import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { SETUP_TOKEN } from '$app/env/private';
import { db, startSession } from '#lib/server/auth/guard.ts';
import { safeEqual } from '#lib/server/auth/crypto.ts';
import { createTeacher, teacherCount, ValidationError } from '#lib/server/services/accounts.ts';

async function setupAllowed() {
	return !!SETUP_TOKEN && (await teacherCount(db())) === 0;
}

export const load: PageServerLoad = async () => {
	if ((await teacherCount(db())) > 0) redirect(303, '/login');
	return { tokenConfigured: !!SETUP_TOKEN };
};

export const actions: Actions = {
	default: async (event) => {
		if (!(await setupAllowed())) error(403, 'Einrichtung nicht möglich');
		const form = await event.request.formData();
		const token = String(form.get('token') ?? '');
		const username = String(form.get('username') ?? '');
		const displayName = String(form.get('displayName') ?? '');
		const password = String(form.get('password') ?? '');
		const password2 = String(form.get('password2') ?? '');
		const values = { username, displayName };
		if (!safeEqual(token, SETUP_TOKEN!)) return fail(403, { ...values, error: 'Einrichtungs-Token ist falsch.' });
		if (password !== password2) return fail(400, { ...values, error: 'Die Passwörter stimmen nicht überein.' });
		let id: string;
		try {
			id = await createTeacher(db(), { username, displayName, password });
		} catch (e) {
			if (e instanceof ValidationError) return fail(400, { ...values, error: e.message });
			throw e;
		}
		await startSession(event, 'teacher', id);
		redirect(303, '/lehrkraft');
	}
};
