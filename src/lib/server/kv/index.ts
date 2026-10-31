import { Redis } from 'ioredis';
import { REDIS_URL } from '$app/env/private';
import { log } from '../log';
import type { Kv } from './types';

export type { Kv } from './types';

const PREFIX = 'antonia:';

class RedisKv implements Kv {
	constructor(private r: Redis) {}

	get(key: string) {
		return this.r.get(PREFIX + key);
	}

	async set(key: string, value: string, ttlSeconds?: number) {
		if (ttlSeconds) await this.r.set(PREFIX + key, value, 'EX', ttlSeconds);
		else await this.r.set(PREFIX + key, value);
	}

	async del(key: string) {
		await this.r.del(PREFIX + key);
	}

	async incr(key: string, ttlSeconds: number) {
		const k = PREFIX + key;
		const [[, n]] = (await this.r.multi().incr(k).expire(k, ttlSeconds, 'NX').exec()) as [
			[Error | null, number],
			unknown
		];
		return n;
	}

	ttl(key: string) {
		return this.r.ttl(PREFIX + key);
	}

	async ping() {
		try {
			return (await this.r.ping()) === 'PONG';
		} catch {
			return false;
		}
	}

	quit() {
		return this.r.quit();
	}
}

let instance: RedisKv | undefined;

/** Lazily connects to Redis, so nothing connects at build time. */
export function getKv(): Kv {
	if (!instance) {
		const r = new Redis(REDIS_URL, {
			maxRetriesPerRequest: 3,
			connectTimeout: 10_000
		});
		let lastErrorLog = 0;
		r.on('error', (err: Error) => {
			// Throttle: reconnect attempts would otherwise flood the log.
			if (Date.now() - lastErrorLog > 60_000) {
				lastErrorLog = Date.now();
				log.warn('redis error', { error: err.message });
			}
		});
		instance = new RedisKv(r);
	}
	return instance;
}

export async function closeKv() {
	await instance?.quit();
	instance = undefined;
}
