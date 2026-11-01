<script lang="ts">
	import { clockPrecise } from '#lib/domain/modes.ts';

	interface Props {
		ms: number;
		/** Rendered width in px. */
		size?: number;
	}
	let { ms, size = 220 }: Props = $props();
	const time = $derived(clockPrecise(ms));
</script>

<svg viewBox="0 0 120 140" width={size} role="img" aria-label="Stoppuhr: {time}" class="stopwatch">
	<rect x="52" y="2" width="16" height="12" rx="3" fill="#7d8792" />
	<rect x="46" y="12" width="28" height="8" rx="3" fill="#b4bcc6" />
	<rect x="96" y="26" width="10" height="16" rx="3" fill="#b4bcc6" transform="rotate(40 101 34)" />
	<circle cx="60" cy="80" r="56" fill="#b4bcc6" />
	<circle cx="60" cy="80" r="50" fill="#fff" stroke="#7d8792" stroke-width="2" />
	{#each Array.from({ length: 12 }, (_, i) => i) as i (i)}
		<line
			x1="60"
			y1="35"
			x2="60"
			y2={i % 3 === 0 ? 43 : 40}
			stroke="#7d8792"
			stroke-width={i % 3 === 0 ? 3 : 1.5}
			transform="rotate({i * 30} 60 80)"
		/>
	{/each}
	<text
		x="60"
		y="88"
		text-anchor="middle"
		font-size="21"
		font-weight="800"
		fill="#1f2933"
		style="font-variant-numeric: tabular-nums">{time}</text
	>
</svg>

<style>
	.stopwatch {
		display: block;
		margin: 0 auto;
		filter: drop-shadow(0 4px 6px #0003);
		animation: wobble 1.2s ease-out 0.2s both;
		transform-origin: 50% 80%;
	}
	@keyframes wobble {
		0% {
			transform: scale(0.3) rotate(-14deg);
			opacity: 0;
		}
		55% {
			transform: scale(1.12) rotate(6deg);
			opacity: 1;
		}
		100% {
			transform: none;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.stopwatch {
			animation: none;
		}
	}
</style>
