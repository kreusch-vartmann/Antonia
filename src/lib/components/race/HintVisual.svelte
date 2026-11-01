<script lang="ts">
	import type { HintVisual } from '#lib/domain/formats/types.ts';

	let { visual }: { visual: HintVisual } = $props();
</script>

{#if visual.kind === 'dots'}
	{@const r = 9}
	{@const gap = 24}
	{@const w = visual.cols * gap + (visual.cols > 5 ? 10 : 0) + 10}
	{@const h = visual.rows * gap + (visual.rows > 5 ? 10 : 0) + 10}
	<svg
		viewBox="0 0 {w} {h}"
		class="dots"
		role="img"
		aria-label="{visual.rows} Reihen mit je {visual.cols} Punkten"
	>
		{#each Array.from({ length: visual.rows }, (_, i) => i) as row (row)}
			{#each Array.from({ length: visual.cols }, (_, j) => j) as col (col)}
				<circle
					cx={17 + col * gap + (col >= 5 ? 10 : 0)}
					cy={17 + row * gap + (row >= 5 ? 10 : 0)}
					{r}
					fill={row % 2 ? '#2f6fd6' : '#e9812f'}
				/>
			{/each}
		{/each}
	</svg>
{:else}
	<!-- Tile field: 10 or 20 tiles in rows of 10, grouped in fives -->
	{@const a = visual.a}
	{@const b = visual.b}
	{@const rows = visual.size / 10}
	{@const cells = Array.from({ length: visual.size }, (_, i) => i)}
	{@const h = rows * 30 + 8}
	<svg
		viewBox="0 0 290 {h}"
		class="twenty"
		role="img"
		aria-label={visual.size === 10 ? 'Zehnerfeld' : 'Zwanzigerfeld'}
	>
		<rect x="1" y="1" width="288" height={h - 2} rx="6" fill="#fff" stroke="#999" />
		{#each cells as i (i)}
			{@const row = Math.floor(i / 10)}
			{@const col = i % 10}
			{@const x = 18 + col * 26 + (col >= 5 ? 6 : 0)}
			{@const y = 19 + row * 30}
			{#if visual.op === '+'}
				<!-- first number blue, added tiles orange -->
				{@const color = i < a ? '#2f6fd6' : i < a + b ? '#e9812f' : '#eee'}
				<circle cx={x} cy={y} r="10" fill={color} />
			{:else}
				<!-- the tiles taken away come first (left), red and crossed out -->
				{@const crossed = i < Math.min(a, b)}
				{@const color = i < a ? (crossed ? '#d64545' : '#2f6fd6') : '#eee'}
				<circle cx={x} cy={y} r="10" fill={color} opacity={crossed ? 0.55 : 1} />
				{#if crossed}
					<line x1={x - 8} y1={y - 8} x2={x + 8} y2={y + 8} stroke="#333" stroke-width="2.5" />
				{/if}
			{/if}
		{/each}
	</svg>
{/if}

<style>
	svg {
		max-width: 100%;
		height: auto;
		display: block;
	}
	.dots {
		max-height: 7.5rem;
		width: auto;
	}
	.twenty {
		max-width: 16rem;
	}
</style>
