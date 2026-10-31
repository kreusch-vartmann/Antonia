import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { APP_SECRET } from '$app/env/private';
import { db, kv, requireTeacher, startSession } from '#lib/server/auth/guard.ts';
import {
	changeTeacherPassword,
	disableTotp,
	enableTotp,
	getTeacher,
	ValidationError
} from '#lib/server/services/accounts.ts';
import { AUDIT_LABELS, audit, recentAudit } from '#lib/server/services/audit.ts';
import { generateTotpSecret, otpauthUri, qrSvg } from '#lib/server/auth/totp.ts';
import { destroyAllSessions } from '#lib/server/auth/session.ts';
import { verifyPassword } from '#lib/server/auth/password.ts';
import { str } from '#lib/server/forms.ts';
import { schema } from '#lib/server/db/types.ts';
import { eq } from 'drizzle-orm';

const setupKey = (id: string) => `totpsetup:${id}`;

export const load: PageServerLoad = async (event) => {
	const teacherId = requireTeacher(event);
	const pending = await kv().get(setupKey(teacherId));
	const teacher = await getTeacher(db(), teacherId);
	let setup: { secret: string; qr: string } | null = null;
	if (pending && teacher && !teacher.totpEnabled) {
		setup = { secret: pending, qr: await qrSvg(otpauthUri(pending, teacher.username)) };
	}
	const log = await recentAudit(db(), teacherId, 30);
	return {
		setup,
		audit: log.map((l) => ({ id: l.id, at: l.at, label: AUDIT_LABELS[l.action] ?? l.action }))
	};
};

async function checkPassword(teacherId: string, pw: string) {
	const [t] = await db().select().from(schema.teacher).where(eq(schema.teacher.id, teacherId));
	return !!t && (await verifyPassword(t.passwordHash, pw));
}

export const actions: Actions = {
	password: async (event) => {
		const teacherId = requireTeacher(event);
		const form = await event.request.formData();
		if (str(form, 'next') !== str(form, 'next2')) {
			return fail(400, { pwError: 'Die neuen Passwörter stimmen nicht überein.' });
		}
		try {
			await changeTeacherPassword(db(), teacherId, str(form, 'current'), str(form, 'next'));
		} catch (e) {
			if (e instanceof ValidationError) return fail(400, { pwError: e.message });
			throw e;
		}
		// Log out other devices, keep this one.
		await destroyAllSessions(kv(), 'teacher', teacherId);
		await startSession(event, 'teacher', teacherId);
		return { pwSaved: true };
	},
	startTotp: async (event) => {
		const teacherId = requireTeacher(event);
		await kv().set(setupKey(teacherId), generateTotpSecret(), 10 * 60);
		return { started: true };
	},
	confirmTotp: async (event) => {
		const teacherId = requireTeacher(event);
		const secret = await kv().get(setupKey(teacherId));
		if (!secret)
			return fail(400, { totpError: 'Die Einrichtung ist abgelaufen. Bitte neu starten.' });
		const code = str(await event.request.formData(), 'code');
		const codes = await enableTotp(db(), APP_SECRET, teacherId, secret, code);
		if (!codes) return fail(400, { totpError: 'Der Code stimmt nicht. Bitte erneut versuchen.' });
		await kv().del(setupKey(teacherId));
		return { recoveryCodes: codes };
	},
	cancelTotp: async (event) => {
		const teacherId = requireTeacher(event);
		await kv().del(setupKey(teacherId));
	},
	disableTotp: async (event) => {
		const teacherId = requireTeacher(event);
		const pw = str(await event.request.formData(), 'password');
		if (!(await checkPassword(teacherId, pw)))
			return fail(400, { disableError: 'Passwort stimmt nicht.' });
		await disableTotp(db(), teacherId);
		return { disabled: true };
	},
	logoutAll: async (event) => {
		const teacherId = requireTeacher(event);
		await destroyAllSessions(kv(), 'teacher', teacherId);
		await audit(db(), teacherId, 'teacher.sessions.revoke', 'teacher', teacherId);
		await startSession(event, 'teacher', teacherId);
		return { loggedOut: true };
	}
};
