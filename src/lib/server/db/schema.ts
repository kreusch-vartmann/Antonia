/**
 * Database schema.
 *
 * Tables are added milestone by milestone (see docs/PLAN.md). After changing
 * this file run `npm run db:generate` to create a SQL migration in ./drizzle.
 */
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/** Technical key/value metadata (e.g. schema/app version). Never personal data. */
export const appMeta = pgTable('app_meta', {
	key: text('key').primaryKey(),
	value: text('value').notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});
