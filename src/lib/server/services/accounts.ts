import { eq, sql } from 'drizzle-orm';
import type { Db } from '../db/types';
import { schema } from '../db/types';
import type { Kv } from '../kv/types';
import { decrypt, encrypt, sha256 } from '../auth/crypto';
import {
	dummyVerify,
	hashPassword,
	normalizeUsername,
	teacherPasswordProblem,
	USERNAME_RE,
	verifyPassword
} from '../auth/password';
import { clearFailures, isLimited, LOGIN_LIMITS, registerFailure } from '../auth/ratelimit';
import { generateRecoveryCodes, verifyTotp } from '../auth/totp';
import type { Role } from '../auth/session';
import { audit } from './audit';

const { teacher, student } = schema;

export class ValidationError extends Error {
	constructor(
		message: string,
		public field?: string
	) {
		super(message);
	}
}

export async function teacherCount(db: Db): Promise<number> {
	const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(teacher);
	return r.n;
}

export async function isUsernameTaken(
	db: Db,
	username: string,
	exceptId?: string
): Promise<boolean> {
	const u = normalizeUsername(username);
	const t = await db.select({ id: teacher.id }).from(teacher).where(eq(teacher.username, u));
	const s = await db.select({ id: student.id }).from(student).where(eq(student.username, u));
	return [...t, ...s].some((r) => r.id !== exceptId);
}

export function checkUsername(username: string): string {
	const u = normalizeUsername(username);
	if (!USERNAME_RE.test(u)) {
		throw new ValidationError(
			'Benutzername: 3–32 Zeichen, nur Kleinbuchstaben, Ziffern, Punkt, Binde- oder Unterstrich.',
			'username'
		);
	}
	return u;
}

export async function createTeacher(
	db: Db,
	input: { username: string; displayName: string; password: string }
) {
	const username = checkUsername(input.username);
	const displayName = input.displayName.trim();
	if (!displayName || displayName.length > 80)
		throw new ValidationError('Name fehlt.', 'displayName');
	const problem = teacherPasswordProblem(input.password);
	if (problem) throw new ValidationError(problem, 'password');
	if (await isUsernameTaken(db, username))
		throw new ValidationError('Benutzername ist vergeben.', 'username');
	const [row] = await db
		.insert(teacher)
		.values({ username, displayName, passwordHash: await hashPassword(input.password) })
		.returning({ id: teacher.id });
	await audit(db, row.id, 'teacher.create', 'teacher', row.id);
	return row.id;
}

export type LoginResult =
	| { ok: true; role: Role; userId: string; needs2fa: boolean }
	| { ok: false; error: 'invalid' | 'locked'; retryAfter?: number };

export async function login(
	db: Db,
	kv: Kv,
	input: { username: string; password: string; ip: string }
): Promise<LoginResult> {
	const u = normalizeUsername(input.username).slice(0, 64);
	const userKey = `login:u:${u}`;
	const ipKey = `login:ip:${input.ip}`;
	const locked =
		(await isLimited(kv, userKey, LOGIN_LIMITS.perUser)) ??
		(await isLimited(kv, ipKey, LOGIN_LIMITS.perIp));
	if (locked) return { ok: false, error: 'locked', retryAfter: locked };

	const [t] = await db
		.select({ id: teacher.id, hash: teacher.passwordHash, totp: teacher.totpSecretEnc })
		.from(teacher)
		.where(eq(teacher.username, u));
	const [s] = t
		? []
		: await db
				.select({ id: student.id, hash: student.passwordHash })
				.from(student)
				.where(eq(student.username, u));

	const user = t ?? s;
	const valid = user
		? await verifyPassword(user.hash, input.password)
		: await dummyVerify(input.password);
	if (!user || !valid) {
		await registerFailure(kv, userKey, LOGIN_LIMITS.perUser);
		await registerFailure(kv, ipKey, LOGIN_LIMITS.perIp);
		return { ok: false, error: 'invalid' };
	}
	await clearFailures(kv, userKey);
	if (t) return { ok: true, role: 'teacher', userId: t.id, needs2fa: !!t.totp };
	return { ok: true, role: 'student', userId: s!.id, needs2fa: false };
}

