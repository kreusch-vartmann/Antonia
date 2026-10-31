import { describe, expect, it } from 'vitest';
import { generateAddSub, generateDivisionRow, generateMultiplicationRow } from './generators';
import { arithmetic } from './formats/arithmetic';

describe('generators', () => {
	it('creates the 5 times table like 1·5 … 10·5', () => {
		const t = generateMultiplicationRow({ row: 5 });
		expect(t).toHaveLength(10);
		expect(t[0].content.expr).toEqual({ a: 1, op: '*', b: 5, gap: 'result' });
		expect(t[9].content.answer).toBe(50);
		expect(t[0].tags).toContain('5er-Reihe');
		expect(t.every((d) => arithmetic.validate(d.content).ok)).toBe(true);
	});

	it('supports both orientations without duplicating squares', () => {
		const t = generateMultiplicationRow({ row: 5, from: 1, to: 10, orientation: 'both' });
		expect(t).toHaveLength(19);
	});

	it('creates factor gaps', () => {
		const t = generateMultiplicationRow({ row: 5, gap: 'factor' });
		expect(t[2].content.expr?.gap).toBe('a');
		expect(t[2].content.answer).toBe(3);
	});

	it('creates division rows', () => {
		const t = generateDivisionRow({ row: 5, from: 1, to: 10 });
		expect(t[2].content.expr).toEqual({ a: 15, op: ':', b: 5, gap: 'result' });
		expect(t[2].content.answer).toBe(3);
	});

	it('respects ten-crossing constraints and range', () => {
		const withT = generateAddSub({ op: '+', max: 20, count: 10, transition: 'with', seed: 3 });
		expect(withT).toHaveLength(10);
		for (const d of withT) {
			const { a, b } = d.content.expr!;
			expect((a % 10) + (b % 10)).toBeGreaterThanOrEqual(10);
			expect(d.content.answer).toBeLessThanOrEqual(20);
		}
		const without = generateAddSub({
			op: '-',
			max: 100,
			count: 10,
			transition: 'without',
			seed: 3
		});
		for (const d of without) {
			const { a, b } = d.content.expr!;
			expect(a % 10).toBeGreaterThanOrEqual(b % 10);
			expect(d.content.answer).toBeGreaterThanOrEqual(0);
		}
	});

	it('is deterministic for a seed and unique', () => {
		const a = generateAddSub({ max: 20, count: 8, seed: 42 });
		const b = generateAddSub({ max: 20, count: 8, seed: 42 });
		expect(a).toEqual(b);
		const keys = a.map((d) => JSON.stringify(d.content.expr));
		expect(new Set(keys).size).toBe(keys.length);
	});
});
