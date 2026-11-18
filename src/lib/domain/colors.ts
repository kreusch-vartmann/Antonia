/** Colours for place values, operands and the material in hints. */
export const PLACE_COLORS = ['red', 'green', 'blue', 'purple', 'yellow', 'orange'] as const;
export type PlaceColor = (typeof PLACE_COLORS)[number];

export const PLACE_COLOR_LABEL: Record<PlaceColor, string> = {
	red: 'Rot',
	green: 'Grün',
	blue: 'Blau',
	purple: 'Lila',
	yellow: 'Gelb',
	orange: 'Orange'
};

/** text: readable on white; fill: for dots and material. */
export const PLACE_COLOR_HEX: Record<PlaceColor, { text: string; fill: string }> = {
	red: { text: '#c62828', fill: '#d32f2f' },
	green: { text: '#2e7d32', fill: '#43a047' },
	blue: { text: '#1f5fbf', fill: '#1f5fbf' },
	purple: { text: '#7b1fa2', fill: '#9c27b0' },
	yellow: { text: '#9a7400', fill: '#f2c200' },
	orange: { text: '#c25100', fill: '#ef6c00' }
};

export const OPERAND_A = '#1f5fbf';
export const OPERAND_B = '#c62828';
export const STRIKE_RED = '#c62828';
export const STRIKE_BLACK = '#222';
export const WOOD = { fill: '#e2b47c', light: '#f0cb98', stroke: '#9c6b35' };

export type Place = 'ones' | 'tens' | 'hundreds' | 'thousands';
const PLACES: Place[] = ['ones', 'tens', 'hundreds', 'thousands'];

/** The digits of a number from the left with their place; null after the fourth place. */
export function digitPlaces(value: string): { digit: string; place: Place | null }[] {
	const chars = [...value];
	return chars.map((digit, i) => {
		const fromRight = chars.length - 1 - i;
		return { digit, place: PLACES[fromRight] ?? null };
	});
}
