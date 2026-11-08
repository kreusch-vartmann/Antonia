import { json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { db, kv, requireStudent } from '#lib/server/auth/guard.ts';
import { RunError, startOrResumeRun, type RunErrorCode } from '#lib/server/services/runs.ts';
import { RUN_MODES } from '#lib/domain/modes.ts';
import { log } from '#lib/server/log.ts';

const body = z.object({
	assignmentId: z.uuid(),
	mode: z.enum(RUN_MODES).default('normal'),
	fresh: z.boolean().default(false)
});

const RUN_ERROR_STATUS: Record<RunErrorCode, number> = {
	not_found: 404,
	not_available: 409,
	mode_locked: 409,
	no_tasks: 409,
	no_target: 409
};

function reject(route: string | null, status: number, code: string, message: string) {
	log.warn('run api rejected', { route, status, code });
	return json({ code, message }, { status });
}

export const POST: RequestHandler = async (event) => {
	const studentId = requireStudent(event);
	const parsed = body.safeParse(await event.request.json().catch(() => null));
	if (!parsed.success) return reject(event.route.id, 400, 'bad_request', 'Ungültige Anfrage');
	try {
		const { assignmentId, mode, fresh } = parsed.data;
		return json(
			await startOrResumeRun(db(), kv(), studentId, assignmentId, mode, Date.now(), { fresh })
		);
	} catch (e) {
		if (e instanceof RunError)
			return reject(event.route.id, RUN_ERROR_STATUS[e.code], e.code, e.message);
		throw e;
	}
};
