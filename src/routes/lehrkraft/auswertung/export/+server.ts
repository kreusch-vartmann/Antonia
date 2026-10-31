import type { RequestHandler } from './$types';
import { db, requireTeacher } from '#lib/server/auth/guard.ts';
import { exportCsv } from '#lib/server/services/analytics.ts';
import { listStudents } from '#lib/server/services/students.ts';
import { audit } from '#lib/server/services/audit.ts';
import { isUuid } from '#lib/server/forms.ts';

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

export const GET: RequestHandler = async (event) => {
	const teacherId = requireTeacher(event);
	const sp = event.url.searchParams;
	let ids = sp.getAll('id').filter(isUuid);
	if (ids.length === 0) ids = (await listStudents(db(), teacherId)).map((s) => s.id);
	const from = sp.get('from') ?? '';
	const to = sp.get('to') ?? '';
	const csv = await exportCsv(db(), teacherId, ids, {
		from: dateRe.test(from) ? from : undefined,
		to: dateRe.test(to) ? to : undefined
	});
	await audit(db(), teacherId, 'results.export');
	const stamp = new Date().toISOString().slice(0, 10);
	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="antonia-ergebnisse-${stamp}.csv"`,
			'Cache-Control': 'no-store'
		}
	});
};
