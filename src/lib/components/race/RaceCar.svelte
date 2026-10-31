<script lang="ts">
	import { carHex } from '#lib/domain/cars.ts';

	interface Props {
		model?: string;
		color?: string;
		/** Rendered size in px (width), car points to the right. */
		size?: number;
		ghost?: boolean;
		label?: string;
		/** Render as <g> inside another SVG (car centred at 0,0, 100 units long). */
		inline?: boolean;
	}

	let {
		model = 'racer',
		color = 'blue',
		size = 80,
		ghost = false,
		label,
		inline = false
	}: Props = $props();
	const fill = $derived(carHex(color));
</script>

{#if inline}
	<g class:ghost>{@render body()}</g>
{:else}
	<svg
		viewBox="-50 -30 100 60"
		width={size}
		height={size * 0.6}
		role={label ? 'img' : undefined}
		aria-label={label}
		aria-hidden={label ? undefined : 'true'}
		class:ghost
	>
		{@render body()}
	</svg>
{/if}

{#snippet body()}
	<!-- wheels -->
	<g fill="#222">
		{#if model === 'truck'}
			<rect x="-38" y="-27" width="16" height="9" rx="3" />
			<rect x="-38" y="18" width="16" height="9" rx="3" />
			<rect x="20" y="-27" width="16" height="9" rx="3" />
			<rect x="20" y="18" width="16" height="9" rx="3" />
		{:else}
			<rect x="-32" y="-26" width="16" height="9" rx="3" />
			<rect x="-32" y="17" width="16" height="9" rx="3" />
			<rect x="16" y="-26" width="16" height="9" rx="3" />
			<rect x="16" y="17" width="16" height="9" rx="3" />
		{/if}
	</g>
	{#if model === 'buggy'}
		<ellipse cx="0" cy="0" rx="40" ry="20" {fill} stroke="#00000055" stroke-width="2" />
		<ellipse cx="6" cy="0" rx="14" ry="12" fill="#bfe3ff" stroke="#00000044" />
		<rect x="-30" y="-14" width="14" height="28" rx="4" fill="#00000022" />
	{:else if model === 'truck'}
		<rect
			x="-46"
			y="-19"
			width="58"
			height="38"
			rx="4"
			fill="#d9d4c7"
			stroke="#00000055"
			stroke-width="2"
		/>
		<rect x="14" y="-18" width="32" height="36" rx="7" {fill} stroke="#00000055" stroke-width="2" />
		<rect x="30" y="-14" width="10" height="28" rx="3" fill="#bfe3ff" />
		<line x1="-40" y1="-8" x2="6" y2="-8" stroke="#00000022" stroke-width="2" />
		<line x1="-40" y1="8" x2="6" y2="8" stroke="#00000022" stroke-width="2" />
	{:else}
		<path
			d="M -44 -12 Q -46 -18 -38 -18 L 22 -16 Q 44 -12 46 0 Q 44 12 22 16 L -38 18 Q -46 18 -44 12 Z"
			{fill}
			stroke="#00000055"
			stroke-width="2"
		/>
		<path d="M 4 -11 L 20 -9 Q 26 0 20 9 L 4 11 Q 8 0 4 -11 Z" fill="#bfe3ff" />
		<rect
			x="-48"
			y="-20"
			width="7"
			height="40"
			rx="2"
			{fill}
			stroke="#00000055"
			stroke-width="1.5"
		/>
		<rect x="-20" y="-3" width="30" height="6" rx="3" fill="#ffffff88" />
	{/if}
{/snippet}

<style>
	svg {
		display: block;
		overflow: visible;
	}
	.ghost {
		opacity: 0.4;
	}
</style>
