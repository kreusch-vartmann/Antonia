import { error } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { db, kv, requireStudent } from '#lib/server/auth/guard.ts';
import { startOrResumeRun } from '#lib/server/services/runs.ts';
import { ValidationError } from '#lib/server/services/accounts.ts';

const body = z.object({ assignmentId: z.uuid() });

export const POST: RequestHandler = async (event) => {
	const studentId = requireStudent(event);
	const parsed = body.safeParse(await event.request.json().catch(() => null));
	if (!parsed.success) error(400, 'Ungültige Anfrage');
	try {
		return Response.json(await startOrResumeRun(db(), kv(), studentId, parsed.data.assignmentId));
	} catch (e) {
		if (e instanceof ValidationError) error(400, e.message);
		throw e;
	}
};
