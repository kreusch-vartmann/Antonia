import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db, kv, requireAdmin } from '#lib/server/auth/guard.ts';
import {
	createTeacherByAdmin,
	listTeachers,
	resetTeacherPassword,
	setActive,
	setRole,
	transferStudents
} from '#lib/server/services/teachers.ts';
import { guarded, isUuid, str } from '#lib/server/forms.ts';

export const load: PageServerLoad = async (event) => {
	await requireAdmin(event);
	return { teachers: await listTeachers(db()) };
};

export const actions: Actions = {
	create: async (event) => {
		const adminId = await requireAdmin(event);
		const form = await event.request.formData();
		const values = { username: str(form, 'username'), displayName: str(form, 'displayName') };
		return guarded(async () => {
			const r = await createTeacherByAdmin(db(), adminId, values);
			return { created: { username: values.username.trim().toLowerCase(), password: r.password } };
		}, values);
	},
	password: async (event) => {
		const adminId = await requireAdmin(event);
		const id = str(await event.request.formData(), 'id');
		if (!isUuid(id)) return fail(400, { error: 'Unbekannte Lehrkraft.' });
		return guarded(async () => ({
			newPassword: { id, password: await resetTeacherPassword(db(), kv(), adminId, id) }
		}));
	},
	role: async (event) => {
		const adminId = await requireAdmin(event);
		const form = await event.request.formData();
		const id = str(form, 'id');
		if (!isUuid(id)) return fail(400, { error: 'Unbekannte Lehrkraft.' });
		const role = str(form, 'role') === 'admin' ? 'admin' : 'teacher';
		return guarded(async () => {
			await setRole(db(), adminId, id, role);
			return { done: true };
		});
	},
	active: async (event) => {
		const adminId = await requireAdmin(event);
		const form = await event.request.formData();
		const id = str(form, 'id');
		if (!isUuid(id)) return fail(400, { error: 'Unbekannte Lehrkraft.' });
		return guarded(async () => {
			await setActive(db(), kv(), adminId, id, str(form, 'active') === 'true');
			return { done: true };
		});
	},
	transfer: async (event) => {
		const adminId = await requireAdmin(event);
		const form = await event.request.formData();
		const from = str(form, 'from');
		const to = str(form, 'to');
		if (!isUuid(from) || !isUuid(to)) return fail(400, { error: 'Bitte zwei Lehrkräfte wählen.' });
		return guarded(async () => ({ transferred: await transferStudents(db(), adminId, from, to) }));
	}
};
