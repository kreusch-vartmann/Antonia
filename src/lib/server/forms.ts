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
		if (e instanceof ValidationError)
			return fail(400, { ...values, error: e.message, field: e.field });
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

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Reads the fields "p.a", "p.first.kind", … into a nested object. Fields named in `arrayKeys`
 * become arrays (checkbox groups); all others hold the first value.
 */
export function nestParams(
	form: FormData,
	arrayKeys: string[] = [],
	prefix = 'p.'
): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const key of new Set(form.keys())) {
		if (!key.startsWith(prefix)) continue;
		const path = key.slice(prefix.length).split('.');
		if (path.some((k) => !k || UNSAFE_KEYS.has(k))) continue;
		const values = form.getAll(key).filter((v): v is string => typeof v === 'string');
		let node = out;
		for (const k of path.slice(0, -1)) {
			const next = node[k];
			node = (typeof next === 'object' && next !== null ? next : (node[k] = {})) as Record<
				string,
				unknown
			>;
		}
		const last = path[path.length - 1];
		node[last] = arrayKeys.includes(last) ? values.filter((v) => v !== '') : values[0];
	}
	return out;
}
