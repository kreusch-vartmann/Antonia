import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db, requireTeacher } from '#lib/server/auth/guard.ts';
import { allTags, createTasks, parseTagString } from '#lib/server/services/tasks.ts';
import { guarded, str } from '#lib/server/forms.ts';
import { arithmeticFromForm } from '#lib/server/taskForm.ts';
import { layerFromForm } from '#lib/domain/settings.ts';

export const load: PageServerLoad = async (event) => {
	const teacherId = requireTeacher(event);
	return { allTags: await allTags(db(), teacherId) };
};

export const actions: Actions = {
	default: async (event) => {
		const teacherId = requireTeacher(event);
		const form = await event.request.formData();
		const res = await guarded(async () => {
			const content = arithmeticFromForm(form);
			const [id] = await createTasks(db(), teacherId, [
				{ content, tags: parseTagString(str(form, 'tags')), settings: layerFromForm(form) }
			]);
			return { id, another: str(form, 'another') === '1' };
		});
		if (res && 'id' in res) {
			redirect(303, res.another ? '/lehrkraft/aufgaben/neu?saved=1' : '/lehrkraft/aufgaben');
		}
		return res;
	}
};
