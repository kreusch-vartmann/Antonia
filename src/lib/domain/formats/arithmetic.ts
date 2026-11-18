/**
 * Format "arithmetic": basic arithmetic (+, −, ·, :) with an optional gap,
 * optional question text and a teacher-defined answer.
 */
import { z } from 'zod';
import type {
	ArithmeticContent,
	Gap,
	Hint,
	Op,
	PartRole,
	PresentationPart,
	SlotPart,
	StepProgress,
	TaskFormat
} from './types';
import { fieldSize } from '../visuals';

export const OP_SYMBOL: Record<Op, string> = { '+': '+', '-': '−', '*': '·', ':': ':' };
const OP_WORD: Record<Op, string> = { '+': 'plus', '-': 'minus', '*': 'mal', ':': 'geteilt durch' };
export const OP_LABEL: Record<Op, string> = {
	'+': 'Plus',
	'-': 'Minus',
	'*': 'Mal',
	':': 'Geteilt'
};

const MAX = 100_000;
const int = z.number().int().min(0).max(MAX);

export const arithmeticSchema = z
	.object({
		format: z.literal('arithmetic'),
		expr: z
			.object({
				a: int,
				op: z.enum(['+', '-', '*', ':']),
				b: int,
				gap: z.enum(['result', 'a', 'b'])
			})
			.optional(),
		text: z.string().trim().max(500).optional(),
		answer: int,
		distractors: z.array(int).max(6).optional(),
		hint: z.string().trim().max(500).optional(),
		decompose: z.enum(['boxes', 'equation']).optional(),
		withRemainder: z.boolean().optional()
	})
	.superRefine((c, ctx) => {
		if (!c.expr && !c.text) {
			ctx.addIssue({ code: 'custom', message: 'Rechenausdruck oder Fragetext erforderlich' });
		}
		if (
			c.withRemainder &&
			(!c.expr || c.expr.op !== ':' || c.expr.gap !== 'result' || c.expr.b === 0)
		) {
			ctx.addIssue({
				code: 'custom',
				message: 'Rest gibt es nur bei Geteiltaufgaben, bei denen das Ergebnis gesucht ist.'
			});
		} else if (c.expr && !c.withRemainder) {
			const r = computeResult(c.expr.a, c.expr.op, c.expr.b);
			if (r === null) {
				ctx.addIssue({
					code: 'custom',
					message:
						c.expr.op === ':'
							? 'Geteiltaufgabe muss ohne Rest aufgehen (und nicht durch 0)'
							: 'Ergebnis darf nicht negativ sein'
				});
			}
		}
	});

/** a op b, or null if not a valid primary-school task (negative / remainder). */
export function computeResult(a: number, op: Op, b: number): number | null {
	switch (op) {
		case '+':
			return a + b;
		case '-':
			return a - b >= 0 ? a - b : null;
		case '*':
			return a * b;
		case ':':
			return b !== 0 && a % b === 0 ? a / b : null;
	}
}

/** Quotient and remainder of a : b, or null for b = 0. */
export function divide(a: number, b: number): { q: number; r: number } | null {
	return b > 0 ? { q: Math.floor(a / b), r: a % b } : null;
}

/** The mathematically expected answer for an expression with a gap (the quotient with remainder). */
export function expectedAnswer(
	expr: { a: number; op: Op; b: number; gap: Gap },
	withRemainder = false
): number | null {
	if (withRemainder && expr.op === ':' && expr.gap === 'result')
		return divide(expr.a, expr.b)?.q ?? null;
	if (expr.gap === 'a') return expr.a;
	if (expr.gap === 'b') return expr.b;
	return computeResult(expr.a, expr.op, expr.b);
}

export type Consistency =
	| { status: 'ok' }
	| { status: 'incomplete' }
	| { status: 'invalid'; message: string }
	| { status: 'mismatch'; message: string; correct: number };

/**
 * Checks whether an expression with a gap and a teacher-entered answer is
 * arithmetically consistent, e.g. "3 · 5 = 16" is not.
 * Used by the editors to warn until the teacher has corrected the values.
 */
