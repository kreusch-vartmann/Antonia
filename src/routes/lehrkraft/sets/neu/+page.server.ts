import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db, requireTeacher } from '#lib/server/auth/guard.ts';
import { createSet } from '#lib/server/services/sets.ts';
import { ValidationError } from '#lib/server/services/accounts.ts';
import { guarded, str } from '#lib/server/forms.ts';
import { layerFromForm } from '#lib/domain/settings.ts';
import { previewFromForm, withNewTasks } from '#lib/server/wizardForm.ts';

export const load: PageServerLoad = (event) => {
	requireTeacher(event);
	return {};
};

export const actions: Actions = {
	preview: async (event) => {
		requireTeacher(event);
		return previewFromForm(await event.request.formData());
	},
	save: async (event) => {
		const teacherId = requireTeacher(event);
		const form = await event.request.formData();
		const name = str(form, 'name').trim();
		const res = await guarded(async () => {
			if (!name) throw new ValidationError('Bitte dem Set einen Namen geben.', 'name');
			const settings = layerFromForm(form);
			const rounds = Math.min(Math.max(Number(str(form, 'rounds')) || 1, 1), 3);
			if (rounds > 1) settings.rounds = rounds;
			const setId = await withNewTasks(db(), teacherId, form, (taskIds) =>
				createSet(db(), teacherId, {
					name,
					description: str(form, 'description'),
					settings,
					taskIds
				})
			);
			return { setId };
		});
		if (res && 'setId' in res) redirect(303, `/lehrkraft/sets/${res.setId}#zuweisen`);
		return res;
	}
};
