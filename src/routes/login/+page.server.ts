import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db, kv, safeNext, startSession } from '#lib/server/auth/guard.ts';
import { login, teacherCount } from '#lib/server/services/accounts.ts';
import { createPending2fa } from '#lib/server/auth/session.ts';
import { audit } from '#lib/server/services/audit.ts';
import { dev } from '$app/env';
import { USERNAME_RE } from '#lib/server/auth/password.ts';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.session) redirect(303, '/');
	// the QR code on the access card brings the user name along
	const u = (url.searchParams.get('u') ?? '').trim().toLowerCase();
	return { needsSetup: (await teacherCount(db())) === 0, prefill: USERNAME_RE.test(u) ? u : '' };
};

export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData();
		const username = String(form.get('username') ?? '');
		const password = String(form.get('password') ?? '');
		if (!username || !password)
			return fail(400, { username, error: 'Bitte Benutzername und Passwort eingeben.' });

		const r = await login(db(), kv(), { username, password, ip: event.getClientAddress() });
		if (!r.ok) {
			if (r.error === 'locked') {
				const min = Math.ceil((r.retryAfter ?? 900) / 60);
				return fail(429, {
					username,
					error: `Zu viele Versuche. Bitte in ${min} Minuten erneut versuchen.`
				});
			}
			return fail(400, { username, error: 'Benutzername oder Passwort stimmt nicht.' });
		}
		if (r.needs2fa) {
			const token = await createPending2fa(kv(), r.userId);
			event.cookies.set('antonia_2fa', token, {
				path: '/login',
				httpOnly: true,
				secure: !dev,
				sameSite: 'strict',
				maxAge: 300
			});
			redirect(
				303,
				`/login/2fa?next=${encodeURIComponent(event.url.searchParams.get('next') ?? '')}`
			);
		}
		await startSession(event, r.role, r.userId);
		if (r.role === 'teacher') {
			await audit(db(), r.userId, 'teacher.login', 'teacher', r.userId);
			redirect(303, safeNext(event.url.searchParams.get('next'), '/lehrkraft'));
		}
		redirect(303, '/ueben');
	}
};
