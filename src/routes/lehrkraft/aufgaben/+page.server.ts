import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db, requireTeacher } from '#lib/server/auth/guard.ts';
import { addTagToTasks, allTags, deleteTasks, listTasks } from '#lib/server/services/tasks.ts';
import { addItems, createSet, listSets } from '#lib/server/services/sets.ts';
import { guarded, isUuid, str, strs } from '#lib/server/forms.ts';
import { formatOf } from '#lib/domain/formats/index.ts';

export const load: PageServerLoad = async (event) => {
	const teacherId = requireTeacher(event);
	const sp = event.url.searchParams;
	const filter = {
		tag: sp.get('tag') || undefined,
		op: sp.get('op') || undefined,
		q: sp.get('q')?.slice(0, 100) || undefined
	};
	const [tasks, tags, sets] = await Promise.all([
		listTasks(db(), teacherId, filter),
		allTags(db(), teacherId),
		listSets(db(), teacherId)
	]);
	return {
		filter,
		tags,
		sets: sets.map((s) => ({ id: s.id, name: s.name })),
		tasks: tasks.map((t) => ({
			id: t.id,
			label: formatOf(t.content).label1(t.content),
			answer: t.content.answer,
			tags: t.tags,
			generated: t.origin.kind === 'generator',
			hasSettings: Object.keys(t.settings).length > 0
		}))
	};
};

export const actions: Actions = {
	bulk: async (event) => {
		const teacherId = requireTeacher(event);
		const form = await event.request.formData();
		const ids = strs(form, 'id').filter(isUuid);
		const op = str(form, 'op');
		if (ids.length === 0) return fail(400, { error: 'Bitte Aufgaben auswählen.' });
		return guarded(async () => {
			if (op === 'delete') {
				const n = await deleteTasks(db(), teacherId, ids);
				return { message: `${n} Aufgabe(n) gelöscht.` };
			}
			if (op === 'tag') {
				await addTagToTasks(db(), teacherId, ids, str(form, 'tag'));
				return { message: 'Schlagwort hinzugefügt.' };
			}
			if (op === 'addToSet') {
				const setId = str(form, 'setId');
				if (!isUuid(setId)) return fail(400, { error: 'Bitte ein Set wählen.' });
				await addItems(db(), teacherId, setId, ids);
				redirect(303, `/lehrkraft/sets/${setId}`);
			}
			if (op === 'newSet') {
				const name = str(form, 'setName') || 'Neues Set';
				const setId = await createSet(db(), teacherId, { name, taskIds: ids });
				redirect(303, `/lehrkraft/sets/${setId}`);
			}
			return fail(400, { error: 'Unbekannte Aktion.' });
		});
	}
};
