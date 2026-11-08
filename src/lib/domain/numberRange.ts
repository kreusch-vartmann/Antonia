/**
 * Classifies a set of tasks by number range and ten/hundred transition,
 * so that sets can be listed in the order they are taught.
 */
import type { TaskContent } from './formats/types';
import { computeResult } from './formats/arithmetic';

export type RangeKey =
	| 'zr6'
	| 'zr10'
	| 'zr20-without'
	| 'zr20-with'
	| 'zr100-without'
	| 'zr100-with'
	| 'zr1000-without'
	| 'zr1000-with'
	| 'mult'
	| 'div'
	| 'multdiv'
	| 'mixed'
	| 'other'
	| 'empty';

export const RANGE_ORDER: RangeKey[] = [
	'zr6',
	'zr10',
	'zr20-without',
	'zr20-with',
	'zr100-without',
	'zr100-with',
	'zr1000-without',
	'zr1000-with',
	'mult',
	'div',
	'multdiv',
	'mixed',
	'other',
	'empty'
];

export const RANGE_LABEL: Record<RangeKey, string> = {
	zr6: 'Zahlenraum bis 6',
	zr10: 'Zahlenraum bis 10',
	'zr20-without': 'Zahlenraum bis 20 ohne Zehnerübergang',
	'zr20-with': 'Zahlenraum bis 20 mit Zehnerübergang',
	'zr100-without': 'Zahlenraum bis 100 ohne Zehnerübergang',
	'zr100-with': 'Zahlenraum bis 100 mit Zehnerübergang',
	'zr1000-without': 'Zahlenraum bis 1000 ohne Übergang',
	'zr1000-with': 'Zahlenraum bis 1000 mit Übergang',
	mult: 'Einmaleins',
	div: 'Geteilt',
	multdiv: 'Mal und Geteilt',
	mixed: 'Gemischt',
	other: 'Sonstige',
	empty: 'Ohne Aufgaben'
};

/** Does a + b or a − b cross a multiple of ten? (8 + 7, 15 − 7) */
export function crossesTen(a: number, op: '+' | '-', b: number): boolean {
	return op === '+' ? (a % 10) + (b % 10) >= 10 : a % 10 < b % 10;
}

/** Does a + b or a − b cross a multiple of one hundred? (80 + 50, 130 − 50) */
export function crossesHundred(a: number, op: '+' | '-', b: number): boolean {
	return op === '+' ? (a % 100) + (b % 100) >= 100 : a % 100 < b % 100;
}

export function classifySet(contents: TaskContent[]): RangeKey {
	if (contents.length === 0) return 'empty';
	const exprs = contents.flatMap((c) => (c.expr ? [c.expr] : []));
	if (exprs.length === 0) return 'other';

	const ops = new Set(exprs.map((e) => e.op));
	const hasAddSub = ops.has('+') || ops.has('-');
	const hasMulDiv = ops.has('*') || ops.has(':');
	if (hasAddSub && hasMulDiv) return 'mixed';
	if (hasMulDiv) return ops.has('*') && ops.has(':') ? 'multdiv' : ops.has('*') ? 'mult' : 'div';

	let max = 0;
	let tens = false;
	let hundreds = false;
	for (const e of exprs) {
		const op = e.op as '+' | '-';
		const r = computeResult(e.a, op, e.b) ?? 0;
		max = Math.max(max, e.a, e.b, r);
		if (crossesTen(e.a, op, e.b)) tens = true;
		if (crossesHundred(e.a, op, e.b)) hundreds = true;
	}
	if (max <= 6) return 'zr6';
	if (max <= 10) return 'zr10';
	if (max <= 20) return tens ? 'zr20-with' : 'zr20-without';
	if (max <= 100) return tens ? 'zr100-with' : 'zr100-without';
	if (max <= 1000) return tens || hundreds ? 'zr1000-with' : 'zr1000-without';
	return 'other';
}
