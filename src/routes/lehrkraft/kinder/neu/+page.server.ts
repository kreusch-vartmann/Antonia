import type { Actions, PageServerLoad } from './$types';
import { APP_SECRET } from '$app/env/private';
import { db, requireTeacher } from '#lib/server/auth/guard.ts';
import { createStudent } from '#lib/server/services/students.ts';
import { listGroups, setStudentGroups } from '#lib/server/services/groups.ts';
import { guarded, isUuid, str } from '#lib/server/forms.ts';
import { layerFromForm } from '#lib/domain/settings.ts';
import { kidPassword } from '#lib/server/auth/password.ts';

export const load: PageServerLoad = async (event) => {
	const teacherId = requireTeacher(event);
	const groups = await listGroups(db(), teacherId);
	return {
		suggestedPassword: kidPassword(),
		classes: groups.filter((g) => g.kind === 'class').map((g) => ({ id: g.id, name: g.name }))
	};
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
			const classId = str(form, 'classId');
			if (isUuid(classId))
				await setStudentGroups(db(), teacherId, id, { classId, subgroupIds: [] });
			return { created: { id, username: values.username.trim().toLowerCase(), password } };
		}, values);
	}
};
