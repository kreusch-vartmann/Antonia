/** Management of the teacher accounts (admins only; the caller has to check the role). */
import { randomBytes } from 'node:crypto';
import { and, asc, eq, ne, sql } from 'drizzle-orm';
import type { Db } from '../db/types';
import { schema } from '../db/types';
import type { Kv } from '../kv/types';
import { hashPassword } from '../auth/password';
import { destroyAllSessions } from '../auth/session';
import { createTeacher, ValidationError } from './accounts';
import { audit } from './audit';

const { teacher, student, studentTeacher } = schema;

export type TeacherRole = 'admin' | 'teacher';

/** A readable random password with 14 characters. */
function randomPassword(): string {
	return randomBytes(11).toString('base64url').slice(0, 14);
}

export async function listTeachers(db: Db) {
	return db
		.select({
			id: teacher.id,
			username: teacher.username,
			displayName: teacher.displayName,
			role: teacher.role,
			active: teacher.active,
			twoFactor: sql<boolean>`${teacher.totpSecretEnc} is not null`,
			students: sql<number>`(select count(*)::int from student s where s.teacher_id = "teacher"."id")`
		})
		.from(teacher)
		.orderBy(asc(teacher.displayName));
}

/** Creates an account with a random password that is shown once. */
export async function createTeacherByAdmin(
	db: Db,
	adminId: string,
	input: { username: string; displayName: string }
) {
	const password = randomPassword();
	const id = await createTeacher(db, { ...input, password });
	await audit(db, adminId, 'teacher.admin.create', 'teacher', id);
	return { id, password };
}

export async function resetTeacherPassword(db: Db, kv: Kv, adminId: string, id: string) {
	const password = randomPassword();
	const res = await db
		.update(teacher)
		.set({ passwordHash: await hashPassword(password), updatedAt: new Date() })
		.where(eq(teacher.id, id))
		.returning({ id: teacher.id });
	if (res.length === 0) throw new ValidationError('Lehrkraft nicht gefunden.');
	await destroyAllSessions(kv, 'teacher', id);
	await audit(db, adminId, 'teacher.admin.password', 'teacher', id);
	return password;
}

/** At least one active admin has to remain. */
async function requireAnotherAdmin(db: Db, exceptId: string) {
	const [r] = await db
		.select({ n: sql<number>`count(*)::int` })
		.from(teacher)
		.where(and(eq(teacher.role, 'admin'), eq(teacher.active, true), ne(teacher.id, exceptId)));
	if (r.n === 0) throw new ValidationError('Es muss mindestens ein aktiver Admin übrig bleiben.');
}

export async function setRole(db: Db, adminId: string, id: string, role: TeacherRole) {
	if (role !== 'admin' && role !== 'teacher') throw new ValidationError('Unbekannte Rolle.');
	const [t] = await db.select({ role: teacher.role }).from(teacher).where(eq(teacher.id, id));
	if (!t) throw new ValidationError('Lehrkraft nicht gefunden.');
	if (t.role === 'admin' && role !== 'admin') await requireAnotherAdmin(db, id);
	await db.update(teacher).set({ role, updatedAt: new Date() }).where(eq(teacher.id, id));
	await audit(db, adminId, 'teacher.admin.role', 'teacher', id);
}

export async function setActive(db: Db, kv: Kv, adminId: string, id: string, active: boolean) {
	const [t] = await db.select({ role: teacher.role }).from(teacher).where(eq(teacher.id, id));
	if (!t) throw new ValidationError('Lehrkraft nicht gefunden.');
	if (!active) {
		if (id === adminId)
			throw new ValidationError('Du kannst dein eigenes Konto nicht deaktivieren.');
		if (t.role === 'admin') await requireAnotherAdmin(db, id);
	}
	await db.update(teacher).set({ active, updatedAt: new Date() }).where(eq(teacher.id, id));
	if (!active) await destroyAllSessions(kv, 'teacher', id);
	await audit(db, adminId, 'teacher.admin.active', 'teacher', id);
}

/** All children of one teacher go to another one (e.g. when somebody leaves the school). */
export async function transferStudents(db: Db, adminId: string, fromId: string, toId: string) {
	if (fromId === toId) throw new ValidationError('Bitte zwei verschiedene Lehrkräfte wählen.');
	const found = await db.select({ id: teacher.id }).from(teacher);
	const ids = new Set(found.map((t) => t.id));
	if (!ids.has(fromId) || !ids.has(toId)) throw new ValidationError('Lehrkraft nicht gefunden.');
	const moved = await db
		.update(student)
		.set({ teacherId: toId, updatedAt: new Date() })
		.where(eq(student.teacherId, fromId))
		.returning({ id: student.id });
	for (const m of moved) {
		// the new owner does not need to be a guest any more
		await db
			.delete(studentTeacher)
			.where(and(eq(studentTeacher.studentId, m.id), eq(studentTeacher.teacherId, toId)));
	}
	await audit(db, adminId, 'teacher.admin.transfer', 'teacher', toId);
	return moved.length;
}
