import { and, asc, eq, sql } from 'drizzle-orm';
import type { Db } from '../db/types';
import { schema } from '../db/types';
import type { Kv } from '../kv/types';
import { resolveSettings, type Settings } from '#lib/domain/settings.ts';
import { isFlawlessMode, trophyFor, type RunMode } from '#lib/domain/modes.ts';
import {
	abort,
	answer,
	createRun,
	pickTaskSettings,
	result,
	tick,
	timeout,
	view,
	type AnswerEventDraft,
	type Feedback,
	type RunState,
	type RunView
} from '#lib/domain/run/engine.ts';
import { randomSeed } from '#lib/domain/random.ts';
import { activeAssignmentsForChild, bestTimes, type BestTime } from './sets';
import { ValidationError } from './accounts';

const { assignment, taskSet, student, run, answerEvent, trophy } = schema;

const RUN_TTL = 24 * 60 * 60;

interface StoredRun {
	runId: string;
	studentId: string;
	assignmentId: string;
	setId: string;
	engine: RunState;
}

export type ClientSettings = Pick<
	Settings,
	'readAloud' | 'sound' | 'calm' | 'largeText' | 'targetTime' | 'showTimer'
>;

export interface RunPayload {
	runId: string;
	view: RunView;
	settings: ClientSettings;
	/** Progress of the best run, for the ghost car (race against the best time only). */
	ghost: [number, number][] | null;
	/** Best earlier time with this set (flawless races only), without the run itself. */
	best: Pick<BestTime, 'durationMs' | 'at'> | null;
}

const runKey = (id: string) => `run:${id}`;
const activeKey = (assignmentId: string, mode: RunMode) => `activerun:${assignmentId}:${mode}`;

// Serialise actions per run within this process (double taps etc.).
const locks = new Map<string, Promise<unknown>>();
async function withLock<T>(id: string, fn: () => Promise<T>): Promise<T> {
	const prev = locks.get(id) ?? Promise.resolve();
	const next = prev.then(fn, fn);
	locks.set(
		id,
		next.catch(() => {})
	);
	try {
		return await next;
	} finally {
		if (locks.get(id) === next || locks.size > 1000) locks.delete(id);
	}
}

function clientSettings(s: Settings): ClientSettings {
	return {
		readAloud: s.readAloud,
		sound: s.sound,
		calm: s.calm,
		largeText: s.largeText,
		targetTime: s.targetTime,
		showTimer: s.showTimer
	};
}

async function load(kv: Kv, runId: string): Promise<StoredRun | null> {
	const raw = await kv.get(runKey(runId));
	return raw ? (JSON.parse(raw) as StoredRun) : null;
}

async function save(kv: Kv, s: StoredRun) {
	await kv.set(runKey(s.runId), JSON.stringify(s), RUN_TTL);
}

async function reference(db: Db, s: StoredRun) {
	const [best] = (await bestTimes(db, s.studentId, [s.setId], s.runId)).values();
	return best ?? null;
}

async function payload(db: Db, s: StoredRun, now: number): Promise<RunPayload> {
	const flawless = isFlawlessMode(s.engine.mode);
	const best = flawless ? await reference(db, s) : null;
	let ghost: [number, number][] | null = null;
	if (best && s.engine.mode === 'record') {
		const [row] = await db
			.select({ timeline: run.timeline })
			.from(run)
			.where(eq(run.id, best.runId));
		ghost = row?.timeline ?? null;
	}
	return {
		runId: s.runId,
		view: view(s.engine, now),
		settings: clientSettings(s.engine.settings),
		ghost,
		best: best ? { durationMs: best.durationMs, at: best.at } : null
	};
}

/**
 * Starts a run (or resumes the running one of the same mode) for an active
 * assignment of the child.
 */
