import type { PageServerLoad } from './$types';
import { db, requireTeacher } from '#lib/server/auth/guard.ts';
import { overview } from '#lib/server/services/analytics.ts';
import { listSets } from '#lib/server/services/sets.ts';
import { listTasks } from '#lib/server/services/tasks.ts';

export const load: PageServerLoad = async (event) => {
	const teacherId = requireTeacher(event);
	const [students, sets, tasks] = await Promise.all([
		overview(db(), teacherId),
		listSets(db(), teacherId),
		listTasks(db(), teacherId)
	]);
	return { students, setCount: sets.length, taskCount: tasks.length };
};
