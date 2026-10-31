import { error } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { db, kv, requireStudent } from '#lib/server/auth/guard.ts';
import { act, getRunPayload } from '#lib/server/services/runs.ts';
import { ValidationError } from '#lib/server/services/accounts.ts';

const action = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('answer'),
		key: z.string().max(100),
		value: z.string().max(12),
		ms: z.number().int().min(0).max(3_600_000).nullable()
	}),
	z.object({ type: z.literal('timeout'), key: z.string().max(100) }),
	z.object({ type: z.literal('tick') }),
	z.object({ type: z.literal('abort') })
]);

export const GET: RequestHandler = async (event) => {
	const studentId = requireStudent(event);
	const p = await getRunPayload(db(), kv(), studentId, event.params.runId);
	if (!p) error(404, 'Rennen nicht gefunden');
	return Response.json(p);
};

export const POST: RequestHandler = async (event) => {
	const studentId = requireStudent(event);
	const parsed = action.safeParse(await event.request.json().catch(() => null));
	if (!parsed.success) error(400, 'Ungültige Anfrage');
	try {
		return Response.json(await act(db(), kv(), studentId, event.params.runId, parsed.data));
	} catch (e) {
		if (e instanceof ValidationError) error(404, e.message);
		throw e;
	}
};
