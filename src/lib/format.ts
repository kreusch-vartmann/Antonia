/** Formatting helpers for German UI. */

export function pct(x: number | null | undefined): string {
	if (x === null || x === undefined || Number.isNaN(x)) return '–';
	return `${Math.round(x * 100)} %`;
}

export function seconds(ms: number | null | undefined): string {
	if (ms === null || ms === undefined) return '–';
	return `${(ms / 1000).toLocaleString('de-DE', { maximumFractionDigits: 1 })} s`;
}

export function duration(ms: number | null | undefined): string {
	if (ms === null || ms === undefined) return '–';
	const s = Math.round(ms / 1000);
	const m = Math.floor(s / 60);
	return m > 0 ? `${m} min ${s % 60} s` : `${s} s`;
}

export function dateTime(d: Date | string | null | undefined): string {
	if (!d) return '–';
	return new Date(d).toLocaleString('de-DE', {
		timeZone: 'Europe/Berlin',
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}

export function date(d: Date | string | null | undefined): string {
	if (!d) return '–';
	const v =
		typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)
			? new Date(`${d}T12:00:00`)
			: new Date(d);
	return v.toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin' });
}

export function fullName(s: { firstName: string; lastName?: string | null }): string {
	return [s.firstName, s.lastName].filter(Boolean).join(' ');
}

export function stars(n: number | null | undefined): string {
	if (n === null || n === undefined) return '–';
	return '★'.repeat(n) + '☆'.repeat(Math.max(0, 3 - n));
}

export const RUN_STATUS: Record<string, string> = {
	running: 'läuft',
	finished: 'beendet',
	timeUp: 'Zeit abgelaufen',
	aborted: 'abgebrochen',
	failed: 'Motorschaden'
};
