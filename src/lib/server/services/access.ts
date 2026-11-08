/**
 * Who may see and manage a child.
 *
 * - The teacher who created the child is its owner: full rights (password, settings,
 *   export, delete, sharing).
 * - A child can be shared with other teachers: they see it, assign their own sets and
 *   evaluate it, but cannot manage it.
 */
import { and, asc, eq, ne, sql } from 'drizzle-orm';
import type { Db } from '../db/types';
import { schema } from '../db/types';
import { ValidationError } from './accounts';
import { audit } from './audit';

const { student, teacher, studentTeacher } = schema;

export type StudentAccess = 'owner' | 'shared';

/** SQL condition for queries on `student`: the teacher owns the child or it is shared with them. */
export function canSeeStudent(teacherId: string) {
	return sql`(${student.teacherId} = ${teacherId} or exists (select 1 from student_teacher st where st.student_id = ${student.id} and st.teacher_id = ${teacherId}))`;
}

export async function studentAccess(
	db: Db,
	teacherId: string,
	studentId: string
): Promise<StudentAccess | null> {
	const [row] = await db
		.select({
			owner: student.teacherId,
			shared: sql<boolean>`exists (select 1 from student_teacher st where st.student_id = ${student.id} and st.teacher_id = ${teacherId})`
		})
		.from(student)
		.where(eq(student.id, studentId));
	if (!row) return null;
	if (row.owner === teacherId) return 'owner';
	return row.shared ? 'shared' : null;
}

export async function requireOwner(db: Db, teacherId: string, studentId: string) {
	if ((await studentAccess(db, teacherId, studentId)) !== 'owner')
		throw new ValidationError('Nur die Lehrkraft, die das Kind angelegt hat, darf das.');
}

export async function shareStudent(db: Db, ownerId: string, studentId: string, teacherId: string) {
	await requireOwner(db, ownerId, studentId);
	if (teacherId === ownerId) throw new ValidationError('Das Kind gehört dir schon.');
	const [t] = await db
		.select({ id: teacher.id })
		.from(teacher)
		.where(and(eq(teacher.id, teacherId), eq(teacher.active, true)));
	if (!t) throw new ValidationError('Lehrkraft nicht gefunden.');
	await db.insert(studentTeacher).values({ studentId, teacherId }).onConflictDoNothing();
	await audit(db, ownerId, 'student.share', 'student', studentId);
}

export async function unshareStudent(
	db: Db,
	ownerId: string,
	studentId: string,
	teacherId: string
) {
	await requireOwner(db, ownerId, studentId);
	await db
		.delete(studentTeacher)
		.where(and(eq(studentTeacher.studentId, studentId), eq(studentTeacher.teacherId, teacherId)));
	await audit(db, ownerId, 'student.unshare', 'student', studentId);
}

export async function listShares(db: Db, studentId: string) {
	return db
		.select({ teacherId: teacher.id, displayName: teacher.displayName })
		.from(studentTeacher)
		.innerJoin(teacher, eq(teacher.id, studentTeacher.teacherId))
		.where(eq(studentTeacher.studentId, studentId))
		.orderBy(asc(teacher.displayName));
}

/** Active teachers a child can be shared with. */
export async function otherTeachers(db: Db, exceptId: string) {
	return db
		.select({ id: teacher.id, displayName: teacher.displayName })
		.from(teacher)
		.where(and(ne(teacher.id, exceptId), eq(teacher.active, true)))
		.orderBy(asc(teacher.displayName));
}

/** Name of the owner of a child (shown to teachers it is shared with). */
export async function ownerName(db: Db, studentId: string): Promise<string | null> {
	const [row] = await db
		.select({ name: teacher.displayName })
		.from(student)
		.innerJoin(teacher, eq(teacher.id, student.teacherId))
		.where(eq(student.id, studentId));
	return row?.name ?? null;
}
