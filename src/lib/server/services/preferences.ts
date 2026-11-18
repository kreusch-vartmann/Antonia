import { eq } from 'drizzle-orm';
import type { Db } from '../db/types';
import { schema } from '../db/types';
import type { TeacherPreferences } from '#lib/domain/preferences.ts';
import { DISPLAY_KEYS, sanitizeLayer, type SettingsLayer } from '#lib/domain/settings.ts';

const { teacher } = schema;

/** Only the display settings are kept as defaults for new sets. */
export function displayLayer(layer: SettingsLayer): SettingsLayer {
	const clean = sanitizeLayer(layer) as Record<string, unknown>;
	return Object.fromEntries(
		DISPLAY_KEYS.filter((k) => clean[k] !== undefined).map((k) => [k, clean[k]])
	) as SettingsLayer;
}

export async function getPreferences(db: Db, teacherId: string): Promise<TeacherPreferences> {
	const [row] = await db
		.select({ preferences: teacher.preferences })
		.from(teacher)
		.where(eq(teacher.id, teacherId));
	const p = row?.preferences ?? {};
	return {
		setDefaults: displayLayer(p.setDefaults ?? {}),
		headingOrder: Array.isArray(p.headingOrder)
			? p.headingOrder.filter((k): k is string => typeof k === 'string').slice(0, 200)
			: undefined
	};
}

/** Shallow merge: keys in `patch` replace the stored ones. */
export async function updatePreferences(
	db: Db,
	teacherId: string,
	patch: Partial<TeacherPreferences>
): Promise<void> {
	const current = await getPreferences(db, teacherId);
	const next: TeacherPreferences = { ...current, ...patch };
	if (patch.setDefaults) next.setDefaults = displayLayer(patch.setDefaults);
	await db.update(teacher).set({ preferences: next }).where(eq(teacher.id, teacherId));
}
