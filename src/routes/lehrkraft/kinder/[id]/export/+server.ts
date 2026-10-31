import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, requireTeacher } from '#lib/server/auth/guard.ts';
import { exportStudentJson } from '#lib/server/services/analytics.ts';
import { audit } from '#lib/server/services/audit.ts';
import { isUuid } from '#lib/server/forms.ts';

export const GET: RequestHandler = async (event) => {
	const teacherId = requireTeacher(event);
	if (!isUuid(event.params.id)) error(404, 'Nicht gefunden');
	const data = await exportStudentJson(db(), teacherId, event.params.id);
	if (!data) error(404, 'Nicht gefunden');
	await audit(db(), teacherId, 'student.export', 'student', event.params.id);
	return new Response(JSON.stringify(data, null, 2), {
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Content-Disposition': `attachment; filename="antonia-export-${event.params.id.slice(0, 8)}.json"`,
			'Cache-Control': 'no-store'
		}
	});
};
