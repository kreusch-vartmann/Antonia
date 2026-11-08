import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import type { Db } from '../db/types';
import { schema } from '../db/types';
import { resolveSettings, sanitizeLayer, type SettingsLayer } from '#lib/domain/settings.ts';
import { RUN_MODES, cleanModes, type RunMode } from '#lib/domain/modes.ts';
import { classifySet } from '#lib/domain/numberRange.ts';
import type { TaskContent } from '#lib/domain/formats/types.ts';
import { ValidationError } from './accounts';

const { taskSet, taskSetItem, task, assignment, student } = schema;

/**
 * Only runs after the last "reset progress" of the assignment count for the child
 * (stars, best time, unlock). The evaluation of the teacher always sees every run.
 */
const countsForChild = sql`${schema.run.startedAt} > coalesce(${assignment.progressResetAt}, '-infinity'::timestamptz)`;

/** Best stars per assignment and race mode (only runs that count for the child). */
async function starsByMode(db: Db, assignmentIds: string[]) {
	const map = new Map<string, Partial<Record<RunMode, number>>>();
	if (assignmentIds.length === 0) return map;
	const rows = await db
		.select({
			assignmentId: schema.run.assignmentId,
			mode: schema.run.mode,
			stars: sql<number | null>`max(${schema.run.stars})`
		})
		.from(schema.run)
		.innerJoin(assignment, eq(assignment.id, schema.run.assignmentId))
		.where(and(inArray(schema.run.assignmentId, assignmentIds), countsForChild))
		.groupBy(schema.run.assignmentId, schema.run.mode);
	for (const r of rows) {
		if (r.stars === null) continue;
		const m = map.get(r.assignmentId) ?? {};
		m[r.mode] = r.stars;
		map.set(r.assignmentId, m);
	}
	return map;
}

