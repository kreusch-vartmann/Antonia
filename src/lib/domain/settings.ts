/**
 * Settings and their inheritance.
 *
 * Every layer is a partial object; `undefined` means "inherit".
 * Resolution order (later wins):
 *   system defaults → task → set → set item → student → assignment
 *
 * Every setting has exactly one place (or two) where it can be edited, see
 * `levels` in SETTING_META: child (e.g. compensation for disadvantages), set
 * (what is practised) and assignment (what the child should do now). Values
 * stored in other layers are ignored, so no hidden overrides exist.
 *
 * Run-level settings (target time, …) ignore the task layers.
 */
import { z } from 'zod';

export const settingsSchema = z.object({
	/** How the child answers. */
	answerFormat: z.enum(['keypad', 'choice']),
	/** Number of options in choice mode (incl. the correct one). */
	choiceCount: z.number().int().min(2).max(4),
	/** Show the hint after this many wrong attempts (0 = never). */
	hintAfter: z.number().int().min(0).max(5),
	/** Show the solution after this many wrong attempts (child re-enters it). */
	solutionAfter: z.number().int().min(1).max(6),
	/** Repeat tasks later in the run that were not solved on the first try. */
	repeatWrong: z.boolean(),
	/** Time limit per task in seconds (0 = off). */
	taskTimeLimit: z.number().int().min(0).max(600),
	/** What happens when the task time runs out. */
	onTimeout: z.enum(['retryLater', 'wrong']),
	/** Target time in seconds for the race against the clock (0 = not offered). */
	targetTime: z.number().int().min(0).max(7200),
	/** Show the remaining time (fuel gauge). */
	showTimer: z.boolean(),
	/** Task order within the run. */
	order: z.enum(['fixed', 'shuffle']),
	/** Max tasks per run (0 = all tasks of the set). */
	tasksPerRun: z.number().int().min(0).max(200),
	/** Read aloud: off, button, automatically. */
	readAloud: z.enum(['off', 'button', 'auto']),
	/** Sound effects. */
	sound: z.boolean(),
	/** Calm mode: no animations, reduced visuals. */
	calm: z.boolean(),
	/** Larger text and buttons. */
	largeText: z.boolean()
});

export type Settings = z.infer<typeof settingsSchema>;
export type SettingKey = keyof Settings;
export type SettingsLayer = Partial<Settings>;

export const settingsLayerSchema = settingsSchema.partial();

export const DEFAULT_SETTINGS: Settings = {
	answerFormat: 'keypad',
	choiceCount: 3,
	hintAfter: 1,
	solutionAfter: 2,
	repeatWrong: true,
	taskTimeLimit: 0,
	onTimeout: 'retryLater',
	targetTime: 0,
	showTimer: true,
	order: 'fixed',
	tasksPerRun: 0,
	readAloud: 'button',
	sound: true,
	calm: false,
	largeText: false
};

/** Settings that are resolved separately for each task of a run. */
export const TASK_LEVEL_KEYS: SettingKey[] = [
	'answerFormat',
	'choiceCount',
	'hintAfter',
	'solutionAfter',
	'taskTimeLimit',
	'onTimeout'
];

export type LayerName = 'default' | 'task' | 'set' | 'setItem' | 'student' | 'assignment';

export const LAYER_LABELS: Record<LayerName, string> = {
	default: 'Standardwert',
	task: 'Aufgabe',
	set: 'Aufgabenset',
	setItem: 'Aufgabe im Set',
	student: 'Kind',
	assignment: 'Zuweisung'
};

/** Wording for "where does the value come from". */
export const LAYER_FROM: Record<LayerName, string> = {
	default: 'Standardwert',
	task: 'von der Aufgabe',
	set: 'vom Aufgabenset',
	setItem: 'von der Aufgabe im Set',
	student: 'vom Kind',
	assignment: 'von der Zuweisung'
};

export interface Layers {
	task?: SettingsLayer;
	set?: SettingsLayer;
	setItem?: SettingsLayer;
	student?: SettingsLayer;
	assignment?: SettingsLayer;
}

const ORDER: Exclude<LayerName, 'default'>[] = ['task', 'set', 'setItem', 'student', 'assignment'];

export interface Resolved {
	values: Settings;
	sources: Record<SettingKey, LayerName>;
}

