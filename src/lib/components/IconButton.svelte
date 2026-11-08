<script lang="ts">
	import Icon, { type IconName } from './Icon.svelte';

	interface Props {
		icon: IconName;
		/** Accessible name and tooltip; the button shows only the pictogram. */
		label: string;
		href?: string;
		primary?: boolean;
		disabled?: boolean;
		/** Larger variant for the main action of a screen. */
		large?: boolean;
		type?: 'button' | 'submit';
		onclick?: () => void;
	}

	let {
		icon,
		label,
		href,
		primary = false,
		disabled = false,
		large = false,
		type = 'button',
		onclick
	}: Props = $props();
</script>

{#if href}
	<a class="ibtn" class:primary class:large {href} aria-label={label} title={label}
		><Icon name={icon} size={large ? 52 : 36} /></a
	>
{:else}
	<button
		class="ibtn"
		class:primary
		class:large
		{type}
		{disabled}
		aria-label={label}
		title={label}
		{onclick}><Icon name={icon} size={large ? 52 : 36} /></button
	>
{/if}

<style>
	.ibtn {
		width: 4.25rem;
		height: 4.25rem;
		min-height: 4.25rem;
		display: inline-grid;
		place-items: center;
		border-radius: 1.2rem;
		border: 3px solid var(--color-border);
		background: #fff;
		color: var(--color-text);
		cursor: pointer;
		text-decoration: none;
		padding: 0;
	}
	.ibtn.large {
		width: 6rem;
		height: 6rem;
		min-height: 6rem;
		border-radius: 1.6rem;
	}
	.ibtn.primary {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: #fff;
	}
	.ibtn:hover:not(:disabled) {
		border-color: var(--color-primary);
	}
	.ibtn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
</style>
