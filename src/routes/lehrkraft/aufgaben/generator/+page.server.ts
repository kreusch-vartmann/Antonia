import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db, requireTeacher } from '#lib/server/auth/guard.ts';
import { GENERATORS, type GeneratorId } from '#lib/domain/generators.ts';
import { createTasks, parseTagString } from '#lib/server/services/tasks.ts';
import { createSet } from '#lib/server/services/sets.ts';
import { guarded, str } from '#lib/server/forms.ts';
import { arithmeticFromForm } from '#lib/server/taskForm.ts';
import { ZodError } from 'zod';
import type { TaskOrigin } from '#lib/domain/formats/types.ts';

export const load: PageServerLoad = (event) => {
	requireTeacher(event);
	return {};
};

export const actions: Actions = {
	preview: async (event) => {
		requireTeacher(event);
		const form = await event.request.formData();
		const generator = str(form, 'generator') as GeneratorId;
		const g = GENERATORS[generator];
		if (!g) return fail(400, { error: 'Unbekannter Generator.' });
		const params: Record<string, string> = {};
		for (const [k, v] of form.entries()) {
			if (k.startsWith('p.') && typeof v === 'string') params[k.slice(2)] = v;
		}
		params.seed ||= String(Math.floor(Math.random() * 1_000_000));
		try {
			const drafts = g.run(params);
			if (drafts.length === 0)
				return fail(400, { error: 'Mit diesen Einstellungen entstehen keine Aufgaben.' });
			return {
				generator,
				params,
				drafts: drafts.map((d) => d.content),
				tags: drafts[0].tags,
				origin: drafts[0].origin
			};
		} catch (e) {
			if (e instanceof ZodError)
				return fail(400, { error: e.issues[0]?.message ?? 'Ungültige Eingabe.' });
			throw e;
		}
	},
	save: async (event) => {
		const teacherId = requireTeacher(event);
		const form = await event.request.formData();
		const count = Math.min(Number(str(form, 'count')) || 0, 200);
		let origin: TaskOrigin = { kind: 'manual' };
		try {
			const o = JSON.parse(str(form, 'origin').slice(0, 2000));
			if (o?.kind === 'generator' && typeof o.generator === 'string') {
				origin = { kind: 'generator', generator: o.generator, params: o.params ?? {} };
			}
		} catch {
			/* ignore */
		}
		const tags = parseTagString(str(form, 'tags'));
		const res = await guarded(async () => {
			const inputs = [];
			for (let i = 0; i < count; i++) {
				if (form.get(`d.${i}.include`) !== 'on') continue;
				inputs.push({ content: arithmeticFromForm(form, `d.${i}.`), tags, origin });
			}
			if (inputs.length === 0) return fail(400, { error: 'Keine Aufgabe ausgewählt.' });
			const ids = await createTasks(db(), teacherId, inputs);
			if (form.get('asSet') === 'on') {
				const setId = await createSet(db(), teacherId, {
					name: str(form, 'setName') || 'Neues Set',
					taskIds: ids
				});
				return { setId };
			}
			return { saved: ids.length };
		});
		if (res && 'setId' in res && res.setId) redirect(303, `/lehrkraft/sets/${res.setId}`);
		if (res && 'saved' in res) redirect(303, `/lehrkraft/aufgaben?saved=${res.saved}`);
		return res;
	}
};
