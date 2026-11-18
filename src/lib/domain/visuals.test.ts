import { describe, expect, it } from 'vitest';
import { dienesGroups, fieldCells, fieldSize, runs, strikes } from './visuals';

const crossed = (a: number, b: number) =>
	fieldCells(a, '-', b).flatMap((c, i) => (c.crossed ? [i] : []));
const range = (from: number, to: number) =>
	Array.from({ length: to - from + 1 }, (_, i) => from + i);

describe('fieldSize', () => {
	it('chooses the field by the biggest number', () => {
		expect(fieldSize(7, '-', 2)).toBe(10);
		expect(fieldSize(8, '+', 7)).toBe(20);
		expect(fieldSize(59, '-', 32)).toBe(100);
		expect(fieldSize(30, '+', 80)).toBe(null);
		expect(fieldSize(3, '*', 4)).toBe(null);
		expect(fieldSize(5, '-', 7)).toBe(null);
	});
});

describe('strike-out rules (minus)', () => {
	const cases: [number, number, number[]][] = [
		[7, 6, range(0, 5)],
		[7, 5, range(0, 4)],
		[7, 2, [5, 6]],
		[10, 3, [7, 8, 9]],
		[10, 6, range(0, 5)],
		[13, 7, [...range(6, 9), ...range(10, 12)]],
		[16, 2, [14, 15]],
		[16, 5, range(10, 14)],
		[17, 6, range(10, 15)],
		[17, 10, range(0, 9)],
		[20, 7, range(13, 19)],
		[59, 7, range(50, 56)],
		[59, 30, range(20, 49)],
		[59, 32, [...range(20, 49), 57, 58]],
		[34, 22, [...range(10, 29), 32, 33]],
		[52, 27, [...range(25, 29), ...range(30, 49), 50, 51]],
		[100, 37, [...range(63, 69), ...range(70, 99)]]
	];
	for (const [a, b, expected] of cases) {
		it(`${a} − ${b}`, () => {
			expect(crossed(a, b).sort((x, y) => x - y)).toEqual(expected);
		});
	}

	it('leaves the result behind', () => {
		for (const [a, b] of cases.map(([x, y]) => [x, y])) {
			const left = fieldCells(a, '-', b).filter((c) => c.owner === 'a' && !c.crossed).length;
			expect(left).toBe(a - b);
		}
	});

	it('draws one line per run', () => {
		expect(strikes(fieldCells(13, '-', 7))).toEqual([
			{ row: 0, from: 6, to: 9 },
			{ row: 1, from: 0, to: 2 }
		]);
		expect(strikes(fieldCells(59, '-', 32))).toEqual([
			{ row: 2, from: 0, to: 9 },
			{ row: 3, from: 0, to: 9 },
			{ row: 4, from: 0, to: 9 },
			{ row: 5, from: 7, to: 8 }
		]);
	});
});

describe('plus', () => {
	const owners = (a: number, b: number) => {
		const cells = fieldCells(a, '+', b);
		const idx = (o: 'a' | 'b') => cells.flatMap((c, i) => (c.owner === o ? [i] : []));
		return { a: idx('a'), b: idx('b'), size: cells.length };
	};
	it('3 + 4', () => {
		expect(owners(3, 4)).toEqual({ a: [0, 1, 2], b: range(3, 6), size: 10 });
	});
	it('8 + 7', () => {
		expect(owners(8, 7)).toEqual({ a: range(0, 7), b: range(8, 14), size: 20 });
	});
	it('34 + 21: tens first, then the ones', () => {
		expect(owners(34, 21)).toEqual({
			a: [...range(0, 29), ...range(50, 53)],
			b: [...range(30, 49), 54],
			size: 100
		});
	});
	it('38 + 25', () => {
		expect(owners(38, 25)).toEqual({
			a: [...range(0, 29), ...range(50, 57)],
			b: [...range(30, 49), ...range(58, 62)],
			size: 100
		});
	});
	it('never strikes anything', () => {
		expect(fieldCells(8, '+', 7).some((c) => c.crossed)).toBe(false);
	});
});

describe('base-ten material', () => {
	it('34 + 21', () => {
		const [a, b] = dienesGroups(34, '+', 21);
		expect([a.rods.length, a.cubes.length, b.rods.length, b.cubes.length]).toEqual([3, 4, 2, 1]);
	});
	it('52 − 27: the cubes first, then the end of the lowest free rod', () => {
		const [g] = dienesGroups(52, '-', 27);
		expect(g.rods.length).toBe(5);
		expect(g.rods[4].crossed.every(Boolean)).toBe(true);
		expect(g.rods[3].crossed.every(Boolean)).toBe(true);
		expect(g.rods[2].crossed).toEqual([...Array(5).fill(false), ...Array(5).fill(true)]);
		expect(g.rods[1].crossed.some(Boolean)).toBe(false);
		expect(g.cubes).toEqual([true, true]);
	});
	it('16 − 2', () => {
		const [g] = dienesGroups(16, '-', 2);
		expect(g.rods.length).toBe(1);
		expect(g.rods[0].crossed.some(Boolean)).toBe(false);
		expect(g.cubes).toEqual([false, false, false, false, true, true]);
	});
	it('7 − 6', () => {
		const [g] = dienesGroups(7, '-', 6);
		expect(g.rods.length).toBe(0);
		expect(g.cubes.filter(Boolean).length).toBe(6);
	});
	it('runs', () => {
		expect(runs([false, true, true, false, true])).toEqual([
			[1, 2],
			[4, 4]
		]);
	});
});
