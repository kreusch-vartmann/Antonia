import type { Actions, PageServerLoad } from './$types';
import { db, requireTeacher } from '#lib/server/auth/guard.ts';
import {
	duplicateSet,
	listSets,
	removeSet,
	setSetHeading,
	writeSetOrder
} from '#lib/server/services/sets.ts';
import {
	createHeading,
	deleteHeading,
	listHeadings,
	renameHeading
} from '#lib/server/services/headings.ts';
import { getPreferences, updatePreferences } from '#lib/server/services/preferences.ts';
import { guarded, isUuid, str } from '#lib/server/forms.ts';
import { groupSets, headingOrder, moveInList } from '#lib/domain/setOrder.ts';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	const teacherId = requireTeacher(event);
	const [sets, headings, prefs] = await Promise.all([
		listSets(db(), teacherId),
		listHeadings(db(), teacherId),
		getPreferences(db(), teacherId)
	]);
	return { sets, headings, headingOrder: prefs.headingOrder ?? [] };
};

const dir = (v: string) => (v === 'up' ? 'up' : 'down');

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
	},
	moveSet: async (event) => {
		const teacherId = requireTeacher(event);
		const form = await event.request.formData();
		const id = str(form, 'id');
		if (!isUuid(id)) return;
		return guarded(async () => {
			const [sets, headings, prefs] = await Promise.all([
				listSets(db(), teacherId),
				listHeadings(db(), teacherId),
				getPreferences(db(), teacherId)
			]);
			const list = sets.map((s) => ({ ...s, autoRange: s.range }));
			const group = groupSets(list, headings, prefs.headingOrder).find((g) =>
				g.sets.some((s) => s.id === id)
			);
			if (!group) return;
			const ids = moveInList(
				group.sets.map((s) => s.id),
				id,
				dir(str(form, 'dir'))
			);
			await writeSetOrder(db(), teacherId, ids);
		});
	},
	setHeading: async (event) => {
		const teacherId = requireTeacher(event);
		const form = await event.request.formData();
		const id = str(form, 'id');
		if (!isUuid(id)) return;
		return guarded(() => setSetHeading(db(), teacherId, id, str(form, 'heading') || null));
	},
	moveHeading: async (event) => {
		const teacherId = requireTeacher(event);
		const form = await event.request.formData();
		const key = str(form, 'key');
		const [headings, prefs] = await Promise.all([
			listHeadings(db(), teacherId),
			getPreferences(db(), teacherId)
		]);
		const order = headingOrder(prefs.headingOrder, headings);
		if (!order.includes(key)) return;
		await updatePreferences(db(), teacherId, {
			headingOrder: moveInList(order, key, dir(str(form, 'dir')))
		});
	},
	createHeading: async (event) => {
		const teacherId = requireTeacher(event);
		const name = str(await event.request.formData(), 'name');
		return guarded(async () => {
			await createHeading(db(), teacherId, name);
		});
	},
	renameHeading: async (event) => {
		const teacherId = requireTeacher(event);
		const form = await event.request.formData();
		const id = str(form, 'id');
		if (!isUuid(id)) return;
		return guarded(() => renameHeading(db(), teacherId, id, str(form, 'name')));
	},
	deleteHeading: async (event) => {
		const teacherId = requireTeacher(event);
		const id = str(await event.request.formData(), 'id');
		if (!isUuid(id)) return;
		await deleteHeading(db(), teacherId, id);
	}
};