export function checkConsistency(input: {
	a: number | null;
	op: Op;
	b: number | null;
	gap: Gap;
	answer: number | null;
	withRemainder?: boolean;
}): Consistency {
	const { a, op, b, gap, answer } = input;
	if (a === null || b === null || ![a, b].every((n) => Number.isFinite(n))) {
		return { status: 'incomplete' };
	}
	if (input.withRemainder && op === ':') {
		const d = gap === 'result' ? divide(a, b) : null;
		if (!d) {
			return {
				status: 'invalid',
				message:
					gap !== 'result'
						? 'Rest gibt es nur, wenn das Ergebnis gesucht ist.'
						: `${a} : ${b} geht nicht (Teiler ist 0).`
			};
		}
		if (answer === null || !Number.isFinite(answer)) return { status: 'incomplete' };
		if (answer === d.q) return { status: 'ok' };
		return {
			status: 'mismatch',
			correct: d.q,
			message: `${a} : ${b} = ${d.q} Rest ${d.r}, nicht ${answer}.`
		};
	}
	const r = computeResult(a, op, b);
	if (r === null) {
		return {
			status: 'invalid',
			message:
				op === ':'
					? `${a} : ${b} geht nicht ohne Rest auf (oder Teiler ist 0). Mit „mit Rest“ ist es möglich.`
					: `${a} − ${b} ergäbe eine negative Zahl.`
		};
	}
	if (answer === null || !Number.isFinite(answer)) return { status: 'incomplete' };
	const A = gap === 'a' ? answer : a;
	const B = gap === 'b' ? answer : b;
	const R = gap === 'result' ? answer : r;
	const filled = computeResult(A, op, B);
	if (filled === R) return { status: 'ok' };
	const s = OP_SYMBOL[op];
	return {
		status: 'mismatch',
		correct: expectedAnswer({ a, op, b, gap }) ?? r,
		message: `${A} ${s} ${B} = ${R} geht nicht auf.`
	};
}

function parseGiven(given: string): number | null {
	const t = given.trim();
	if (!/^\d{1,6}$/.test(t)) return null;
	return Number(t);
}

function reverseDigits(n: number) {
	return Number(String(n).split('').reverse().join(''));
}

const KERNEL = [1, 2, 5, 10];

function multiplicationHint(a: number, b: number): Hint {
	const visual =
		a <= 10 && b <= 10 && a > 0 && b > 0 ? { kind: 'dots' as const, rows: a, cols: b } : undefined;
	if (a === 0 || b === 0) return { text: 'Mal 0 ergibt immer 0.', visual };
	if (a === 1 || b === 1) {
		const other = a === 1 ? b : a;
		return { text: `1 mal eine Zahl ist die Zahl selbst: 1 · ${other} = ${other} · 1.`, visual };
	}
	if (a === 10 || b === 10) {
		const other = a === 10 ? b : a;
		return { text: `Mal 10: Hänge an die ${other} eine 0 an.`, visual };
	}
	if (a === 5 || b === 5) {
		const other = a === 5 ? b : a;
		return { text: `${a} · ${b} ist die Hälfte von ${other} · 10.`, visual };
	}
	if (a === 2 || b === 2) {
		const other = a === 2 ? b : a;
		return { text: `Mal 2 heißt verdoppeln: ${other} + ${other}.`, visual };
	}
	// Derive from a kernel task using the first factor.
	const n = b;
	const derive: Record<number, string> = {
		3: `3 · ${n} = 2 · ${n} + 1 · ${n}`,
		4: `4 · ${n} = 2 · ${n} + 2 · ${n}`,
		6: `6 · ${n} = 5 · ${n} + 1 · ${n}`,
		7: `7 · ${n} = 5 · ${n} + 2 · ${n}`,
		8: `8 · ${n} = 10 · ${n} − 2 · ${n}`,
		9: `9 · ${n} = 10 · ${n} − 1 · ${n}`
	};
	if (derive[a]) return { text: `Nutze eine Kernaufgabe: ${derive[a]}`, visual };
	return { text: `Zerlege die Aufgabe in leichtere Malaufgaben.`, visual };
}

function fieldVisual(a: number, op: Op, b: number): Hint['visual'] {
	if ((op !== '+' && op !== '-') || fieldSize(a, op, b) === null) return undefined;
	return { kind: 'field', a, b, op };
}

