import type { Actions, PageServerLoad } from './$types';
import { db, requireTeacher } from '#lib/server/auth/guard.ts';
import { listStudents } from '#lib/server/services/students.ts';
import {
	createGroup,
	deleteGroup,
	listGroups,
	moveGroup,
	renameGroup,
	setGroupMembers
} from '#lib/server/services/groups.ts';
import { guarded, isUuid, str, strs } from '#lib/server/forms.ts';

export const load: PageServerLoad = async (event) => {
	const teacherId = requireTeacher(event);
	const [groups, students] = await Promise.all([
		listGroups(db(), teacherId),
		listStudents(db(), teacherId)
	]);
	return { groups, students };
};

export const actions: Actions = {
	create: async (event) => {
		const teacherId = requireTeacher(event);
		const form = await event.request.formData();
		const kind = str(form, 'kind') === 'subgroup' ? 'subgroup' : 'class';
		return guarded(async () => {
			await createGroup(db(), teacherId, { name: str(form, 'name'), kind });
			return { saved: 'create' };
		});
	},
	rename: async (event) => {
		const teacherId = requireTeacher(event);
		const form = await event.request.formData();
		const id = str(form, 'id');
		if (!isUuid(id)) return;
		return guarded(async () => {
			await renameGroup(db(), teacherId, id, str(form, 'name'));
			return { saved: id };
		});
	},
	remove: async (event) => {
		const teacherId = requireTeacher(event);
		const id = str(await event.request.formData(), 'id');
		if (!isUuid(id)) return;
		return guarded(async () => {
			await deleteGroup(db(), teacherId, id);
			return { saved: 'remove' };
		});
	},
	move: async (event) => {
		const teacherId = requireTeacher(event);
		const form = await event.request.formData();
		const id = str(form, 'id');
		if (!isUuid(id)) return;
		return guarded(async () => {
			await moveGroup(db(), teacherId, id, str(form, 'dir') === 'up' ? 'up' : 'down');
			return { saved: 'move' };
		});
	},
	members: async (event) => {
		const teacherId = requireTeacher(event);
		const form = await event.request.formData();
		const id = str(form, 'id');
		if (!isUuid(id)) return;
		return guarded(async () => {
			await setGroupMembers(db(), teacherId, id, strs(form, 'studentId').filter(isUuid));
			return { saved: id };
		});
	}
};
