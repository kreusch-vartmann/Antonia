<script lang="ts" module>
	export interface TrackCar {
		id: string;
		fraction: number;
		model: string;
		color: string;
		lane: number; // -1 inner, 0 middle, 1 outer
		ghost?: boolean;
		broken?: boolean;
		/** Size factor (default 0.85). */
		scale?: number;
	}
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import RaceCar from './RaceCar.svelte';

	interface Props {
		cars: TrackCar[];
		calm?: boolean;
		/** Maximum height of the track in percent of the screen height. */
		heightVh?: number;
	}

	let { cars, calm = false, heightVh = 42 }: Props = $props();

	const D = 'M 500 500 L 700 500 A 200 200 0 0 0 700 100 L 300 100 A 200 200 0 0 0 300 500 Z';
	let pathEl: SVGPathElement | undefined = $state();
	let length = $state(0);

	onMount(() => {
		length = pathEl?.getTotalLength() ?? 0;
	});

	function place(fraction: number, lane: number) {
		if (!pathEl || !length) return { x: 500, y: 500 + lane * 30, a: 0 };
		const f = Math.min(Math.max(fraction, 0), 1);
		const l = f * length;
		const p = pathEl.getPointAtLength(Math.min(l, length - 0.01));
		const q = pathEl.getPointAtLength(Math.min(l + 1, length));
		const a = Math.atan2(q.y - p.y, q.x - p.x);
		// normal pointing outwards (track runs counter-clockwise on screen)
		const nx = Math.sin(a);
		const ny = -Math.cos(a);
		const off = lane * 30;
		return { x: p.x - nx * off, y: p.y - ny * off, a: (a * 180) / Math.PI };
	}
</script>

<div class="track-box" style:--track-vh={heightVh}>
	<svg
		viewBox="0 0 1000 600"
		preserveAspectRatio="xMidYMid meet"
		class="track"
		class:calm
		aria-hidden="true"
	>
		<rect x="0" y="0" width="1000" height="600" rx="30" fill={calm ? '#dfe6dc' : '#9ccc7c'} />
		{#if !calm}
			<g fill="#7cb35b">
				<circle cx="500" cy="300" r="60" />
				<circle cx="420" cy="290" r="35" />
				<circle cx="590" cy="310" r="40" />
			</g>
		{/if}
		<path d={D} fill="none" stroke="#e9e6df" stroke-width="128" stroke-linejoin="round" />
		<path
			d={D}
			fill="none"
			stroke={calm ? '#8a9096' : '#5d666e'}
			stroke-width="116"
			stroke-linejoin="round"
		/>
		<path
			bind:this={pathEl}
			d={D}
			fill="none"
			stroke="#ffffffcc"
			stroke-width="4"
			stroke-dasharray="26 22"
		/>
		<!-- start/finish line -->
		<g transform="translate(500 500)">
			{#each Array.from({ length: 6 }, (_, i) => i) as row (row)}
				{#each [0, 1] as col (col)}
					<rect
						x={-12 + col * 12}
						y={-58 + row * 19.3}
						width="12"
						height="19.3"
						fill={(row + col) % 2 ? '#fff' : '#222'}
					/>
				{/each}
			{/each}
		</g>
		<g transform="translate(470 590)">
			<text x="0" y="0" font-size="26" fill="#2a3b20" text-anchor="middle" font-weight="700"
				>ZIEL</text
			>
		</g>
		{#each cars as car (car.id)}
			{@const pos = place(car.fraction, car.lane)}
			<g
				transform="translate({pos.x} {pos.y}) rotate({pos.a}) scale({car.scale ?? 0.85})"
				class="car"
			>
				<RaceCar inline model={car.model} color={car.color} ghost={car.ghost} broken={car.broken} />
			</g>
		{/each}
	</svg>
</div>

<style>
	/* Fixed 5:3 box (padding trick works in every Safari), as wide as the height limit allows. */
	.track-box {
		--vh: 1vh;
		position: relative;
		width: min(100%, calc(var(--track-vh, 42) * var(--vh) * 5 / 3));
		margin-inline: auto;
	}
	@supports (height: 1dvh) {
		.track-box {
			--vh: 1dvh;
		}
	}
	.track-box::before {
		content: '';
		display: block;
		padding-top: 60%;
	}
	.track {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		display: block;
	}
	.car {
		transition: transform 120ms linear;
	}
	.calm .car {
		transition: none;
	}
	.calm :global(.puff) {
		animation: none;
	}
</style>
