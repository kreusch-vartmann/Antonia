import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import { DATABASE_URL } from '$app/env/private';
import { schema, type Db } from './types';

export type { Db };

let client: postgres.Sql | undefined;
let instance: Db | undefined;

/** Lazily creates the connection pool, so nothing connects at build time. */
export function getDb(): Db {
	if (!instance) {
		client = postgres(DATABASE_URL, {
			max: Number(process.env.DB_POOL_MAX) || 10,
			idle_timeout: 30,
			connect_timeout: 10,
			onnotice: () => {}
		});
		instance = drizzle(client, { schema }) as unknown as Db;
	}
	return instance;
}

export async function runMigrations(migrationsFolder: string) {
	const db = getDb() as unknown as Parameters<typeof migrate>[0];
	await migrate(db, { migrationsFolder });
}

export async function pingDb(): Promise<boolean> {
	try {
		await getDb().execute(sql`select 1`);
		return true;
	} catch {
		return false;
	}
}

export async function closeDb() {
	await client?.end({ timeout: 5 });
	client = undefined;
	instance = undefined;
}
