import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db, kv, requireStudent } from '#lib/server/auth/guard.ts';
import { startOrResumeRun } from '#lib/server/services/runs.ts';
import { activeAssignmentsForChild } from '#lib/server/services/sets.ts';
import { ValidationError } from '#lib/server/services/accounts.ts';
import { parseRunMode } from '#lib/domain/modes.ts';
import { isUuid } from '#lib/server/forms.ts';

export const load: PageServerLoad = async (event) => {
	const studentId = requireStudent(event);
	const id = event.params.assignmentId;
	if (!isUuid(id)) error(404, 'Nicht gefunden');
	const active = await activeAssignmentsForChild(db(), studentId);
	const a = active.find((x) => x.id === id);
	if (!a) error(404, 'Dieses Rennen ist gerade nicht verfügbar.');
	try {
		const mode = parseRunMode(event.url.searchParams.get('mode'));
		const payload = await startOrResumeRun(db(), kv(), studentId, id, mode);
		return { payload, setName: a.setName, assignmentId: id };
	} catch (e) {
		if (e instanceof ValidationError) error(400, e.message);
		throw e;
	}
};
