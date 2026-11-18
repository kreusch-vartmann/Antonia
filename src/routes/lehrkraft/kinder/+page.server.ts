import type { PageServerLoad } from './$types';
import { db, requireTeacher } from '#lib/server/auth/guard.ts';
import { listStudents } from '#lib/server/services/students.ts';
import { listGroups } from '#lib/server/services/groups.ts';

export const load: PageServerLoad = async (event) => {
	const teacherId = requireTeacher(event);
	const [students, groups] = await Promise.all([
		listStudents(db(), teacherId),
		listGroups(db(), teacherId)
	]);
	return { students, groups };
};
