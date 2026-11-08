<script lang="ts" module>
	export type IconName =
		| 'speaker'
		| 'flag'
		| 'clock'
		| 'fuel'
		| 'eye'
		| 'eye-off'
		| 'stopwatch'
		| 'home'
		| 'replay'
		| 'restart'
		| 'play'
		| 'stop'
		| 'logout'
		| 'trophy'
		| 'car'
		| 'gear';
</script>

<script lang="ts">
	interface Props {
		name: IconName;
		size?: number;
	}
	let { name, size = 22 }: Props = $props();
</script>

<svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" class="icon">
	{#if name === 'speaker'}
		<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
		<path
			d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
		/>
	{:else if name === 'flag'}
		<line x1="4" y1="2" x2="4" y2="22" stroke="currentColor" stroke-width="2" />
		{#each [0, 1, 2, 3] as r (r)}
			{#each [0, 1, 2, 3] as c (c)}
				<rect
					x={5 + c * 4}
					y={3 + r * 3}
					width="4"
					height="3"
					fill={(r + c) % 2 ? '#fff' : 'currentColor'}
				/>
			{/each}
		{/each}
		<rect x="5" y="3" width="16" height="12" fill="none" stroke="currentColor" stroke-width="0.8" />
	{:else if name === 'eye'}
		<path
			d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linejoin="round"
		/>
		<circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2" />
	{:else if name === 'eye-off'}
		<path
			d="M1.5 12S5.5 5 12 5c2 0 3.8.7 5.3 1.6M22.5 12S18.5 19 12 19c-2 0-3.8-.7-5.3-1.6"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linejoin="round"
		/>
		<path
			d="M9.9 9.9a3.2 3.2 0 0 0 4.2 4.2M3 3l18 18"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
		/>
	{:else if name === 'clock'}
		<circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" stroke-width="2" />
		<path
			d="M12 9v4l3 2M9 3h6"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
		/>
	{:else if name === 'stopwatch'}
		<circle cx="12" cy="13.5" r="8" fill="none" stroke="currentColor" stroke-width="2" />
		<path
			d="M9.5 2.5h5M12 2.5v3M12 13.5l3.2-3.2M18.6 6.6l1.6-1.6"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	{:else if name === 'home'}
		<path
			d="M3 11.5 12 4l9 7.5M5.5 10v10h13V10M10 20v-6h4v6"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	{:else if name === 'replay' || name === 'restart'}
		<path
			d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5M3.5 3.5v5h5"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
		{#if name === 'restart'}<path d="M10.2 8.8 15.6 12l-5.4 3.2z" fill="currentColor" />{/if}
	{:else if name === 'play'}
		<path
			d="M8 5l11 7-11 7z"
			fill="currentColor"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linejoin="round"
		/>
	{:else if name === 'stop'}
		<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
	{:else if name === 'logout'}
		<path
			d="M14 4H6v16h8M10.5 12H21M18 8.8 21.2 12 18 15.2"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	{:else if name === 'trophy'}
		<path
			d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M12 14v4M8 20h8"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	{:else if name === 'car'}
		<path
			d="M3 16v-4.5l2.5-4h9L19 11.5h2V16"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
		<circle cx="7.5" cy="16.5" r="2.2" fill="currentColor" />
		<circle cx="16.5" cy="16.5" r="2.2" fill="currentColor" />
	{:else if name === 'gear'}
		<circle cx="12" cy="12" r="5.5" fill="none" stroke="currentColor" stroke-width="2" />
		<circle cx="12" cy="12" r="1.8" fill="currentColor" />
		{#each [0, 45, 90, 135, 180, 225, 270, 315] as a (a)}
			<line
				x1="12"
				y1="3"
				x2="12"
				y2="5.8"
				stroke="currentColor"
				stroke-width="3"
				transform="rotate({a} 12 12)"
			/>
		{/each}
	{:else}
		<rect
			x="4"
			y="4"
			width="10"
			height="16"
			rx="2"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
		/>
		<rect x="6" y="6" width="6" height="4" fill="currentColor" />
		<path
			d="M14 9l4 3v6a1.5 1.5 0 0 0 3 0V9l-3-3"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
		/>
	{/if}
</svg>

<style>
	.icon {
		display: inline-block;
		vertical-align: middle;
		flex-shrink: 0;
	}
</style>
