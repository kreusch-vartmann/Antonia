import { defineConfig } from 'drizzle-kit';

// `db:generate` works offline; only `db:migrate`/`db:push`/`db:studio` need DATABASE_URL.
export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'postgresql',
	dbCredentials: { url: process.env.DATABASE_URL ?? '' },
	verbose: true,
	strict: true
});
