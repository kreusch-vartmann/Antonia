import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db, requireTeacher } from '#lib/server/auth/guard.ts';
import {
	addItems,
	deleteUnusedTasks,
	getSet,
	getSetItems,
	replaceItemTask,
	setItems
} from '#lib/server/services/sets.ts';
import { createTasks, getTask, taskUsage, updateTask } from '#lib/server/services/tasks.ts';
import { guarded, isUuid } from '#lib/server/forms.ts';
import { arithmeticFromForm } from '#lib/server/taskForm.ts';

/** `/lehrkraft/sets/<set>/aufgabe/neu` creates a task, any other id edits one. */
async function loadSetAndTask(teacherId: string, setId: string, taskId: string) {
	if (!isUuid(setId)) error(404, 'Nicht gefunden');
	const set = await getSet(db(), teacherId, setId);
	if (!set) error(404, 'Nicht gefunden');
	if (taskId === 'neu') return { set, task: null };
	if (!isUuid(taskId)) error(404, 'Nicht gefunden');
	const inSet = (await getSetItems(db(), setId)).some((i) => i.task.id === taskId);
	const task = inSet ? await getTask(db(), teacherId, taskId) : null;
	if (!task) error(404, 'Nicht gefunden');
	return { set, task };
}

export const load: PageServerLoad = async (event) => {
	const teacherId = requireTeacher(event);
	const { set, task } = await loadSetAndTask(teacherId, event.params.id, event.params.taskId);
	return {
		set: { id: set.id, name: set.name },
		task: task ? { id: task.id, content: task.content, updatedAt: task.updatedAt } : null,
		sharedWith: task ? Math.max(0, (await taskUsage(db(), task.id)) - 1) : 0
	};
};

export const actions: Actions = {
	save: async (event) => {
		const teacherId = requireTeacher(event);
		const form = await event.request.formData();
		const { set, task } = await loadSetAndTask(teacherId, event.params.id, event.params.taskId);
		const res = await guarded(async () => {
			const content = arithmeticFromForm(form);
			if (!task) {
				const [id] = await createTasks(db(), teacherId, [{ content }]);
				await addItems(db(), teacherId, set.id, [id]);
				return { created: form.get('another') === '1' ? 'another' : 'back' };
			}
			if ((await taskUsage(db(), task.id)) > 1) {
				// the task is also in another set: this set gets its own changed copy
				const [id] = await createTasks(db(), teacherId, [
					{ content, tags: task.tags, settings: task.settings, origin: task.origin }
				]);
				await replaceItemTask(db(), teacherId, set.id, task.id, id);
				return { saved: true, taskId: id };
			}
			await updateTask(db(), teacherId, task.id, {
				content,
				tags: task.tags,
				settings: task.settings
			});
			return { saved: true, taskId: task.id };
		});
		if (res && 'created' in res) {
			redirect(
				303,
				res.created === 'another'
					? `/lehrkraft/sets/${set.id}/aufgabe/neu?saved=1`
					: `/lehrkraft/sets/${set.id}`
			);
		}
		if (res && 'taskId' in res && res.taskId !== event.params.taskId) {
			redirect(303, `/lehrkraft/sets/${set.id}/aufgabe/${res.taskId}?saved=1`);
		}
		return res;
	},
	remove: async (event) => {
		const teacherId = requireTeacher(event);
		const { set, task } = await loadSetAndTask(teacherId, event.params.id, event.params.taskId);
		if (!task) error(404, 'Nicht gefunden');
		const rest = (await getSetItems(db(), set.id))
			.map((i) => i.task.id)
			.filter((t) => t !== task.id);
		await setItems(db(), teacherId, set.id, rest);
		await deleteUnusedTasks(db(), teacherId, [task.id]);
		redirect(303, `/lehrkraft/sets/${set.id}`);
	}
};
