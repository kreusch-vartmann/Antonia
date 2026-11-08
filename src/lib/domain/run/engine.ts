/**
 * Run engine: the pure state machine behind a practice run.
 *
 * It is scenario-agnostic (the race only visualises `done / total`) and
 * format-agnostic (all task logic goes through the format registry).
 * The state is JSON-serialisable so the server can keep it in Redis.
 */
import { formatOf } from '../formats';
import type { Hint, Presentation, TaskContent } from '../formats/types';
import { isFlawlessMode, type RunMode } from '../modes';
import { rng, shuffle } from '../random';
import { TASK_LEVEL_KEYS, type Settings } from '../settings';

export type TaskSettings = Pick<
	Settings,
	'answerFormat' | 'choiceCount' | 'hintAfter' | 'solutionAfter' | 'taskTimeLimit' | 'onTimeout'
>;

export interface RunTaskDef {
	id: string;
	content: TaskContent;
	settings: TaskSettings;
	/** Key of this appearance in the run; the task id, or "<id>~<round>" in later rounds. */
	slot?: string;
	/** Pass through the set (0 = first). */
	round?: number;
}

/** `failed`: engine failure in a flawless race (a mistake was made). */
export type RunStatus = 'running' | 'finished' | 'timeUp' | 'aborted' | 'failed';

interface Current {
	/** Slot key of the task in this run (see RunTaskDef.slot). */
	taskId: string;
	presentation: number;
	/** Wrong attempts in this presentation. */
	wrong: number;
	timeouts: number;
	hintShown: boolean;
	solutionShown: boolean;
	choices?: number[];
	disabledChoices: number[];
	shownAt: number;
}

export interface RunState {
	v: 1;
	/** Missing in states stored before race modes existed (= normal). */
	mode?: RunMode;
	seed: number;
	rngCounter: number;
	startedAt: number;
	finishedAt?: number;
	status: RunStatus;
	settings: Settings;
	/** Tasks by slot key. */
	tasks: Record<string, RunTaskDef>;
	/** Number of tasks to solve in this run (every appearance counts, repeats for mistakes do not). */
	uniqueTasks: number;
	queue: string[];
	current: Current | null;
	done: number;
	total: number;
	presentations: Record<string, number>;
	requeues: Record<string, number>;
	firstTry: number;
	seq: number;
	timeline: [number, number][];
}

export interface AnswerEventDraft {
	taskId: string;
	taskSnapshot: TaskContent;
	family: string;
	seq: number;
	round: number;
	kind: 'answer' | 'timeout';
	given: string | null;
	correct: boolean;
	attempt: number;
	presentation: number;
	hintShown: boolean;
	solutionShown: boolean;
	ms: number | null;
	errorPattern: string | null;
}

export interface Feedback {
	outcome: 'correct' | 'wrong' | 'timeout' | 'ignored';
	/** Solved after the solution had been shown. */
	afterSolution?: boolean;
	/** Solved on the very first try. */
	firstTry?: boolean;
	/** The mistake ended a flawless race (engine failure). */
	failed?: boolean;
}

export interface StepResult {
	state: RunState;
	feedback: Feedback;
	events: AnswerEventDraft[];
}

export interface CurrentView {
	key: string;
	presentation: Presentation;
	answerFormat: 'keypad' | 'choice';
	wrong: number;
	hint: Hint | null;
	solution: string | null;
	disabledChoices: number[];
	taskTimeLimit: number;
	/** ms since the task was shown (for timers after reload). */
	shownElapsedMs: number;
}

export interface RunView {
	mode: RunMode;
	status: RunStatus;
	done: number;
	total: number;
	fraction: number;
	elapsedMs: number;
	uniqueTasks: number;
	current: CurrentView | null;
	result: RunResult | null;
}

export interface RunResult {
	stars: number;
	firstTry: number;
	tasks: number;
	done: number;
	durationMs: number;
}

