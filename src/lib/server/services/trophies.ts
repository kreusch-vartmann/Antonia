import { and, asc, desc, eq } from 'drizzle-orm';
import type { Db } from '../db/types';
import { schema } from '../db/types';
import { formatOf } from '#lib/domain/formats/index.ts';
import type { Hint } from '#lib/domain/formats/types.ts';

const { trophy, answerEvent } = schema;

/** The child's display case: newest trophy first. */
export async function listTrophies(db: Db, studentId: string) {
	return db
		.select({
			id: trophy.id,
			kind: trophy.kind,
			mode: trophy.mode,
			setName: trophy.setName,
			durationMs: trophy.durationMs,
			targetMs: trophy.targetMs,
			mistakes: trophy.mistakes,
			earnedAt: trophy.earnedAt
		})
		.from(trophy)
		.where(eq(trophy.studentId, studentId))
		.orderBy(desc(trophy.earnedAt), desc(trophy.id));
}

export interface TrophyTask {
	/** The task with its solution, e.g. "3 · 5 = 15". */
	text: string;
	question: string | null;
	/** Wrong answers the child gave for this task, in order. */
	wrong: string[];
	/** Tip for tasks that went wrong. */
	hint: Hint | null;
}

/** One trophy with the whole race: every task, the wrong answers and tips for them. */
export async function trophyDetail(db: Db, studentId: string, trophyId: string) {
	const [t] = await db
		.select()
		.from(trophy)
		.where(and(eq(trophy.id, trophyId), eq(trophy.studentId, studentId)));
	if (!t) return null;
	const events = t.runId
		? await db
				.select()
				.from(answerEvent)
				.where(eq(answerEvent.runId, t.runId))
				.orderBy(asc(answerEvent.seq))
		: [];

	const tasks = new Map<string, TrophyTask>();
	for (const e of events) {
		const key = e.taskId ?? JSON.stringify(e.taskSnapshot);
		let task = tasks.get(key);
		if (!task) {
			const fmt = formatOf(e.taskSnapshot);
			const p = fmt.present(e.taskSnapshot);
			const solution = fmt.solution(e.taskSnapshot);
			task = {
				text: p.parts.map((x) => (x.kind === 'text' ? x.value : solution)).join(' '),
				question: p.question ?? null,
				wrong: [],
				hint: null
			};
			tasks.set(key, task);
		}
		if (e.kind === 'answer' && !e.correct && e.given) {
			task.wrong.push(e.given);
			task.hint ??= formatOf(e.taskSnapshot).hint(e.taskSnapshot);
		}
	}
	return {
		trophy: {
			id: t.id,
			kind: t.kind,
			mode: t.mode,
			setName: t.setName,
			durationMs: t.durationMs,
			targetMs: t.targetMs,
			mistakes: t.mistakes,
			earnedAt: t.earnedAt
		},
		tasks: [...tasks.values()]
	};
}
