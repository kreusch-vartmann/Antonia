/**
 * Small key/value abstraction over Redis.
 *
 * Only the operations the app needs are exposed. This keeps business logic
 * testable with `MemoryKv` and makes the Redis usage explicit.
 */
export interface Kv {
	get(key: string): Promise<string | null>;
	/** Set a value, optionally with a TTL in seconds. */
	set(key: string, value: string, ttlSeconds?: number): Promise<void>;
	del(key: string): Promise<void>;
	/** Atomically increment; sets TTL when the key is created. Returns new value. */
	incr(key: string, ttlSeconds: number): Promise<number>;
	/** Remaining TTL in seconds, -1 if none, -2 if missing. */
	ttl(key: string): Promise<number>;
	ping(): Promise<boolean>;
}

/** In-memory implementation for tests and local tooling. Not for production. */
export class MemoryKv implements Kv {
	private store = new Map<string, { value: string; expiresAt?: number }>();
	constructor(private now: () => number = Date.now) {}

	private alive(key: string) {
		const e = this.store.get(key);
		if (!e) return undefined;
		if (e.expiresAt !== undefined && e.expiresAt <= this.now()) {
			this.store.delete(key);
			return undefined;
		}
		return e;
	}

	async get(key: string) {
		return this.alive(key)?.value ?? null;
	}

	async set(key: string, value: string, ttlSeconds?: number) {
		this.store.set(key, {
			value,
			expiresAt: ttlSeconds ? this.now() + ttlSeconds * 1000 : undefined
		});
	}

	async del(key: string) {
		this.store.delete(key);
	}

	async incr(key: string, ttlSeconds: number) {
		const e = this.alive(key);
		if (!e) {
			this.store.set(key, { value: '1', expiresAt: this.now() + ttlSeconds * 1000 });
			return 1;
		}
		const n = Number(e.value) + 1;
		e.value = String(n);
		return n;
	}

	async ttl(key: string) {
		const e = this.alive(key);
		if (!e) return -2;
		if (e.expiresAt === undefined) return -1;
		return Math.ceil((e.expiresAt - this.now()) / 1000);
	}

	async ping() {
		return true;
	}
}
