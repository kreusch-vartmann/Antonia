import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db, requireTeacher } from '#lib/server/auth/guard.ts';
import {
	allTags,
	deleteTasks,
	getTask,
	parseTagString,
	taskUsage,
	updateTask
} from '#lib/server/services/tasks.ts';
import { guarded, isUuid, str } from '#lib/server/forms.ts';
import { arithmeticFromForm } from '#lib/server/taskForm.ts';
import { layerFromForm } from '#lib/domain/settings.ts';

export const load: PageServerLoad = async (event) => {
	const teacherId = requireTeacher(event);
	if (!isUuid(event.params.id)) error(404, 'Nicht gefunden');
	const task = await getTask(db(), teacherId, event.params.id);
	if (!task) error(404, 'Nicht gefunden');
	return { task, usage: await taskUsage(db(), task.id), allTags: await allTags(db(), teacherId) };
};

export const actions: Actions = {
	save: async (event) => {
		const teacherId = requireTeacher(event);
		const form = await event.request.formData();
		return guarded(async () => {
			await updateTask(db(), teacherId, event.params.id, {
				content: arithmeticFromForm(form),
				tags: parseTagString(str(form, 'tags')),
				settings: layerFromForm(form)
			});
			return { saved: true };
		});
	},
	delete: async (event) => {
		const teacherId = requireTeacher(event);
		await deleteTasks(db(), teacherId, [event.params.id]);
		redirect(303, '/lehrkraft/aufgaben');
	}
};