const MAX_TIMEOUTS_BEFORE_SOLUTION = 2;

function random(state: RunState): () => number {
	state.rngCounter += 1;
	return rng(state.seed ^ (state.rngCounter * 0x9e3779b1));
}

export function pickTaskSettings(s: Settings): TaskSettings {
	return Object.fromEntries(TASK_LEVEL_KEYS.map((k) => [k, s[k]])) as TaskSettings;
}

/**
 * Race against the clock: the clock car is the only opponent.
 */
export function applyMode(settings: Settings, mode: RunMode): Settings {
	if (mode === 'time' && settings.targetTime <= 0) throw new Error('time race needs a target time');
	return settings;
}

/** Time limit of the whole run in seconds: the target time of the race against the clock. */
export function runTimeLimit(state: RunState): number {
	return state.mode === 'time' ? state.settings.targetTime : 0;
}

export function createRun(opts: {
	tasks: RunTaskDef[];
	settings: Settings;
	seed: number;
	now: number;
	mode?: RunMode;
}): RunState {
	if (opts.tasks.length === 0) throw new Error('run needs at least one task');
	const mode = opts.mode ?? 'normal';
	const settings = applyMode(opts.settings, mode);
	const state: RunState = {
		v: 1,
		mode,
		seed: opts.seed,
		rngCounter: 0,
		startedAt: opts.now,
		status: 'running',
		settings,
		tasks: {},
		uniqueTasks: 0,
		queue: [],
		current: null,
		done: 0,
		total: 0,
		presentations: {},
		requeues: {},
		firstTry: 0,
		seq: 0,
		timeline: [[0, 0]]
	};
	let list = opts.tasks;
	if (settings.order === 'shuffle') list = shuffle(list, random(state));
	if (settings.tasksPerRun > 0) list = list.slice(0, settings.tasksPerRun);
	// Practise all tasks several times: every pass gets its own slots.
	const slots: RunTaskDef[] = [];
	const rounds = Math.max(1, settings.rounds ?? 1);
	for (let r = 0; r < rounds; r++) {
		let pass = list;
		if (r > 0 && settings.order === 'shuffle') {
			pass = shuffle(list, random(state));
			// never the same task twice in a row at the border of two passes
			if (pass.length > 1 && pass[0].id === slots[slots.length - 1].id)
				pass = [...pass.slice(1), pass[0]];
		}
		for (const t of pass) slots.push({ ...t, slot: r === 0 ? t.id : `${t.id}~${r}`, round: r });
	}
	for (const t of slots) state.tasks[t.slot!] = t;
	state.queue = slots.map((t) => t.slot!);
	state.uniqueTasks = slots.length;
	state.total = slots.length;
	advance(state, opts.now);
	return state;
}

function fraction(state: RunState) {
	return state.total === 0 ? 0 : state.done / state.total;
}

function mark(state: RunState, now: number) {
	const f = Math.round(fraction(state) * 1000) / 1000;
	const last = state.timeline[state.timeline.length - 1];
	if (!last || last[1] !== f) state.timeline.push([now - state.startedAt, f]);
}

function advance(state: RunState, now: number) {
	const id = state.queue.shift();
	if (!id) {
		finish(state, now, 'finished');
		return;
	}
	const def = state.tasks[id];
	const presentation = (state.presentations[id] ?? 0) + 1;
	state.presentations[id] = presentation;
	let choices: number[] | undefined;
	if (def.settings.answerFormat === 'choice') {
		const fmt = formatOf(def.content);
		const r = random(state);
		const answer = Number(fmt.solution(def.content));
		const wrong = fmt.distractors(def.content, def.settings.choiceCount - 1, r);
		choices = shuffle([answer, ...wrong], r);
	}
	state.current = {
		taskId: id,
		presentation,
		wrong: 0,
		timeouts: 0,
		hintShown: false,
		solutionShown: false,
		choices,
		disabledChoices: [],
		shownAt: now
	};
}

