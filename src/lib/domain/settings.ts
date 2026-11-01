/**
 * Settings and their inheritance.
 *
 * Every layer is a partial object; `undefined` means "inherit".
 * Resolution order (later wins):
 *   system defaults → task → set → set item → student → assignment
 *
 * Run-level settings (opponent, run time limit, …) ignore the task layers.
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
	/** What happens to the car on a wrong answer. */
	onWrong: z.enum(['pitstop', 'setback']),
	/** Repeat tasks later in the run that were not solved on the first try. */
	repeatWrong: z.boolean(),
	/** Time limit per task in seconds (0 = off). */
	taskTimeLimit: z.number().int().min(0).max(600),
	/** What happens when the task time runs out. */
	onTimeout: z.enum(['retryLater', 'wrong']),
	/** Time limit for the whole run in seconds (0 = off). */
	runTimeLimit: z.number().int().min(0).max(7200),
	/** Target time in seconds for the race against the clock (0 = not offered). */
	targetTime: z.number().int().min(0).max(7200),
	/** Show the remaining time (fuel gauge). */
	showTimer: z.boolean(),
	/** Opponent in the race. */
	opponent: z.enum(['none', 'ghost', 'pacer']),
	/** Pacer speed: seconds per task. */
	pacerSecondsPerTask: z.number().int().min(2).max(120),
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
	onWrong: 'pitstop',
	repeatWrong: true,
	taskTimeLimit: 0,
	onTimeout: 'retryLater',
	runTimeLimit: 0,
	targetTime: 0,
	showTimer: true,
	opponent: 'none',
	pacerSecondsPerTask: 15,
	order: 'fixed',
	tasksPerRun: 0,
	readAloud: 'button',
	sound: true,
	calm: false,
	largeText: false
};

/** Settings that only make sense for a single task. */
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
	default: 'Standard',
	task: 'Aufgabe',
	set: 'Aufgabenset',
	setItem: 'Aufgabe im Set',
	student: 'Kind',
	assignment: 'Zuweisung'
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
			if (v === undefined) continue;
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
 * `s.<key>`; the value "" (or a missing field) means "inherit".
 */