/** Plus/minus with a number over 100: no automatic hint. */
function noAutoHint(a: number, op: Op, b: number): boolean {
	if (op !== '+' && op !== '-') return false;
	const r = computeResult(a, op, b);
	return r !== null && Math.max(a, b, r) > 100;
}

/** Plus/minus hint: only the picture, no explaining text. */
function additionHint(a: number, op: '+' | '-', b: number): Hint | null {
	const visual = fieldVisual(a, op, b);
	return visual ? { text: '', visual } : null;
}

/**
 * Split of the second number for stepwise calculation, or null if not meaningful:
 * 8 + 7 → 2 | 5 (to the next ten), 34 + 25 → 20 | 5 (tens and ones), 15 − 7 → 5 | 2.
 */
export function decomposition(a: number, op: Op, b: number): [number, number] | null {
	if (op !== '+' && op !== '-') return null;
	if (b >= 10 && b % 10 !== 0) return [b - (b % 10), b % 10];
	if (b < 10 && op === '+') {
		const toTen = 10 - (a % 10);
		if (a % 10 !== 0 && b > toTen) return [toTen, b - toTen];
	}
	if (b < 10 && op === '-') {
		const ones = a % 10;
		if (a >= 10 && ones > 0 && b > ones) return [ones, b - ones];
	}
	return null;
}

/** The split that applies to this task, if it has a usable `decompose` setting. */
function splitOf(c: ArithmeticContent): [number, number] | null {
	if (!c.decompose || !c.expr || c.expr.gap !== 'result') return null;
	return decomposition(c.expr.a, c.expr.op, c.expr.b);
}

/** Quotient and remainder if this is a division with remainder. */
function remainderOf(c: ArithmeticContent): { q: number; r: number } | null {
	if (!c.withRemainder || !c.expr || c.expr.op !== ':' || c.expr.gap !== 'result') return null;
	return divide(c.expr.a, c.expr.b);
}

function stepCount(c: ArithmeticContent): number {
	if (remainderOf(c)) return 2;
	return splitOf(c) ? 3 : 1;
}

function expectedAt(c: ArithmeticContent, step = 0): number {
	const rem = remainderOf(c);
	if (rem) return step >= 1 ? rem.r : rem.q;
	const split = stepCount(c) === 3 ? splitOf(c) : null;
	if (!split) return c.answer;
	return [split[0], split[1], c.answer][Math.min(Math.max(step, 0), 2)];
}

/** Hint for the first two steps of a decomposed task: only the picture. */
function stepHint(c: ArithmeticContent): Hint | null {
	const { a, op, b } = c.expr!;
	if (remainderOf(c)) return { text: `Welche Zahl mal ${b} ist höchstens ${a}?` };
	const visual = fieldVisual(a, op, b);
	return visual ? { text: '', visual } : null;
}

function stepSpeech(c: ArithmeticContent, step: number): string {
	const { a, op, b } = c.expr!;
	const w = OP_WORD[op];
	if (remainderOf(c)) {
		return step === 0
			? `${a} geteilt durch ${b}. Wie oft passt die ${b} hinein?`
			: 'Welcher Rest bleibt?';
	}
	if (step >= 2) return `${a} ${w} ${b} ist gleich wie viel?`;
	if (b >= 10)
		return step === 0
			? `Welche Zehnerzahl steckt in der ${b}?`
			: `Und wie viele Einer hat die ${b}?`;
	if (op === '+')
		return step === 0
			? `Wie viel fehlt von ${a} bis zum nächsten Zehner?`
			: `Wie viel von der ${b} bleibt dann übrig?`;
	return step === 0
		? `Wie viel musst du von ${a} abziehen, um auf den Zehner zu kommen?`
		: `Wie viel von der ${b} musst du dann noch abziehen?`;
}

