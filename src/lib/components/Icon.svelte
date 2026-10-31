<script lang="ts">
	interface Props {
		name: 'speaker' | 'flag' | 'clock' | 'fuel' | 'eye' | 'eye-off';
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
