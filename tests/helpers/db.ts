import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { schema, type Db } from '#lib/server/db/types.ts';

/**
 * Creates a fresh in-process PostgreSQL (PGlite) with all migrations applied.
 * Each call returns an isolated database.
 */
export async function createTestDb(): Promise<{ db: Db; close: () => Promise<void> }> {
	const client = new PGlite();
	const pdb = drizzle(client, { schema });
	await migrate(pdb, { migrationsFolder: './drizzle' });
	return { db: pdb as unknown as Db, close: () => client.close() };
}
