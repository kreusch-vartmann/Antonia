import type { Actions } from './$types';
import { db, requireStudent } from '#lib/server/auth/guard.ts';
import { setCar } from '#lib/server/services/students.ts';
import { guarded, str } from '#lib/server/forms.ts';

export const actions: Actions = {
	default: async (event) => {
		const id = requireStudent(event);
		const form = await event.request.formData();
		return guarded(async () => {
			await setCar(db(), id, str(form, 'model'), str(form, 'color'));
			return { saved: true };
		});
	}
};
