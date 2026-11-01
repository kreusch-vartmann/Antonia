import type { PageServerLoad } from './$types';
import { db, requireStudent } from '#lib/server/auth/guard.ts';
import { activeAssignmentsForChild, groupRaces } from '#lib/server/services/sets.ts';

export const load: PageServerLoad = async (event) => {
	const id = requireStudent(event);
	return { races: groupRaces(await activeAssignmentsForChild(db(), id)) };
};
