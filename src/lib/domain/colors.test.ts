import { describe, expect, it } from 'vitest';
import { digitPlaces } from './colors';

describe('digitPlaces', () => {
	it('names the places from the right', () => {
		expect(digitPlaces('1234').map((d) => d.place)).toEqual([
			'thousands',
			'hundreds',
			'tens',
			'ones'
		]);
		expect(digitPlaces('7')).toEqual([{ digit: '7', place: 'ones' }]);
	});
	it('has no colour after the fourth place', () => {
		expect(digitPlaces('12345')[0]).toEqual({ digit: '1', place: null });
	});
});
