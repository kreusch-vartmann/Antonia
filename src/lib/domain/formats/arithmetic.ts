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
	TaskFormat
} from './types';

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
		hint: z.string().trim().max(500).optional()
	})
	.superRefine((c, ctx) => {
		if (!c.expr && !c.text) {
			ctx.addIssue({ code: 'custom', message: 'Rechenausdruck oder Fragetext erforderlich' });
		}
		if (c.expr) {
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

/** The mathematically expected answer for an expression with a gap. */
export function expectedAnswer(expr: { a: number; op: Op; b: number; gap: Gap }): number | null {
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
}): Consistency {
	const { a, op, b, gap, answer } = input;
	if (a === null || b === null || ![a, b].every((n) => Number.isFinite(n))) {
		return { status: 'incomplete' };
	}
	const r = computeResult(a, op, b);
	if (r === null) {
		return {
			status: 'invalid',
			message:
				op === ':'
					? `${a} : ${b} geht nicht ohne Rest auf (oder Teiler ist 0).`
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

function additionHint(a: number, op: '+' | '-', b: number, r: number): Hint {
	const max = Math.max(a, b, r);
	const within20 = max <= 20;
	const visual = within20
		? { kind: 'twenty' as const, size: max <= 10 ? (10 as const) : (20 as const), a, b, op }
		: undefined;
	if (op === '+') {
		if (within20 && a < 10 && r > 10) {
			return {
				text: `Rechne erst bis 10: ${a} + ${10 - a} = 10. Dann noch ${b - (10 - a)} dazu.`,
				visual
			};
		}
		if (b >= 10 && b % 10 !== 0) {
			const t = b - (b % 10);
			return { text: `Erst die Zehner: ${a} + ${t}. Dann die Einer: + ${b % 10}.`, visual };
		}
		return { text: `Lege erst ${a} Plättchen, dann ${b} dazu.`, visual };
	}
	if (within20 && a > 10 && r < 10) {
		return {
			text: `Rechne erst bis 10: ${a} − ${a - 10} = 10. Dann noch ${b - (a - 10)} weg.`,
			visual
		};
	}
	if (b >= 10 && b % 10 !== 0) {
		const t = b - (b % 10);
		return { text: `Erst die Zehner: ${a} − ${t}. Dann die Einer: − ${b % 10}.`, visual };
	}
	return { text: `Lege ${a} Plättchen und nimm ${b} weg.`, visual };
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
		return { ok: true, content: c };
	},

	present(c) {
		const parts: PresentationPart[] = [];
		let speech = c.text ? c.text + ' ' : '';
		if (c.expr) {
			const { a, op, b, gap } = c.expr;
			const r = computeResult(a, op, b) ?? c.answer;
			const s = OP_SYMBOL[op];
			const w = OP_WORD[op];
			// Only plus and minus are coloured (first number blue, second red).
			const coloured = op === '+' || op === '-';
			const roleA: PartRole = coloured ? 'a' : 'result';
			const roleB: PartRole = coloured ? 'b' : 'result';
			const num = (v: number, role: PartRole): PresentationPart => ({
				kind: 'num',
				value: String(v),
				role
			});
			const sym = (value: string): PresentationPart => ({ kind: 'op', value });
			if (gap === 'result') {
				parts.push(num(a, roleA), sym(s), num(b, roleB), sym('='), { kind: 'gap', role: 'result' });
				speech += `${a} ${w} ${b} ist gleich wie viel?`;
			} else if (gap === 'a') {
				parts.push({ kind: 'gap', role: roleA }, sym(s), num(b, roleB), sym('='), num(r, 'result'));
				speech += `Wie viel ${w} ${b} ist gleich ${r}?`;
			} else {
				parts.push(num(a, roleA), sym(s), { kind: 'gap', role: roleB }, sym('='), num(r, 'result'));
				speech += `${a} ${w} wie viel ist gleich ${r}?`;
			}
		} else {
			parts.push({ kind: 'gap', role: 'result' });
		}
		return { question: c.text, parts, speech: speech.trim() };
	},

	label1(c) {
		if (!c.expr) return c.text ?? '';
		const { a, op, b, gap } = c.expr;
		const r = computeResult(a, op, b) ?? c.answer;
		const s = OP_SYMBOL[op];
		const prefix = c.text ? '(Text) ' : '';
		if (gap === 'a') return `${prefix}? ${s} ${b} = ${r}`;
		if (gap === 'b') return `${prefix}${a} ${s} ? = ${r}`;
		return `${prefix}${a} ${s} ${b} = ?`;
	},

	check(c, given) {
		return parseGiven(given) === c.answer;
	},

	solution(c) {
		return String(c.answer);
	},

	hint(c) {
		const custom = c.hint?.trim();
		let auto: Hint | null = null;
		if (c.expr) {
			const { a, op, b, gap } = c.expr;
			const r = computeResult(a, op, b);
			if (r !== null) {
				if (op === '*') {
					auto =
						gap === 'result'
							? multiplicationHint(a, b)
							: { text: `Denke an die Geteiltaufgabe: ${r} : ${gap === 'a' ? b : a}.` };
				} else if (op === ':') {
					auto = { text: `Denke an die Malaufgabe: Welche Zahl mal ${b} ergibt ${a}?` };
					if (gap !== 'result') auto = { text: `Denke an die Malaufgabe: ${r} · ${b} = ${a}.` };
				} else if (gap === 'result') {
					auto = additionHint(a, op, b, r);
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
		return auto;
	},

	distractors(c, count, rng) {
		const x = c.answer;
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

	errorPattern(c, given) {
		const g = parseGiven(given);
		if (g === null) return 'invalid';
		const x = c.answer;
		if (g === x) return null;
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
		if (op === ':') return '1:1 Geteiltaufgabe';
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
	digitSwap: 'Zahlendreher'
};
