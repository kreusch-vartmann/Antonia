import { fail } from '@sveltejs/kit';
import { ZodError } from 'zod';
import type { Db } from './db/types';
import { nestParams, str } from './forms';
import { arithmeticFromForm } from './taskForm';
import { createTasks, deleteTasks, parseTagString } from './services/tasks';
import { ValidationError } from './services/accounts';
import { generateFromWizard, suggestSetName, type WizardPreview } from '#lib/domain/wizard.ts';
import type { TaskOrigin } from '#lib/domain/formats/types.ts';

/** Form fields of the wizard that hold several values. */
const ARRAY_KEYS = ['gaps', 'rows'];

/** The "preview" action of the wizard: generates drafts from the form fields "p.*". */
export async function previewFromForm(form: FormData) {
	const params = nestParams(form, ARRAY_KEYS);
	params.seed = String(Math.floor(Math.random() * 1_000_000));
	try {
		const r = generateFromWizard(params);
		if (r.drafts.length === 0)
			return fail(400, {
				error: r.warnings[0] ?? 'Mit diesen Einstellungen entstehen keine Aufgaben.',
				where: 'preview'
			});
		const preview: WizardPreview = {
			params,
			drafts: r.drafts.map((d) => d.content),
			warnings: r.warnings,
			tags: r.tags,
			origin: r.origin,
			name: suggestSetName(params)
		};
		return { preview };
	} catch (e) {
		if (e instanceof ZodError)
			return fail(400, { error: e.issues[0]?.message ?? 'Ungültige Eingabe.' });
		throw e;
	}
}

/** Reads the (edited) draft rows "d.<i>.*" and saves the ticked ones as tasks. */
export async function createDraftTasks(db: Db, teacherId: string, form: FormData) {
	const count = Math.min(Math.max(Number(str(form, 'count')) || 0, 0), 300);
	let origin: TaskOrigin = { kind: 'manual' };
	try {
		const o = JSON.parse(str(form, 'origin').slice(0, 4000));
		if (o?.kind === 'generator' && typeof o.generator === 'string') {
			origin = { kind: 'generator', generator: o.generator, params: o.params ?? {} };
		}
	} catch {
		/* manual */
	}
	const tags = parseTagString(str(form, 'tags'));
	const inputs = [];
	for (let i = 0; i < count; i++) {
		if (form.get(`d.${i}.include`) !== 'on') continue;
		// empty rows of the manual input are ignored
		if (!str(form, `d.${i}.a`).trim() && !str(form, `d.${i}.b`).trim()) continue;
		inputs.push({ content: arithmeticFromForm(form, `d.${i}.`), tags, origin });
	}
	if (inputs.length === 0) throw new ValidationError('Keine Aufgabe ausgewählt.');
	if (inputs.length > 200) throw new ValidationError('Höchstens 200 Aufgaben auf einmal.');
	return createTasks(db, teacherId, inputs);
}

/** Runs `fn` with freshly created tasks and removes them again if it fails. */
export async function withNewTasks<T>(
	db: Db,
	teacherId: string,
	form: FormData,
	fn: (taskIds: string[]) => Promise<T>
): Promise<T> {
	const ids = await createDraftTasks(db, teacherId, form);
	try {
		return await fn(ids);
	} catch (e) {
		await deleteTasks(db, teacherId, ids);
		throw e;
	}
}