export async function listSets(db: Db, teacherId: string) {
	const rows = await db
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
	const contents = new Map<string, TaskContent[]>();
	if (rows.length > 0) {
		const items = await db
			.select({ setId: taskSetItem.setId, content: task.content })
			.from(taskSetItem)
			.innerJoin(task, eq(task.id, taskSetItem.taskId))
			.where(
				inArray(
					taskSetItem.setId,
					rows.map((r) => r.id)
				)
			);
		for (const i of items) contents.set(i.setId, [...(contents.get(i.setId) ?? []), i.content]);
	}
	// number range and ten transition, derived from the tasks (for sorting the list)
	return rows.map((r) => ({ ...r, range: classifySet(contents.get(r.id) ?? []) }));
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

/** Puts another task in the place of a task of the set (same position and item settings). */
export async function replaceItemTask(
	db: Db,
	teacherId: string,
	setId: string,
	oldTaskId: string,
	newTaskId: string
) {
	const set = await getSet(db, teacherId, setId);
	if (!set) throw new ValidationError('Set nicht gefunden.');
	const [owned] = await db
		.select({ id: task.id })
		.from(task)
		.where(and(eq(task.id, newTaskId), eq(task.teacherId, teacherId)));
	if (!owned) throw new ValidationError('Unbekannte Aufgabe.');
	await db
		.update(taskSetItem)
		.set({ taskId: newTaskId })
		.where(and(eq(taskSetItem.setId, setId), eq(taskSetItem.taskId, oldTaskId)));
	await db.update(taskSet).set({ updatedAt: new Date() }).where(eq(taskSet.id, setId));
}

/** Deletes the given tasks if no set uses them any more (tasks only live inside sets). */
export async function deleteUnusedTasks(db: Db, teacherId: string, taskIds: string[]) {
	if (taskIds.length === 0) return;
	const used = await db
		.select({ id: taskSetItem.taskId })
		.from(taskSetItem)
		.where(inArray(taskSetItem.taskId, taskIds));
	const inUse = new Set(used.map((u) => u.id));
	const unused = taskIds.filter((id) => !inUse.has(id));
	if (unused.length)
		await db.delete(task).where(and(eq(task.teacherId, teacherId), inArray(task.id, unused)));
}

/** A copy of the set with copies of its tasks, so that changes in one do not affect the other. */
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
		const copies = await db
			.insert(task)
			.values(
				items.map((i) => ({
					teacherId,
					subject: i.task.subject,
					format: i.task.format,
					content: i.task.content,
					tags: i.task.tags,
					origin: i.task.origin,
					settings: i.task.settings
				}))
			)
			.returning({ id: task.id });
		await db.insert(taskSetItem).values(
			items.map((i, n) => ({
				setId: newId,
				taskId: copies[n].id,
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
	const taskIds = (await getSetItems(db, id)).map((i) => i.task.id);
	await db.delete(taskSet).where(and(eq(taskSet.id, id), eq(taskSet.teacherId, teacherId)));
	await deleteUnusedTasks(db, teacherId, taskIds);
	return 'deleted' as const;
}

// ---------- Assignments ----------

function requireModes(values: string[], targetTime: number): RunMode[] {
	const modes = cleanModes(values);
	if (modes.length === 0) throw new ValidationError('Bitte mindestens eine Rennart auswählen.');
	if (modes.includes('time') && targetTime <= 0)
		throw new ValidationError('Für „Gegen die Zeit“ bitte eine Zielzeit eintragen.');
	if (modes.includes('record') && !modes.includes('flawless'))
		throw new ValidationError(
			'„Bestzeit jagen“ braucht „Fehlerfrei“: Die Bestzeit entsteht in einer fehlerfreien Fahrt.'
		);
	return modes;
}

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
		/** Allowed race modes (default: all). */
		modes?: RunMode[];
	}
) {
	const targetTime = sanitizeLayer(input.settings ?? {}).targetTime ?? 0;
	const modes =
		input.modes === undefined
			? ([...RUN_MODES].filter((m) => m !== 'time' || targetTime > 0) as RunMode[])
			: requireModes(input.modes, targetTime);
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
			modes,
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
		modes?: RunMode[];
	}
) {
	const a = await getAssignmentForTeacher(db, teacherId, id);
	if (!a) throw new ValidationError('Zuweisung nicht gefunden.');
	const modes =
		input.modes === undefined
			? undefined
			: requireModes(input.modes, sanitizeLayer(input.settings ?? {}).targetTime ?? 0);
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
			modes: modes ?? a.assignment.modes,
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
			modes: assignment.modes,
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
			modes: assignment.modes,
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

export interface StudentRaceAssignment {
	id: string;
	startsOn: string | null;
	endsOn: string | null;
	archived: boolean;
	modes: RunMode[];
	/** Target time in seconds of the race against the clock (0 = none). */
	targetTime: number;
	/** Best stars per race mode since the last reset. */
	starsByMode: Partial<Record<RunMode, number>>;
	runs: number;
	progressResetAt: Date | null;
	/** The teacher may edit this assignment (it uses a set of their own). */
	editable: boolean;
}

export interface StudentRace {
	setId: string;
	setName: string;
	archived: boolean;
	best: BestTime | null;
	assignments: StudentRaceAssignment[];
}

/**
 * All assignments of one child, bundled per set ("race"). The caller has to make sure
 * that the teacher may see the child.
 */
export async function racesForStudent(
	db: Db,
	teacherId: string,
	studentId: string
): Promise<StudentRace[]> {
	const rows = await db
		.select({
			id: assignment.id,
			setId: taskSet.id,
			setName: taskSet.name,
			setOwner: taskSet.teacherId,
			setArchived: taskSet.archived,
			startsOn: assignment.startsOn,
			endsOn: assignment.endsOn,
			archived: assignment.archived,
			modes: assignment.modes,
			settings: assignment.settings,
			progressResetAt: assignment.progressResetAt,
			createdAt: assignment.createdAt,
			runs: sql<number>`(select count(*)::int from run r where r.assignment_id = "assignment"."id" and r.status <> 'running')`
		})
		.from(assignment)
		.innerJoin(taskSet, eq(taskSet.id, assignment.setId))
		.where(eq(assignment.studentId, studentId))
		.orderBy(desc(assignment.createdAt));
	const stars = await starsByMode(
		db,
		rows.map((r) => r.id)
	);
	const best = await bestTimes(db, studentId, [...new Set(rows.map((r) => r.setId))]);
	const groups = new Map<string, StudentRace>();
	for (const r of rows) {
		let g = groups.get(r.setId);
		if (!g) {
			g = {
				setId: r.setId,
				setName: r.setName,
				archived: true,
				best: best.get(r.setId) ?? null,
				assignments: []
			};
			groups.set(r.setId, g);
		}
		if (!r.archived && !r.setArchived) g.archived = false;
		g.assignments.push({
			id: r.id,
			startsOn: r.startsOn,
			endsOn: r.endsOn,
			archived: r.archived,
			modes: cleanModes(r.modes),
			targetTime: resolveSettings({ assignment: r.settings }).values.targetTime,
			starsByMode: stars.get(r.id) ?? {},
			runs: r.runs,
			progressResetAt: r.progressResetAt,
			editable: r.setOwner === teacherId
		});
	}
	return [...groups.values()];
}

export interface BestTime {
	runId: string;
	durationMs: number;
	at: string;
}

/**
 * The reference for the race against the best time: the fastest finished flawless run
 * (modes "Fehlerfrei" and "Bestzeit jagen") of the child per set.
 */
export async function bestTimes(
	db: Db,
	studentId: string,
	setIds: string[],
	excludeRunId?: string
): Promise<Map<string, BestTime>> {
	const best = new Map<string, BestTime>();
	if (setIds.length === 0) return best;
	const rows = await db
		.select({
			runId: schema.run.id,
			setId: schema.run.setId,
			durationMs: schema.run.durationMs,
			finishedAt: schema.run.finishedAt
		})
		.from(schema.run)
		.innerJoin(assignment, eq(assignment.id, schema.run.assignmentId))
		.where(
			and(
				eq(schema.run.studentId, studentId),
				inArray(schema.run.setId, setIds),
				eq(schema.run.status, 'finished'),
				inArray(schema.run.mode, ['flawless', 'record']),
				sql`${schema.run.durationMs} is not null`,
				countsForChild,
				excludeRunId ? ne(schema.run.id, excludeRunId) : undefined
			)
		)
		.orderBy(asc(schema.run.durationMs));
	for (const r of rows) {
		if (best.has(r.setId) || r.durationMs === null) continue;
		best.set(r.setId, {
			runId: r.runId,
			durationMs: r.durationMs,
			at: (r.finishedAt ?? new Date()).toISOString()
		});
	}
	return best;
}

/** Assignments the child can currently work on. */
export async function activeAssignmentsForChild(db: Db, studentId: string, today = todayBerlin()) {
	const rows = await db
		.select({
			id: assignment.id,
			allowedModes: assignment.modes,
			setSettings: taskSet.settings,
			assignmentSettings: assignment.settings,
			studentSettings: student.settings,
			setId: taskSet.id,
			setName: taskSet.name,
			description: taskSet.description,
			endsOn: assignment.endsOn,
			items: sql<number>`(select count(*)::int from task_set_item i where i.set_id = "task_set"."id")`,
			bestStars: sql<
				number | null
			>`(select max(stars) from run r where r.assignment_id = "assignment"."id" and r.started_at > coalesce("assignment"."progress_reset_at", '-infinity'::timestamptz))`,
			runs: sql<number>`(select count(*)::int from run r where r.assignment_id = "assignment"."id" and r.status in ('finished','timeUp') and r.started_at > coalesce("assignment"."progress_reset_at", '-infinity'::timestamptz))`
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
	const stars = await starsByMode(
		db,
		rows.map((r) => r.id)
	);
	const starsFor = (id: string): Partial<Record<RunMode, number>> => stars.get(id) ?? {};
	const best = await bestTimes(db, studentId, [...new Set(rows.map((r) => r.setId))]);
	return rows.map(({ setSettings, assignmentSettings, studentSettings, allowedModes, ...a }) => {
		const targetTime = resolveSettings({
			set: setSettings,
			student: studentSettings,
			assignment: assignmentSettings
		}).values.targetTime;
		return {
			...a,
			/** Reference time for "Bestzeit jagen" (null until a flawless race was finished). */
			best: best.get(a.setId) ?? null,
			/** Best star rating per race mode of this assignment. */
			starsByMode: starsFor(a.id),
			/** Target time in seconds for the race against the clock (0 = not offered). */
			targetTime,
			/** Modes the child may choose: allowed by the teacher, and the time race needs a target. */
			modes: cleanModes(allowedModes).filter((m) => m !== 'time' || targetTime > 0)
		};
	});
}

export type RaceVariant = {
	assignmentId: string;
	mode: RunMode;
	/** Target time in seconds (only meaningful for the time race). */
	targetTime: number;
	endsOn: string | null;
	stars: number;
	/** Best time of the child with this set; shown instead of stars for the race against it. */
	best: BestTime | null;
};

export type RaceGroup = {
	setId: string;
	setName: string;
	description: string | null;
	items: number;
	endsOn: string | null;
	variants: RaceVariant[];
};

/**
 * Merges all active assignments of the same set into one entry with its race
 * variants (normal, flawless, one time race per target time). Identical variants
 * from several assignments appear once and show the best stars of all of them.
 */
export function groupRaces(assignments: Awaited<ReturnType<typeof activeAssignmentsForChild>>) {
	const groups = new Map<string, RaceGroup>();
	for (const a of assignments) {
		let g = groups.get(a.setId);
		if (!g) {
			g = {
				setId: a.setId,
				setName: a.setName,
				description: a.description,
				items: a.items,
				endsOn: null,
				variants: []
			};
			groups.set(a.setId, g);
		}
		for (const mode of a.modes) {
			const targetTime = mode === 'time' ? a.targetTime : 0;
			const stars = a.starsByMode[mode] ?? 0;
			const same = g.variants.find((v) => v.mode === mode && v.targetTime === targetTime);
			if (same) {
				same.stars = Math.max(same.stars, stars);
				if (same.endsOn && a.endsOn && a.endsOn > same.endsOn) same.endsOn = a.endsOn;
				if (!a.endsOn) same.endsOn = null;
			} else {
				g.variants.push({
					assignmentId: a.id,
					mode,
					targetTime,
					endsOn: a.endsOn,
					stars,
					best: a.best
				});
			}
		}
	}
	return [...groups.values()]
		.map((g) => {
			g.variants.sort(
				(x, y) =>
					RUN_MODES.indexOf(x.mode) - RUN_MODES.indexOf(y.mode) || x.targetTime - y.targetTime
			);
			const ends = new Set(g.variants.map((v) => v.endsOn));
			if (ends.size === 1) {
				g.endsOn = g.variants[0].endsOn;
				for (const v of g.variants) v.endsOn = null;
			}
			return g;
		})
		.filter((g) => g.variants.length > 0);
}
