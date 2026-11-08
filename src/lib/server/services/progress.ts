import { and, eq } from 'drizzle-orm';
import type { Db } from '../db/types';
import { schema } from '../db/types';
import type { Kv } from '../kv/types';
import { abortActiveRuns } from './runs';
import { ValidationError } from './accounts';
import { audit } from './audit';

const { assignment, student } = schema;

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
	const [owned] = await db
		.select({ id: student.id })
		.from(student)
		.where(and(eq(student.id, studentId), eq(student.teacherId, teacherId)));
	if (!owned) throw new ValidationError('Kind nicht gefunden.');
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