/** Resolve effective settings and remember which layer each value comes from. */
export function resolveSettings(layers: Layers): Resolved {
	const values = { ...DEFAULT_SETTINGS } as Record<SettingKey, unknown>;
	const sources = Object.fromEntries(
		Object.keys(DEFAULT_SETTINGS).map((k) => [k, 'default'])
	) as Record<SettingKey, LayerName>;
	for (const name of ORDER) {
		const layer = sanitizeLayer(layers[name]);
		for (const [k, v] of Object.entries(layer) as [SettingKey, unknown][]) {
			if (v === undefined || !SETTING_META[k].levels.includes(name)) continue;
			values[k] = v;
			sources[k] = name;
		}
	}
	return { values: values as Settings, sources };
}

/** Drop unknown keys and invalid values (stored JSON may be outdated). */
export function sanitizeLayer(layer: unknown): SettingsLayer {
	if (!layer || typeof layer !== 'object') return {};
	const out: Record<string, unknown> = {};
	const shape = settingsSchema.shape;
	for (const [k, v] of Object.entries(layer)) {
		if (!(k in shape) || v === undefined || v === null) continue;
		const parsed = shape[k as SettingKey].safeParse(v);
		if (parsed.success) out[k] = parsed.data;
	}
	return out as SettingsLayer;
}

/**
 * Parse a settings layer from form data. Each setting uses the field name
 * `s.<key>`; the value "" (or a missing field) means "inherit". A value that
 * equals the value that applies anyway (field `s.~<key>`) is not stored.
 */
export function layerFromForm(form: FormData, prefix = 's.'): SettingsLayer {
	const out: Record<string, unknown> = {};
	for (const key of Object.keys(DEFAULT_SETTINGS) as SettingKey[]) {
		const raw = form.get(prefix + key);
		if (raw === null || raw === '') continue;
		// The editor pre-selects the value that applies anyway (`~` field). Only deviations are stored.
		if (form.get(`${prefix}~${key}`) === raw) continue;
		const def = DEFAULT_SETTINGS[key];
		let value: unknown = raw;
		if (typeof def === 'number') value = Number(raw);
		else if (typeof def === 'boolean') value = raw === 'true' || raw === 'on';
		const parsed = settingsSchema.shape[key].safeParse(value);
		if (parsed.success) out[key] = parsed.data;
	}
	return out as SettingsLayer;
}

/** Human readable labels/options for the settings editor. */
export interface SettingMeta {
	label: string;
	help?: string;
	type: 'enum' | 'number' | 'boolean';
	options?: { value: string; label: string }[];
	min?: number;
	max?: number;
	unit?: string;
	group: 'Antworten' | 'Hilfen bei Fehlern' | 'Zeit' | 'Rennen' | 'Darstellung';
	/** Where this setting can be edited. Values from other layers are ignored. */
	levels: Exclude<LayerName, 'default'>[];
	/** Label for stored numbers that are not among the options. */
	formatNumber?: (n: number) => string;
}

type Option = { value: string; label: string };

/** Numeric choices, shown as a dropdown; the value is stored as a number. */
const numeric = (values: number[], label: (n: number) => string): Option[] =>
	values.map((n) => ({ value: String(n), label: label(n) }));

const tries = (n: number) => (n === 1 ? 'Nach 1 Fehlversuch' : `Nach ${n} Fehlversuchen`);
const seconds = (n: number) => (n % 60 === 0 && n >= 120 ? `${n / 60} Minuten` : `${n} Sekunden`);

