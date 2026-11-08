/**
 * Task format abstraction.
 *
 * A format defines how a task is stored (content), presented, checked, which
 * hints and distractors exist and how errors are classified. Scenarios (e.g.
 * the race) only see the generic `Presentation` and never format internals.
 */

export type Op = '+' | '-' | '*' | ':';
export type Gap = 'result' | 'a' | 'b';

export interface ArithmeticContent {
	format: 'arithmetic';
	/** Optional expression; required unless `text` is given. */
	expr?: { a: number; op: Op; b: number; gap: Gap };
	/** Optional custom question text (e.g. a word problem). */
	text?: string;
	/** Expected answer (set by the teacher; prefilled from the expression). */
	answer: number;
	/** Optional manual wrong options for choice mode. */
	distractors?: number[];
	/** Optional custom hint text by the teacher. */
	hint?: string;
	/**
	 * Split of the second number for plus/minus tasks with a gap at the result:
	 * `show` draws the split, `fill` makes the child enter the two parts and then the result.
	 */
	decompose?: 'show' | 'fill';
}

/** Union of all task contents. New formats extend this union. */
export type TaskContent = ArithmeticContent;

export type TaskOrigin =
	{ kind: 'manual' } | { kind: 'generator'; generator: string; params: Record<string, unknown> };

export type HintVisual =
	| { kind: 'dots'; rows: number; cols: number }
	/** Tile field with 10 or 20 tiles, depending on the number range of the task. */
	| { kind: 'twenty'; size: 10 | 20; a: number; b: number; op: '+' | '-' };

export interface Hint {
	text: string;
	visual?: HintVisual;
}

/**
 * Role of a number in a plus/minus task, used for colours: first number blue (`a`),
 * second number and its decomposition red (`b`, `part`), everything else neutral.
 */
export type PartRole = 'a' | 'b' | 'result' | 'part';

export type PresentationPart =
	/** `split` draws the decomposition of this number below it. */
	| { kind: 'num'; value: string; role: PartRole; split?: [string, string] }
	| { kind: 'op'; value: string }
	| { kind: 'text'; value: string }
	/** The input slot of the current step. */
	| { kind: 'gap'; role: PartRole }
	/** An input slot of a later step. */
	| { kind: 'blank'; role: PartRole };

/** What the child sees. Contains no solution. */
export interface Presentation {
	/** Optional question text shown above the expression. */
	question?: string;
	/** Expression parts; `gap` marks the input slot. */
	parts: PresentationPart[];
	/** Text for speech synthesis. */
	speech: string;
	/** Answer options in choice mode. */
	choices?: number[];
}

/** How far the child is in a task with several steps. */
export interface StepProgress {
	step: number;
	/** Answers of the finished steps. */
	filled: string[];
}

export interface TaskFormat<C extends TaskContent = TaskContent> {
	id: C['format'];
	label: string;
	validate(content: unknown): { ok: true; content: C } | { ok: false; error: string };
	/** `progress` is only needed for tasks with several steps; with `step >= steps` the task is shown solved. */
	present(content: C, progress?: StepProgress): Omit<Presentation, 'choices'>;
	/** Number of answers the child has to give (1 for normal tasks). */
	steps(content: C): number;
	/** The expected answer of a step as a number. */
	expected(content: C, step?: number): number;
	/** The whole task with all answers filled in, e.g. "8 + 7 = 8 + 2 + 5 = 15". */
	solved(content: C): string;
	/** Short one-line label for lists, e.g. "3 · 5 = ?". */
	label1(content: C): string;
	check(content: C, given: string, step?: number): boolean;
	solution(content: C, step?: number): string;
	hint(content: C, step?: number): Hint | null;
	distractors(content: C, count: number, rng: () => number, step?: number): number[];
	errorPattern(content: C, given: string, step?: number): string | null;
	/** Grouping for analytics, e.g. "1x1 Kernaufgabe". */
	family(content: C): string;
}
