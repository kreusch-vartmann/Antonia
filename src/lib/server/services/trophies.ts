import { desc, eq } from 'drizzle-orm';
import type { Db } from '../db/types';
import { schema } from '../db/types';

const { trophy } = schema;

/** The child's display case: newest trophy first. */
export async function listTrophies(db: Db, studentId: string) {
	return db
		.select({
			id: trophy.id,
			kind: trophy.kind,
			mode: trophy.mode,
			setName: trophy.setName,
			durationMs: trophy.durationMs,
			targetMs: trophy.targetMs,
			earnedAt: trophy.earnedAt
		})
		.from(trophy)
		.where(eq(trophy.studentId, studentId))
		.orderBy(desc(trophy.earnedAt), desc(trophy.id));
}
