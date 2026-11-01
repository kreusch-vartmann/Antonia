<script lang="ts">
	interface Props {
		count?: number;
	}
	let { count = 70 }: Props = $props();

	const COLORS = ['#f2b705', '#e04b4b', '#3b82d9', '#3fae5a', '#b05fd1', '#ff8a3d'];
	// svelte-ignore state_referenced_locally
	const pieces = Array.from({ length: count }, (_, i) => ({
		left: Math.random() * 100,
		delay: Math.random() * 1.6,
		duration: 2.6 + Math.random() * 2.2,
		drift: (Math.random() - 0.5) * 30,
		spin: 360 + Math.random() * 720,
		size: 0.5 + Math.random() * 0.5,
		color: COLORS[i % COLORS.length],
		round: i % 4 === 0
	}));
</script>

<div class="confetti" aria-hidden="true">
	{#each pieces as p, i (i)}
		<span
			class:round={p.round}
			style:left="{p.left}%"
			style:background={p.color}
			style:width="{p.size}rem"
			style:height="{p.size * (p.round ? 1 : 1.6)}rem"
			style:animation-delay="{p.delay}s"
			style:animation-duration="{p.duration}s"
			style:--drift="{p.drift}vw"
			style:--spin="{p.spin}deg"
		></span>
	{/each}
</div>

<style>
	.confetti {
		position: fixed;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
		z-index: 50;
	}
	span {
		position: absolute;
		top: -3rem;
		border-radius: 2px;
		opacity: 0;
		animation-name: fall;
		animation-timing-function: linear;
		animation-fill-mode: forwards;
	}
	.round {
		border-radius: 50%;
	}
	@keyframes fall {
		0% {
			opacity: 1;
			transform: translate(0, 0) rotate(0);
		}
		85% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			transform: translate(var(--drift), 110dvh) rotate(var(--spin));
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.confetti {
			display: none;
		}
	}
</style>
