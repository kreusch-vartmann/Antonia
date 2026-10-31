import { and, arrayContains, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import type { Db } from '../db/types';
import { schema } from '../db/types';
import { getFormat } from '#lib/domain/formats/index.ts';
import type { TaskContent, TaskOrigin } from '#lib/domain/formats/types.ts';
import { sanitizeLayer, type SettingsLayer } from '#lib/domain/settings.ts';
import { ValidationError } from './accounts';

const { task, taskSetItem } = schema;

export interface TaskInput {
	content: unknown;
	tags?: string[];
	settings?: SettingsLayer;
	origin?: TaskOrigin;
}

export function normalizeTags(tags: string[] | undefined): string[] {
	return [...new Set((tags ?? []).map((t) => t.trim()).filter((t) => t && t.length <= 40))].slice(0, 20);
}

export function parseTagString(s: string | null | undefined): string[] {
	return normalizeTags((s ?? '').split(','));
}

function validated(content: unknown): TaskContent {
	const fmtId = (content as { format?: string })?.format ?? '';
	let fmt;
	try {
		fmt = getFormat(fmtId);
	} catch {
		throw new ValidationError('Unbekanntes Aufgabenformat.');
	}
	const r = fmt.validate(content);
	if (!r.ok) throw new ValidationError(r.error);
	return r.content;
}

export async function createTasks(db: Db, teacherId: string, inputs: TaskInput[]) {
	if (inputs.length === 0) return [];
	if (inputs.length > 200) throw new ValidationError('Höchstens 200 Aufgaben auf einmal.');
	const rows = inputs.map((i) => {
		const content = validated(i.content);
		return {
			teacherId,
			format: content.format,
			content,
			tags: normalizeTags(i.tags),
			settings: sanitizeLayer(i.settings ?? {}),
			origin: i.origin ?? { kind: 'manual' as const }
		};
	});
	return (await db.insert(task).values(rows).returning({ id: task.id })).map((r) => r.id);
}

export async function updateTask(db: Db, teacherId: string, id: string, input: TaskInput) {
	const content = validated(input.content);
	const res = await db
		.update(task)
		.set({
			content,
			format: content.format,
			tags: normalizeTags(input.tags),
			settings: sanitizeLayer(input.settings ?? {}),
			updatedAt: new Date()
		})
		.where(and(eq(task.id, id), eq(task.teacherId, teacherId)))
		.returning({ id: task.id });
	if (res.length === 0) throw new ValidationError('Aufgabe nicht gefunden.');
}

export async function getTask(db: Db, teacherId: string, id: string) {
	const [t] = await db.select().from(task).where(and(eq(task.id, id), eq(task.teacherId, teacherId)));
	return t ?? null;
}

export interface TaskFilter {
	tag?: string;
	op?: string;
	q?: string;
	ids?: string[];
}

export async function listTasks(db: Db, teacherId: string, f: TaskFilter = {}) {
	const conds = [eq(task.teacherId, teacherId), eq(task.archived, false)];
	if (f.tag) conds.push(arrayContains(task.tags, [f.tag]));
	if (f.op) conds.push(sql`${task.content}->'expr'->>'op' = ${f.op}`);
	if (f.q) {
		const like = `%${f.q.replace(/[%_\\]/g, '\\$&')}%`;
		conds.push(sql`(${task.content}::text ilike ${like} or array_to_string(${task.tags}, ',') ilike ${like})`);
	}
	if (f.ids) conds.push(f.ids.length ? inArray(task.id, f.ids) : sql`false`);
	return db
		.select()
		.from(task)
		.where(and(...conds))
		.orderBy(desc(task.createdAt), asc(task.id))
		.limit(1000);
}

export async function allTags(db: Db, teacherId: string): Promise<string[]> {
	const rows = await db
		.selectDistinct({ tag: sql<string>`unnest(${task.tags})`.as('tag') })
		.from(task)
		.where(and(eq(task.teacherId, teacherId), eq(task.archived, false)));
	return rows.map((r) => r.tag).sort((a, b) => a.localeCompare(b, 'de'));
}

export async function taskUsage(db: Db, taskId: string): Promise<number> {
	const [r] = await db
		.select({ n: sql<number>`count(*)::int` })
		.from(taskSetItem)
		.where(eq(taskSetItem.taskId, taskId));
	return r.n;
}

/** Deletes a task (it is removed from sets; past results keep a snapshot). */
export async function deleteTasks(db: Db, teacherId: string, ids: string[]) {
	if (ids.length === 0) return 0;
	const res = await db
		.delete(task)
		.where(and(eq(task.teacherId, teacherId), inArray(task.id, ids)))
		.returning({ id: task.id });
	return res.length;
}

export async function addTagToTasks(db: Db, teacherId: string, ids: string[], tag: string) {
	const t = normalizeTags([tag])[0];
	if (!t || ids.length === 0) return;
	await db
		.update(task)
		.set({ tags: sql`array(select distinct unnest(array_append(${task.tags}, ${t})))`, updatedAt: new Date() })
		.where(and(eq(task.teacherId, teacherId), inArray(task.id, ids)));
}