function presentArithmetic(c: ArithmeticContent, progress?: StepProgress) {
	const parts: PresentationPart[] = [];
	const steps = stepCount(c);
	const step = progress?.step ?? 0;
	const solved = !!progress && step >= steps;
	let speech = c.text ? c.text + ' ' : '';
	// Only plus and minus are coloured (first number blue, second red).
	const coloured = !!c.expr && (c.expr.op === '+' || c.expr.op === '-');
	const roleA: PartRole = coloured ? 'a' : 'result';
	const roleB: PartRole = coloured ? 'b' : 'result';
	const num = (v: number | string, role: PartRole): SlotPart => ({
		kind: 'num',
		value: String(v),
		role
	});
	const sym = (value: string): PresentationPart => ({ kind: 'op', value });
	/** The input slot: a gap now, the number when solved. */
	const slot = (role: PartRole, value: number): SlotPart =>
		solved ? num(value, role) : { kind: 'gap', role };

	if (c.expr) {
		const { a, op, b, gap } = c.expr;
		const r = computeResult(a, op, b) ?? c.answer;
		const s = OP_SYMBOL[op];
		const w = OP_WORD[op];
		const split = splitOf(c);
		const roles: PartRole[] = steps === 2 ? ['result', 'result'] : ['part', 'part', 'result'];
		// one slot after the other: finished steps as numbers, the current one as a gap
		const cell = (i: number): SlotPart => {
			if (i < step || solved) return num(progress?.filled[i] ?? expectedAt(c, i), roles[i]);
			return i === step ? { kind: 'gap', role: roles[i] } : { kind: 'blank', role: roles[i] };
		};
		if (steps === 2 && remainderOf(c)) {
			// 17 : 5 = □ R □
			parts.push(num(a, roleA), sym(s), num(b, roleB), sym('='), cell(0), sym('R'), cell(1));
			speech += solved ? '' : stepSpeech(c, Math.min(step, 1));
		} else if (gap === 'result' && steps === 3 && split) {
			if (c.decompose === 'boxes') {
				// 8 + 7 = □, the parts of the 7 in boxes below it
				parts.push(
					num(a, roleA),
					sym(s),
					{ kind: 'num', value: String(b), role: roleB, split: [cell(0), cell(1)] },
					sym('='),
					cell(2)
				);
			} else {
				// 8 + 7
				// = 8 + □ + □ = □
				parts.push(
					num(a, roleA),
					sym(s),
					num(b, roleB),
					{ kind: 'break' },
					sym('='),
					num(a, roleA),
					sym(s),
					cell(0),
					sym(s),
					cell(1),
					sym('='),
					cell(2)
				);
			}
			speech += solved ? '' : stepSpeech(c, Math.min(step, 2));
		} else if (gap === 'result') {
			parts.push(num(a, roleA), sym(s), num(b, roleB), sym('='), slot('result', c.answer));
			speech += `${a} ${w} ${b} ist gleich wie viel?`;
		} else if (gap === 'a') {
			parts.push(slot(roleA, a), sym(s), num(b, roleB), sym('='), num(r, 'result'));
			speech += `Wie viel ${w} ${b} ist gleich ${r}?`;
		} else {
			parts.push(num(a, roleA), sym(s), slot(roleB, b), sym('='), num(r, 'result'));
			speech += `${a} ${w} wie viel ist gleich ${r}?`;
		}
	} else {
		parts.push(slot('result', c.answer));
	}
	return { question: c.text, parts, speech: speech.trim() };
}

