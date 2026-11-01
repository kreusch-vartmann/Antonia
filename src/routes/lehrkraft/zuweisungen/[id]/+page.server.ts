import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db, requireTeacher } from '#lib/server/auth/guard.ts';
import {
	deleteAssignment,
	getAssignmentForTeacher,
	getSetItems,
	updateAssignment
} from '#lib/server/services/sets.ts';
import { guarded, isUuid, str, strs } from '#lib/server/forms.ts';
import { layerFromForm, resolveSettings } from '#lib/domain/settings.ts';
import { cleanModes } from '#lib/domain/modes.ts';

export const load: PageServerLoad = async (event) => {
	const teacherId = requireTeacher(event);
	if (!isUuid(event.params.id)) error(404, 'Nicht gefunden');
	const a = await getAssignmentForTeacher(db(), teacherId, event.params.id);
	if (!a) error(404, 'Nicht gefunden');
	const below = resolveSettings({ set: a.set.settings, student: a.student.settings });
	const effective = resolveSettings({
		set: a.set.settings,
		student: a.student.settings,
		assignment: a.assignment.settings
	});
	const taskCount = (await getSetItems(db(), a.set.id)).length;
	return { a, below, effective, taskCount };
};

export const actions: Actions = {
	save: async (event) => {
		const teacherId = requireTeacher(event);
		const form = await event.request.formData();
		return guarded(async () => {
			await updateAssignment(db(), teacherId, event.params.id, {
				startsOn: str(form, 'startsOn') || null,
				endsOn: str(form, 'endsOn') || null,
				archived: form.get('archived') === 'on',
				settings: layerFromForm(form),
				modes: cleanModes(strs(form, 'mode'))
			});
			return { saved: true };
		});
	},
	delete: async (event) => {
		const teacherId = requireTeacher(event);
		const a = await getAssignmentForTeacher(db(), teacherId, event.params.id);
		if (!a) error(404, 'Nicht gefunden');
		await deleteAssignment(db(), teacherId, event.params.id);
		redirect(303, `/lehrkraft/sets/${a.set.id}`);
	}
};
