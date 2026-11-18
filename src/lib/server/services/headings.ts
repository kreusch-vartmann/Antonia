import { and, asc, eq } from 'drizzle-orm';
import type { Db } from '../db/types';
import { schema } from '../db/types';
import { ValidationError } from './accounts';
import { getPreferences, updatePreferences } from './preferences';
import { customHeading } from '#lib/domain/setOrder.ts';

const { setHeading, taskSet } = schema;

function cleanName(name: string): string {
	const n = name.trim();
	if (n.length < 1 || n.length > 60)
		throw new ValidationError('Bitte einen Namen mit 1 bis 60 Zeichen eingeben.');
	return n;
}

export async function listHeadings(db: Db, teacherId: string) {
	return db
		.select({ id: setHeading.id, name: setHeading.name })
		.from(setHeading)
		.where(eq(setHeading.teacherId, teacherId))
		.orderBy(asc(setHeading.createdAt));
}

export async function createHeading(db: Db, teacherId: string, name: string): Promise<string> {
	const [row] = await db
		.insert(setHeading)
		.values({ teacherId, name: cleanName(name) })
		.returning({ id: setHeading.id });
	return row.id;
}

export async function renameHeading(db: Db, teacherId: string, id: string, name: string) {
	await db
		.update(setHeading)
		.set({ name: cleanName(name) })
		.where(and(eq(setHeading.id, id), eq(setHeading.teacherId, teacherId)));
}

/** Deletes an own heading; its sets are listed under their automatic heading again. */
export async function deleteHeading(db: Db, teacherId: string, id: string) {
	const key = customHeading(id);
	const [own] = await db
		.select({ id: setHeading.id })
		.from(setHeading)
		.where(and(eq(setHeading.id, id), eq(setHeading.teacherId, teacherId)));
	if (!own) return;
	await db
		.update(taskSet)
		.set({ heading: null })
		.where(and(eq(taskSet.teacherId, teacherId), eq(taskSet.heading, key)));
	await db.delete(setHeading).where(eq(setHeading.id, id));
	const prefs = await getPreferences(db, teacherId);
	if (prefs.headingOrder?.includes(key)) {
		await updatePreferences(db, teacherId, {
			headingOrder: prefs.headingOrder.filter((k) => k !== key)
		});
	}
}
