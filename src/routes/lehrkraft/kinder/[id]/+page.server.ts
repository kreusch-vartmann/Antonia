import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db, kv, requireTeacher } from '#lib/server/auth/guard.ts';
import {
	deleteStudent,
	getStudent,
	resetStudentPassword,
	updateStudent
} from '#lib/server/services/students.ts';
import { listAssignmentsForStudent } from '#lib/server/services/sets.ts';
import { guarded, isUuid, str } from '#lib/server/forms.ts';
import { layerFromForm } from '#lib/domain/settings.ts';
import { kidPassword } from '#lib/server/auth/password.ts';
import { destroyAllSessions } from '#lib/server/auth/session.ts';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	const teacherId = requireTeacher(event);
	if (!isUuid(event.params.id)) error(404, 'Nicht gefunden');
	const student = await getStudent(db(), teacherId, event.params.id);
	if (!student) error(404, 'Nicht gefunden');
	const safe: Partial<typeof student> = { ...student };
	delete safe.passwordHash;
	return {
		student: safe as Omit<typeof student, 'passwordHash'>,
		assignments: await listAssignmentsForStudent(db(), teacherId, student.id),
		suggestedPassword: kidPassword()
	};
};

export const actions: Actions = {
	update: async (event) => {
		const teacherId = requireTeacher(event);
		const form = await event.request.formData();
		return guarded(async () => {
			await updateStudent(db(), teacherId, event.params.id, {
				firstName: str(form, 'firstName'),
				lastName: str(form, 'lastName'),
				displayName: str(form, 'displayName'),
				username: str(form, 'username'),
				notes: str(form, 'notes'),
				settings: layerFromForm(form)
			});
			return { saved: true };
		});
	},
	password: async (event) => {
		const teacherId = requireTeacher(event);
		const form = await event.request.formData();
		const password = str(form, 'password');
		return guarded(async () => {
			await resetStudentPassword(db(), teacherId, event.params.id, password);
			await destroyAllSessions(kv(), 'student', event.params.id);
			return { newPassword: password };
		});
	},
	logoutAll: async (event) => {
		const teacherId = requireTeacher(event);
		const s = await getStudent(db(), teacherId, event.params.id);
		if (!s) error(404, 'Nicht gefunden');
		await destroyAllSessions(kv(), 'student', s.id);
		return { loggedOut: true };
	},
	delete: async (event) => {
		const teacherId = requireTeacher(event);
		const form = await event.request.formData();
		const s = await getStudent(db(), teacherId, event.params.id);
		if (!s) error(404, 'Nicht gefunden');
		if (str(form, 'confirm').trim() !== s.firstName) {
			return fail(400, { deleteError: 'Zur Bestätigung bitte den Vornamen genau eintippen.' });
		}
		await destroyAllSessions(kv(), 'student', s.id);
		await deleteStudent(db(), teacherId, s.id);
		redirect(303, '/lehrkraft/kinder');
	}
};
