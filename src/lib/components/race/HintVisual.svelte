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
	<!-- Zwanzigerfeld: 2 rows of 10, grouped in fives -->
	{@const a = visual.a}
	{@const b = visual.b}
	{@const cells = Array.from({ length: 20 }, (_, i) => i)}
	<svg viewBox="0 0 290 70" class="twenty" role="img" aria-label="Zwanzigerfeld">
		<rect x="1" y="1" width="288" height="68" rx="6" fill="#fff" stroke="#999" />
		{#each cells as i (i)}
			{@const row = Math.floor(i / 10)}
			{@const col = i % 10}
			{@const filled = visual.op === '+' ? i < a + b : i < a}
			{@const crossed = visual.op === '-' && i >= a - b && i < a}
			{@const second = visual.op === '+' && i >= a && i < a + b}
			<circle
				cx={18 + col * 26 + (col >= 5 ? 6 : 0)}
				cy={20 + row * 30}
				r="10"
				fill={!filled ? '#eee' : second ? '#2f6fd6' : '#d64545'}
				opacity={crossed ? 0.35 : 1}
			/>
			{#if crossed}
				<line
					x1={10 + col * 26 + (col >= 5 ? 6 : 0)}
					y1={12 + row * 30}
					x2={26 + col * 26 + (col >= 5 ? 6 : 0)}
					y2={28 + row * 30}
					stroke="#333"
					stroke-width="2.5"
				/>
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
