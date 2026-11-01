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

/** What the child sees. Contains no solution. */
export interface Presentation {
	/** Optional question text shown above the expression. */
	question?: string;
	/** Expression parts; `gap` marks the input slot. */
	parts: ({ kind: 'text'; value: string } | { kind: 'gap' })[];
	/** Text for speech synthesis. */
	speech: string;
	/** Answer options in choice mode. */
	choices?: number[];
}

export interface TaskFormat<C extends TaskContent = TaskContent> {
	id: C['format'];
	label: string;
	validate(content: unknown): { ok: true; content: C } | { ok: false; error: string };
	present(content: C): Omit<Presentation, 'choices'>;
	/** Short one-line label for lists, e.g. "3 · 5 = ?". */
	label1(content: C): string;
	check(content: C, given: string): boolean;
	solution(content: C): string;
	hint(content: C): Hint | null;
	distractors(content: C, count: number, rng: () => number): number[];
	errorPattern(content: C, given: string): string | null;
	/** Grouping for analytics, e.g. "1x1 Kernaufgabe". */
	family(content: C): string;
}
