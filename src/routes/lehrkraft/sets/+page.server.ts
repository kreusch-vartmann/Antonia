import type { Actions, PageServerLoad } from './$types';
import { db, requireTeacher } from '#lib/server/auth/guard.ts';
import { duplicateSet, listSets, removeSet } from '#lib/server/services/sets.ts';
import { guarded, isUuid, str } from '#lib/server/forms.ts';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	const teacherId = requireTeacher(event);
	return { sets: await listSets(db(), teacherId) };
};

export const actions: Actions = {
	duplicate: async (event) => {
		const teacherId = requireTeacher(event);
		const id = str(await event.request.formData(), 'id');
		if (!isUuid(id)) return;
		const res = await guarded(() => duplicateSet(db(), teacherId, id));
		if (typeof res === 'string') redirect(303, `/lehrkraft/sets/${res}`);
		return res;
	},
	remove: async (event) => {
		const teacherId = requireTeacher(event);
		const id = str(await event.request.formData(), 'id');
		if (!isUuid(id)) return;
		const r = await removeSet(db(), teacherId, id);
		return {
			message: r === 'archived' ? 'Set archiviert (Ergebnisse bleiben erhalten).' : 'Set gelöscht.'
		};
	}
};
