import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db, requireTeacher } from '#lib/server/auth/guard.ts';
import { studentReport } from '#lib/server/services/analytics.ts';
import { getStudent } from '#lib/server/services/students.ts';
import { isUuid } from '#lib/server/forms.ts';

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

export const load: PageServerLoad = async (event) => {
	const teacherId = requireTeacher(event);
	if (!isUuid(event.params.id)) error(404, 'Nicht gefunden');
	const s = await getStudent(db(), teacherId, event.params.id);
	if (!s) error(404, 'Nicht gefunden');
	const from = event.url.searchParams.get('from') ?? '';
	const to = event.url.searchParams.get('to') ?? '';
	const period = {
		from: dateRe.test(from) ? from : undefined,
		to: dateRe.test(to) ? to : undefined
	};
	return {
		student: { id: s.id, firstName: s.firstName, lastName: s.lastName, displayName: s.displayName },
		period,
		report: await studentReport(db(), teacherId, s.id, period)
	};
};
