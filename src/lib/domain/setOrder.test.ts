import { describe, expect, it } from 'vitest';
import {
	compareSets,
	groupSets,
	headingOf,
	headingOrder,
	isValidHeading,
	moveInList,
	type OrderableSet
} from './setOrder';

const set = (over: Partial<OrderableSet> & { id: string }): OrderableSet => ({
	name: over.id,
	autoRange: 'zr20-with',
	heading: null,
	sortOrder: null,
	...over
});
const customs = [{ id: 'c1', name: 'Wochenplan' }];

describe('set order', () => {
	it('uses the automatic heading unless a valid one is stored', () => {
		expect(headingOf(set({ id: 'a' }), customs)).toBe('range:zr20-with');
		expect(headingOf(set({ id: 'a', heading: 'range:zr20-without' }), customs)).toBe(
			'range:zr20-without'
		);
		expect(headingOf(set({ id: 'a', heading: 'custom:c1' }), customs)).toBe('custom:c1');
		expect(headingOf(set({ id: 'a', heading: 'custom:gone' }), customs)).toBe('range:zr20-with');
		expect(isValidHeading('range:nonsense', customs)).toBe(false);
	});

	it('stored order first, the rest in the default order', () => {
		const order = headingOrder(['custom:c1', 'range:zr10', 'range:unknown'], customs);
		expect(order.slice(0, 2)).toEqual(['custom:c1', 'range:zr10']);
		expect(order).toContain('range:zr6');
		expect(new Set(order).size).toBe(order.length);
		expect(headingOrder(undefined, customs).at(-1)).toBe('custom:c1');
	});

	it('sorts by position, sets without one by name', () => {
		const list = [
			set({ id: 'b', name: 'B' }),
			set({ id: 'x', name: 'X', sortOrder: 0 }),
			set({ id: 'a', name: 'A' }),
			set({ id: 'y', name: 'Y', sortOrder: 1 })
		];
		expect(list.sort(compareSets).map((s) => s.id)).toEqual(['x', 'y', 'a', 'b']);
	});

	it('groups sets, also into own headings', () => {
		const groups = groupSets([set({ id: 'a' }), set({ id: 'b', heading: 'custom:c1' })], customs, [
			'custom:c1'
		]);
		expect(groups[0]).toMatchObject({ key: 'custom:c1', label: 'Wochenplan' });
		expect(groups[0].sets.map((s) => s.id)).toEqual(['b']);
		expect(groups.find((g) => g.key === 'range:zr20-with')!.sets.map((s) => s.id)).toEqual(['a']);
	});

	it('moves an item up and down, not past the edges', () => {
		expect(moveInList(['a', 'b', 'c'], 'b', 'up')).toEqual(['b', 'a', 'c']);
		expect(moveInList(['a', 'b', 'c'], 'b', 'down')).toEqual(['a', 'c', 'b']);
		expect(moveInList(['a', 'b', 'c'], 'a', 'up')).toEqual(['a', 'b', 'c']);
		expect(moveInList(['a', 'b', 'c'], 'c', 'down')).toEqual(['a', 'b', 'c']);
	});
});
