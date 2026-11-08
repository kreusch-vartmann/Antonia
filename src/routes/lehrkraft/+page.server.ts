import type { PageServerLoad } from './$types';
import { db, requireTeacher } from '#lib/server/auth/guard.ts';
import { overview } from '#lib/server/services/analytics.ts';
import { listSets } from '#lib/server/services/sets.ts';

export const load: PageServerLoad = async (event) => {
	const teacherId = requireTeacher(event);
	const [students, sets] = await Promise.all([
		overview(db(), teacherId),
		listSets(db(), teacherId)
	]);
	return { students, setCount: sets.length };
};
