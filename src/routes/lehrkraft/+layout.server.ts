import type { LayoutServerLoad } from './$types';
import { db, endSession, requireTeacher } from '#lib/server/auth/guard.ts';
import { getTeacher } from '#lib/server/services/accounts.ts';
import { error, redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async (event) => {
	const id = requireTeacher(event);
	const teacher = await getTeacher(db(), id);
	if (!teacher) error(403, 'Kein Zugriff');
	if (!teacher.active) {
		// deactivated while logged in
		await endSession(event);
		redirect(303, '/login');
	}
	return { teacher, isAdmin: teacher.role === 'admin' };
};
