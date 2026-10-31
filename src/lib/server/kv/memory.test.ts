import { describe, expect, it } from 'vitest';
import { MemoryKv } from './types';

describe('MemoryKv', () => {
	it('expires values after their TTL', async () => {
		let now = 0;
		const kv = new MemoryKv(() => now);
		await kv.set('a', '1', 10);
		expect(await kv.get('a')).toBe('1');
		now = 10_001;
		expect(await kv.get('a')).toBeNull();
	});

	it('incr starts at 1 and keeps the first TTL', async () => {
		let now = 0;
		const kv = new MemoryKv(() => now);
		expect(await kv.incr('c', 60)).toBe(1);
		now = 30_000;
		expect(await kv.incr('c', 60)).toBe(2);
		expect(await kv.ttl('c')).toBe(30);
		now = 61_000;
		expect(await kv.incr('c', 60)).toBe(1);
	});
});
