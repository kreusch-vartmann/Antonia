<script lang="ts">
	import { PLACE_COLOR_HEX, STRIKE_BLACK, STRIKE_RED, WOOD } from '#lib/domain/colors.ts';
	import { displaySettings, type DisplaySettings } from '#lib/domain/settings.ts';
	import { dienesGroups, runs } from '#lib/domain/visuals.ts';

	interface Props {
		a: number;
		b: number;
		op: '+' | '-';
		display?: DisplaySettings;
	}

	let { a, b, op, display = displaySettings({}) }: Props = $props();

	const cube = 16;
	const rodW = 160;
	const rodGap = 6;
	const cubeGap = 4;
	const groupGap = 28;
	const pad = 8;
	const over = 6;

	const groups = $derived(dienesGroups(a, op, b));
	const place = $derived(display.numberColors === 'placeValue');
	const rodFill = $derived(place ? PLACE_COLOR_HEX[display.colorTens].fill : WOOD.fill);
	const cubeFill = $derived(place ? PLACE_COLOR_HEX[display.colorOnes].fill : WOOD.fill);
	const stroke = $derived(place ? '#00000066' : WOOD.stroke);
	const strike = $derived(place ? STRIKE_BLACK : STRIKE_RED);

	const layout = $derived.by(() => {
		let x = pad;
		let height = 0;
		const out = groups.map((g) => {
			const cubesW = g.cubes.length * (cube + cubeGap);
			const width = Math.max(g.rods.length ? rodW : 0, cubesW, cube);
			const rodsH = g.rods.length * (cube + rodGap);
			const gh = rodsH + (g.cubes.length ? cube : 0);
			height = Math.max(height, gh);
			const item = { g, x, rodsH };
			x += width + groupGap;
			return item;
		});
		return { items: out, width: x - groupGap + pad, height: height + 2 * pad };
	});
</script>

<div class="visual">
	<svg
		viewBox="0 0 {layout.width} {layout.height}"
		width={layout.width}
		height={layout.height}
		class="dienes"
		role="img"
		aria-label="Zehnerstangen und Einerwürfel"
	>
		{#each layout.items as item, gi (gi)}
			{#each item.g.rods as rod, ri (ri)}
				{@const y = pad + ri * (cube + rodGap)}
				<rect x={item.x} {y} width={rodW} height={cube} rx="2" fill={rodFill} {stroke} />
				<rect x={item.x + 1} y={y + 1} width={rodW - 2} height="4" fill="#fff" opacity="0.35" />
				{#each Array.from({ length: 9 }, (_, k) => k + 1) as k (k)}
					<line
						x1={item.x + k * cube}
						x2={item.x + k * cube}
						y1={y}
						y2={y + cube}
						{stroke}
						stroke-width="1"
					/>
				{/each}
				{#each runs(rod.crossed) as [from, to] (from)}
					<line
						x1={item.x + from * cube - over}
						x2={item.x + (to + 1) * cube + over}
						y1={y + cube / 2}
						y2={y + cube / 2}
						stroke={strike}
						stroke-width="3.5"
						stroke-linecap="round"
					/>
				{/each}
			{/each}
			{#each item.g.cubes.keys() as ci (ci)}
				{@const x = item.x + ci * (cube + cubeGap)}
				{@const y = pad + item.rodsH}
				<rect {x} {y} width={cube} height={cube} rx="2" fill={cubeFill} {stroke} />
				<rect x={x + 1} y={y + 1} width={cube - 2} height="4" fill="#fff" opacity="0.35" />
			{/each}
			{#each runs(item.g.cubes) as [from, to] (from)}
				<line
					x1={item.x + from * (cube + cubeGap) - over}
					x2={item.x + to * (cube + cubeGap) + cube + over}
					y1={pad + item.rodsH + cube / 2}
					y2={pad + item.rodsH + cube / 2}
					stroke={strike}
					stroke-width="3.5"
					stroke-linecap="round"
				/>
			{/each}
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
		max-width: min(24rem, 100%);
		height: auto;
		max-height: 40vh;
		max-height: 40dvh;
	}
</style>
