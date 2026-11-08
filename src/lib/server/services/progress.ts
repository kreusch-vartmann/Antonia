import { and, eq } from 'drizzle-orm';
import { studentAccess } from './access';
import type { Db } from '../db/types';
import { schema } from '../db/types';
import type { Kv } from '../kv/types';
import { abortActiveRuns } from './runs';
import { ValidationError } from './accounts';
import { audit } from './audit';

const { assignment, taskSet } = schema;

/**
 * Restarts the progress of a child with one set: stars, best time and the unlock of
 * "Bestzeit jagen" begin anew. All runs stay in the evaluation, trophies stay in the case.
 * The assignments themselves are kept.
 */
export async function resetProgress(
	db: Db,
	kv: Kv,
	teacherId: string,
	studentId: string,
	setId: string,
	now = new Date()
) {
	// the owner of the child may reset every set, a guest only sets of their own
	const access = await studentAccess(db, teacherId, studentId);
	if (!access) throw new ValidationError('Kind nicht gefunden.');
	if (access === 'shared') {
		const [own] = await db
			.select({ id: taskSet.id })
			.from(taskSet)
			.where(and(eq(taskSet.id, setId), eq(taskSet.teacherId, teacherId)));
		if (!own)
			throw new ValidationError('Du darfst nur den Spielstand deiner eigenen Sets zurücksetzen.');
	}
	const rows = await db
		.select({ id: assignment.id })
		.from(assignment)
		.where(and(eq(assignment.studentId, studentId), eq(assignment.setId, setId)));
	if (rows.length === 0) throw new ValidationError('Zuweisung nicht gefunden.');
	for (const r of rows) {
		await abortActiveRuns(db, kv, r.id, now.getTime());
		await db.update(assignment).set({ progressResetAt: now }).where(eq(assignment.id, r.id));
	}
	await audit(db, teacherId, 'assignment.progress.reset', 'student', studentId);
}
