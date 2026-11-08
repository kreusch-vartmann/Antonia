import type { ArithmeticContent, Gap, Op } from '#lib/domain/formats/types.ts';
import { expectedAnswer } from '#lib/domain/formats/arithmetic.ts';
import { ValidationError } from './services/accounts';

const OPS: Op[] = ['+', '-', '*', ':'];
const GAPS: Gap[] = ['result', 'a', 'b'];

function intOrNull(v: FormDataEntryValue | null): number | null {
	if (typeof v !== 'string' || v.trim() === '') return null;
	const n = Number(v.trim());
	return Number.isInteger(n) ? n : NaN;
}

function numList(v: FormDataEntryValue | null): number[] | undefined {
	if (typeof v !== 'string' || !v.trim()) return undefined;
	const nums = v
		.split(/[,;\s]+/)
		.filter(Boolean)
		.map((x) => Number(x));
	if (nums.some((n) => !Number.isInteger(n) || n < 0)) {
		throw new ValidationError(
			'Falsche Antwortmöglichkeiten: bitte ganze Zahlen, durch Komma getrennt.'
		);
	}
	return nums;
}

/**
 * Reads an arithmetic task from form fields (optionally prefixed, e.g. "d.3.").
 * If no answer is given, it is computed from the expression.
 */
export function arithmeticFromForm(form: FormData, p = ''): ArithmeticContent {
	const g = (k: string) => form.get(p + k);
	const mode = String(g('mode') ?? 'expr');
	const text = String(g('text') ?? '').trim() || undefined;
	const hint = String(g('hint') ?? '').trim() || undefined;
	const distractors = numList(g('distractors'));
	let expr: ArithmeticContent['expr'];
	if (mode !== 'text') {
		const a = intOrNull(g('a'));
		const b = intOrNull(g('b'));
		const op = String(g('op') ?? '') as Op;
		const gap = String(g('gap') ?? 'result') as Gap;
		if (a === null || b === null || Number.isNaN(a) || Number.isNaN(b)) {
			throw new ValidationError('Bitte beide Zahlen der Rechnung eingeben.');
		}
		if (!OPS.includes(op) || !GAPS.includes(gap)) throw new ValidationError('Ungültige Rechnung.');
		expr = { a, op, b, gap };
	}
	let answer = intOrNull(g('answer'));
	if (answer === null && expr) answer = expectedAnswer(expr);
	if (answer === null || Number.isNaN(answer)) {
		throw new ValidationError('Bitte das Ergebnis angeben (ganze Zahl ≥ 0).');
	}
	const dec = String(g('decompose') ?? '');
	const decompose = dec === 'boxes' || dec === 'equation' ? dec : undefined;
	return { format: 'arithmetic', expr, text, answer, distractors, hint, decompose };
}
