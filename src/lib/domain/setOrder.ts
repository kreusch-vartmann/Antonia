/**
 * Order and headings of the set overview. Sets are listed under a heading that the program
 * derives from the tasks ("range:<RangeKey>"); the teacher can move a set to another heading,
 * also to an own one ("custom:<id>"), and change the order of sets and headings.
 */
import { RANGE_LABEL, RANGE_ORDER, type RangeKey } from './numberRange';

export type HeadingKey = string;

export interface CustomHeading {
	id: string;
	name: string;
}

export interface OrderableSet {
	id: string;
	name: string;
	autoRange: RangeKey;
	heading: string | null;
	sortOrder: number | null;
}

export const rangeHeading = (key: RangeKey): HeadingKey => `range:${key}`;
export const customHeading = (id: string): HeadingKey => `custom:${id}`;

function isRangeKey(key: string): key is RangeKey {
	return (RANGE_ORDER as string[]).includes(key);
}

/** Does this heading key exist (a fixed one, or one of the teacher's own)? */
export function isValidHeading(key: string, customs: CustomHeading[]): boolean {
	if (key.startsWith('range:')) return isRangeKey(key.slice(6));
	if (key.startsWith('custom:')) return customs.some((c) => c.id === key.slice(7));
	return false;
}

/** The heading a set is listed under: the stored one if it still exists, else the automatic one. */
export function headingOf(s: OrderableSet, customs: CustomHeading[]): HeadingKey {
	if (s.heading && isValidHeading(s.heading, customs)) return s.heading;
	return rangeHeading(s.autoRange);
}

/** All headings in display order: the stored order first (existing keys only), then the rest. */
export function headingOrder(stored: string[] | undefined, customs: CustomHeading[]): HeadingKey[] {
	const all = [...RANGE_ORDER.map(rangeHeading), ...customs.map((c) => customHeading(c.id))];
	const first = (stored ?? []).filter((k, i, a) => all.includes(k) && a.indexOf(k) === i);
	return [...first, ...all.filter((k) => !first.includes(k))];
}

export function headingLabel(key: HeadingKey, customs: CustomHeading[]): string {
	if (key.startsWith('range:')) return RANGE_LABEL[key.slice(6) as RangeKey] ?? key;
	return customs.find((c) => customHeading(c.id) === key)?.name ?? key;
}

/** sortOrder ascending (without one last), then by name. */
export function compareSets(a: OrderableSet, b: OrderableSet): number {
	if (a.sortOrder !== b.sortOrder) {
		if (a.sortOrder === null) return 1;
		if (b.sortOrder === null) return -1;
		return a.sortOrder - b.sortOrder;
	}
	return a.name.localeCompare(b.name, 'de', { numeric: true });
}

export function groupSets<T extends OrderableSet>(
	sets: T[],
	customs: CustomHeading[],
	stored?: string[]
): { key: HeadingKey; label: string; sets: T[] }[] {
	return headingOrder(stored, customs).map((key) => ({
		key,
		label: headingLabel(key, customs),
		sets: sets.filter((s) => headingOf(s, customs) === key).sort(compareSets)
	}));
}

/** Moves an item one place up or down; returns a new list (unchanged at the edges). */
export function moveInList<T>(list: T[], item: T, dir: 'up' | 'down'): T[] {
	const i = list.indexOf(item);
	const j = dir === 'up' ? i - 1 : i + 1;
	if (i < 0 || j < 0 || j >= list.length) return [...list];
	const out = [...list];
	[out[i], out[j]] = [out[j], out[i]];
	return out;
}
