import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema';

export { schema };

/**
 * Database type shared by the production driver (postgres.js) and the test
 * driver (PGlite). Services receive a `Db` as a parameter so they can be tested
 * against an in-process PostgreSQL.
 */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
