import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db, requireTeacher } from '#lib/server/auth/guard.ts';
import { createSet } from '#lib/server/services/sets.ts';
import { guarded, str } from '#lib/server/forms.ts';
import { layerFromForm } from '#lib/domain/settings.ts';

export const load: PageServerLoad = (event) => {
	requireTeacher(event);
	return {};
};

export const actions: Actions = {
	default: async (event) => {
		const teacherId = requireTeacher(event);
		const form = await event.request.formData();
		const values = { name: str(form, 'name'), description: str(form, 'description') };
		const res = await guarded(
			() => createSet(db(), teacherId, { ...values, settings: layerFromForm(form) }),
			values
		);
		if (typeof res === 'string') redirect(303, `/lehrkraft/sets/${res}`);
		return res;
	}
};
