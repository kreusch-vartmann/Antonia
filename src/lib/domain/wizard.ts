/**
 * Set wizard: turns a few general answers (calculation type, number range, which
 * number is missing, ten transition, …) and optional fine settings into task drafts.
 * The drafts are shown to the teacher and can be changed one by one before saving.
 */
import { z } from 'zod';
import type { ArithmeticContent, Gap, Op, TaskOrigin } from './formats/types';
import { computeResult, decomposition, expectedAnswer } from './formats/arithmetic';
import { crossesHundred, crossesTen } from './numberRange';
import { rng as makeRng, shuffle } from './random';
import type { TaskDraft } from './generators';

export const OPERAND_KINDS = [
	'any',
	'ones',
	'tens',
	'twoDigit',
	'twoDigitMixed',
	'hundreds',
	'threeDigit',
	'fixed'
] as const;
export type OperandKind = (typeof OPERAND_KINDS)[number];

export const OPERAND_LABEL: Record<OperandKind, string> = {
	any: 'beliebig',
	ones: 'Einer (x)',
	tens: 'Zehnerzahl (x0)',
	twoDigit: 'zweistellig (xx)',
	twoDigitMixed: 'zweistellig, keine Zehnerzahl',
	hundreds: 'Hunderterzahl (x00)',
	threeDigit: 'dreistellig (xxx)',
	fixed: 'bestimmte Zahlen …'
};

export const WIZARD_RANGES = [6, 10, 20, 100, 1000] as const;

const bool = z
	.union([z.boolean(), z.enum(['true', 'false', 'on'])])
	.transform((v) => v === true || v === 'true' || v === 'on');

const operand = z.object({
	kind: z.enum(OPERAND_KINDS).default('any'),
	/** Comma separated numbers for kind "fixed", e.g. "6, 7". */
	fixed: z.string().max(200).default('')
});

export const wizardParams = z
	.object({
		op: z.enum(['+', '-', '+-', '*', ':', '*:']).default('+'),
		range: z.coerce
			.number()
			.refine((n) => (WIZARD_RANGES as readonly number[]).includes(n), 'Ungültiger Zahlenraum')
			.default(20),
		gaps: z
			.array(z.enum(['result', 'a', 'b']))
			.min(1, 'Bitte mindestens angeben, was gesucht wird.')
			.default(['result']),
		tenTransition: z.enum(['any', 'without', 'with']).default('any'),
		hundredTransition: z.enum(['any', 'without', 'with']).default('any'),
		count: z.coerce.number().int().min(1).max(100).default(10),
		rounds: z.coerce.number().int().min(1).max(3).default(1),
		decompose: z.enum(['none', 'show', 'fill']).default('none'),
		allowZero: bool.default(false),
		first: operand.default({ kind: 'any', fixed: '' }),
		second: operand.default({ kind: 'any', fixed: '' }),
		/** Times table rows / divisors; empty = 1 to 10. */
		rows: z.array(z.coerce.number().int().min(1).max(20)).default([]),
		factorFrom: z.coerce.number().int().min(0).max(20).default(1),
		factorTo: z.coerce.number().int().min(0).max(20).default(10),
		orientation: z.enum(['kxn', 'nxk', 'both']).default('kxn'),
		seed: z.coerce.number().int().default(1)
	})
	.refine((p) => p.factorFrom <= p.factorTo, {
		message: '„Faktor von“ muss kleiner oder gleich „bis“ sein',
		path: ['factorFrom']
	});

export type WizardParams = z.infer<typeof wizardParams>;

/** What the "preview" step of the wizard hands to the page. */
export interface WizardPreview {
	params: Record<string, unknown>;
	drafts: ArithmeticContent[];
	warnings: string[];
	tags: string[];
	origin: TaskOrigin;
	name: string;
}

export interface WizardResult {
	drafts: TaskDraft[];
	warnings: string[];
	tags: string[];
	origin: TaskOrigin;
}

function parseFixed(s: string): number[] {
	return [
		...new Set(
			s
				.split(/[,;\s]+/)
				.filter(Boolean)
				.map(Number)
				.filter((n) => Number.isInteger(n) && n >= 0 && n <= 100_000)
		)
	];
}