function finish(state: RunState, now: number, status: RunStatus) {
	state.status = status;
	state.finishedAt = now;
	state.current = null;
	mark(state, now);
}

export function computeStars(firstTry: number, tasks: number, done: number, status: RunStatus) {
	if (status === 'aborted' || status === 'failed' || tasks === 0) return 0;
	if (status === 'timeUp' && done === 0) return 0;
	const ratio = firstTry / tasks;
	if (ratio >= 0.9) return 3;
	if (ratio >= 0.6) return 2;
	return 1;
}

/** Ends the run if the overall time limit is reached. */
export function tick(state: RunState, now: number): boolean {
	if (state.status !== 'running') return false;
	const limit = runTimeLimit(state);
	if (limit > 0 && now - state.startedAt >= limit * 1000) {
		finish(state, now, 'timeUp');
		return true;
	}
	return false;
}

function eventBase(
	state: RunState,
	cur: Current
): Omit<AnswerEventDraft, 'kind' | 'given' | 'correct' | 'ms' | 'errorPattern'> {
	const def = state.tasks[cur.taskId];
	state.seq += 1;
	return {
		taskId: def.id,
		taskSnapshot: def.content,
		round: def.round ?? 0,
		family: formatOf(def.content).family(def.content),
		seq: state.seq,
		attempt: cur.wrong + 1,
		presentation: cur.presentation,
		hintShown: cur.hintShown,
		solutionShown: cur.solutionShown
	};
}

function registerWrong(state: RunState, cur: Current) {
	const def = state.tasks[cur.taskId];
	cur.wrong += 1;
	if (cur.wrong >= def.settings.solutionAfter) cur.solutionShown = true;
	if (def.settings.hintAfter > 0 && cur.wrong >= def.settings.hintAfter) cur.hintShown = true;
}

export function answer(
	state: RunState,
	input: { key: string; value: string; ms: number | null },
	now: number
): StepResult {
	if (tick(state, now)) return { state, feedback: { outcome: 'ignored' }, events: [] };
	const cur = state.current;
	if (state.status !== 'running' || !cur || input.key !== currentKey(cur)) {
		return { state, feedback: { outcome: 'ignored' }, events: [] };
	}
	const def = state.tasks[cur.taskId];
	const fmt = formatOf(def.content);
	const value = input.value.trim().slice(0, 12);
	if (cur.choices && cur.disabledChoices.includes(Number(value))) {
		return { state, feedback: { outcome: 'ignored' }, events: [] };
	}
	const correct = fmt.check(def.content, value);
	const ms = input.ms === null ? null : Math.max(0, Math.min(Math.round(input.ms), 3_600_000));
	const event: AnswerEventDraft = {
		...eventBase(state, cur),
		kind: 'answer',
		given: value,
		correct,
		ms,
		errorPattern: correct ? null : fmt.errorPattern(def.content, value)
	};

	if (correct) {
		const firstTry = cur.presentation === 1 && cur.wrong === 0 && cur.timeouts === 0;
		if (firstTry) state.firstTry += 1;
		state.done += 1;
		const needsRepeat =
			state.settings.repeatWrong &&
			(cur.wrong > 0 || cur.solutionShown || cur.timeouts > 0) &&
			(state.requeues[cur.taskId] ?? 0) < 1;
		if (needsRepeat) {
			state.total += 1;
			state.queue.push(cur.taskId);
			state.requeues[cur.taskId] = (state.requeues[cur.taskId] ?? 0) + 1;
		}
		const afterSolution = cur.solutionShown;
		mark(state, now);
		advance(state, now);
		return { state, feedback: { outcome: 'correct', afterSolution, firstTry }, events: [event] };
	}

	if (isFlawlessMode(state.mode)) {
		finish(state, now, 'failed');
		return { state, feedback: { outcome: 'wrong', failed: true }, events: [event] };
	}

	if (cur.choices) cur.disabledChoices.push(Number(value));
	registerWrong(state, cur);
	return { state, feedback: { outcome: 'wrong' }, events: [event] };
}

