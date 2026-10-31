/** Cars for the race (own SVG drawings, see RaceCar.svelte). */
export const CAR_MODELS = [
	{ id: 'racer', label: 'Flitzer' },
	{ id: 'buggy', label: 'Buggy' },
	{ id: 'truck', label: 'Laster' }
] as const;

export const CAR_COLORS = [
	{ id: 'red', label: 'Rot', hex: '#d64545' },
	{ id: 'blue', label: 'Blau', hex: '#2f6fd6' },
	{ id: 'green', label: 'Grün', hex: '#2e9e5b' },
	{ id: 'yellow', label: 'Gelb', hex: '#e8b923' },
	{ id: 'purple', label: 'Lila', hex: '#8a55c9' },
	{ id: 'orange', label: 'Orange', hex: '#e9812f' }
] as const;

export type CarModel = (typeof CAR_MODELS)[number]['id'];
export type CarColor = (typeof CAR_COLORS)[number]['id'];

export interface Car {
	model: string;
	color: string;
}

export const DEFAULT_CAR: Car = { model: 'racer', color: 'blue' };

export function carHex(color: string): string {
	return CAR_COLORS.find((c) => c.id === color)?.hex ?? '#2f6fd6';
}
