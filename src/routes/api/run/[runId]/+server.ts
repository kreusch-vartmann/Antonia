import { json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { db, kv, requireStudent } from '#lib/server/auth/guard.ts';
import { act, getRunPayload, RunError } from '#lib/server/services/runs.ts';
import { log } from '#lib/server/log.ts';

const actionId = z.string().min(8).max(64).optional();

const action = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('answer'),
		key: z.string().max(100),
		value: z.string().max(12),
		// The engine rounds and clamps the time itself.
		ms: z.number().min(0).max(86_400_000).nullable(),
		actionId
	}),
	z.object({ type: z.literal('timeout'), key: z.string().max(100), actionId }),
	z.object({ type: z.literal('tick') }),
	z.object({ type: z.literal('abort'), actionId })
]);

function reject(route: string | null, status: number, code: string, message: string) {
	log.warn('run api rejected', { route, status, code });
	return json({ code, message }, { status });
}

export const GET: RequestHandler = async (event) => {
	const studentId = requireStudent(event);
	const p = await getRunPayload(db(), kv(), studentId, event.params.runId);
	if (!p) return reject(event.route.id, 404, 'not_found', 'Rennen nicht gefunden');
	return json(p);
};

export const POST: RequestHandler = async (event) => {
	const studentId = requireStudent(event);
	const parsed = action.safeParse(await event.request.json().catch(() => null));
	if (!parsed.success) return reject(event.route.id, 400, 'bad_request', 'Ungültige Anfrage');
	try {
		return json(await act(db(), kv(), studentId, event.params.runId, parsed.data));
	} catch (e) {
		if (e instanceof RunError) return reject(event.route.id, 404, e.code, e.message);
		throw e;
	}
};
