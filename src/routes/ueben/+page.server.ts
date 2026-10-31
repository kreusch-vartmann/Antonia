import type { PageServerLoad } from './$types';
import { db, requireStudent } from '#lib/server/auth/guard.ts';
import { activeAssignmentsForChild } from '#lib/server/services/sets.ts';

export const load: PageServerLoad = async (event) => {
	const id = requireStudent(event);
	return { assignments: await activeAssignmentsForChild(db(), id) };
};
