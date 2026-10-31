import type { LayoutServerLoad } from './$types';
import { db, requireTeacher } from '#lib/server/auth/guard.ts';
import { getTeacher } from '#lib/server/services/accounts.ts';
import { error } from '@sveltejs/kit';

export const load: LayoutServerLoad = async (event) => {
	const id = requireTeacher(event);
	const teacher = await getTeacher(db(), id);
	if (!teacher) error(403, 'Kein Zugriff');
	return { teacher };
};
