import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db, requireTeacher } from '#lib/server/auth/guard.ts';
import { addItems, getSet, getSetItems } from '#lib/server/services/sets.ts';
import { allTags, listTasks } from '#lib/server/services/tasks.ts';
import { guarded, isUuid, strs } from '#lib/server/forms.ts';
import { formatOf } from '#lib/domain/formats/index.ts';

export const load: PageServerLoad = async (event) => {
	const teacherId = requireTeacher(event);
	if (!isUuid(event.params.id)) error(404, 'Nicht gefunden');
	const set = await getSet(db(), teacherId, event.params.id);
	if (!set) error(404, 'Nicht gefunden');
	const sp = event.url.searchParams;
	const filter = {
		tag: sp.get('tag') || undefined,
		op: sp.get('op') || undefined,
		q: sp.get('q')?.slice(0, 100) || undefined
	};
	const inSet = new Set((await getSetItems(db(), set.id)).map((i) => i.task.id));
	const tasks = await listTasks(db(), teacherId, filter);
	return {
		set: { id: set.id, name: set.name },
		filter,
		tags: await allTags(db(), teacherId),
		tasks: tasks.map((t) => ({
			id: t.id,
			label: formatOf(t.content).label1(t.content),
			answer: t.content.answer,
			tags: t.tags,
			inSet: inSet.has(t.id)
		}))
	};
};

export const actions: Actions = {
	default: async (event) => {
		const teacherId = requireTeacher(event);
		const ids = strs(await event.request.formData(), 'id').filter(isUuid);
		const res = await guarded(async () => {
			await addItems(db(), teacherId, event.params.id, ids);
			return { ok: true };
		});
		if (res && 'ok' in res) redirect(303, `/lehrkraft/sets/${event.params.id}`);
		return res;
	}
};
