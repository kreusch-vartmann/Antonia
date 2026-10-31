import { arithmetic } from './arithmetic';
import type { TaskContent, TaskFormat } from './types';

/** Registry of all task formats. Add new formats here. */
export const FORMATS: Record<string, TaskFormat> = {
	[arithmetic.id]: arithmetic as TaskFormat
};

export function getFormat(id: string): TaskFormat {
	const f = FORMATS[id];
	if (!f) throw new Error(`unknown task format: ${id}`);
	return f;
}

export function formatOf(content: TaskContent): TaskFormat {
	return getFormat(content.format);
}

export type { TaskContent, TaskFormat };
