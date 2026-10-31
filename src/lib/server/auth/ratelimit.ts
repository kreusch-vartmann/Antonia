import type { Kv } from '../kv/types';

export interface Limit {
	/** Max failures in the window. */
	max: number;
	windowSeconds: number;
}

export const LOGIN_LIMITS = {
	perUser: { max: 5, windowSeconds: 15 * 60 },
	perIp: { max: 30, windowSeconds: 15 * 60 },
	totp: { max: 5, windowSeconds: 15 * 60 }
} satisfies Record<string, Limit>;

/** Failure counter based rate limiting (only failures count). */
export async function isLimited(kv: Kv, key: string, limit: Limit): Promise<number | null> {
	const v = Number((await kv.get(`rl:${key}`)) ?? 0);
	if (v >= limit.max) {
		const ttl = await kv.ttl(`rl:${key}`);
		return ttl > 0 ? ttl : limit.windowSeconds;
	}
	return null;
}

export async function registerFailure(kv: Kv, key: string, limit: Limit) {
	await kv.incr(`rl:${key}`, limit.windowSeconds);
}

export async function clearFailures(kv: Kv, key: string) {
	await kv.del(`rl:${key}`);
}
