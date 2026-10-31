import type { PageServerLoad } from './$types';
import { db, requireTeacher } from '#lib/server/auth/guard.ts';
import { listStudents } from '#lib/server/services/students.ts';

export const load: PageServerLoad = async (event) => {
	const teacherId = requireTeacher(event);
	return { students: await listStudents(db(), teacherId) };
};
