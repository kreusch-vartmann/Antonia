import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db, requireTeacher } from '#lib/server/auth/guard.ts';
import { runDetail } from '#lib/server/services/analytics.ts';
import { isUuid } from '#lib/server/forms.ts';
import { formatOf } from '#lib/domain/formats/index.ts';

export const load: PageServerLoad = async (event) => {
	const teacherId = requireTeacher(event);
	if (!isUuid(event.params.id)) error(404, 'Nicht gefunden');
	const d = await runDetail(db(), teacherId, event.params.id);
	if (!d) error(404, 'Nicht gefunden');
	return {
		run: d.run,
		setName: d.setName,
		studentName: d.studentName,
		studentId: d.studentId,
		events: d.events.map((e) => ({
			...e,
			label: formatOf(e.taskSnapshot).label1(e.taskSnapshot),
			solution: formatOf(e.taskSnapshot).solution(e.taskSnapshot)
		}))
	};
};
