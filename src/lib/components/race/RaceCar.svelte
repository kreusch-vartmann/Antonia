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
		/** Engine failure: smoke over the bonnet. */
		broken?: boolean;
	}

	let {
		model = 'racer',
		color = 'blue',
		size = 80,
		ghost = false,
		label,
		inline = false,
		broken = false
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
	{@render car()}
	{#if broken}
		<g class="smoke" fill="#e4e7ea" stroke="#9aa1a8" stroke-width="1.5">
			<circle class="puff p1" cx="30" cy="-4" r="17" />
			<circle class="puff p2" cx="42" cy="8" r="13" />
			<circle class="puff p3" cx="22" cy="12" r="11" />
		</g>
	{/if}
{/snippet}

{#snippet car()}
	<!-- wheels -->
	<g fill="#222">
		{#if model === 'monster'}
			<!-- own wheels below -->
		{:else if model === 'truck'}
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
	{#if model === 'monster'}
		<!-- monster truck: huge wheels with tread, a face at the front -->
		<g fill="#1b1d21" stroke="#00000066" stroke-width="2">
			<rect x="-44" y="-30" width="28" height="17" rx="6" />
			<rect x="-44" y="13" width="28" height="17" rx="6" />
			<rect x="12" y="-30" width="28" height="17" rx="6" />
			<rect x="12" y="13" width="28" height="17" rx="6" />
		</g>
		<g stroke="#5a5f66" stroke-width="2" stroke-linecap="round">
			{#each [-38, -31, -24, 18, 25, 32] as x (x)}
				<line x1={x} y1="-27" x2={x} y2="-16" />
				<line x1={x} y1="16" x2={x} y2="27" />
			{/each}
		</g>
		<rect
			x="-36"
			y="-13"
			width="76"
			height="26"
			rx="9"
			{fill}
			stroke="#00000066"
			stroke-width="2"
		/>
		<path d="M -34 -4 L -10 -4 L -4 0 L -10 4 L -34 4 Z" fill="#f08a24" />
		<rect x="-8" y="-10" width="22" height="20" rx="5" fill="#bfe3ff" stroke="#00000055" />
		<!-- eyes and teeth -->
		<circle cx="30" cy="-7" r="5.5" fill="#fff" stroke="#000" stroke-width="1" />
		<circle cx="30" cy="7" r="5.5" fill="#fff" stroke="#000" stroke-width="1" />
		<circle cx="31.5" cy="-7" r="2.4" fill="#d62828" />
		<circle cx="31.5" cy="7" r="2.4" fill="#d62828" />
		<path
			d="M 41 -10 L 36 -6 L 41 -3 L 36 0 L 41 3 L 36 6 L 41 10"
			fill="none"
			stroke="#fff"
			stroke-width="3"
			stroke-linejoin="round"
		/>
	{:else if model === 'buggy'}
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
		opacity: 0.5;
	}
	.puff {
		transform-box: fill-box;
		transform-origin: center;
		opacity: 0.8;
		animation: puff 1.6s ease-out infinite;
	}
	.p2 {
		animation-delay: 0.5s;
	}
	.p3 {
		animation-delay: 1s;
	}
	@keyframes puff {
		from {
			opacity: 0.85;
			transform: translate(0, 0) scale(0.9);
		}
		to {
			opacity: 0.1;
			transform: translate(10px, -20px) scale(1.5);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.puff {
			animation: none;
		}
	}
</style>
