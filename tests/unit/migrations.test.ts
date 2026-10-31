import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { schema } from '#lib/server/db/types.ts';
import { createTestDb } from '../helpers/db';

describe('migrations', () => {
	it('apply cleanly to an empty database', async () => {
		const { db, close } = await createTestDb();
		try {
			await db.insert(schema.appMeta).values({ key: 'probe', value: '1' });
			const rows = await db.select().from(schema.appMeta);
			expect(rows).toHaveLength(1);
			const res = await db.execute(sql`select 1 as one`);
			expect(res).toBeTruthy();
		} finally {
			await close();
		}
	});
});
