/**
 * Groups of children: classes (a child is in at most one class per teacher) and subgroups
 * (any number, also across classes). Groups belong to the teacher who created them and can
 * contain every child that teacher may see (own and shared children).
 */
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import type { Db } from '../db/types';
import { schema } from '../db/types';
import { ValidationError } from './accounts';
import { canSeeStudent } from './access';
import { moveInList } from '#lib/domain/setOrder.ts';

const { student, studentGroup, studentGroupMember } = schema;

export type GroupKind = 'class' | 'subgroup';

export interface GroupWithMembers {
	id: string;
	name: string;
	kind: GroupKind;
	position: number;
	memberIds: string[];
}

function cleanName(name: string): string {
	const n = name.trim();
	if (n.length < 1 || n.length > 60)
		throw new ValidationError('Bitte einen Namen mit 1 bis 60 Zeichen eingeben.', 'name');
	return n;
}

async function ownGroup(db: Db, teacherId: string, id: string) {
	const [g] = await db
		.select()
		.from(studentGroup)
		.where(and(eq(studentGroup.id, id), eq(studentGroup.teacherId, teacherId)));
	if (!g) throw new ValidationError('Gruppe nicht gefunden.');
	return g;
}

async function requireVisible(db: Db, teacherId: string, ids: string[]) {
	if (ids.length === 0) return;
	const rows = await db
		.select({ id: student.id })
		.from(student)
		.where(and(canSeeStudent(teacherId), inArray(student.id, ids)));
	if (rows.length !== ids.length) throw new ValidationError('Kind nicht gefunden.');
}

/** The teacher's groups (classes first, then subgroups) with the children they may see. */
export async function listGroups(db: Db, teacherId: string): Promise<GroupWithMembers[]> {
	const groups = await db
		.select()
		.from(studentGroup)
		.where(eq(studentGroup.teacherId, teacherId))
		.orderBy(asc(studentGroup.position), asc(studentGroup.createdAt));
	if (groups.length === 0) return [];
	const members = await db
		.select({ groupId: studentGroupMember.groupId, studentId: studentGroupMember.studentId })
		.from(studentGroupMember)
		.innerJoin(student, eq(student.id, studentGroupMember.studentId))
		.where(
			and(
				inArray(
					studentGroupMember.groupId,
					groups.map((g) => g.id)
				),
				canSeeStudent(teacherId)
			)
		);
	const byGroup = new Map<string, string[]>();
	for (const m of members) byGroup.set(m.groupId, [...(byGroup.get(m.groupId) ?? []), m.studentId]);
	const out = groups.map((g) => ({
		id: g.id,
		name: g.name,
		kind: g.kind,
		position: g.position,
		memberIds: byGroup.get(g.id) ?? []
	}));
	return [...out.filter((g) => g.kind === 'class'), ...out.filter((g) => g.kind === 'subgroup')];
}

export async function createGroup(
	db: Db,
	teacherId: string,
	input: { name: string; kind: GroupKind }
): Promise<string> {
	const name = cleanName(input.name);
	const kind: GroupKind = input.kind === 'subgroup' ? 'subgroup' : 'class';
	const [last] = await db
		.select({ max: sql<number>`coalesce(max(${studentGroup.position}), -1)::int` })
		.from(studentGroup)
		.where(and(eq(studentGroup.teacherId, teacherId), eq(studentGroup.kind, kind)));
	const [row] = await db
		.insert(studentGroup)
		.values({ teacherId, name, kind, position: (last?.max ?? -1) + 1 })
		.returning({ id: studentGroup.id });
	return row.id;
}

export async function renameGroup(db: Db, teacherId: string, id: string, name: string) {
	await ownGroup(db, teacherId, id);
	await db
		.update(studentGroup)
		.set({ name: cleanName(name) })
		.where(eq(studentGroup.id, id));
}

export async function deleteGroup(db: Db, teacherId: string, id: string) {
	await ownGroup(db, teacherId, id);
	await db.delete(studentGroup).where(eq(studentGroup.id, id));
}