export function layerFromForm(form: FormData, prefix = 's.'): SettingsLayer {
	const out: Record<string, unknown> = {};
	for (const key of Object.keys(DEFAULT_SETTINGS) as SettingKey[]) {
		const raw = form.get(prefix + key);
		if (raw === null || raw === '') continue;
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
	group: 'Antworten' | 'Fehler & Hilfen' | 'Zeit' | 'Rennen' | 'Darstellung';
}

export const SETTING_META: Record<SettingKey, SettingMeta> = {
	answerFormat: {
		label: 'Antwortformat',
		type: 'enum',
		group: 'Antworten',
		options: [
			{ value: 'keypad', label: 'Zahlenfeld (eintippen)' },
			{ value: 'choice', label: 'Auswahl (antippen)' }
		]
	},
	choiceCount: {
		label: 'Anzahl Auswahlmöglichkeiten',
		type: 'number',
		min: 2,
		max: 4,
		group: 'Antworten'
	},
	tasksPerRun: {
		label: 'Aufgaben pro Rennen',
		help: '0 = alle Aufgaben des Sets',
		type: 'number',
		min: 0,
		max: 200,
		group: 'Antworten'
	},
	order: {
		label: 'Reihenfolge',
		type: 'enum',
		group: 'Antworten',
		options: [
			{ value: 'fixed', label: 'wie im Set' },
			{ value: 'shuffle', label: 'gemischt' }
		]
	},
	hintAfter: {
		label: 'Hilfe zeigen nach … Fehlversuchen',
		help: '0 = keine Hilfe',
		type: 'number',
		min: 0,
		max: 5,
		group: 'Fehler & Hilfen'
	},
	solutionAfter: {
		label: 'Lösung zeigen nach … Fehlversuchen',
		help: 'Das Kind gibt die gezeigte Lösung dann selbst ein.',
		type: 'number',
		min: 1,
		max: 6,
		group: 'Fehler & Hilfen'
	},
	onWrong: {
		label: 'Bei falscher Antwort',
		type: 'enum',
		group: 'Fehler & Hilfen',
		options: [
			{ value: 'pitstop', label: 'Boxenstopp (Auto bleibt stehen)' },
			{ value: 'setback', label: 'Zurückfallen (Aufgabe kommt zusätzlich)' }
		]
	},
	repeatWrong: {
		label: 'Nicht sofort gelöste Aufgaben später wiederholen',
		type: 'boolean',
		group: 'Fehler & Hilfen'
	},
	taskTimeLimit: {
		label: 'Zeit pro Aufgabe',
		help: '0 = aus',
		type: 'number',
		min: 0,
		max: 600,
		unit: 's',
		group: 'Zeit'
	},
	onTimeout: {
		label: 'Wenn die Zeit pro Aufgabe abläuft',
		type: 'enum',
		group: 'Zeit',
		options: [
			{ value: 'retryLater', label: 'Aufgabe kommt später nochmal' },
			{ value: 'wrong', label: 'als Fehlversuch werten' }
		]
	},
	runTimeLimit: {
		label: 'Zeit für das ganze Rennen',
		help: 'Danach endet das Rennen. Nicht zu verwechseln mit der Zielzeit des Zeitrennens. 0 = aus',
		type: 'number',
		min: 0,
		max: 7200,
		unit: 's',
		group: 'Zeit'
	},
	targetTime: {
		label: 'Zielzeit für das Zeitrennen (Zeitmonstertruck)',
		help: 'Die Rennart (Normal, Fehlerfrei, Gegen die Zeit) wählt das Kind selbst. „Gegen die Zeit“ wird nur angeboten, wenn hier eine Zielzeit steht; der Zeitmonstertruck erreicht das Ziel genau dann. 0 = nicht angeboten.',
		type: 'number',
		min: 0,
		max: 7200,
		unit: 's',
		group: 'Rennen'
	},
	showTimer: { label: 'Zeitanzeige (Tank) sichtbar', type: 'boolean', group: 'Zeit' },
	opponent: {
		label: 'Gegner',
		type: 'enum',
		group: 'Rennen',
		options: [
			{ value: 'none', label: 'keiner' },
			{ value: 'ghost', label: 'Geister-Auto (eigene Bestleistung)' },
			{ value: 'pacer', label: 'Computer-Auto' }
		]
	},
	pacerSecondsPerTask: {
		label: 'Tempo Computer-Auto (Sekunden pro Aufgabe)',
		type: 'number',
		min: 2,
		max: 120,
		unit: 's',
		group: 'Rennen'
	},
	readAloud: {
		label: 'Vorlesen',
		type: 'enum',
		group: 'Darstellung',
		options: [
			{ value: 'off', label: 'aus' },
			{ value: 'button', label: 'per Knopf' },
			{ value: 'auto', label: 'automatisch' }
		]
	},
	sound: { label: 'Töne', type: 'boolean', group: 'Darstellung' },
	calm: {
		label: 'Reizarmer Modus',
		help: 'keine Animationen, ruhige Darstellung',
		type: 'boolean',
		group: 'Darstellung'
	},
	largeText: { label: 'Große Schrift', type: 'boolean', group: 'Darstellung' }
};

export function formatSettingValue(key: SettingKey, value: unknown): string {
	const meta = SETTING_META[key];
	if (meta.type === 'boolean') return value ? 'ja' : 'nein';
	if (meta.type === 'enum')
		return meta.options?.find((o) => o.value === value)?.label ?? String(value);
	if (meta.unit && value === 0) return 'aus';
	return meta.unit ? `${value} ${meta.unit}` : String(value);
}