function matches(kind: OperandKind, fixed: number[], n: number, allowZero: boolean): boolean {
	switch (kind) {
		case 'any':
			return allowZero || n > 0;
		case 'ones':
			return n <= 9 && (allowZero || n > 0);
		case 'tens':
			return n >= 10 && n <= 90 && n % 10 === 0;
		case 'twoDigit':
			return n >= 10 && n <= 99;
		case 'twoDigitMixed':
			return n >= 10 && n <= 99 && n % 10 !== 0;
		case 'hundreds':
			return n >= 100 && n <= 900 && n % 100 === 0;
		case 'threeDigit':
			return n >= 100 && n <= 999;
		case 'fixed':
			return fixed.includes(n);
	}
}

interface Candidate {
	a: number;
	op: Op;
	b: number;
	/** Position in the natural order (times tables: by row, then factor). */
	idx?: number;
}

function addSubCandidates(p: WizardParams): Candidate[] {
	const ops: Op[] = p.op === '+-' ? ['+', '-'] : [p.op as Op];
	const fixedA = parseFixed(p.first.fixed);
	const fixedB = parseFixed(p.second.fixed);
	const all = Array.from({ length: p.range + 1 }, (_, i) => i);
	const as = all.filter((n) => matches(p.first.kind, fixedA, n, p.allowZero));
	const bs = all.filter((n) => matches(p.second.kind, fixedB, n, p.allowZero));
	const out: Candidate[] = [];
	for (const op of ops) {
		for (const a of as) {
			for (const b of bs) {
				const r = op === '+' ? a + b : a - b;
				if (r < 0 || r > p.range) continue;
				if (!p.allowZero && r === 0) continue;
				if (p.range >= 20) {
					const t = crossesTen(a, op as '+' | '-', b);
					if (p.tenTransition === 'with' && !t) continue;
					if (p.tenTransition === 'without' && t) continue;
				}
				if (p.range === 1000) {
					const h = crossesHundred(a, op as '+' | '-', b);
					if (p.hundredTransition === 'with' && !h) continue;
					if (p.hundredTransition === 'without' && h) continue;
				}
				out.push({ a, op, b });
			}
		}
	}
	return out;
}

function timesCandidates(p: WizardParams): Candidate[] {
	const rows = p.rows.length > 0 ? p.rows : Array.from({ length: 10 }, (_, i) => i + 1);
	const out: Candidate[] = [];
	const seen = new Set<string>();
	const push = (c: Candidate) => {
		const key = `${c.a}${c.op}${c.b}`;
		if (!seen.has(key)) {
			seen.add(key);
			out.push({ ...c, idx: out.length });
		}
	};
	for (const row of rows) {
		for (let k = p.factorFrom; k <= p.factorTo; k++) {
			if (p.op === '*' || p.op === '*:') {
				if (p.orientation !== 'nxk') push({ a: k, op: '*', b: row });
				if (p.orientation !== 'kxn') push({ a: row, op: '*', b: k });
			}
			if (p.op === ':' || p.op === '*:') push({ a: k * row, op: ':', b: row });
		}
	}
	return out;
}

const OP_NAME: Record<string, string> = {
	'+': 'Plus',
	'-': 'Minus',
	'+-': 'Plus und Minus',
	'*': 'Mal',
	':': 'Geteilt',
	'*:': 'Mal und Geteilt'
};

function tagsFor(p: WizardParams): string[] {
	const tags: string[] = [];
	if (p.op === '*' || p.op === ':' || p.op === '*:') {
		if (p.op !== ':') tags.push('1x1');
		if (p.op !== '*') tags.push('1:1');
		for (const r of p.rows) tags.push(`${r}er-Reihe`);
		return tags;
	}
	tags.push(`ZR ${p.range}`);
	if (p.op !== '-') tags.push('Plus');
	if (p.op !== '+') tags.push('Minus');
	if (p.range >= 20 && p.tenTransition === 'with') tags.push('mit Übergang');
	if (p.range >= 20 && p.tenTransition === 'without') tags.push('ohne Übergang');
	if (p.decompose !== 'none') tags.push('Zerlegung');
	return tags;
}

