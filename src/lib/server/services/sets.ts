import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import type { Db } from '../db/types';
import { schema } from '../db/types';
import { resolveSettings, sanitizeLayer, type SettingsLayer } from '#lib/domain/settings.ts';
import { ValidationError } from './accounts';

const { taskSet, taskSetItem, task, assignment, student } = schema;

export async function listSets(db: Db, teacherId: string) {
	return db
		.select({
			id: taskSet.id,
			name: taskSet.name,
			description: taskSet.description,
			scenario: taskSet.scenario,
			updatedAt: taskSet.updatedAt,
			items: sql<number>`(select count(*)::int from task_set_item i where i.set_id = "task_set"."id")`,
			assignments: sql<number>`(select count(*)::int from assignment a where a.set_id = "task_set"."id" and a.archived = false)`
		})
		.from(taskSet)
		.where(and(eq(taskSet.teacherId, teacherId), eq(taskSet.archived, false)))
		.orderBy(desc(taskSet.updatedAt));
}

export async function getSet(db: Db, teacherId: string, id: string) {
	const [s] = await db
		.select()
		.from(taskSet)
		.where(and(eq(taskSet.id, id), eq(taskSet.teacherId, teacherId)));
	return s ?? null;
}

export async function getSetItems(db: Db, setId: string) {
	return db
		.select({
			itemId: taskSetItem.id,
			position: taskSetItem.position,
			itemSettings: taskSetItem.settings,
			task
		})
		.from(taskSetItem)
		.innerJoin(task, eq(task.id, taskSetItem.taskId))
		.where(eq(taskSetItem.setId, setId))
		.orderBy(asc(taskSetItem.position));
}

function cleanSet(input: { name: string; description?: string | null }) {
	const name = input.name.trim();
	if (!name || name.length > 120) throw new ValidationError('Name fehlt.', 'name');
	return { name, description: input.description?.trim().slice(0, 1000) || null };
}

export async function createSet(
	db: Db,
	teacherId: string,
	input: { name: string; description?: string | null; settings?: SettingsLayer; taskIds?: string[] }
) {
	const [row] = await db
		.insert(taskSet)
		.values({ teacherId, ...cleanSet(input), settings: sanitizeLayer(input.settings ?? {}) })
		.returning({ id: taskSet.id });
	if (input.taskIds?.length) await setItems(db, teacherId, row.id, input.taskIds);
	return row.id;
}

export async function updateSet(
	db: Db,
	teacherId: string,
	id: string,
	input: { name: string; description?: string | null; settings?: SettingsLayer }
) {
	const res = await db
		.update(taskSet)
		.set({
			...cleanSet(input),
			settings: sanitizeLayer(input.settings ?? {}),
			updatedAt: new Date()
		})
		.where(and(eq(taskSet.id, id), eq(taskSet.teacherId, teacherId)))
		.returning({ id: taskSet.id });
	if (res.length === 0) throw new ValidationError('Set nicht gefunden.');
}

/** Replace the ordered task list; per-item settings of kept tasks are preserved. */
export async function setItems(db: Db, teacherId: string, setId: string, taskIds: string[]) {
	const set = await getSet(db, teacherId, setId);
	if (!set) throw new ValidationError('Set nicht gefunden.');
	const unique = [...new Set(taskIds)].slice(0, 500);
	if (unique.length) {
		const owned = await db
			.select({ id: task.id })
			.from(task)
			.where(and(eq(task.teacherId, teacherId), inArray(task.id, unique)));
		if (owned.length !== unique.length) throw new ValidationError('Unbekannte Aufgabe.');
	}
	await db.transaction(async (tx) => {
		const existing = await tx.select().from(taskSetItem).where(eq(taskSetItem.setId, setId));
		const settingsByTask = new Map(existing.map((e) => [e.taskId, e.settings]));
		await tx.delete(taskSetItem).where(eq(taskSetItem.setId, setId));
		if (unique.length) {
			await tx.insert(taskSetItem).values(
				unique.map((taskId, i) => ({
					setId,
					taskId,
					position: i,
					settings: settingsByTask.get(taskId) ?? {}
				}))
			);
		}
		await tx.update(taskSet).set({ updatedAt: new Date() }).where(eq(taskSet.id, setId));
	});
}

export async function addItems(db: Db, teacherId: string, setId: string, taskIds: string[]) {
	const items = await getSetItems(db, setId);
	await setItems(db, teacherId, setId, [...items.map((i) => i.task.id), ...taskIds]);
}

