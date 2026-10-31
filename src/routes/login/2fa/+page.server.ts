import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { APP_SECRET } from '$app/env/private';
import { db, kv, safeNext, startSession } from '#lib/server/auth/guard.ts';
import { clearPending2fa, readPending2fa } from '#lib/server/auth/session.ts';
import { verifySecondFactor } from '#lib/server/services/accounts.ts';
import { audit } from '#lib/server/services/audit.ts';

export const load: PageServerLoad = async ({ cookies }) => {
	const teacherId = await readPending2fa(kv(), cookies.get('antonia_2fa'));
	if (!teacherId) redirect(303, '/login');
	return {};
};

export const actions: Actions = {
	default: async (event) => {
		const token = event.cookies.get('antonia_2fa');
		const teacherId = await readPending2fa(kv(), token);
		if (!teacherId || !token) redirect(303, '/login');
		const code = String((await event.request.formData()).get('code') ?? '');
		const r = await verifySecondFactor(db(), kv(), APP_SECRET, teacherId, code);
		if (!r.ok) {
			if (r.locked) return fail(429, { error: 'Zu viele Versuche. Bitte später erneut anmelden.' });
			return fail(400, { error: 'Der Code stimmt nicht.' });
		}
		await clearPending2fa(kv(), token);
		event.cookies.delete('antonia_2fa', { path: '/login' });
		await startSession(event, 'teacher', teacherId);
		await audit(db(), teacherId, 'teacher.login', 'teacher', teacherId);
		redirect(303, safeNext(event.url.searchParams.get('next'), '/lehrkraft'));
	}
};
