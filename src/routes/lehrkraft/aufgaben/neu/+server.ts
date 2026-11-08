import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** The task pool no longer exists: tasks live inside the sets. */
export const GET: RequestHandler = () => redirect(301, '/lehrkraft/sets');