/** Generates the task drafts for the given wizard answers. */
export function generateFromWizard(input: unknown): WizardResult {
	const p = wizardParams.parse(input);
	const warnings: string[] = [];
	const r = makeRng(p.seed);
	const addSub = p.op === '+' || p.op === '-' || p.op === '+-';
	const wantSplit = addSub && p.decompose !== 'none';

	if (!addSub && p.decompose !== 'none')
		warnings.push('Die Zahlzerlegung gibt es nur bei Plus und Minus. Sie wird ignoriert.');
	if (wantSplit && p.gaps.some((g) => g !== 'result'))
		warnings.push('Die Zahlzerlegung wirkt nur bei Aufgaben, bei denen das Ergebnis gesucht wird.');

	const pool = shuffle(addSub ? addSubCandidates(p) : timesCandidates(p), r);
	const used = new Set<number>();
	const picked: { c: Candidate; gap: Gap }[] = [];
	for (let i = 0; i < p.count; i++) {
		const gap = p.gaps[i % p.gaps.length];
		const needSplit = wantSplit && gap === 'result';
		const j = pool.findIndex(
			(c, idx) => !used.has(idx) && (!needSplit || decomposition(c.a, c.op, c.b) !== null)
		);
		if (j < 0) continue;
		used.add(j);
		picked.push({ c: pool[j], gap });
	}
	if (picked.length < p.count) {
		warnings.push(
			picked.length === 0
				? 'Mit diesen Einstellungen entstehen keine Aufgaben.'
				: `Mit diesen Einstellungen gibt es nur ${picked.length} verschiedene Aufgaben.`
		);
	}

	const tags = tagsFor(p);
	const origin: TaskOrigin = { kind: 'generator', generator: 'wizard', params: { ...p } };
	// Times tables keep their natural order (the set can be shuffled for the child), plus and
	// minus are mixed.
	const ordered = addSub
		? p.gaps.length > 1
			? shuffle(picked, r)
			: picked
		: [...picked].sort((x, y) => (x.c.idx ?? 0) - (y.c.idx ?? 0));
	const drafts: TaskDraft[] = ordered.map(({ c, gap }) => {
		const expr = { a: c.a, op: c.op, b: c.b, gap };
		const answer = expectedAnswer(expr) ?? computeResult(c.a, c.op, c.b) ?? 0;
		const content: ArithmeticContent = { format: 'arithmetic', expr, answer };
		if (wantSplit && gap === 'result') content.decompose = p.decompose as 'show' | 'fill';
		return { content, tags, origin };
	});
	return { drafts, warnings, tags, origin };
}

function rowsText(rows: number[]): string {
	if (rows.length <= 1) return rows.join('');
	return `${rows.slice(0, -1).join(', ')} und ${rows.at(-1)}`;
}

/** "5er-Reihe" or "2er-, 5er- und 10er-Reihe". */
function reihen(rows: number[]): string {
	if (rows.length === 1) return `${rows[0]}er-Reihe`;
	return `${rows
		.slice(0, -1)
		.map((r) => `${r}er-`)
		.join(', ')} und ${rows.at(-1)}er-Reihe`;
}

/** A name for the new set, e.g. "+6 und +7 mit ZÜ" or "Einmaleins 5er-Reihe". */
export function suggestSetName(input: unknown): string {
	const p = wizardParams.parse(input);
	const rows = [...p.rows].sort((a, b) => a - b);
	let name: string;
	if (p.op === '*') {
		name = rows.length ? `Einmaleins ${reihen(rows)}` : 'Einmaleins';
	} else if (p.op === ':') {
		name = rows.length ? `Geteilt durch ${rowsText(rows)}` : 'Geteilt';
	} else if (p.op === '*:') {
		name = rows.length ? `Mal und Geteilt, ${reihen(rows)}` : 'Mal und Geteilt';
	} else {
		const fixed = parseFixed(p.second.fixed);
		const sym = p.op === '-' ? '−' : '+';
		const suffix =
			p.range >= 20 && p.tenTransition === 'with'
				? ' mit ZÜ'
				: p.range >= 20 && p.tenTransition === 'without'
					? ' ohne ZÜ'
					: '';
		if (p.op !== '+-' && p.second.kind === 'fixed' && fixed.length > 0) {
			name = fixed.map((n) => `${sym}${n}`).join(' und ') + suffix;
		} else {
			name = `${OP_NAME[p.op]} bis ${p.range}${suffix}`;
		}
		if (p.decompose !== 'none') name += ' mit Zerlegung';
	}
	return name.slice(0, 120);
}
