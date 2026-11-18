import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from '../helpers/db';
import type { Db } from '#lib/server/db/types.ts';
import { createTeacher } from '#lib/server/services/accounts.ts';
import { createStudent } from '#lib/server/services/students.ts';
import { shareStudent, unshareStudent } from '#lib/server/services/access.ts';
import { createTasks } from '#lib/server/services/tasks.ts';
import {
	createSet,
	duplicateSet,
	listSets,
	setSetHeading,
	writeSetOrder
} from '#lib/server/services/sets.ts';
import { getPreferences, updatePreferences } from '#lib/server/services/preferences.ts';
import { createHeading, deleteHeading, listHeadings } from '#lib/server/services/headings.ts';
import {
	createGroup,
	deleteGroup,
	listGroups,
	moveGroup,
	renameGroup,
	setGroupMembers,
	setStudentGroups
} from '#lib/server/services/groups.ts';
import { deleteStudent } from '#lib/server/services/students.ts';
import type { ArithmeticContent } from '#lib/domain/formats/types.ts';

let db: Db;
let close: () => Promise<void>;

beforeEach(async () => {
	({ db, close } = await createTestDb());
});
afterEach(async () => close());

const teacher = (name = 'lehrerin') =>
	createTeacher(db, { username: name, displayName: 'Frau Test', password: 'sehr-geheim-123' });
const kid = (t: string, name: string) =>
	createStudent(db, t, { firstName: name, username: name.toLowerCase(), password: 'sonne12' });

const add = (a: number, b: number): ArithmeticContent => ({
	format: 'arithmetic',
	expr: { a, op: '+', b, gap: 'result' },
	answer: a + b
});

async function simpleSet(t: string, name: string, a = 3, b = 4) {
	const ids = await createTasks(db, t, [
		{ content: add(a, b), tags: [], origin: { kind: 'manual' } }
	]);
	return createSet(db, t, { name, taskIds: ids });
}

describe('display defaults for new sets', () => {
	it('keeps only the display settings and ignores anything else', async () => {
		const t = await teacher();
		expect((await getPreferences(db, t)).setDefaults).toEqual({});
		await updatePreferences(db, t, {
			setDefaults: { numberColors: 'placeValue', colorOnes: 'orange', hintAfter: 3, sound: false }
		});
		expect((await getPreferences(db, t)).setDefaults).toEqual({
			numberColors: 'placeValue',
			colorOnes: 'orange'
		});
		await updatePreferences(db, t, { headingOrder: ['range:zr10'] });
		const p = await getPreferences(db, t);
		expect(p.headingOrder).toEqual(['range:zr10']);
		expect(p.setDefaults).toMatchObject({ colorOnes: 'orange' });
	});
});

describe('set overview: headings and order', () => {
	it('moves a set under an own heading, back to automatic, and keeps the teachers apart', async () => {
		const t = await teacher();
		const other = await teacher('andere');
		const a = await simpleSet(t, 'Plus 1');
		const b = await simpleSet(t, 'Plus 2');
		const foreign = await simpleSet(other, 'Fremd');

		const h = await createHeading(db, t, '  Wochenplan  ');
		expect((await listHeadings(db, t)).map((x) => x.name)).toEqual(['Wochenplan']);
		await setSetHeading(db, t, a, `custom:${h}`);
		await expect(setSetHeading(db, t, a, 'custom:' + crypto.randomUUID())).rejects.toThrow();
		await expect(setSetHeading(db, t, a, 'range:nonsense')).rejects.toThrow();
		await expect(setSetHeading(db, other, a, 'range:zr10')).rejects.toThrow();
		let sets = await listSets(db, t);
		expect(sets.find((s) => s.id === a)).toMatchObject({ heading: `custom:${h}`, range: 'zr10' });

		const copy = await duplicateSet(db, t, a);
		expect((await listSets(db, t)).find((s) => s.id === copy)?.heading).toBe(`custom:${h}`);

		await writeSetOrder(db, t, [b, a, foreign]);
		sets = await listSets(db, t);
		expect(sets.find((s) => s.id === b)?.sortOrder).toBe(0);
		expect(sets.find((s) => s.id === a)?.sortOrder).toBe(1);
		expect((await listSets(db, other)).find((s) => s.id === foreign)?.sortOrder).toBeNull();

		await updatePreferences(db, t, { headingOrder: [`custom:${h}`, 'range:zr10'] });
		await deleteHeading(db, t, h);
		expect((await listHeadings(db, t)).length).toBe(0);
		expect((await listSets(db, t)).find((s) => s.id === a)?.heading).toBeNull();
		expect((await getPreferences(db, t)).headingOrder).toEqual(['range:zr10']);
	});
});

