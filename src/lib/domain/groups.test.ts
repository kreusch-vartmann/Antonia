import { describe, expect, it } from 'vitest';
import { sectionsByClass, toggleGroup, type GroupLite } from './groups';

const kids = ['a', 'b', 'c', 'd'].map((id) => ({ id }));
const groups: GroupLite[] = [
	{ id: 'k1', name: '1a', kind: 'class', memberIds: ['a', 'b'] },
	{ id: 'k2', name: '1b', kind: 'class', memberIds: ['c'] },
	{ id: 'u1', name: 'Förder', kind: 'subgroup', memberIds: ['a', 'c'] }
];

describe('groups', () => {
	it('sorts children by class, the others last', () => {
		const s = sectionsByClass(kids, groups);
		expect(s.map((x) => [x.name, x.students.map((k) => k.id)])).toEqual([
			['1a', ['a', 'b']],
			['1b', ['c']],
			['Ohne Klasse', ['d']]
		]);
	});
	it('needs no heading without classes', () => {
		expect(sectionsByClass(kids, [groups[2]])).toEqual([
			{ key: 'all', name: null, students: kids }
		]);
	});
	it('toggles a whole group', () => {
		expect(toggleGroup([], ['a', 'c']).sort()).toEqual(['a', 'c']);
		expect(toggleGroup(['a', 'c', 'x'], ['a', 'c']).sort()).toEqual(['x']);
		expect(toggleGroup(['a'], ['a', 'c']).sort()).toEqual(['a', 'c']);
		expect(toggleGroup(['a'], [])).toEqual(['a']);
	});
});
