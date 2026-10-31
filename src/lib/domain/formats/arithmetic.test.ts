import { describe, expect, it } from 'vitest';
import { arithmetic, computeResult } from './arithmetic';
import type { ArithmeticContent } from './types';
import { rng } from '../random';

const mul = (a: number, b: number, gap: 'result' | 'a' | 'b' = 'result'): ArithmeticContent => ({
	format: 'arithmetic',
	expr: { a, op: '*', b, gap },
	answer: gap === 'a' ? a : gap === 'b' ? b : a * b
});

describe('arithmetic format', () => {
	it('validates and rejects invalid tasks', () => {
		expect(arithmetic.validate(mul(3, 5)).ok).toBe(true);
		expect(arithmetic.validate({ format: 'arithmetic', answer: 3 }).ok).toBe(false);
		expect(
			arithmetic.validate({ format: 'arithmetic', expr: { a: 3, op: '-', b: 5, gap: 'result' }, answer: 0 }).ok
		).toBe(false);
		expect(
			arithmetic.validate({ format: 'arithmetic', expr: { a: 7, op: ':', b: 2, gap: 'result' }, answer: 3 }).ok
		).toBe(false);
		expect(arithmetic.validate({ format: 'arithmetic', text: 'Wie viele Finger?', answer: 10 }).ok).toBe(
			true
		);
	});

	it('presents gaps correctly without revealing the answer', () => {
		const p = arithmetic.present(mul(3, 5, 'a'));
		expect(p.parts).toEqual([{ kind: 'gap' }, { kind: 'text', value: '· 5 = 15' }]);
		expect(p.speech).toBe('Wie viel mal 5 ist gleich 15?');
		const q = arithmetic.present(mul(3, 5));
		expect(q.parts[0]).toEqual({ kind: 'text', value: '3 · 5 =' });
		expect(q.speech).not.toContain('15');
	});

	it('checks answers tolerant to whitespace and leading zeros', () => {
		expect(arithmetic.check(mul(3, 5), ' 15 ')).toBe(true);
		expect(arithmetic.check(mul(3, 5), '015')).toBe(true);
		expect(arithmetic.check(mul(3, 5), '16')).toBe(false);
		expect(arithmetic.check(mul(3, 5), 'abc')).toBe(false);
	});

	it('uses the teacher-defined answer', () => {
		const c: ArithmeticContent = { format: 'arithmetic', text: 'Wie viele Beine hat ein Hund?', answer: 4 };
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

	it('custom hint overrides the text', () => {
		expect(arithmetic.hint({ ...mul(3, 5), hint: 'Denk an deine Hände!' })?.text).toBe(
			'Denk an deine Hände!'
		);
	});

	it('assigns analytic families', () => {
		expect(arithmetic.family(mul(3, 5))).toBe('1·1 Kernaufgabe');
		expect(arithmetic.family(mul(7, 8))).toBe('1·1 abgeleitet');
		expect(
			arithmetic.family({ format: 'arithmetic', expr: { a: 8, op: '+', b: 5, gap: 'result' }, answer: 13 })
		).toBe('Plus ZR 20 mit Übergang');
	});

	it('computeResult enforces primary school rules', () => {
		expect(computeResult(3, '-', 5)).toBeNull();
		expect(computeResult(10, ':', 3)).toBeNull();
		expect(computeResult(10, ':', 0)).toBeNull();
		expect(computeResult(12, ':', 3)).toBe(4);
	});
});
