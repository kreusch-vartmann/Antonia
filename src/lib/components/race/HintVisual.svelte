<script lang="ts">
	import type { HintVisual } from '#lib/domain/formats/types.ts';
	import { displaySettings, type DisplaySettings } from '#lib/domain/settings.ts';
	import DotField from '../visual/DotField.svelte';
	import DienesVisual from '../visual/DienesVisual.svelte';

	let { visual, display = displaySettings({}) }: { visual: HintVisual; display?: DisplaySettings } =
		$props();
</script>

<div class="visual">
	{#if visual.kind === 'dots'}
		{@const r = 9}
		{@const gap = 24}
		{@const w = visual.cols * gap + (visual.cols > 5 ? 10 : 0) + 10}
		{@const h = visual.rows * gap + (visual.rows > 5 ? 10 : 0) + 10}
		{@const k = Math.min(1.1, 120 / h)}
		<!-- width/height are set explicitly: Safari collapses a viewBox-only SVG in a flex container -->
		<svg
			viewBox="0 0 {w} {h}"
			width={Math.round(w * k)}
			height={Math.round(h * k)}
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
	{:else if display.visualMaterial === 'dienes'}
		<DienesVisual a={visual.a} b={visual.b} op={visual.op} {display} />
	{:else}
		<DotField a={visual.a} b={visual.b} op={visual.op} {display} />
	{/if}
</div>

<style>
	.visual {
		flex: 1 1 100%;
		display: flex;
		justify-content: center;
	}
	svg {
		display: block;
		max-width: 100%;
		height: auto;
		flex: none;
	}
</style>
