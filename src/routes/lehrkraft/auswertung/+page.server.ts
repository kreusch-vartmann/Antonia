import type { PageServerLoad } from './$types';
import { db, requireTeacher } from '#lib/server/auth/guard.ts';
import { overview } from '#lib/server/services/analytics.ts';

export const load: PageServerLoad = async (event) => {
	const teacherId = requireTeacher(event);
	return { students: await overview(db(), teacherId) };
};
