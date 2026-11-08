import type { Actions, PageServerLoad } from './$types';
import { APP_SECRET } from '$app/env/private';
import { db, kv, requireTeacher } from '#lib/server/auth/guard.ts';
import {
	listStudents,
	resetStudentPassword,
	revealStudentPassword
} from '#lib/server/services/students.ts';
import { audit } from '#lib/server/services/audit.ts';
import { kidPassword } from '#lib/server/auth/password.ts';
import { destroyAllSessions } from '#lib/server/auth/session.ts';
import { qrSvg } from '#lib/server/auth/totp.ts';
import { isUuid, strs } from '#lib/server/forms.ts';
import { fail } from '@sveltejs/kit';

/** Only the children of the teacher (not the ones shared with them) get cards. */
export const load: PageServerLoad = async (event) => {
	const teacherId = requireTeacher(event);
	const students = (await listStudents(db(), teacherId)).filter((s) => s.owned);
	const cards = await Promise.all(
		students.map(async (s) => ({
			id: s.id,
			displayName: s.displayName,
			username: s.username,
			password: await revealStudentPassword(db(), APP_SECRET, teacherId, s.id),
			// the QR code opens the login page with the user name filled in (no password inside)
			qr: await qrSvg(`${event.url.origin}/login?u=${encodeURIComponent(s.username)}`)
		}))
	);
	if (cards.some((c) => c.password)) await audit(db(), teacherId, 'student.password.view');
	const preselected = event.url.searchParams.get('id');
	return {
		cards,
		preselected: preselected && isUuid(preselected) ? preselected : null
	};
};

export const actions: Actions = {
	default: async (event) => {
		const teacherId = requireTeacher(event);
		const ids = strs(await event.request.formData(), 'id').filter(isUuid);
		if (ids.length === 0) return fail(400, { error: 'Bitte mindestens ein Kind auswählen.' });
		const students = (await listStudents(db(), teacherId)).filter((s) => s.owned);
		let n = 0;
		for (const s of students.filter((s) => ids.includes(s.id))) {
			await resetStudentPassword(db(), teacherId, s.id, kidPassword(), APP_SECRET);
			await destroyAllSessions(kv(), 'student', s.id);
			n++;
		}
		return { renewed: n };
	}
};
