import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { APP_SECRET } from '$app/env/private';
import { db, kv, requireTeacher } from '#lib/server/auth/guard.ts';
import {
	deleteStudent,
	getStudent,
	resetStudentPassword,
	revealStudentPassword,
	updateStudent
} from '#lib/server/services/students.ts';
import {
	listShares,
	otherTeachers,
	ownerName,
	requireOwner,
	shareStudent,
	unshareStudent
} from '#lib/server/services/access.ts';
import { racesForStudent } from '#lib/server/services/sets.ts';
import { resetProgress } from '#lib/server/services/progress.ts';
import { audit } from '#lib/server/services/audit.ts';
import { guarded, isUuid, str } from '#lib/server/forms.ts';
import { layerFromForm } from '#lib/domain/settings.ts';
import { kidPassword } from '#lib/server/auth/password.ts';
import { destroyAllSessions } from '#lib/server/auth/session.ts';

export const load: PageServerLoad = async (event) => {
	const teacherId = requireTeacher(event);
	if (!isUuid(event.params.id)) error(404, 'Nicht gefunden');
	const student = await getStudent(db(), teacherId, event.params.id);
	if (!student) error(404, 'Nicht gefunden');
	const races = await racesForStudent(db(), teacherId, student.id);
	if (student.access === 'shared') {
		// a guest only sees what is needed to assign sets and evaluate
		return {
			access: 'shared' as const,
			owner: await ownerName(db(), student.id),
			student: {
				id: student.id,
				firstName: student.firstName,
				lastName: student.lastName,
				displayName: student.displayName
			},
			races
		};
	}
	const { passwordHash: _hash, passwordEnc, ...safe } = student;
	void _hash;
	return {
		access: 'owner' as const,
		student: safe,
		hasStoredPassword: passwordEnc !== null,
		races,
		shares: await listShares(db(), student.id),
		teachers: await otherTeachers(db(), teacherId),
		suggestedPassword: kidPassword()
	};
};

export const actions: Actions = {
	update: async (event) => {
		const teacherId = requireTeacher(event);
		const form = await event.request.formData();
		return guarded(async () => {
			await updateStudent(db(), teacherId, event.params.id, {
				firstName: str(form, 'firstName'),
				lastName: str(form, 'lastName'),
				displayName: str(form, 'displayName'),
				username: str(form, 'username'),
				notes: str(form, 'notes'),
				settings: layerFromForm(form)
			});
			return { saved: true };
		});
	},
	password: async (event) => {
		const teacherId = requireTeacher(event);
		const form = await event.request.formData();
		const password = str(form, 'password');
		return guarded(async () => {
			await resetStudentPassword(db(), teacherId, event.params.id, password, APP_SECRET);
			await destroyAllSessions(kv(), 'student', event.params.id);
			return { newPassword: password };
		});
	},
	reveal: async (event) => {
		const teacherId = requireTeacher(event);
		return guarded(async () => {
			const password = await revealStudentPassword(db(), APP_SECRET, teacherId, event.params.id);
			await audit(db(), teacherId, 'student.password.view', 'student', event.params.id);
			return { revealed: password ?? '' };
		});
	},
	resetProgress: async (event) => {
		const teacherId = requireTeacher(event);
		const setId = str(await event.request.formData(), 'setId');
		if (!isUuid(setId)) return fail(400, { error: 'Unbekanntes Set.' });
		return guarded(async () => {
			await resetProgress(db(), kv(), teacherId, event.params.id, setId);
			return { progressReset: setId };
		});
	},
	share: async (event) => {
		const teacherId = requireTeacher(event);
		const other = str(await event.request.formData(), 'teacherId');
		if (!isUuid(other)) return fail(400, { error: 'Bitte eine Lehrkraft auswählen.' });
		return guarded(async () => {
			await shareStudent(db(), teacherId, event.params.id, other);
			return { shared: true };
		});
	},
	unshare: async (event) => {
		const teacherId = requireTeacher(event);
		const other = str(await event.request.formData(), 'teacherId');
		if (!isUuid(other)) return fail(400, { error: 'Unbekannte Lehrkraft.' });
		return guarded(async () => {
			await unshareStudent(db(), teacherId, event.params.id, other);
			return { unshared: true };
		});
	},
	logoutAll: async (event) => {
		const teacherId = requireTeacher(event);
		return guarded(async () => {
			await requireOwner(db(), teacherId, event.params.id);
			await destroyAllSessions(kv(), 'student', event.params.id);
			return { loggedOut: true };
		});
	},
	delete: async (event) => {
		const teacherId = requireTeacher(event);
		const form = await event.request.formData();
		const s = await getStudent(db(), teacherId, event.params.id);
		if (!s || s.access !== 'owner') error(404, 'Nicht gefunden');
		if (str(form, 'confirm').trim() !== s.firstName) {
			return fail(400, { deleteError: 'Zur Bestätigung bitte den Vornamen genau eintippen.' });
		}
		await destroyAllSessions(kv(), 'student', s.id);
		await deleteStudent(db(), teacherId, s.id);
		redirect(303, '/lehrkraft/kinder');
	}
};
