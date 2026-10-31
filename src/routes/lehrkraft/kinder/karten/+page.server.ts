import type { Actions, PageServerLoad } from './$types';
import { db, kv, requireTeacher } from '#lib/server/auth/guard.ts';
import { listStudents, resetStudentPassword } from '#lib/server/services/students.ts';
import { kidPassword } from '#lib/server/auth/password.ts';
import { destroyAllSessions } from '#lib/server/auth/session.ts';
import { strs } from '#lib/server/forms.ts';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	const teacherId = requireTeacher(event);
	return { students: await listStudents(db(), teacherId) };
};

export const actions: Actions = {
	default: async (event) => {
		const teacherId = requireTeacher(event);
		const ids = strs(await event.request.formData(), 'id');
		if (ids.length === 0) return fail(400, { error: 'Bitte mindestens ein Kind auswählen.' });
		const students = await listStudents(db(), teacherId);
		const passwords: Record<string, string> = {};
		for (const s of students.filter((s) => ids.includes(s.id))) {
			const pw = kidPassword();
			await resetStudentPassword(db(), teacherId, s.id, pw);
			await destroyAllSessions(kv(), 'student', s.id);
			passwords[s.id] = pw;
		}
		return { passwords };
	}
};