export async function updateItemSettings(
	db: Db,
	teacherId: string,
	setId: string,
	itemId: string,
	settings: SettingsLayer
) {
	const set = await getSet(db, teacherId, setId);
	if (!set) throw new ValidationError('Set nicht gefunden.');
	await db
		.update(taskSetItem)
		.set({ settings: sanitizeLayer(settings) })
		.where(and(eq(taskSetItem.id, itemId), eq(taskSetItem.setId, setId)));
}

export async function duplicateSet(db: Db, teacherId: string, id: string) {
	const set = await getSet(db, teacherId, id);
	if (!set) throw new ValidationError('Set nicht gefunden.');
	const items = await getSetItems(db, id);
	const newId = await createSet(db, teacherId, {
		name: `${set.name} (Kopie)`.slice(0, 120),
		description: set.description,
		settings: set.settings
	});
	if (items.length) {
		await db.insert(taskSetItem).values(
			items.map((i) => ({
				setId: newId,
				taskId: i.task.id,
				position: i.position,
				settings: i.itemSettings
			}))
		);
	}
	return newId;
}

/** Archive instead of delete when results exist, so evaluations stay available. */
export async function removeSet(db: Db, teacherId: string, id: string) {
	const [r] = await db
		.select({ n: sql<number>`count(*)::int` })
		.from(schema.run)
		.where(eq(schema.run.setId, id));
	if (r.n > 0) {
		await db
			.update(taskSet)
			.set({ archived: true, updatedAt: new Date() })
			.where(and(eq(taskSet.id, id), eq(taskSet.teacherId, teacherId)));
		await db.update(assignment).set({ archived: true }).where(eq(assignment.setId, id));
		return 'archived' as const;
	}
	await db.delete(taskSet).where(and(eq(taskSet.id, id), eq(taskSet.teacherId, teacherId)));
	return 'deleted' as const;
}

// ---------- Assignments ----------

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

function cleanDate(d: string | null | undefined): string | null {
	if (!d) return null;
	if (!dateRe.test(d)) throw new ValidationError('Ungültiges Datum.');
	return d;
}

/** Today's date in Germany (YYYY-MM-DD). */
export function todayBerlin(now = new Date()): string {
	return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(now);
}

export async function assign(
	db: Db,
	teacherId: string,
	input: {
		setId: string;
		studentIds: string[];
		startsOn?: string | null;
		endsOn?: string | null;
		settings?: SettingsLayer;
	}
) {
	const set = await getSet(db, teacherId, input.setId);
	if (!set) throw new ValidationError('Set nicht gefunden.');
	const startsOn = cleanDate(input.startsOn);
	const endsOn = cleanDate(input.endsOn);
	if (startsOn && endsOn && startsOn > endsOn)
		throw new ValidationError('Das Ende liegt vor dem Beginn.');
	const ids = [...new Set(input.studentIds)];
	if (ids.length === 0) throw new ValidationError('Bitte mindestens ein Kind auswählen.');
	const owned = await db
		.select({ id: student.id })
		.from(student)
		.where(and(eq(student.teacherId, teacherId), inArray(student.id, ids)));
	if (owned.length !== ids.length) throw new ValidationError('Unbekanntes Kind.');
	await db.insert(assignment).values(
		ids.map((studentId) => ({
			setId: input.setId,
			studentId,
			startsOn,
			endsOn,
			settings: sanitizeLayer(input.settings ?? {})
		}))
	);
}

/** Loads an assignment only if it belongs to the teacher (via its set). */
export async function getAssignmentForTeacher(db: Db, teacherId: string, id: string) {
	const [a] = await db
		.select({
			assignment,
			set: taskSet,
			student: {
				id: student.id,
				displayName: student.displayName,
				firstName: student.firstName,
				lastName: student.lastName,
				settings: student.settings
			}
		})
		.from(assignment)
		.innerJoin(taskSet, eq(taskSet.id, assignment.setId))
		.innerJoin(student, eq(student.id, assignment.studentId))
		.where(and(eq(assignment.id, id), eq(taskSet.teacherId, teacherId)));
	return a ?? null;
}

