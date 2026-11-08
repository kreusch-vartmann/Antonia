import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db, requireTeacher } from '#lib/server/auth/guard.ts';
import { addItems, getSet } from '#lib/server/services/sets.ts';
import { guarded, isUuid } from '#lib/server/forms.ts';
import { previewFromForm, withNewTasks } from '#lib/server/wizardForm.ts';

export const load: PageServerLoad = async (event) => {
	const teacherId = requireTeacher(event);
	if (!isUuid(event.params.id)) error(404, 'Nicht gefunden');
	const set = await getSet(db(), teacherId, event.params.id);
	if (!set) error(404, 'Nicht gefunden');
	return { set: { id: set.id, name: set.name } };
};

export const actions: Actions = {
	preview: async (event) => {
		requireTeacher(event);
		return previewFromForm(await event.request.formData());
	},
	save: async (event) => {
		const teacherId = requireTeacher(event);
		const form = await event.request.formData();
		const res = await guarded(async () => {
			const set = await getSet(db(), teacherId, event.params.id);
			if (!set) error(404, 'Nicht gefunden');
			await withNewTasks(db(), teacherId, form, (taskIds) =>
				addItems(db(), teacherId, event.params.id, taskIds)
			);
			return { ok: true };
		});
		if (res && 'ok' in res) redirect(303, `/lehrkraft/sets/${event.params.id}`);
		return res;
	}
};