describe('groups of children', () => {
	it('classes hold a child once, subgroups cut across classes', async () => {
		const t = await teacher();
		const [mia, ben, eva] = [await kid(t, 'Mia'), await kid(t, 'Ben'), await kid(t, 'Eva')];
		const c1 = await createGroup(db, t, { name: 'Klasse 1a', kind: 'class' });
		const c2 = await createGroup(db, t, { name: 'Klasse 1b', kind: 'class' });
		const förder = await createGroup(db, t, { name: 'Förderkurs', kind: 'subgroup' });
		await expect(createGroup(db, t, { name: '   ', kind: 'class' })).rejects.toThrow();

		await setGroupMembers(db, t, c1, [mia, ben]);
		await setGroupMembers(db, t, c2, [ben, eva]);
		await setGroupMembers(db, t, förder, [mia, eva]);
		let groups = await listGroups(db, t);
		const members = (id: string) => groups.find((g) => g.id === id)!.memberIds.sort();
		expect(members(c1)).toEqual([mia]);
		expect(members(c2)).toEqual([ben, eva].sort());
		expect(members(förder)).toEqual([mia, eva].sort());
		expect(groups.map((g) => g.kind)).toEqual(['class', 'class', 'subgroup']);

		await setStudentGroups(db, t, mia, { classId: c2, subgroupIds: [] });
		groups = await listGroups(db, t);
		expect(members(c1)).toEqual([]);
		expect(members(c2)).toContain(mia);
		expect(members(förder)).toEqual([eva]);
		await expect(
			setStudentGroups(db, t, mia, { classId: förder, subgroupIds: [] })
		).rejects.toThrow();

		await renameGroup(db, t, c1, 'Klasse 1c');
		await moveGroup(db, t, c2, 'up');
		groups = await listGroups(db, t);
		expect(groups.map((g) => g.name).slice(0, 2)).toEqual(['Klasse 1b', 'Klasse 1c']);

		await deleteStudent(db, t, eva);
		groups = await listGroups(db, t);
		expect(members(c2)).not.toContain(eva);
		await deleteGroup(db, t, förder);
		expect((await listGroups(db, t)).length).toBe(2);
	});

	it('other teachers cannot use the groups or the children; sharing and unsharing work', async () => {
		const owner = await teacher();
		const other = await teacher('andere');
		const mia = await kid(owner, 'Mia');
		const mine = await createGroup(db, owner, { name: 'Meine', kind: 'class' });
		const theirs = await createGroup(db, other, { name: 'Deren', kind: 'class' });

		await expect(setGroupMembers(db, other, theirs, [mia])).rejects.toThrow();
		await expect(setGroupMembers(db, other, mine, [])).rejects.toThrow();
		await expect(renameGroup(db, other, mine, 'x')).rejects.toThrow();

		await shareStudent(db, owner, mia, other);
		await setGroupMembers(db, other, theirs, [mia]);
		expect((await listGroups(db, other))[0].memberIds).toEqual([mia]);

		await unshareStudent(db, owner, mia, other);
		expect((await listGroups(db, other))[0].memberIds).toEqual([]);
	});
});

describe('division with remainder as a task', () => {
	it('is stored with its remainder box', async () => {
		const t = await teacher();
		const [id] = await createTasks(db, t, [
			{
				content: {
					format: 'arithmetic',
					expr: { a: 17, op: ':', b: 5, gap: 'result' },
					answer: 3,
					withRemainder: true
				},
				tags: [],
				origin: { kind: 'manual' }
			}
		]);
		const setId = await createSet(db, t, { name: 'Geteilt mit Rest', taskIds: [id] });
		const set = (await listSets(db, t)).find((s) => s.id === setId)!;
		expect(set.range).toBe('div');
		const [row] = await db.query.task.findMany();
		expect(row.content).toMatchObject({ withRemainder: true, answer: 3 });
	});
});
