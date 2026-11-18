/**
 * Layout of the dot field and the base-ten material for plus/minus tasks up to 100.
 *
 * The field has 10 columns; cell `i` lies in row `floor(i / 10)`, column `i % 10`.
 * Strike-out rules for minus (see the teachers' feedback):
 *  - up to 10: a subtrahend of 5 or more is struck from the left, a smaller one from the right
 *  - from 11 on: whole tens always from the tens (the full rows right above the partial row);
 *    ones of 5 or more from the bottom left, smaller ones from the bottom right;
 *    if the ones do not suffice (ten transition), first the single dots of the partial row go,
 *    then the rest from the right end of the lowest full row that is still untouched.
 */
export type FieldSize = 10 | 20 | 100;

export interface FieldCell {
	/** Which number the dot belongs to; null = empty dot. */
	owner: 'a' | 'b' | null;
	crossed: boolean;
	/** Place value for colouring: full rows are tens, the rest are ones. */
	place: 'tens' | 'ones';
}

/** A line through the cells `from`..`to` (columns, inclusive) of one row. */
export interface Strike {
	row: number;
	from: number;
	to: number;
}

type PlusMinus = '+' | '-';

function resultOf(a: number, op: string, b: number): number | null {
	if (op === '+') return a + b;
	if (op === '-') return a - b >= 0 ? a - b : null;
	return null;
}

/** Size of the field for the task, or null if there is no picture (other operation, over 100). */
export function fieldSize(a: number, op: string, b: number): FieldSize | null {
	const r = resultOf(a, op, b);
	if (r === null) return null;
	const m = Math.max(a, b, r);
	if (m <= 10) return 10;
	if (m <= 20) return 20;
	if (m <= 100) return 100;
	return null;
}

export function fieldCells(a: number, op: PlusMinus, b: number): FieldCell[] {
	const size = fieldSize(a, op, b);
	if (size === null) return [];
	const cells: FieldCell[] = Array.from({ length: size }, () => ({
		owner: null,
		crossed: false,
		place: 'ones' as const
	}));
	if (op === '+') {
		const ta = Math.floor(a / 10);
		const tb = Math.floor(b / 10);
		const oa = a % 10;
		const ob = b % 10;
		const s = (ta + tb) * 10;
		for (let i = 0; i < s; i++) {
			cells[i].owner = i < ta * 10 ? 'a' : 'b';
			cells[i].place = 'tens';
		}
		for (let i = 0; i < oa; i++) cells[s + i].owner = 'a';
		for (let i = 0; i < ob; i++) cells[s + oa + i].owner = 'b';
		return cells;
	}

	const full = Math.floor(a / 10);
	const p = a % 10;
	for (let i = 0; i < a; i++) {
		cells[i].owner = 'a';
		cells[i].place = i < full * 10 ? 'tens' : 'ones';
	}
	const cross = (from: number, to: number) => {
		for (let i = from; i <= to; i++) if (cells[i]) cells[i].crossed = true;
	};

	if (size === 10) {
		if (b >= 5) cross(0, b - 1);
		else cross(a - b, a - 1);
		return cells;
	}

	const t = Math.floor(b / 10);
	const o = b % 10;
	for (let k = 1; k <= t; k++) cross((full - k) * 10, (full - k) * 10 + 9);
	if (o > 0) {
		if (o <= p) {
			if (o >= 5) cross(full * 10, full * 10 + o - 1);
			else cross(full * 10 + p - o, full * 10 + p - 1);
		} else {
			cross(full * 10, full * 10 + p - 1);
			const row = full - 1 - t;
			cross(row * 10 + 10 - (o - p), row * 10 + 9);
		}
	}
	return cells;
}

/** The lines to draw: one per run of struck cells in a row. */
export function strikes(cells: FieldCell[]): Strike[] {
	const out: Strike[] = [];
	const rows = Math.ceil(cells.length / 10);
	for (let row = 0; row < rows; row++) {
		let start = -1;
		for (let c = 0; c <= 10; c++) {
			const on = c < 10 && !!cells[row * 10 + c]?.crossed;
			if (on && start < 0) start = c;
			if (!on && start >= 0) {
				out.push({ row, from: start, to: c - 1 });
				start = -1;
			}
		}
	}
	return out;
}

export interface DienesRod {
	/** The 10 segments of the rod, left to right; true = struck out. */
	crossed: boolean[];
}

export interface DienesGroup {
	owner: 'a' | 'b';
	rods: DienesRod[];
	/** Single cubes; true = struck out. */
	cubes: boolean[];
}

/** Base-ten material for plus (two groups) or minus (one group with struck parts). */
export function dienesGroups(a: number, op: PlusMinus, b: number): DienesGroup[] {
	if (fieldSize(a, op, b) === null) return [];
	const plain = (n: number, owner: 'a' | 'b'): DienesGroup => ({
		owner,
		rods: Array.from({ length: Math.floor(n / 10) }, () => ({ crossed: Array(10).fill(false) })),
		cubes: Array(n % 10).fill(false)
	});
	if (op === '+') return [plain(a, 'a'), plain(b, 'b')];
	const cells = fieldCells(a, '-', b);
	const full = Math.floor(a / 10);
	const g = plain(a, 'a');
	for (let r = 0; r < full; r++) {
		g.rods[r].crossed = Array.from({ length: 10 }, (_, c) => cells[r * 10 + c].crossed);
	}
	g.cubes = g.cubes.map((_, c) => cells[full * 10 + c].crossed);
	return [g];
}

/** Runs of struck items as [from, to] index pairs, e.g. [false,true,true,false] → [[1,2]]. */
export function runs(flags: boolean[]): [number, number][] {
	const out: [number, number][] = [];
	let start = -1;
	for (let i = 0; i <= flags.length; i++) {
		const on = i < flags.length && flags[i];
		if (on && start < 0) start = i;
		if (!on && start >= 0) {
			out.push([start, i - 1]);
			start = -1;
		}
	}
	return out;
}
