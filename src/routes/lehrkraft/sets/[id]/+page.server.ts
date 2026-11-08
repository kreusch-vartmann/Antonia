import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db, requireTeacher } from '#lib/server/auth/guard.ts';
import {
	assign,
	deleteUnusedTasks,
	getSet,
	getSetItems,
	listAssignmentsForSet,
	setItems,
	updateSet
} from '#lib/server/services/sets.ts';
import { listStudents } from '#lib/server/services/students.ts';
import { guarded, isUuid, str, strs } from '#lib/server/forms.ts';
import { layerFromForm } from '#lib/domain/settings.ts';
import { cleanModes } from '#lib/domain/modes.ts';
import { formatOf } from '#lib/domain/formats/index.ts';

export const load: PageServerLoad = async (event) => {
	const teacherId = requireTeacher(event);
	if (!isUuid(event.params.id)) error(404, 'Nicht gefunden');
	const set = await getSet(db(), teacherId, event.params.id);
	if (!set) error(404, 'Nicht gefunden');
	const [items, assignments, students] = await Promise.all([
		getSetItems(db(), set.id),
		listAssignmentsForSet(db(), teacherId, set.id),
		listStudents(db(), teacherId)
	]);
	return {
		set,
		items: items.map((i) => ({
			itemId: i.itemId,
			taskId: i.task.id,
			label: formatOf(i.task.content).label1(i.task.content),
			answer: i.task.content.answer,
			decompose: i.task.content.decompose ?? null
		})),
		assignments,
		students
	};
};

async function currentOrder(setId: string) {
	return (await getSetItems(db(), setId)).map((i) => i.task.id);
}

export const actions: Actions = {
	update: async (event) => {
		const teacherId = requireTeacher(event);
		const form = await event.request.formData();
		return guarded(async () => {
			await updateSet(db(), teacherId, event.params.id, {
				name: str(form, 'name'),
				description: str(form, 'description'),
				settings: layerFromForm(form)
			});
			return { saved: 'set' };
		});
	},
	move: async (event) => {
		const teacherId = requireTeacher(event);
		const form = await event.request.formData();
		const taskId = str(form, 'taskId');
		const dir = str(form, 'dir');
		const order = await currentOrder(event.params.id);
		const i = order.indexOf(taskId);
		if (i < 0) return;
		const j = dir === 'up' ? i - 1 : dir === 'down' ? i + 1 : dir === 'top' ? 0 : order.length - 1;
		if (j < 0 || j >= order.length || j === i) return;
		order.splice(i, 1);
		order.splice(j, 0, taskId);
		await setItems(db(), teacherId, event.params.id, order);
	},
	remove: async (event) => {
		const teacherId = requireTeacher(event);
		const taskId = str(await event.request.formData(), 'taskId');
		const order = (await currentOrder(event.params.id)).filter((t) => t !== taskId);
		await setItems(db(), teacherId, event.params.id, order);
		// tasks only live inside sets
		await deleteUnusedTasks(db(), teacherId, [taskId]);
	},
	shuffle: async (event) => {
		const teacherId = requireTeacher(event);
		const order = await currentOrder(event.params.id);
		for (let i = order.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[order[i], order[j]] = [order[j], order[i]];
		}
		await setItems(db(), teacherId, event.params.id, order);
	},
	assign: async (event) => {
		const teacherId = requireTeacher(event);
		const form = await event.request.formData();
		return guarded(async () => {
			await assign(db(), teacherId, {
				setId: event.params.id,
				studentIds: strs(form, 'studentId').filter(isUuid),
				startsOn: str(form, 'startsOn') || null,
				endsOn: str(form, 'endsOn') || null,
				settings: layerFromForm(form),
				modes: cleanModes(strs(form, 'mode'))
			});
			return { saved: 'assign' };
		});
	}
};
