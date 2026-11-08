import { describe, expect, it } from 'vitest';
import { arithmetic, checkConsistency, computeResult, decomposition } from './arithmetic';
import type { ArithmeticContent } from './types';
import { rng } from '../random';

const mul = (a: number, b: number, gap: 'result' | 'a' | 'b' = 'result'): ArithmeticContent => ({
	format: 'arithmetic',
	expr: { a, op: '*', b, gap },
	answer: gap === 'a' ? a : gap === 'b' ? b : a * b
});

const add = (
	a: number,
	b: number,
	op: '+' | '-' = '+',
	gap: 'result' | 'a' | 'b' = 'result'
): ArithmeticContent => ({
	format: 'arithmetic',
	expr: { a, op, b, gap },
	answer: gap === 'a' ? a : gap === 'b' ? b : op === '+' ? a + b : a - b
});

describe('arithmetic format', () => {
	it('colours plus and minus: first number blue, second number red', () => {
		const plus = arithmetic.present(add(8, 7)).parts;
		expect(plus.filter((x) => x.kind === 'num').map((x) => x.role)).toEqual(['a', 'b']);
		const minus = arithmetic.present(add(15, 7, '-')).parts;
		expect(minus.filter((x) => x.kind === 'num').map((x) => x.role)).toEqual(['a', 'b']);
		// gap in place of the second number keeps its role (red underline)
		const gapB = arithmetic.present(add(8, 7, '+', 'b')).parts;
		expect(gapB.find((x) => x.kind === 'gap')).toEqual({ kind: 'gap', role: 'b' });
		const gapA = arithmetic.present(add(8, 7, '+', 'a')).parts;
		expect(gapA.find((x) => x.kind === 'gap')).toEqual({ kind: 'gap', role: 'a' });
	});

	it('validates and rejects invalid tasks', () => {
		expect(arithmetic.validate(mul(3, 5)).ok).toBe(true);
		expect(arithmetic.validate({ format: 'arithmetic', answer: 3 }).ok).toBe(false);
		expect(
			arithmetic.validate({
				format: 'arithmetic',
				expr: { a: 3, op: '-', b: 5, gap: 'result' },
				answer: 0
			}).ok
		).toBe(false);
		expect(
			arithmetic.validate({
				format: 'arithmetic',
				expr: { a: 7, op: ':', b: 2, gap: 'result' },
				answer: 3
			}).ok
		).toBe(false);
		expect(
			arithmetic.validate({ format: 'arithmetic', text: 'Wie viele Finger?', answer: 10 }).ok
		).toBe(true);
	});

	it('presents gaps correctly without revealing the answer', () => {
		const p = arithmetic.present(mul(3, 5, 'a'));
		expect(p.parts).toEqual([
			{ kind: 'gap', role: 'result' },
			{ kind: 'op', value: '·' },
			{ kind: 'num', value: '5', role: 'result' },
			{ kind: 'op', value: '=' },
			{ kind: 'num', value: '15', role: 'result' }
		]);
		expect(p.speech).toBe('Wie viel mal 5 ist gleich 15?');
		const q = arithmetic.present(mul(3, 5));
		expect(q.parts[0]).toEqual({ kind: 'num', value: '3', role: 'result' });
		expect(q.parts.at(-1)).toEqual({ kind: 'gap', role: 'result' });
		expect(q.speech).not.toContain('15');
	});

	it('checks answers tolerant to whitespace and leading zeros', () => {
		expect(arithmetic.check(mul(3, 5), ' 15 ')).toBe(true);
		expect(arithmetic.check(mul(3, 5), '015')).toBe(true);
		expect(arithmetic.check(mul(3, 5), '16')).toBe(false);
		expect(arithmetic.check(mul(3, 5), 'abc')).toBe(false);
	});

	it('uses the teacher-defined answer', () => {
		const c: ArithmeticContent = {
			format: 'arithmetic',
			text: 'Wie viele Beine hat ein Hund?',
			answer: 4
		};
		expect(arithmetic.check(c, '4')).toBe(true);
	});

	it('classifies typical errors', () => {
		expect(arithmetic.errorPattern(mul(6, 5), '35')).toBe('neighbor');
		expect(arithmetic.errorPattern(mul(6, 5), '11')).toBe('opConfusion');
		expect(arithmetic.errorPattern(mul(0, 5), '5')).toBe('zeroRule');
		expect(arithmetic.errorPattern(mul(3, 7), '12')).toBe('digitSwap');
		expect(arithmetic.errorPattern(mul(3, 5, 'a'), '15')).toBe('gapResult');
		expect(arithmetic.errorPattern(mul(3, 5), 'x')).toBe('invalid');
		expect(arithmetic.errorPattern(mul(3, 5), '15')).toBeNull();
	});

	it('creates plausible, unique distractors', () => {
		const d = arithmetic.distractors(mul(3, 5), 3, rng(1));
		expect(d).toHaveLength(3);
		expect(new Set(d).size).toBe(3);
		expect(d).not.toContain(15);
		expect(d.every((x) => x >= 0)).toBe(true);
	});

	it('prefers manual distractors', () => {
		const c = { ...mul(3, 5), distractors: [50, 51] };
		expect(arithmetic.distractors(c, 2, rng(1))).toEqual([50, 51]);
	});

	it('gives kernel-task hints for the 1x1 without the result', () => {
		const h = arithmetic.hint(mul(3, 5));
		expect(h?.text).toContain('Hälfte');
		expect(h?.text).not.toContain('15');
		expect(h?.visual).toEqual({ kind: 'dots', rows: 3, cols: 5 });
		expect(arithmetic.hint(mul(7, 6))?.text).toContain('5 · 6 + 2 · 6');
	});

	it('tile hint follows the number range: 10 tiles up to 10, 20 tiles up to 20', () => {
		const add = (a: number, b: number): ArithmeticContent => ({
			format: 'arithmetic',
			expr: { a, op: '+', b, gap: 'result' },
			answer: a + b
		});
		const sub = (a: number, b: number): ArithmeticContent => ({
			format: 'arithmetic',
			expr: { a, op: '-', b, gap: 'result' },
			answer: a - b
		});
		expect(arithmetic.hint(add(3, 4))?.visual).toMatchObject({ kind: 'twenty', size: 10 });
		expect(arithmetic.hint(sub(9, 4))?.visual).toMatchObject({ kind: 'twenty', size: 10 });
		expect(arithmetic.hint(add(7, 8))?.visual).toMatchObject({ kind: 'twenty', size: 20 });
		expect(arithmetic.hint(sub(15, 6))?.visual).toMatchObject({ kind: 'twenty', size: 20 });
		expect(arithmetic.hint(add(30, 8))?.visual).toBeUndefined();
	});

	it('custom hint overrides the text', () => {
		expect(arithmetic.hint({ ...mul(3, 5), hint: 'Denk an deine Hände!' })?.text).toBe(
			'Denk an deine Hände!'
		);
	});

	it('assigns analytic families', () => {
		expect(arithmetic.family(mul(3, 5))).toBe('1·1 Kernaufgabe');
		expect(arithmetic.family(mul(7, 8))).toBe('1·1 abgeleitet');
		expect(
			arithmetic.family({
				format: 'arithmetic',
				expr: { a: 8, op: '+', b: 5, gap: 'result' },
				answer: 13
			})
		).toBe('Plus ZR 20 mit Übergang');
	});

	it('computeResult enforces primary school rules', () => {
		expect(computeResult(3, '-', 5)).toBeNull();
		expect(computeResult(10, ':', 3)).toBeNull();
		expect(computeResult(10, ':', 0)).toBeNull();
		expect(computeResult(12, ':', 3)).toBe(4);
	});

	it('checkConsistency warns while the calculation does not add up', () => {
		const base = { a: 3, op: '*' as const, b: 5, gap: 'result' as const };
		expect(checkConsistency({ ...base, answer: 15 })).toEqual({ status: 'ok' });
		expect(checkConsistency({ ...base, answer: 16 })).toMatchObject({
			status: 'mismatch',
			correct: 15,
			message: '3 · 5 = 16 geht nicht auf.'
		});
		// gap in the first number: "? · 5 = 15" (a = 3). Answer 4 does not fit.
		expect(checkConsistency({ ...base, gap: 'a', answer: 3 })).toEqual({ status: 'ok' });
		expect(checkConsistency({ ...base, gap: 'a', answer: 4 })).toMatchObject({
			status: 'mismatch',
			correct: 3
		});
		expect(checkConsistency({ a: 3, op: '-', b: 5, gap: 'result', answer: 0 }).status).toBe(
			'invalid'
		);
		expect(checkConsistency({ a: 7, op: ':', b: 2, gap: 'result', answer: 3 }).status).toBe(
			'invalid'
		);
		expect(checkConsistency({ ...base, b: null, answer: 15 }).status).toBe('incomplete');
	});
});

