import type { LayoutServerLoad } from './$types';
import { db, requireStudent } from '#lib/server/auth/guard.ts';
import { getStudentSelf } from '#lib/server/services/students.ts';
import { error } from '@sveltejs/kit';
import { resolveSettings } from '#lib/domain/settings.ts';
import { DEFAULT_CAR } from '#lib/domain/cars.ts';

export const load: LayoutServerLoad = async (event) => {
	const id = requireStudent(event);
	const me = await getStudentSelf(db(), id);
	if (!me) error(403, 'Kein Zugriff');
	const s = resolveSettings({ student: me.settings }).values;
	return {
		me: { displayName: me.displayName, car: me.car ?? DEFAULT_CAR },
		display: { calm: s.calm, largeText: s.largeText }
	};
};
