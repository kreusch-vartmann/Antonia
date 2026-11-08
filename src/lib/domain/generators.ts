/**
 * Task generators. They produce editable drafts; the teacher reviews and
 * adjusts each task before it is saved to the pool.
 */
import { z } from 'zod';
import type { ArithmeticContent, Gap, Op, TaskOrigin } from './formats/types';
import { computeResult, expectedAnswer } from './formats/arithmetic';
import { crossesTen } from './numberRange';
import { rng as makeRng, shuffle } from './random';

export interface TaskDraft {
	content: ArithmeticContent;
	tags: string[];
	origin: TaskOrigin;
}

const bool = z
	.union([z.boolean(), z.enum(['true', 'false', 'on'])])
	.transform((v) => v === true || v === 'true' || v === 'on');

export const multiplicationRowParams = z
	.object({
		row: z.coerce.number().int().min(0).max(20),
		from: z.coerce.number().int().min(0).max(20).default(1),
		to: z.coerce.number().int().min(0).max(20).default(10),
		orientation: z.enum(['kxn', 'nxk', 'both']).default('kxn'),
		gap: z.enum(['result', 'factor', 'mixed']).default('result'),
		shuffle: bool.default(false),
		seed: z.coerce.number().int().default(1)
	})
	.refine((p) => p.from <= p.to, { message: '„von“ muss kleiner oder gleich „bis“ sein' });

export const divisionRowParams = z
	.object({
		row: z.coerce.number().int().min(1).max(20),
		from: z.coerce.number().int().min(0).max(20).default(1),
		to: z.coerce.number().int().min(0).max(20).default(10),
		gap: z.enum(['result', 'mixed']).default('result'),
		shuffle: bool.default(false),
		seed: z.coerce.number().int().default(1)
	})
	.refine((p) => p.from <= p.to, { message: '„von“ muss kleiner oder gleich „bis“ sein' });

export const addSubParams = z.object({
	op: z.enum(['+', '-', 'mixed']).default('+'),
	max: z.coerce.number().int().min(5).max(1000).default(20),
	count: z.coerce.number().int().min(1).max(50).default(10),
	transition: z.enum(['any', 'without', 'with']).default('any'),
	minOperand: z.coerce.number().int().min(0).max(999).default(1),
	gap: z.enum(['result', 'mixed']).default('result'),
	seed: z.coerce.number().int().default(1)
});

function make(
	a: number,
	op: Op,
	b: number,
	gap: Gap,
	tags: string[],
	generator: string,
	params: object
): TaskDraft {
	const expr = { a, op, b, gap };
	const answer = expectedAnswer(expr);
	if (answer === null) throw new Error('invalid generated task');
	return {
		content: { format: 'arithmetic', expr, answer },
		tags,
		origin: { kind: 'generator', generator, params: { ...params } }
	};
}

export function generateMultiplicationRow(input: unknown): TaskDraft[] {
	const p = multiplicationRowParams.parse(input);
	const r = makeRng(p.seed);
	const tags = ['1x1', `${p.row}er-Reihe`];
	const out: TaskDraft[] = [];
	for (let k = p.from; k <= p.to; k++) {
		const orients = p.orientation === 'both' ? ['kxn', 'nxk'] : [p.orientation];
		for (const o of orients) {
			const [a, b] = o === 'kxn' ? [k, p.row] : [p.row, k];
			if (p.orientation === 'both' && o === 'nxk' && a === b) continue;
			let gap: Gap = 'result';
			const wantFactor = p.gap === 'factor' || (p.gap === 'mixed' && r() < 0.5);
			if (wantFactor) gap = o === 'kxn' ? 'a' : 'b';
			out.push(make(a, '*', b, gap, tags, 'multiplicationRow', p));
		}
	}
	return p.shuffle ? shuffle(out, r) : out;
}

export function generateDivisionRow(input: unknown): TaskDraft[] {
	const p = divisionRowParams.parse(input);
	const r = makeRng(p.seed);
	const tags = ['1:1', `${p.row}er-Reihe`];
	const out: TaskDraft[] = [];
	for (let k = p.from; k <= p.to; k++) {
		const gap: Gap = p.gap === 'mixed' && r() < 0.5 ? 'b' : 'result';
		out.push(make(k * p.row, ':', p.row, gap, tags, 'divisionRow', p));
	}
	return p.shuffle ? shuffle(out, r) : out;
}

export function generateAddSub(input: unknown): TaskDraft[] {
	const p = addSubParams.parse(input);
	const r = makeRng(p.seed);
	const tags = [`ZR ${p.max}`];
	if (p.op !== '-') tags.push('Plus');
	if (p.op !== '+') tags.push('Minus');
	if (p.transition === 'with') tags.push('mit Übergang');
	if (p.transition === 'without') tags.push('ohne Übergang');

	const out: TaskDraft[] = [];
	const seen = new Set<string>();
	const lo = Math.min(p.minOperand, p.max);
	for (let tries = 0; out.length < p.count && tries < p.count * 200; tries++) {
		const op: '+' | '-' = p.op === 'mixed' ? (r() < 0.5 ? '+' : '-') : p.op;
		let a: number;
		let b: number;
		if (op === '+') {
			a = lo + Math.floor(r() * (p.max - lo + 1));
			const maxB = p.max - a;
			if (maxB < lo) continue;
			b = lo + Math.floor(r() * (maxB - lo + 1));
		} else {
			a = lo + Math.floor(r() * (p.max - lo + 1));
			if (a < lo) continue;
			b = lo + Math.floor(r() * (a - lo + 1));
		}
		if (computeResult(a, op, b) === null) continue;
		const crosses = crossesTen(a, op, b);
		if (p.transition === 'with' && !crosses) continue;
		if (p.transition === 'without' && crosses) continue;
		const key = `${a}${op}${b}`;
		if (seen.has(key)) continue;
		seen.add(key);
		const gap: Gap = p.gap === 'mixed' && r() < 0.5 ? 'b' : 'result';
		out.push(make(a, op, b, gap, tags, 'addSub', p));
	}
	return out;
}

export const GENERATORS = {
	multiplicationRow: { label: 'Einmaleins-Reihe', run: generateMultiplicationRow },
	divisionRow: { label: 'Geteilt-Reihe', run: generateDivisionRow },
	addSub: { label: 'Plus/Minus im Zahlenraum', run: generateAddSub }
} as const;

export type GeneratorId = keyof typeof GENERATORS;
