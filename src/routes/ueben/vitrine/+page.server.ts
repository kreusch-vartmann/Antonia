import type { PageServerLoad } from './$types';
import { db, requireStudent } from '#lib/server/auth/guard.ts';
import { listTrophies } from '#lib/server/services/trophies.ts';

export const load: PageServerLoad = async (event) => {
	const id = requireStudent(event);
	return { trophies: await listTrophies(db(), id) };
};
