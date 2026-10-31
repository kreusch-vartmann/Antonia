import { hash, verify } from '@node-rs/argon2';
import { randomInt } from 'node:crypto';

// OWASP recommendation for Argon2id: m=19 MiB, t=2, p=1.
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 } as const;

export function hashPassword(password: string): Promise<string> {
	return hash(password, OPTIONS);
}

export async function verifyPassword(hashed: string, password: string): Promise<boolean> {
	try {
		return await verify(hashed, password);
	} catch {
		return false;
	}
}

let dummyHash: Promise<string> | undefined;

/** Spend comparable time when a user does not exist (prevents user enumeration). */
export async function dummyVerify(password: string): Promise<false> {
	dummyHash ??= hashPassword('dummy-password-for-timing');
	await verifyPassword(await dummyHash, password);
	return false;
}

export const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/;

export function normalizeUsername(u: string): string {
	return u.trim().toLowerCase();
}

export function teacherPasswordProblem(pw: string): string | null {
	if (pw.length < 10) return 'Das Passwort muss mindestens 10 Zeichen lang sein.';
	if (pw.length > 200) return 'Das Passwort ist zu lang.';
	return null;
}

export function studentPasswordProblem(pw: string): string | null {
	if (pw.length < 4) return 'Das Passwort muss mindestens 4 Zeichen lang sein.';
	if (pw.length > 100) return 'Das Passwort ist zu lang.';
	return null;
}

const WORDS = [
	'apfel',
	'ball',
	'baum',
	'biene',
	'blume',
	'boot',
	'eule',
	'fisch',
	'frosch',
	'hase',
	'igel',
	'katze',
	'kiwi',
	'koala',
	'mond',
	'maus',
	'pferd',
	'pinguin',
	'rabe',
	'rakete',
	'sonne',
	'stern',
	'tiger',
	'wal',
	'wolke',
	'zebra',
	'ente',
	'fuchs',
	'lama',
	'panda'
];

/** Child-friendly password, e.g. "sonne47". */
export function kidPassword(): string {
	return WORDS[randomInt(WORDS.length)] + String(randomInt(10, 100));
}
