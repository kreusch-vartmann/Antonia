<script lang="ts">
	import Icon from './Icon.svelte';

	interface Props {
		name: string;
		label: string;
		autocomplete?: 'current-password' | 'new-password' | 'off' | 'one-time-code';
		required?: boolean;
		minlength?: number;
		hint?: string;
		/** Tells password managers not to offer to save this field (e.g. one-time tokens). */
		ignoreManagers?: boolean;
	}

	let {
		name,
		label,
		autocomplete = 'current-password',
		required = true,
		minlength,
		hint,
		ignoreManagers = false
	}: Props = $props();

	let shown = $state(false);
</script>

<div class="field">
	<label for="pw-{name}"><span>{label}</span></label>
	<div class="wrap">
		<input
			id="pw-{name}"
			{name}
			type={shown ? 'text' : 'password'}
			{autocomplete}
			{required}
			{minlength}
			autocapitalize="none"
			spellcheck="false"
			data-bwignore={ignoreManagers ? 'true' : undefined}
			data-1p-ignore={ignoreManagers ? 'true' : undefined}
			data-lpignore={ignoreManagers ? 'true' : undefined}
		/>
		<button
			type="button"
			class="eye"
			aria-pressed={shown}
			aria-label={shown ? 'Passwort verbergen' : 'Passwort anzeigen'}
			title={shown ? 'Passwort verbergen' : 'Passwort anzeigen'}
			onclick={() => (shown = !shown)}
		>
			<Icon name={shown ? 'eye-off' : 'eye'} size={24} />
		</button>
	</div>
	{#if hint}<small>{hint}</small>{/if}
</div>

<style>
	.wrap {
		position: relative;
		display: flex;
	}
	input {
		padding-right: 3.25rem !important;
	}
	.eye {
		position: absolute;
		right: 0;
		top: 0;
		bottom: 0;
		width: 3rem;
		min-height: 0;
		display: grid;
		place-items: center;
		background: none;
		border: none;
		color: var(--color-muted);
		cursor: pointer;
		border-radius: 0 0.5rem 0.5rem 0;
	}
	.eye:hover,
	.eye[aria-pressed='true'] {
		color: var(--color-primary);
	}
	label span {
		font-weight: 600;
	}
</style>
