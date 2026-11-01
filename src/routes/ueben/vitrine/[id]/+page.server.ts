import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db, requireStudent } from '#lib/server/auth/guard.ts';
import { trophyDetail } from '#lib/server/services/trophies.ts';
import { isUuid } from '#lib/server/forms.ts';

export const load: PageServerLoad = async (event) => {
	const studentId = requireStudent(event);
	if (!isUuid(event.params.id)) error(404, 'Nicht gefunden');
	const detail = await trophyDetail(db(), studentId, event.params.id);
	if (!detail) error(404, 'Diesen Pokal gibt es nicht.');
	return detail;
};
