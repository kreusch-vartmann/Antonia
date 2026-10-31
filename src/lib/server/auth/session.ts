/**
 * Sessions are stored in Redis under the SHA-256 hash of a random token.
 * The cookie only contains the token. A per-user "epoch" allows logging out
 * all sessions of a user at once (e.g. after a password change).
 */
import type { Kv } from '../kv/types';
import { randomToken, sha256 } from './crypto';

export type Role = 'teacher' | 'student';

export interface SessionData {
	role: Role;
	userId: string;
	epoch: number;
	createdAt: number;
}

export const SESSION_COOKIE = 'antonia_session';

export const SESSION_TTL: Record<Role, number> = {
	teacher: 12 * 60 * 60,
	student: 8 * 60 * 60
};

const key = (token: string) => `sess:${sha256(token)}`;
const epochKey = (role: Role, userId: string) => `sessepoch:${role}:${userId}`;

async function currentEpoch(kv: Kv, role: Role, userId: string) {
	return Number((await kv.get(epochKey(role, userId))) ?? 0);
}

export async function createSession(kv: Kv, role: Role, userId: string): Promise<string> {
	const token = randomToken(32);
	const data: SessionData = { role, userId, epoch: await currentEpoch(kv, role, userId), createdAt: Date.now() };
	await kv.set(key(token), JSON.stringify(data), SESSION_TTL[role]);
	return token;
}

/** Validates a session and extends it (sliding expiry). */
export async function validateSession(kv: Kv, token: string | undefined): Promise<SessionData | null> {
	if (!token || token.length > 100) return null;
	const raw = await kv.get(key(token));
	if (!raw) return null;
	let data: SessionData;
	try {
		data = JSON.parse(raw) as SessionData;
	} catch {
		return null;
	}
	if (data.epoch !== (await currentEpoch(kv, data.role, data.userId))) {
		await kv.del(key(token));
		return null;
	}
	const ttl = await kv.ttl(key(token));
	if (ttl > 0 && ttl < SESSION_TTL[data.role] / 2) {
		await kv.set(key(token), raw, SESSION_TTL[data.role]);
	}
	return data;
}

export async function destroySession(kv: Kv, token: string | undefined) {
	if (token) await kv.del(key(token));
}

/** Invalidate all sessions of a user. */
export async function destroyAllSessions(kv: Kv, role: Role, userId: string) {
	await kv.incr(epochKey(role, userId), 400 * 24 * 60 * 60);
}

/** Short-lived token for the second login step (2FA). */
export async function createPending2fa(kv: Kv, teacherId: string): Promise<string> {
	const token = randomToken(24);
	await kv.set(`pending2fa:${sha256(token)}`, teacherId, 5 * 60);
	return token;
}

export async function readPending2fa(kv: Kv, token: string | undefined): Promise<string | null> {
	if (!token) return null;
	return kv.get(`pending2fa:${sha256(token)}`);
}

export async function clearPending2fa(kv: Kv, token: string) {
	await kv.del(`pending2fa:${sha256(token)}`);
}