export function timeout(state: RunState, input: { key: string }, now: number): StepResult {
	if (tick(state, now)) return { state, feedback: { outcome: 'ignored' }, events: [] };
	const cur = state.current;
	if (state.status !== 'running' || !cur || input.key !== currentKey(cur)) {
		return { state, feedback: { outcome: 'ignored' }, events: [] };
	}
	const def = state.tasks[cur.taskId];
	if (def.settings.taskTimeLimit <= 0 || cur.solutionShown) {
		return { state, feedback: { outcome: 'ignored' }, events: [] };
	}
	// Reject early timeouts (client clock tricks); allow 1s tolerance.
	if (now - cur.shownAt < def.settings.taskTimeLimit * 1000 - 1000) {
		return { state, feedback: { outcome: 'ignored' }, events: [] };
	}
	const event: AnswerEventDraft = {
		...eventBase(state, cur),
		kind: 'timeout',
		given: null,
		correct: false,
		ms: now - cur.shownAt,
		errorPattern: null
	};
	cur.timeouts += 1;
	if (def.settings.onTimeout === 'wrong') {
		if (isFlawlessMode(state.mode)) {
			finish(state, now, 'failed');
			return { state, feedback: { outcome: 'timeout', failed: true }, events: [event] };
		}
		registerWrong(state, cur);
		cur.shownAt = now;
	} else if (cur.timeouts >= MAX_TIMEOUTS_BEFORE_SOLUTION) {
		cur.solutionShown = true;
		cur.shownAt = now;
	} else {
		// Try again later: put the task back at the end of the queue.
		state.queue.push(cur.taskId);
		state.presentations[cur.taskId] -= 1;
		const timeouts = cur.timeouts;
		advance(state, now);
		// Keep the timeout count if the same task comes right back.
		if (state.current && state.current.taskId === cur.taskId) state.current.timeouts = timeouts;
	}
	return { state, feedback: { outcome: 'timeout' }, events: [event] };
}

export function abort(state: RunState, now: number): RunState {
	if (state.status === 'running') finish(state, now, 'aborted');
	return state;
}

function currentKey(cur: Current) {
	return `${cur.taskId}:${cur.presentation}:${cur.timeouts}`;
}

export function result(state: RunState): RunResult | null {
	if (state.status === 'running') return null;
	return {
		stars: computeStars(state.firstTry, state.uniqueTasks, state.done, state.status),
		firstTry: state.firstTry,
		tasks: state.uniqueTasks,
		done: state.done,
		durationMs: (state.finishedAt ?? state.startedAt) - state.startedAt
	};
}

export function view(state: RunState, now: number): RunView {
	const cur = state.current;
	let current: CurrentView | null = null;
	if (cur && state.status === 'running') {
		const def = state.tasks[cur.taskId];
		const fmt = formatOf(def.content);
		current = {
			key: currentKey(cur),
			presentation: { ...fmt.present(def.content), choices: cur.choices },
			answerFormat: def.settings.answerFormat,
			wrong: cur.wrong,
			hint: cur.hintShown || cur.solutionShown ? fmt.hint(def.content) : null,
			solution: cur.solutionShown ? fmt.solution(def.content) : null,
			disabledChoices: cur.disabledChoices,
			taskTimeLimit: cur.solutionShown ? 0 : def.settings.taskTimeLimit,
			shownElapsedMs: Math.max(0, now - cur.shownAt)
		};
	}
	return {
		mode: state.mode ?? 'normal',
		status: state.status,
		done: state.done,
		total: state.total,
		fraction: fraction(state),
		elapsedMs: (state.finishedAt ?? now) - state.startedAt,
		uniqueTasks: state.uniqueTasks,
		current,
		result: result(state)
	};
}
