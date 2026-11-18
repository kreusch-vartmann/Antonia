<script lang="ts">
	import {
		OPERAND_A,
		OPERAND_B,
		PLACE_COLOR_HEX,
		STRIKE_BLACK,
		STRIKE_RED
	} from '#lib/domain/colors.ts';
	import { displaySettings, type DisplaySettings } from '#lib/domain/settings.ts';
	import { fieldCells, strikes } from '#lib/domain/visuals.ts';

	interface Props {
		a: number;
		b: number;
		op: '+' | '-';
		display?: DisplaySettings;
	}

	let { a, b, op, display = displaySettings({}) }: Props = $props();

	const gap = 24;
	const r = 9;
	const cells = $derived(fieldCells(a, op, b));
	const lines = $derived(strikes(cells));
	const rows = $derived(Math.ceil(cells.length / 10));
	const big = $derived(cells.length === 100);
	const w = 10 * gap + 10 + 10;
	const h = $derived(2 * 17 + (rows - 1) * gap + (big ? 10 : 0));
	const place = $derived(display.numberColors === 'placeValue');
	const strike = $derived(place ? STRIKE_BLACK : STRIKE_RED);
	const label = $derived(
		(cells.length === 10 ? 'Zehnerfeld' : cells.length === 20 ? 'Zwanzigerfeld' : 'Hunderterfeld') +
			(op === '-' ? `, ${b} weggestrichen` : '')
	);

	const cx = (col: number) => 17 + col * gap + (col >= 5 ? 10 : 0);
	const cy = (row: number) => 17 + row * gap + (big && row >= 5 ? 10 : 0);

	function fill(i: number): string {
		const c = cells[i];
		if (c.owner === null) return '#fff';
		if (place) {
			const key = c.place === 'tens' ? display.colorTens : display.colorOnes;
			return PLACE_COLOR_HEX[key].fill;
		}
		return c.owner === 'a' ? OPERAND_A : OPERAND_B;
	}
</script>

<div class="visual">
	<!-- width/height are set explicitly: Safari collapses a viewBox-only SVG in a flex container -->
	<svg
		viewBox="0 0 {w} {h}"
		width={w}
		height={h}
		class="field field-{cells.length}"
		role="img"
		aria-label={label}
	>
		<rect x="1" y="1" width={w - 2} height={h - 2} rx="6" fill="#fff" stroke="#999" />
		{#each cells as cell, i (i)}
			<circle
				cx={cx(i % 10)}
				cy={cy(Math.floor(i / 10))}
				{r}
				fill={fill(i)}
				stroke={cell.owner === null ? '#8a929b' : 'none'}
				stroke-width="1"
			/>
		{/each}
		{#each lines as l (l.row + '-' + l.from)}
			<line
				x1={cx(l.from) - 13}
				x2={cx(l.to) + 13}
				y1={cy(l.row)}
				y2={cy(l.row)}
				stroke={strike}
				stroke-width="3.5"
				stroke-linecap="round"
			/>
		{/each}
	</svg>
</div>

<style>
	.visual {
		flex: 1 1 100%;
		display: flex;
		justify-content: center;
	}
	svg {
		display: block;
		flex: none;
		max-width: min(18rem, 100%);
		height: auto;
	}
	svg.field-100 {
		max-width: min(15rem, 100%);
		max-height: 40vh;
		max-height: 40dvh;
	}
</style>