export const arithmetic: TaskFormat<ArithmeticContent> = {
	id: 'arithmetic',
	label: 'Rechenaufgabe',

	validate(content) {
		const parsed = arithmeticSchema.safeParse(content);
		if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'ungültig' };
		const c = parsed.data as ArithmeticContent;
		if (c.distractors) c.distractors = [...new Set(c.distractors)].filter((d) => d !== c.answer);
		if (!c.text) delete c.text;
		if (!c.hint) delete c.hint;
		if (c.decompose && !splitOf(c)) delete c.decompose;
		if (!c.withRemainder) delete c.withRemainder;
		return { ok: true, content: c };
	},

	present(c, progress) {
		return presentArithmetic(c, progress);
	},

	steps(c) {
		return stepCount(c);
	},

	expected(c, step = 0) {
		return expectedAt(c, step);
	},

	solved(c) {
		const rem = remainderOf(c);
		if (rem && c.expr) return `${c.expr.a} : ${c.expr.b} = ${rem.q} R ${rem.r}`;
		const split = splitOf(c);
		if (c.expr && split) {
			const { a, op, b } = c.expr;
			const s = OP_SYMBOL[op];
			return `${a} ${s} ${b} = ${a} ${s} ${split[0]} ${s} ${split[1]} = ${c.answer}`;
		}
		return presentArithmetic(c, { step: 1, filled: [] })
			.parts.map((p) =>
				p.kind === 'blank' || p.kind === 'gap' ? '_' : 'value' in p ? p.value : ''
			)
			.join(' ');
	},

	label1(c) {
		if (!c.expr) return c.text ?? '';
		const { a, op, b, gap } = c.expr;
		const r = computeResult(a, op, b) ?? c.answer;
		const s = OP_SYMBOL[op];
		const prefix = c.text ? '(Text) ' : '';
		if (remainderOf(c)) return `${prefix}${a} : ${b} = ? R ?`;
		if (gap === 'a') return `${prefix}? ${s} ${b} = ${r}`;
		if (gap === 'b') return `${prefix}${a} ${s} ? = ${r}`;
		return `${prefix}${a} ${s} ${b} = ?`;
	},

	check(c, given, step = 0) {
		return parseGiven(given) === expectedAt(c, step);
	},

	solution(c, step = 0) {
		return String(expectedAt(c, step));
	},

	hint(c, step = 0) {
		const n = stepCount(c);
		const custom = c.hint?.trim();
		let auto: Hint | null = null;
		if (n > 1 && step < n - 1) {
			auto = stepHint(c);
			if (custom) return { text: custom, visual: auto?.visual };
			return auto;
		}
		const rem = remainderOf(c);
		if (rem && c.expr) {
			auto = { text: `Rechne ${c.expr.a} − ${rem.q} · ${c.expr.b}.` };
		} else if (c.expr) {
			const { a, op, b, gap } = c.expr;
			const r = computeResult(a, op, b);
			if (r !== null && !noAutoHint(a, op, b)) {
				if (op === '*') {
					auto =
						gap === 'result'
							? multiplicationHint(a, b)
							: { text: `Denke an die Geteiltaufgabe: ${r} : ${gap === 'a' ? b : a}.` };
				} else if (op === ':') {
					auto = { text: `Denke an die Malaufgabe: Welche Zahl mal ${b} ergibt ${a}?` };
					if (gap !== 'result') auto = { text: `Denke an die Malaufgabe: ${r} · ${b} = ${a}.` };
				} else if (gap === 'result') {
					auto = additionHint(a, op as '+' | '-', b);
				} else {
					auto = {
						text:
							op === '+'
								? `Denke an die Umkehraufgabe mit Minus.`
								: `Denke an die Umkehraufgabe mit Plus.`
					};
				}
			}
		}
		if (custom) return { text: custom, visual: auto?.visual };
		return auto && (auto.text || auto.visual) ? auto : null;
	},

	distractors(c, count, rng, step = 0) {
		const n = stepCount(c);
		const x = expectedAt(c, step);
		const rem = remainderOf(c);
		if (rem && step === 1 && c.expr) {
			// the remainder is always smaller than the divisor
			const pool = Array.from({ length: c.expr.b }, (_, i) => i)
				.filter((d) => d !== x)
				.sort((p, q) => Math.abs(p - x) - Math.abs(q - x))
				.slice(0, Math.max(count + 2, 4));
			for (let i = pool.length - 1; i > 0; i--) {
				const j = Math.floor(rng() * (i + 1));
				[pool[i], pool[j]] = [pool[j], pool[i]];
			}
			return pool.slice(0, count);
		}
		if (n > 1 && step < n - 1) {
			// intermediate step: plausible numbers around the expected one
			const near = [x + 1, x - 1, x + 2, x - 2, x + 3, x + 10].filter((d) => d >= 0 && d !== x);
			const pool = near.slice(0, Math.max(count + 2, 4));
			for (let i = pool.length - 1; i > 0; i--) {
				const j = Math.floor(rng() * (i + 1));
				[pool[i], pool[j]] = [pool[j], pool[i]];
			}
			return pool.slice(0, count);
		}
		const manual = (c.distractors ?? []).filter((d) => d !== x);
		const cands: number[] = [];
		if (c.expr && c.expr.gap === 'result') {
			const { a, op, b } = c.expr;
			if (op === '*') cands.push(x + b, x - b, x + a, x - a, a + b);
			if (op === '+') cands.push(Math.abs(a - b));
			if (op === '-') cands.push(a + b);
			if (op === ':') cands.push(x + 1, x - 1);
		}
		cands.push(x + 1, x - 1);
		if (x >= 10) cands.push(x + 10, x - 10, reverseDigits(x));
		cands.push(x + 2, x - 2, x + 3);
		const auto = [...new Set(cands)].filter((d) => d >= 0 && d !== x && !manual.includes(d));
		// Keep the most plausible candidates, then randomise among them.
		const pool = auto.slice(0, Math.max(count + 2, 5));
		for (let i = pool.length - 1; i > 0; i--) {
			const j = Math.floor(rng() * (i + 1));
			[pool[i], pool[j]] = [pool[j], pool[i]];
		}
		return [...manual, ...pool].slice(0, count);
	},

	errorPattern(c, given, step = 0) {
		const g = parseGiven(given);
		if (g === null) return 'invalid';
		const x = expectedAt(c, step);
		if (g === x) return null;
		if (remainderOf(c) && step === 1 && c.expr && g >= c.expr.b) return 'remainderTooBig';
		const n = stepCount(c);
		if (n > 1 && step < n - 1) {
			// intermediate step: only the simple patterns
			if (Math.abs(g - x) === 1) return 'offByOne';
			if (Math.abs(g - x) === 10) return 'offByTen';
			return null;
		}
		if (c.expr) {
			const { a, op, b, gap } = c.expr;
			const r = computeResult(a, op, b);
			if (gap !== 'result' && r !== null && g === r) return 'gapResult';
			if (gap === 'result') {
				if (op === '*') {
					if ((a === 0 || b === 0) && (g === a || g === b)) return 'zeroRule';
					if ([(a - 1) * b, (a + 1) * b, a * (b - 1), a * (b + 1)].includes(g)) return 'neighbor';
					if (g === a + b) return 'opConfusion';
				}
				if (op === '+' && g === Math.abs(a - b)) return 'opConfusion';
				if (op === '-' && g === a + b) return 'opConfusion';
				if (op === ':' && (g === a * b || g === a - b)) return 'opConfusion';
			}
		}
		if (Math.abs(g - x) === 1) return 'offByOne';
		if (Math.abs(g - x) === 10) return 'offByTen';
		if (x >= 10 && reverseDigits(g) === x) return 'digitSwap';
		return null;
	},

	family(c) {
		if (!c.expr) return 'Textaufgabe';
		const { a, op, b } = c.expr;
		if (op === '*') {
			if (a === 0 || b === 0) return '1·1 mit 0';
			if (KERNEL.includes(a) || KERNEL.includes(b)) return '1·1 Kernaufgabe';
			if (a === b) return '1·1 Quadratzahl';
			return '1·1 abgeleitet';
		}
		if (op === ':') return c.withRemainder ? '1:1 mit Rest' : '1:1 Geteiltaufgabe';
		const r = computeResult(a, op, b) ?? 0;
		const max = Math.max(a, b, r);
		const zr = max <= 10 ? 10 : max <= 20 ? 20 : max <= 100 ? 100 : 1000;
		const crosses = op === '+' ? (a % 10) + (b % 10) >= 10 : a % 10 < b % 10;
		return `${OP_LABEL[op]} ZR ${zr}${zr > 10 ? (crosses ? ' mit Übergang' : ' ohne Übergang') : ''}`;
	}
};

export const ERROR_PATTERN_LABELS: Record<string, string> = {
	invalid: 'keine Zahl',
	gapResult: 'Ergebnis statt Lücke eingesetzt',
	zeroRule: 'Regel „mal 0“ nicht beachtet',
	neighbor: 'Nachbaraufgabe (eine Reihe daneben)',
	opConfusion: 'Rechenart verwechselt',
	offByOne: 'um 1 daneben (verzählt?)',
	offByTen: 'um 10 daneben (Zehner?)',
	digitSwap: 'Zahlendreher',
	remainderTooBig: 'Rest zu groß (nicht kleiner als der Teiler)'
};
