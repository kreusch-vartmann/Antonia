import { describe, expect, it } from 'vitest';
import { generateFromWizard, suggestSetName, wizardParams } from './wizard';
import { crossesHundred, crossesTen } from './numberRange';
import { decomposition, computeResult } from './formats/arithmetic';

const exprs = (input: unknown) => generateFromWizard(input).drafts.map((d) => d.content.expr!);

describe('set wizard', () => {
	it('ZR 20 plus with ten transition: only tasks that cross the ten', () => {
		const r = generateFromWizard({ op: '+', range: 20, tenTransition: 'with', count: 10, seed: 3 });
		expect(r.drafts).toHaveLength(10);
		for (const e of r.drafts.map((d) => d.content.expr!)) {
			expect(e.op).toBe('+');
			expect(crossesTen(e.a, '+', e.b)).toBe(true);
			expect(e.a + e.b).toBeLessThanOrEqual(20);
		}
		expect(r.tags).toContain('mit Übergang');
	});

	it('fixes the second number to a list ("+6 und +7")', () => {
		const list = exprs({
			op: '+',
			range: 20,
			tenTransition: 'with',
			second: { kind: 'fixed', fixed: '6, 7' },
			count: 20,
			seed: 2
		});
		expect(list.length).toBeGreaterThan(0);
		expect(list.every((e) => e.b === 6 || e.b === 7)).toBe(true);
		expect(list.every((e) => crossesTen(e.a, '+', e.b))).toBe(true);
	});

	it('both numbers can be tens in ZR 100', () => {
		const list = exprs({
			op: '+-',
			range: 100,
			first: { kind: 'tens' },
			second: { kind: 'tens' },
			count: 12,
			seed: 5
		});
		expect(list).toHaveLength(12);
		expect(list.every((e) => e.a % 10 === 0 && e.b % 10 === 0)).toBe(true);
		expect(list.every((e) => computeResult(e.a, e.op, e.b) !== null)).toBe(true);
	});

	it('knows the hundred transition in ZR 1000', () => {
		// hundreds plus tens never cross a hundred
		const none = generateFromWizard({
			op: '+',
			range: 1000,
			first: { kind: 'hundreds' },
			second: { kind: 'tens' },
			hundredTransition: 'with',
			count: 10
		});
		expect(none.drafts).toHaveLength(0);
		expect(none.warnings.join(' ')).toContain('keine Aufgaben');
		const list = exprs({
			op: '+',
			range: 1000,
			first: { kind: 'twoDigitMixed' },
			second: { kind: 'twoDigit' },
			hundredTransition: 'with',
			count: 10,
			seed: 1
		});
		expect(list).toHaveLength(10);
		expect(list.every((e) => crossesHundred(e.a, '+', e.b))).toBe(true);
		const without = exprs({
			op: '+',
			range: 1000,
			first: { kind: 'hundreds' },
			second: { kind: 'tens' },
			hundredTransition: 'without',
			count: 5,
			seed: 1
		});
		expect(without).toHaveLength(5);
	});

	it('warns and returns what exists when there are fewer tasks than wanted, without repeats', () => {
		const r = generateFromWizard({ op: '+', range: 6, count: 50, seed: 1 });
		expect(r.warnings.join(' ')).toMatch(/nur \d+ verschiedene Aufgaben/);
		const keys = r.drafts.map((d) => JSON.stringify(d.content.expr));
		expect(new Set(keys).size).toBe(keys.length);
		expect(r.drafts.length).toBeLessThan(50);
		expect(r.drafts.every((d) => Math.max(d.content.expr!.a, d.content.expr!.b) <= 6)).toBe(true);
	});

	it('spreads the missing numbers evenly', () => {
		const list = exprs({ op: '+', range: 20, gaps: ['a', 'b', 'result'], count: 9, seed: 4 });
		const count = (g: string) => list.filter((e) => e.gap === g).length;
		expect([count('a'), count('b'), count('result')]).toEqual([3, 3, 3]);
		const drafts = generateFromWizard({ op: '-', range: 20, gaps: ['a', 'b'], count: 6, seed: 4 });
		for (const d of drafts.drafts) {
			const e = d.content.expr!;
			expect(d.content.answer).toBe(e.gap === 'a' ? e.a : e.b);
		}
	});

	it('decomposition: only tasks with a usable split get it', () => {
		const r = generateFromWizard({
			op: '+-',
			range: 20,
			tenTransition: 'with',
			decompose: 'equation',
			count: 8,
			seed: 9
		});
		expect(r.drafts.length).toBeGreaterThan(0);
		for (const d of r.drafts) {
			expect(d.content.decompose).toBe('equation');
			const e = d.content.expr!;
			expect(decomposition(e.a, e.op, e.b)).not.toBeNull();
		}
		const mixed = generateFromWizard({
			op: '+',
			range: 20,
			gaps: ['result', 'b'],
			decompose: 'boxes',
			count: 6,
			seed: 9
		});
		expect(mixed.warnings.join(' ')).toMatch(/erlegung/);
		for (const d of mixed.drafts) {
			if (d.content.expr!.gap !== 'result') expect(d.content.decompose).toBeUndefined();
		}
	});

	it('is repeatable with the same seed and different with another one', () => {
		const a = exprs({ op: '+', range: 100, count: 8, seed: 11 });
		const b = exprs({ op: '+', range: 100, count: 8, seed: 11 });
		const c = exprs({ op: '+', range: 100, count: 8, seed: 12 });
		expect(a).toEqual(b);
		expect(a).not.toEqual(c);
	});

	it('times tables and divisions', () => {
		const mul = generateFromWizard({ op: '*', rows: [5], factorFrom: 1, factorTo: 10, count: 10 });
		expect(mul.drafts).toHaveLength(10);
		expect(mul.drafts.every((d) => d.content.expr!.b === 5 && d.content.expr!.op === '*')).toBe(
			true
		);
		const div = exprs({ op: ':', rows: [3, 4], factorFrom: 1, factorTo: 5, count: 20 });
		expect(div).toHaveLength(10);
		expect(div.every((e) => e.a % e.b === 0)).toBe(true);
		// natural order: 1 · 5, 2 · 5, …
		expect(mul.drafts.map((d) => d.content.expr!.a)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
		const both = exprs({ op: '*:', rows: [2], count: 30 });
		expect(new Set(both.map((e) => e.op))).toEqual(new Set(['*', ':']));
	});

	it('rejects bad input', () => {
		expect(() => generateFromWizard({ range: 55 })).toThrow();
		expect(() => generateFromWizard({ gaps: [] })).toThrow();
		expect(wizardParams.safeParse({ factorFrom: 5, factorTo: 2 }).success).toBe(false);
	});

	it('suggests names', () => {
		expect(
			suggestSetName({
				op: '+',
				range: 20,
				tenTransition: 'with',
				second: { kind: 'fixed', fixed: '6, 7' }
			})
		).toBe('+6 und +7 mit ZÜ');
		expect(suggestSetName({ op: '+-', range: 20, tenTransition: 'with' })).toBe(
			'Plus und Minus bis 20 mit ZÜ'
		);
		expect(suggestSetName({ op: '-', range: 100, tenTransition: 'without' })).toBe(
			'Minus bis 100 ohne ZÜ'
		);
		expect(suggestSetName({ op: '*', rows: [5] })).toBe('Einmaleins 5er-Reihe');
		expect(suggestSetName({ op: '*', rows: [10, 2, 5] })).toBe(
			'Einmaleins 2er-, 5er- und 10er-Reihe'
		);
		expect(suggestSetName({ op: ':', rows: [3] })).toBe('Geteilt durch 3');
		expect(suggestSetName({ op: '+', range: 20, decompose: 'equation' })).toBe(
			'Plus bis 20 mit Zerlegung'
		);
	});
});