/** Second factor: TOTP code or one recovery code. */
export async function verifySecondFactor(
	db: Db,
	kv: Kv,
	appSecret: string,
	teacherId: string,
	code: string
): Promise<{ ok: boolean; locked?: number; usedRecovery?: boolean }> {
	const rlKey = `totp:${teacherId}`;
	const locked = await isLimited(kv, rlKey, LOGIN_LIMITS.totp);
	if (locked) return { ok: false, locked };
	const [t] = await db.select().from(teacher).where(eq(teacher.id, teacherId));
	if (!t?.totpSecretEnc) return { ok: false };
	const cleaned = code.trim().toLowerCase();

	if (/^\d{6}$/.test(cleaned.replace(/\s/g, ''))) {
		const step = verifyTotp(decrypt(t.totpSecretEnc, appSecret), cleaned);
		const lastKey = `totplast:${teacherId}`;
		const last = Number((await kv.get(lastKey)) ?? -1);
		if (step !== null && step > last) {
			await kv.set(lastKey, String(step), 120);
			await clearFailures(kv, rlKey);
			return { ok: true };
		}
	} else {
		const h = sha256(cleaned);
		if (t.recoveryCodes.includes(h)) {
			await db
				.update(teacher)
				.set({ recoveryCodes: t.recoveryCodes.filter((c) => c !== h), updatedAt: new Date() })
				.where(eq(teacher.id, teacherId));
			await audit(db, teacherId, 'teacher.2fa.recoveryUsed', 'teacher', teacherId);
			await clearFailures(kv, rlKey);
			return { ok: true, usedRecovery: true };
		}
	}
	await registerFailure(kv, rlKey, LOGIN_LIMITS.totp);
	return { ok: false };
}

export async function enableTotp(
	db: Db,
	appSecret: string,
	teacherId: string,
	secret: string,
	code: string
): Promise<string[] | null> {
	if (verifyTotp(secret, code) === null) return null;
	const { plain, hashes } = generateRecoveryCodes();
	await db
		.update(teacher)
		.set({
			totpSecretEnc: encrypt(secret, appSecret),
			recoveryCodes: hashes,
			updatedAt: new Date()
		})
		.where(eq(teacher.id, teacherId));
	await audit(db, teacherId, 'teacher.2fa.enable', 'teacher', teacherId);
	return plain;
}

export async function disableTotp(db: Db, teacherId: string) {
	await db
		.update(teacher)
		.set({ totpSecretEnc: null, recoveryCodes: [], updatedAt: new Date() })
		.where(eq(teacher.id, teacherId));
	await audit(db, teacherId, 'teacher.2fa.disable', 'teacher', teacherId);
}

export async function changeTeacherPassword(
	db: Db,
	teacherId: string,
	current: string,
	next: string
): Promise<void> {
	const [t] = await db.select().from(teacher).where(eq(teacher.id, teacherId));
	if (!t || !(await verifyPassword(t.passwordHash, current))) {
		throw new ValidationError('Das aktuelle Passwort stimmt nicht.', 'current');
	}
	const problem = teacherPasswordProblem(next);
	if (problem) throw new ValidationError(problem, 'next');
	await db
		.update(teacher)
		.set({ passwordHash: await hashPassword(next), updatedAt: new Date() })
		.where(eq(teacher.id, teacherId));
	await audit(db, teacherId, 'teacher.password.change', 'teacher', teacherId);
}

export async function getTeacher(db: Db, id: string) {
	const [t] = await db
		.select({
			id: teacher.id,
			username: teacher.username,
			displayName: teacher.displayName,
			totpEnabled: sql<boolean>`${teacher.totpSecretEnc} is not null`,
			recoveryLeft: sql<number>`jsonb_array_length(${teacher.recoveryCodes})`
		})
		.from(teacher)
		.where(eq(teacher.id, id));
	return t ?? null;
}
