import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, requireTeacher } from '#lib/server/auth/guard.ts';
import { isUuid } from '#lib/server/forms.ts';
import { schema } from '#lib/server/db/types.ts';
import { and, eq } from 'drizzle-orm';

/** Old link to a task of the pool: go to the task inside the first set that uses it. */
export const GET: RequestHandler = async (event) => {
	const teacherId = requireTeacher(event);
	if (isUuid(event.params.id)) {
		const [row] = await db()
			.select({ setId: schema.taskSetItem.setId })
			.from(schema.taskSetItem)
			.innerJoin(schema.taskSet, eq(schema.taskSet.id, schema.taskSetItem.setId))
			.where(
				and(eq(schema.taskSetItem.taskId, event.params.id), eq(schema.taskSet.teacherId, teacherId))
			)
			.limit(1);
		if (row) redirect(301, `/lehrkraft/sets/${row.setId}/aufgabe/${event.params.id}`);
	}
	redirect(301, '/lehrkraft/sets');
};