export async function updateAssignment(
	db: Db,
	teacherId: string,
	id: string,
	input: {
		startsOn?: string | null;
		endsOn?: string | null;
		settings?: SettingsLayer;
		archived?: boolean;
	}
) {
	const a = await getAssignmentForTeacher(db, teacherId, id);
	if (!a) throw new ValidationError('Zuweisung nicht gefunden.');
	const startsOn = cleanDate(input.startsOn);
	const endsOn = cleanDate(input.endsOn);
	if (startsOn && endsOn && startsOn > endsOn)
		throw new ValidationError('Das Ende liegt vor dem Beginn.');
	await db
		.update(assignment)
		.set({
			startsOn,
			endsOn,
			settings: sanitizeLayer(input.settings ?? {}),
			archived: input.archived ?? a.assignment.archived,
			updatedAt: new Date()
		})
		.where(eq(assignment.id, id));
}

export async function deleteAssignment(db: Db, teacherId: string, id: string) {
	const a = await getAssignmentForTeacher(db, teacherId, id);
	if (!a) throw new ValidationError('Zuweisung nicht gefunden.');
	await db.delete(assignment).where(eq(assignment.id, id));
}

export async function listAssignmentsForSet(db: Db, teacherId: string, setId: string) {
	return db
		.select({
			id: assignment.id,
			studentId: student.id,
			displayName: student.displayName,
			firstName: student.firstName,
			lastName: student.lastName,
			startsOn: assignment.startsOn,
			endsOn: assignment.endsOn,
			archived: assignment.archived,
			settings: assignment.settings,
			runs: sql<number>`(select count(*)::int from run r where r.assignment_id = "assignment"."id" and r.status <> 'running')`,
			bestStars: sql<
				number | null
			>`(select max(stars) from run r where r.assignment_id = "assignment"."id")`
		})
		.from(assignment)
		.innerJoin(taskSet, eq(taskSet.id, assignment.setId))
		.innerJoin(student, eq(student.id, assignment.studentId))
		.where(and(eq(assignment.setId, setId), eq(taskSet.teacherId, teacherId)))
		.orderBy(asc(student.firstName));
}

export async function listAssignmentsForStudent(db: Db, teacherId: string, studentId: string) {
	return db
		.select({
			id: assignment.id,
			setId: taskSet.id,
			setName: taskSet.name,
			startsOn: assignment.startsOn,
			endsOn: assignment.endsOn,
			archived: assignment.archived,
			runs: sql<number>`(select count(*)::int from run r where r.assignment_id = "assignment"."id" and r.status <> 'running')`,
			bestStars: sql<
				number | null
			>`(select max(stars) from run r where r.assignment_id = "assignment"."id")`
		})
		.from(assignment)
		.innerJoin(taskSet, eq(taskSet.id, assignment.setId))
		.where(and(eq(assignment.studentId, studentId), eq(taskSet.teacherId, teacherId)))
		.orderBy(desc(assignment.createdAt));
}

/** Assignments the child can currently work on. */
export async function activeAssignmentsForChild(db: Db, studentId: string, today = todayBerlin()) {
	const rows = await db
		.select({
			id: assignment.id,
			setSettings: taskSet.settings,
			assignmentSettings: assignment.settings,
			studentSettings: student.settings,
			setName: taskSet.name,
			description: taskSet.description,
			endsOn: assignment.endsOn,
			items: sql<number>`(select count(*)::int from task_set_item i where i.set_id = "task_set"."id")`,
			bestStars: sql<
				number | null
			>`(select max(stars) from run r where r.assignment_id = "assignment"."id")`,
			runs: sql<number>`(select count(*)::int from run r where r.assignment_id = "assignment"."id" and r.status in ('finished','timeUp'))`
		})
		.from(assignment)
		.innerJoin(taskSet, eq(taskSet.id, assignment.setId))
		.innerJoin(student, eq(student.id, assignment.studentId))
		.where(
			and(
				eq(assignment.studentId, studentId),
				eq(assignment.archived, false),
				eq(taskSet.archived, false),
				sql`(${assignment.startsOn} is null or ${assignment.startsOn} <= ${today})`,
				sql`(${assignment.endsOn} is null or ${assignment.endsOn} >= ${today})`
			)
		)
		.orderBy(asc(assignment.endsOn), desc(assignment.createdAt));
	return rows.map(({ setSettings, assignmentSettings, studentSettings, ...a }) => ({
		...a,
		/** Target time in seconds for the race against the clock (0 = not offered). */
		targetTime: resolveSettings({
			set: setSettings,
			student: studentSettings,
			assignment: assignmentSettings
		}).values.targetTime
	}));
}