export async function startOrResumeRun(
	db: Db,
	kv: Kv,
	studentId: string,
	assignmentId: string,
	mode: RunMode = 'normal',
	now = Date.now()
): Promise<RunPayload> {
	const active = await activeAssignmentsForChild(db, studentId);
	const available = active.find((a) => a.id === assignmentId);
	if (!available) throw new ValidationError('Diese Aufgabe ist nicht verfügbar.');
	if (!available.modes.includes(mode))
		throw new ValidationError('Diese Rennart ist für dich gerade nicht freigegeben.');
	if (mode === 'record' && !available.best)
		throw new ValidationError(
			'Fahre zuerst einmal „Fehlerfrei“, dann kannst du deine Bestzeit jagen.'
		);

	const existingId = await kv.get(activeKey(assignmentId, mode));
	if (existingId) {
		const s = await load(kv, existingId);
		if (s && s.studentId === studentId && s.engine.status === 'running') {
			if (tick(s.engine, now)) await persistEnd(db, kv, s);
			else return payload(db, s, now);
		}
	}

	const [row] = await db
		.select({ assignment, set: taskSet, studentSettings: student.settings })
		.from(assignment)
		.innerJoin(taskSet, eq(taskSet.id, assignment.setId))
		.innerJoin(student, eq(student.id, assignment.studentId))
		.where(and(eq(assignment.id, assignmentId), eq(assignment.studentId, studentId)));
	if (!row) throw new ValidationError('Diese Aufgabe ist nicht verfügbar.');

	const items = await db
		.select({ item: schema.taskSetItem, task: schema.task })
		.from(schema.taskSetItem)
		.innerJoin(schema.task, eq(schema.task.id, schema.taskSetItem.taskId))
		.where(eq(schema.taskSetItem.setId, row.set.id))
		.orderBy(asc(schema.taskSetItem.position));
	if (items.length === 0) throw new ValidationError('Dieses Set enthält noch keine Aufgaben.');

	const runLevel = resolveSettings({
		set: row.set.settings,
		student: row.studentSettings,
		assignment: row.assignment.settings
	}).values;
	if (mode === 'time' && runLevel.targetTime <= 0)
		throw new ValidationError('Für dieses Rennen ist keine Zielzeit eingestellt.');
	const tasks = items.map(({ item, task }) => ({
		id: task.id,
		content: task.content,
		settings: pickTaskSettings(
			resolveSettings({
				task: task.settings,
				set: row.set.settings,
				setItem: item.settings,
				student: row.studentSettings,
				assignment: row.assignment.settings
			}).values
		)
	}));

	const engine = createRun({ tasks, settings: runLevel, seed: randomSeed(), now, mode });
	const [r] = await db
		.insert(run)
		.values({
			assignmentId,
			studentId,
			setId: row.set.id,
			status: 'running',
			mode,
			startedAt: new Date(now),
			tasksTotal: engine.uniqueTasks,
			settings: engine.settings as unknown as Record<string, unknown>
		})
		.returning({ id: run.id });
	const stored: StoredRun = { runId: r.id, studentId, assignmentId, setId: row.set.id, engine };
	await save(kv, stored);
	await kv.set(activeKey(assignmentId, mode), r.id, RUN_TTL);
	return payload(db, stored, now);
}

async function persistEvents(db: Db, runId: string, events: AnswerEventDraft[]) {
	if (events.length === 0) return;
	await db.insert(answerEvent).values(
		events.map((e) => ({
			runId,
			taskId: e.taskId,
			taskSnapshot: e.taskSnapshot,
			family: e.family,
			seq: e.seq,
			kind: e.kind,
			given: e.given,
			correct: e.correct,
			attempt: e.attempt,
			presentation: e.presentation,
			hintShown: e.hintShown,
			solutionShown: e.solutionShown,
			ms: e.ms,
			errorPattern: e.errorPattern
		}))
	);
}