describe('decomposition of the second number', () => {
	it('splits to the next ten or into tens and ones', () => {
		expect(decomposition(8, '+', 7)).toEqual([2, 5]);
		expect(decomposition(38, '+', 7)).toEqual([2, 5]);
		expect(decomposition(8, '+', 2)).toBeNull();
		expect(decomposition(5, '+', 3)).toBeNull();
		expect(decomposition(34, '+', 25)).toEqual([20, 5]);
		expect(decomposition(34, '+', 20)).toBeNull();
		expect(decomposition(15, '-', 7)).toEqual([5, 2]);
		expect(decomposition(13, '-', 5)).toEqual([3, 2]);
		expect(decomposition(20, '-', 7)).toBeNull();
		expect(decomposition(9, '-', 4)).toBeNull();
		expect(decomposition(57, '-', 25)).toEqual([20, 5]);
		expect(decomposition(3, '*', 5)).toBeNull();
	});

	const fill = (decompose: 'boxes' | 'equation' = 'equation'): ArithmeticContent => ({
		...add(8, 7),
		decompose
	});

	it('is dropped when the task has no usable split', () => {
		const v = arithmetic.validate({ ...add(8, 2), decompose: 'equation' });
		expect(v.ok && v.content.decompose).toBeUndefined();
		const w = arithmetic.validate({ ...add(8, 7, '+', 'b'), decompose: 'boxes' });
		expect(w.ok && w.content.decompose).toBeUndefined();
		const x = arithmetic.validate(fill());
		expect(x.ok && x.content.decompose).toBe('equation');
		const y = arithmetic.validate(fill('boxes'));
		expect(y.ok && y.content.decompose).toBe('boxes');
	});

	it('"equation" asks for the two parts and then the result in a second line', () => {
		const c = fill();
		expect(arithmetic.steps(c)).toBe(3);
		expect([0, 1, 2].map((i) => arithmetic.expected(c, i))).toEqual([2, 5, 15]);
		expect(arithmetic.check(c, '2', 0)).toBe(true);
		expect(arithmetic.check(c, '2', 1)).toBe(false);
		expect(arithmetic.solution(c, 2)).toBe('15');

		const kinds = (step: number, filled: string[]) =>
			arithmetic.present(c, { step, filled }).parts.map((p) => p.kind);
		expect(kinds(0, [])).toEqual([
			'num',
			'op',
			'num',
			'break',
			'op',
			'num',
			'op',
			'gap',
			'op',
			'blank',
			'op',
			'blank'
		]);
		expect(kinds(1, ['2'])).toEqual([
			'num',
			'op',
			'num',
			'break',
			'op',
			'num',
			'op',
			'num',
			'op',
			'gap',
			'op',
			'blank'
		]);
		const last = arithmetic.present(c, { step: 2, filled: ['2', '5'] }).parts;
		expect(last.at(-1)).toEqual({ kind: 'gap', role: 'result' });
		// the parts of the second number are red like the number itself
		expect(last[7]).toEqual({ kind: 'num', value: '2', role: 'part' });
		expect(last[9]).toEqual({ kind: 'num', value: '5', role: 'part' });
		expect(arithmetic.present(c, { step: 0, filled: [] }).speech).toBe(
			'Wie viel fehlt von 8 bis zum nächsten Zehner?'
		);
		expect(arithmetic.solved(c)).toBe('8 + 7 = 8 + 2 + 5 = 15');
	});

	it('"boxes" puts the two parts into boxes below the second number', () => {
		const c = fill('boxes');
		expect(arithmetic.steps(c)).toBe(3);
		expect([0, 1, 2].map((i) => arithmetic.expected(c, i))).toEqual([2, 5, 15]);
		const at = (step: number, filled: string[]) => arithmetic.present(c, { step, filled }).parts;
		expect(at(0, [])).toEqual([
			{ kind: 'num', value: '8', role: 'a' },
			{ kind: 'op', value: '+' },
			{
				kind: 'num',
				value: '7',
				role: 'b',
				split: [
					{ kind: 'gap', role: 'part' },
					{ kind: 'blank', role: 'part' }
				]
			},
			{ kind: 'op', value: '=' },
			{ kind: 'blank', role: 'result' }
		]);
		const last = at(2, ['2', '5']);
		expect(last[2]).toMatchObject({
			split: [
				{ kind: 'num', value: '2', role: 'part' },
				{ kind: 'num', value: '5', role: 'part' }
			]
		});
		expect(last.at(-1)).toEqual({ kind: 'gap', role: 'result' });
		expect(arithmetic.solved(c)).toBe('8 + 7 = 8 + 2 + 5 = 15');
	});

	it('gives a hint for every step and keeps the old hint for the result', () => {
		const c = fill();
		expect(arithmetic.hint(c, 0)?.visual).toMatchObject({ kind: 'twenty', a: 8, b: 7 });
		expect(arithmetic.hint(c, 1)?.text).toContain('Es bleiben 5');
		expect(arithmetic.hint(c, 2)?.text).toContain('Rechne erst bis 10');
		expect(arithmetic.distractors(c, 2, rng(1), 0)).toHaveLength(2);
		expect(arithmetic.distractors(c, 2, rng(1), 0)).not.toContain(2);
	});
});
