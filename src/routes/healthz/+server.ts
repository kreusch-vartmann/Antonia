import { pingDb } from '#lib/server/db/index.ts';
import { getKv } from '#lib/server/kv/index.ts';
import type { RequestHandler } from './$types';

/** Liveness/readiness probe for Docker/Coolify. Exposes no details. */
export const GET: RequestHandler = async () => {
	const [db, kv] = await Promise.all([pingDb(), getKv().ping()]);
	const ok = db && kv;
	return Response.json(
		{ status: ok ? 'ok' : 'degraded', db, redis: kv },
		{ status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } }
	);
};