async function awardTrophy(db: Db, s: StoredRun, durationMs: number | null) {
	const mode = s.engine.mode ?? 'normal';
	const kind = trophyFor(mode);
	if (!kind) return;
	const [wrong] = await db
		.select({ n: sql<number>`count(*)::int` })
		.from(answerEvent)
		.where(
			and(
				eq(answerEvent.runId, s.runId),
				eq(answerEvent.kind, 'answer'),
				eq(answerEvent.correct, false)
			)
		);
	const [set] = await db
		.select({ name: taskSet.name })
		.from(taskSet)
		.where(eq(taskSet.id, s.setId));
	await db
		.insert(trophy)
		.values({
			studentId: s.studentId,
			runId: s.runId,
			kind,
			mode,
			setName: set?.name ?? '',
			durationMs,
			mistakes: wrong?.n ?? 0,
			targetMs: mode === 'time' ? s.engine.settings.targetTime * 1000 : null,
			earnedAt: new Date(s.engine.finishedAt ?? Date.now())
		})
		.onConflictDoNothing();
}

async function persistEnd(db: Db, kv: Kv, s: StoredRun) {
	const res = result(s.engine);
	await db
		.update(run)
		.set({
			status: s.engine.status,
			finishedAt: new Date(s.engine.finishedAt ?? Date.now()),
			durationMs: res?.durationMs ?? null,
			stars: res?.stars ?? null,
			tasksDone: s.engine.done,
			firstTryCorrect: s.engine.firstTry,
			timeline: s.engine.timeline
		})
		.where(eq(run.id, s.runId));
	if (s.engine.status === 'finished') await awardTrophy(db, s, res?.durationMs ?? null);
	await kv.del(activeKey(s.assignmentId, s.engine.mode ?? 'normal'));
	await save(kv, s); // keep result viewable for a while
}

export type RunAction =
	| { type: 'answer'; key: string; value: string; ms: number | null }
	| { type: 'timeout'; key: string }
	| { type: 'tick' }
	| { type: 'abort' };

export async function act(
	db: Db,
	kv: Kv,
	studentId: string,
	runId: string,
	action: RunAction,
	now = Date.now()
): Promise<RunPayload & { feedback: Feedback }> {
	return withLock(runId, async () => {
		const s = await load(kv, runId);
		if (!s || s.studentId !== studentId) throw new ValidationError('Rennen nicht gefunden.');
		const wasRunning = s.engine.status === 'running';
		let feedback: Feedback = { outcome: 'ignored' };
		let events: AnswerEventDraft[] = [];
		if (action.type === 'answer') {
			({ feedback, events } = answer(s.engine, action, now));
		} else if (action.type === 'timeout') {
			({ feedback, events } = timeout(s.engine, action, now));
		} else if (action.type === 'tick') {
			tick(s.engine, now);
		} else {
			abort(s.engine, now);
		}
		await persistEvents(db, runId, events);
		if (wasRunning && s.engine.status !== 'running') {
			await persistEnd(db, kv, s);
		} else {
			await save(kv, s);
			if (events.length) {
				await db
					.update(run)
					.set({ tasksDone: s.engine.done, firstTryCorrect: s.engine.firstTry })
					.where(eq(run.id, runId));
			}
		}
		return { ...(await payload(db, s, now)), feedback };
	});
}

export async function getRunPayload(
	db: Db,
	kv: Kv,
	studentId: string,
	runId: string,
	now = Date.now()
) {
	const s = await load(kv, runId);
	if (!s || s.studentId !== studentId) return null;
	if (s.engine.status === 'running' && tick(s.engine, now)) await persistEnd(db, kv, s);
	return payload(db, s, now);
}

/** Marks runs as aborted that were left open (e.g. Redis state expired). */
export async function cleanupStaleRuns(db: Db) {
	await db
		.update(run)
		.set({ status: 'aborted', finishedAt: sql`now()` })
		.where(and(eq(run.status, 'running'), sql`${run.startedAt} < now() - interval '1 day'`));
}
