import { and, asc, eq, sql } from 'drizzle-orm';
import type { Db } from '../db/types';
import { schema } from '../db/types';
import type { SettingsLayer } from '#lib/domain/settings.ts';
import { sanitizeLayer } from '#lib/domain/settings.ts';
import { hashPassword, studentPasswordProblem } from '../auth/password';
import { decrypt, encrypt } from '../auth/crypto';
import { canSeeStudent, studentAccess } from './access';
import { checkUsername, isUsernameTaken, ValidationError } from './accounts';
import { audit } from './audit';
import { CAR_COLORS, CAR_MODELS } from '#lib/domain/cars.ts';

const { student } = schema;

const PASSWORD_PURPOSE = 'student-password';

export interface StudentInput {
	firstName: string;
	lastName?: string | null;
	displayName?: string | null;
	username: string;
	notes?: string | null;
	settings?: SettingsLayer;
}

function clean(input: StudentInput) {
	const firstName = input.firstName.trim();
	if (!firstName || firstName.length > 60) throw new ValidationError('Vorname fehlt.', 'firstName');
	const lastName = input.lastName?.trim() || null;
	if (lastName && lastName.length > 60) throw new ValidationError('Nachname zu lang.', 'lastName');
	const displayName = (input.displayName?.trim() || firstName).slice(0, 40);
	const notes = input.notes?.trim().slice(0, 2000) || null;
	return { firstName, lastName, displayName, notes };
}

export async function listStudents(db: Db, teacherId: string) {
	return db
		.select({
			id: student.id,
			firstName: student.firstName,
			lastName: student.lastName,
			displayName: student.displayName,
			username: student.username,
			car: student.car,
			/** The teacher created the child (otherwise it is shared with them). */
			owned: sql<boolean>`${student.teacherId} = ${teacherId}`
		})
		.from(student)
		.where(canSeeStudent(teacherId))
		.orderBy(asc(student.firstName), asc(student.lastName));
}

/** A child the teacher owns or that is shared with them, with the kind of access. */
export async function getStudent(db: Db, teacherId: string, id: string) {
	const access = await studentAccess(db, teacherId, id);
	if (!access) return null;
	const [s] = await db.select().from(student).where(eq(student.id, id));
	return s ? { ...s, access } : null;
}

export async function getStudentSelf(db: Db, id: string) {
	const [s] = await db
		.select({
			id: student.id,
			teacherId: student.teacherId,
			displayName: student.displayName,
			settings: student.settings,
			car: student.car
		})
		.from(student)
		.where(eq(student.id, id));
	return s ?? null;
}

/**
 * Creates a child. With `appSecret` the password is also stored encrypted, so the owner can
 * look it up later (the login still uses the hash).
 */
export async function createStudent(
	db: Db,
	teacherId: string,
	input: StudentInput & { password: string },
	appSecret?: string
) {
	const c = clean(input);
	const username = checkUsername(input.username);
	if (await isUsernameTaken(db, username))
		throw new ValidationError('Benutzername ist vergeben.', 'username');
	const problem = studentPasswordProblem(input.password);
	if (problem) throw new ValidationError(problem, 'password');
	const [row] = await db
		.insert(student)
		.values({
			teacherId,
			...c,
			username,
			passwordHash: await hashPassword(input.password),
			passwordEnc: appSecret ? encrypt(input.password, appSecret, PASSWORD_PURPOSE) : null,
			settings: sanitizeLayer(input.settings ?? {})
		})
		.returning({ id: student.id });
	await audit(db, teacherId, 'student.create', 'student', row.id);
	return row.id;
}

export async function updateStudent(db: Db, teacherId: string, id: string, input: StudentInput) {
	const c = clean(input);
	const username = checkUsername(input.username);
	if (await isUsernameTaken(db, username, id))
		throw new ValidationError('Benutzername ist vergeben.', 'username');
	const res = await db
		.update(student)
		.set({ ...c, username, settings: sanitizeLayer(input.settings ?? {}), updatedAt: new Date() })
		.where(and(eq(student.id, id), eq(student.teacherId, teacherId)))
		.returning({ id: student.id });
	if (res.length === 0) throw new ValidationError('Kind nicht gefunden.');
	await audit(db, teacherId, 'student.update', 'student', id);
}

export async function resetStudentPassword(
	db: Db,
	teacherId: string,
	id: string,
	password: string,
	appSecret?: string
) {
	const problem = studentPasswordProblem(password);
	if (problem) throw new ValidationError(problem, 'password');
	const res = await db
		.update(student)
		.set({
			passwordHash: await hashPassword(password),
			passwordEnc: appSecret ? encrypt(password, appSecret, PASSWORD_PURPOSE) : null,
			updatedAt: new Date()
		})
		.where(and(eq(student.id, id), eq(student.teacherId, teacherId)))
		.returning({ id: student.id });
	if (res.length === 0) throw new ValidationError('Kind nicht gefunden.');
	await audit(db, teacherId, 'student.password.reset', 'student', id);
}

/** Deletes the child and – via cascade – all assignments, runs and answers. */
export async function deleteStudent(db: Db, teacherId: string, id: string) {
	const res = await db
		.delete(student)
		.where(and(eq(student.id, id), eq(student.teacherId, teacherId)))
		.returning({ id: student.id });
	if (res.length > 0) await audit(db, teacherId, 'student.delete', 'student', id);
	return res.length > 0;
}

export async function setCar(db: Db, studentId: string, model: string, color: string) {
	if (!CAR_MODELS.some((m) => m.id === model) || !CAR_COLORS.some((c) => c.id === color)) {
		throw new ValidationError('Unbekanntes Auto.');
	}
	await db
		.update(student)
		.set({ car: { model, color }, updatedAt: new Date() })
		.where(eq(student.id, studentId));
}

/** The password of a child, only for its owner. `null` if it was set before passwords were kept. */
export async function revealStudentPassword(
	db: Db,
	appSecret: string,
	teacherId: string,
	id: string
): Promise<string | null> {
	const [row] = await db
		.select({ enc: student.passwordEnc })
		.from(student)
		.where(and(eq(student.id, id), eq(student.teacherId, teacherId)));
	if (!row) throw new ValidationError('Kind nicht gefunden.');
	if (!row.enc) return null;
	try {
		return decrypt(row.enc, appSecret, PASSWORD_PURPOSE);
	} catch {
		return null;
	}
}
