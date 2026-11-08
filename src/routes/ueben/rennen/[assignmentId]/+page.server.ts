import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db, kv, requireStudent } from '#lib/server/auth/guard.ts';
import { findResumable } from '#lib/server/services/runs.ts';
import { activeAssignmentsForChild } from '#lib/server/services/sets.ts';
import { getStudentSelf } from '#lib/server/services/students.ts';
import { parseRunMode } from '#lib/domain/modes.ts';
import { resolveSettings } from '#lib/domain/settings.ts';
import { isUuid } from '#lib/server/forms.ts';

/** Only prepares the start screen. The run itself is created by the "Los!" button. */
export const load: PageServerLoad = async (event) => {
	const studentId = requireStudent(event);
	const id = event.params.assignmentId;
	if (!isUuid(id)) error(404, 'Nicht gefunden');
	const [active, me] = await Promise.all([
		activeAssignmentsForChild(db(), studentId),
		getStudentSelf(db(), studentId)
	]);
	const a = active.find((x) => x.id === id);
	if (!a || !me) error(404, 'Dieses Rennen ist gerade nicht verfügbar.');

	const requested = event.url.searchParams.get('mode');
	const mode = requested ? parseRunMode(requested) : (a.modes[0] ?? 'normal');
	if (!a.modes.includes(mode)) error(409, 'Diese Rennart ist für dich gerade nicht freigegeben.');
	if (mode === 'record' && !a.best)
		error(409, 'Fahre zuerst einmal „Fehlerfrei“, dann kannst du deine Bestzeit jagen.');
	if (a.items === 0) error(409, 'Dieses Set enthält noch keine Aufgaben.');

	const s = resolveSettings({ student: me.settings }).values;
	return {
		assignmentId: id,
		mode,
		setName: a.setName,
		items: a.items,
		targetTime: a.targetTime,
		best: a.best ? { durationMs: a.best.durationMs, at: a.best.at } : null,
		resumable: await findResumable(kv(), studentId, id, mode),
		kidSettings: { calm: s.calm, sound: s.sound, readAloud: s.readAloud }
	};
};
