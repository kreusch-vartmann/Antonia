/**
 * Race modes (= three difficulty levels) and the trophies they award.
 *
 *  normal   – solve the tasks, mistakes are fine         → bronze trophy
 *  flawless – a single mistake means engine failure and a restart → silver trophy
 *  time     – reach the finish before the target time    → gold trophy
 */
export const RUN_MODES = ['normal', 'flawless', 'time'] as const;
export type RunMode = (typeof RUN_MODES)[number];

/** Normalised list of modes in canonical order; unknown values are dropped. */
export function cleanModes(values: unknown[]): RunMode[] {
	return RUN_MODES.filter((m) => values.includes(m));
}

export type TrophyKind = 'bronze' | 'silver' | 'gold';

export const TROPHY_FOR_MODE: Record<RunMode, TrophyKind> = {
	normal: 'bronze',
	flawless: 'silver',
	time: 'gold'
};

export const MODE_LABEL: Record<RunMode, string> = {
	normal: 'Normal',
	flawless: 'Fehlerfrei',
	time: 'Gegen die Zeit'
};

export const MODE_HELP: Record<RunMode, string> = {
	normal: 'Löse die Aufgaben. Fehler sind erlaubt.',
	flawless: 'Fahre ohne einen Fehler ins Ziel. Sonst gibt es einen Motorschaden.',
	time: 'Sei schneller als der Zeitmonstertruck. Fehler sind erlaubt.'
};

export const TROPHY_LABEL: Record<TrophyKind, string> = {
	bronze: 'Bronzener Pokal',
	silver: 'Silberner Pokal',
	gold: 'Goldener Pokal'
};

/** Name of the computer opponent in the race against the clock. */
export const CLOCK_OPPONENT = 'Zeitmonstertruck';

export const TIME_LOST_TEXT =
	'Dieses Mal warst Du noch nicht schnell genug. Aber es klappt bestimmt bald, wenn Du weiter fleißig übst.';

export const FAILED_TEXT =
	'Dein Auto muss zurück an den Start. Beim nächsten Versuch klappt es bestimmt!';

/** Accusative form for "Du hast einen … gewonnen!". */
export const TROPHY_WON: Record<TrophyKind, string> = {
	bronze: 'bronzenen Pokal',
	silver: 'silbernen Pokal',
	gold: 'goldenen Pokal'
};

export function parseRunMode(value: unknown): RunMode {
	return RUN_MODES.includes(value as RunMode) ? (value as RunMode) : 'normal';
}

/** m:ss, e.g. 75000 → "1:15". */
export function clock(ms: number): string {
	const s = Math.max(0, Math.round(ms / 1000));
	return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
