import { describe, expect, it } from 'vitest';
import { classifySet, crossesHundred, crossesTen, RANGE_ORDER } from './numberRange';
import type { ArithmeticContent, Op } from './formats/types';
import { computeResult } from './formats/arithmetic';

const t = (a: number, op: Op, b: number): ArithmeticContent => ({
	format: 'arithmetic',
	expr: { a, op, b, gap: 'result' },
	answer: computeResult(a, op, b) ?? 0
});

describe('number range of a set', () => {
	it('finds the range and the transition', () => {
		expect(classifySet([])).toBe('empty');
		expect(classifySet([t(2, '+', 3), t(6, '-', 1)])).toBe('zr6');
		expect(classifySet([t(4, '+', 5), t(10, '-', 3)])).toBe('zr10');
		expect(classifySet([t(12, '+', 5), t(17, '-', 4)])).toBe('zr20-without');
		expect(classifySet([t(8, '+', 7), t(12, '+', 5)])).toBe('zr20-with');
		expect(classifySet([t(15, '-', 7)])).toBe('zr20-with');
		expect(classifySet([t(34, '+', 25), t(60, '-', 30)])).toBe('zr100-without');
		expect(classifySet([t(38, '+', 25)])).toBe('zr100-with');
		expect(classifySet([t(300, '+', 400)])).toBe('zr1000-without');
		expect(classifySet([t(180, '+', 70)])).toBe('zr1000-with');
		expect(classifySet([t(1500, '+', 70)])).toBe('other');
	});

	it('recognises times tables, divisions and mixtures', () => {
		expect(classifySet([t(3, '*', 5), t(2, '*', 5)])).toBe('mult');
		expect(classifySet([t(15, ':', 5)])).toBe('div');
		expect(classifySet([t(3, '*', 5), t(15, ':', 5)])).toBe('multdiv');
		expect(classifySet([t(3, '*', 5), t(2, '+', 5)])).toBe('mixed');
		expect(classifySet([{ format: 'arithmetic', text: 'Wie viele?', answer: 3 }])).toBe('other');
	});

	it('detects ten and hundred transitions', () => {
		expect(crossesTen(8, '+', 7)).toBe(true);
		expect(crossesTen(12, '+', 5)).toBe(false);
		expect(crossesTen(15, '-', 7)).toBe(true);
		expect(crossesTen(17, '-', 4)).toBe(false);
		expect(crossesHundred(80, '+', 50)).toBe(true);
		expect(crossesHundred(130, '-', 50)).toBe(true);
		expect(crossesHundred(120, '+', 50)).toBe(false);
	});

	it('lists every key once in teaching order', () => {
		expect(new Set(RANGE_ORDER).size).toBe(RANGE_ORDER.length);
		expect(RANGE_ORDER.indexOf('zr20-without')).toBeLessThan(RANGE_ORDER.indexOf('zr20-with'));
	});
});