export const SETTING_META: Record<SettingKey, SettingMeta> = {
	answerFormat: {
		label: 'Antwortformat',
		type: 'enum',
		group: 'Antworten',
		levels: ['student'],
		options: [
			{ value: 'keypad', label: 'Zahlenfeld (eintippen)' },
			{ value: 'choice', label: 'Auswahl (antippen)' }
		]
	},
	choiceCount: {
		label: 'Anzahl Auswahlmöglichkeiten',
		type: 'enum',
		options: numeric([2, 3, 4], (n) => `${n} Möglichkeiten`),
		formatNumber: (n) => `${n} Möglichkeiten`,
		group: 'Antworten',
		levels: ['student']
	},
	tasksPerRun: {
		label: 'Aufgaben pro Rennen',
		type: 'enum',
		options: [
			{ value: '0', label: 'Alle Aufgaben des Sets' },
			...numeric(
				[...Array.from({ length: 28 }, (_, i) => i + 3), 35, 40, 45, 50, 60, 75, 100, 150, 200],
				(n) => `${n} Aufgaben`
			)
		],
		formatNumber: (n) => `${n} Aufgaben`,
		group: 'Antworten',
		levels: ['set', 'assignment']
	},
	order: {
		label: 'Reihenfolge',
		type: 'enum',
		group: 'Antworten',
		levels: ['set', 'assignment'],
		options: [
			{ value: 'fixed', label: 'Wie im Set' },
			{ value: 'shuffle', label: 'Zufall' }
		]
	},
	hintAfter: {
		label: 'Tipp zeigen',
		type: 'enum',
		options: [{ value: '0', label: 'Kein Tipp' }, ...numeric([1, 2, 3, 4, 5], tries)],
		formatNumber: tries,
		group: 'Hilfen bei Fehlern',
		levels: ['set']
	},
	solutionAfter: {
		label: 'Lösung zeigen',
		help: 'Das Kind gibt die gezeigte Lösung dann selbst ein.',
		type: 'enum',
		options: numeric([1, 2, 3, 4, 5, 6], tries),
		formatNumber: tries,
		group: 'Hilfen bei Fehlern',
		levels: ['set']
	},
	repeatWrong: {
		label: 'Nicht sofort gelöste Aufgaben später wiederholen',
		type: 'boolean',
		group: 'Hilfen bei Fehlern',
		levels: ['set']
	},
	taskTimeLimit: {
		label: 'Zeit pro Aufgabe',
		type: 'enum',
		options: [
			{ value: '0', label: 'Keine Begrenzung' },
			...numeric([10, 15, 20, 30, 45, 60, 90, 120, 180, 300, 600], seconds)
		],
		formatNumber: seconds,
		group: 'Zeit',
		levels: ['set', 'student']
	},
	onTimeout: {
		label: 'Wenn die Zeit pro Aufgabe abläuft',
		type: 'enum',
		group: 'Zeit',
		levels: ['set', 'student'],
		options: [
			{ value: 'retryLater', label: 'Später nochmal stellen' },
			{ value: 'wrong', label: 'Als Fehlversuch werten' }
		]
	},
	showTimer: {
		label: 'Zeitanzeige (Tank) sichtbar',
		type: 'boolean',
		group: 'Zeit',
		levels: ['set', 'student']
	},
	targetTime: {
		label: 'Zielzeit für „Gegen die Zeit“',
		help: 'Der Zeitmonstertruck erreicht das Ziel genau nach dieser Zeit.',
		type: 'number',
		min: 0,
		max: 7200,
		unit: 's',
		group: 'Rennen',
		levels: ['assignment']
	},
	readAloud: {
		label: 'Vorlesen',
		type: 'enum',
		group: 'Darstellung',
		levels: ['student'],
		options: [
			{ value: 'off', label: 'Aus' },
			{ value: 'button', label: 'Per Knopf' },
			{ value: 'auto', label: 'Automatisch' }
		]
	},
	sound: { label: 'Töne', type: 'boolean', group: 'Darstellung', levels: ['student'] },
	calm: {
		label: 'Reizarmer Modus',
		help: 'keine Animationen, ruhige Darstellung',
		type: 'boolean',
		group: 'Darstellung',
		levels: ['student']
	},
	largeText: {
		label: 'Große Schrift',
		type: 'boolean',
		group: 'Darstellung',
		levels: ['student']
	}
};

export function formatSettingValue(key: SettingKey, value: unknown): string {
	const meta = SETTING_META[key];
	if (meta.type === 'boolean') return value ? 'Ja' : 'Nein';
	if (meta.type === 'enum') {
		const known = meta.options?.find((o) => o.value === String(value))?.label;
		if (known) return known;
		return meta.formatNumber && typeof value === 'number'
			? meta.formatNumber(value)
			: String(value);
	}
	if (meta.unit && value === 0) return 'aus';
	return meta.unit ? `${value} ${meta.unit}` : String(value);
}

/** Settings that can be edited at the given level. */
export function keysForLevel(level: Exclude<LayerName, 'default'>): SettingKey[] {
	return (Object.keys(SETTING_META) as SettingKey[]).filter((k) =>
		SETTING_META[k].levels.includes(level)
	);
}