/** Moves a group up or down among the groups of the same kind. */
export async function moveGroup(db: Db, teacherId: string, id: string, dir: 'up' | 'down') {
	const g = await ownGroup(db, teacherId, id);
	const same = await db
		.select({ id: studentGroup.id })
		.from(studentGroup)
		.where(and(eq(studentGroup.teacherId, teacherId), eq(studentGroup.kind, g.kind)))
		.orderBy(asc(studentGroup.position), asc(studentGroup.createdAt));
	const order = moveInList(
		same.map((x) => x.id),
		id,
		dir
	);
	await db.transaction(async (tx) => {
		for (const [i, gid] of order.entries()) {
			await tx.update(studentGroup).set({ position: i }).where(eq(studentGroup.id, gid));
		}
	});
}

/** Removes the children from all other classes of this teacher (a child has one class). */
async function leaveOtherClasses(db: Db, teacherId: string, studentIds: string[], keep?: string) {
	if (studentIds.length === 0) return;
	const classes = await db
		.select({ id: studentGroup.id })
		.from(studentGroup)
		.where(and(eq(studentGroup.teacherId, teacherId), eq(studentGroup.kind, 'class')));
	const ids = classes.map((c) => c.id).filter((id) => id !== keep);
	if (ids.length === 0) return;
	await db
		.delete(studentGroupMember)
		.where(
			and(
				inArray(studentGroupMember.groupId, ids),
				inArray(studentGroupMember.studentId, studentIds)
			)
		);
}

/** Replaces the members of a group. For a class the children leave their other classes. */
export async function setGroupMembers(db: Db, teacherId: string, id: string, studentIds: string[]) {
	const g = await ownGroup(db, teacherId, id);
	const ids = [...new Set(studentIds)];
	await requireVisible(db, teacherId, ids);
	// children the teacher cannot see are not touched
	const visible = await db.select({ id: student.id }).from(student).where(canSeeStudent(teacherId));
	const visibleIds = visible.map((v) => v.id);
	await db.transaction(async (tx) => {
		if (visibleIds.length > 0) {
			await tx
				.delete(studentGroupMember)
				.where(
					and(eq(studentGroupMember.groupId, id), inArray(studentGroupMember.studentId, visibleIds))
				);
		}
		if (g.kind === 'class') await leaveOtherClasses(tx as unknown as Db, teacherId, ids, id);
		if (ids.length > 0) {
			await tx
				.insert(studentGroupMember)
				.values(ids.map((studentId) => ({ groupId: id, studentId })))
				.onConflictDoNothing();
		}
	});
}

/** Sets the class and the subgroups of one child (only groups of this teacher). */
export async function setStudentGroups(
	db: Db,
	teacherId: string,
	studentId: string,
	input: { classId: string | null; subgroupIds: string[] }
) {
	await requireVisible(db, teacherId, [studentId]);
	const wanted = [...new Set([...(input.classId ? [input.classId] : []), ...input.subgroupIds])];
	const own = await db
		.select({ id: studentGroup.id, kind: studentGroup.kind })
		.from(studentGroup)
		.where(eq(studentGroup.teacherId, teacherId));
	const kinds = new Map(own.map((g) => [g.id, g.kind]));
	if (wanted.some((id) => !kinds.has(id))) throw new ValidationError('Gruppe nicht gefunden.');
	if (input.classId && kinds.get(input.classId) !== 'class')
		throw new ValidationError('Das ist keine Klasse.');
	if (input.subgroupIds.some((id) => kinds.get(id) !== 'subgroup'))
		throw new ValidationError('Das ist keine Untergruppe.');
	await db.transaction(async (tx) => {
		if (own.length > 0) {
			await tx.delete(studentGroupMember).where(
				and(
					eq(studentGroupMember.studentId, studentId),
					inArray(
						studentGroupMember.groupId,
						own.map((g) => g.id)
					)
				)
			);
		}
		if (wanted.length > 0) {
			await tx.insert(studentGroupMember).values(wanted.map((groupId) => ({ groupId, studentId })));
		}
	});
}
