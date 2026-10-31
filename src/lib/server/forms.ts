import { fail } from '@sveltejs/kit';
import { ValidationError } from './services/accounts';

/** Turns ValidationErrors into `fail(400, { error })`; other errors propagate. */
export async function guarded<T, V extends Record<string, unknown> = Record<never, never>>(
	fn: () => Promise<T>,
	values: V = {} as V
) {
	try {
		return await fn();
	} catch (e) {
		if (e instanceof ValidationError) return fail(400, { ...values, error: e.message, field: e.field });
		throw e;
	}
}

export function str(form: FormData, key: string): string {
	const v = form.get(key);
	return typeof v === 'string' ? v : '';
}

export function strs(form: FormData, key: string): string[] {
	return form.getAll(key).filter((v): v is string => typeof v === 'string' && v !== '');
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(s: string | undefined | null): s is string {
	return !!s && UUID.test(s);
}
