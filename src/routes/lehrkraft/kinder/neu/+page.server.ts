import type { Actions, PageServerLoad } from './$types';
import { APP_SECRET } from '$app/env/private';
import { db, requireTeacher } from '#lib/server/auth/guard.ts';
import { createStudent } from '#lib/server/services/students.ts';
import { guarded, str } from '#lib/server/forms.ts';
import { layerFromForm } from '#lib/domain/settings.ts';
import { kidPassword } from '#lib/server/auth/password.ts';

export const load: PageServerLoad = async (event) => {
	requireTeacher(event);
	return { suggestedPassword: kidPassword() };
};

export const actions: Actions = {
	default: async (event) => {
		const teacherId = requireTeacher(event);
		const form = await event.request.formData();
		const values = {
			firstName: str(form, 'firstName'),
			lastName: str(form, 'lastName'),
			displayName: str(form, 'displayName'),
			username: str(form, 'username'),
			notes: str(form, 'notes')
		};
		const password = str(form, 'password');
		return guarded(async () => {
			const id = await createStudent(
				db(),
				teacherId,
				{ ...values, password, settings: layerFromForm(form) },
				APP_SECRET
			);
			return { created: { id, username: values.username.trim().toLowerCase(), password } };
		}, values);
	}
};
