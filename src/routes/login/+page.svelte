<script lang="ts">
	import { enhance } from '$app/forms';
	import PasswordField from '#lib/components/PasswordField.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let busy = $state(false);
</script>

<svelte:head><title>Anmelden – Antonia</title></svelte:head>

<main class="center-page">
	<div class="card narrow">
		<h1 class="brand">Antonia</h1>
		{#if data.needsSetup}
			<p class="notice">
				Es gibt noch kein Lehrkraft-Konto. <a href="/setup">Zur Ersteinrichtung</a>
			</p>
		{/if}
		<form
			method="POST"
			use:enhance={() => {
				busy = true;
				return async ({ update }) => {
					await update();
					busy = false;
				};
			}}
			class="stack"
		>
			<label class="field">
				<span>Benutzername</span>
				<input
					name="username"
					autocomplete="username"
					autocapitalize="none"
					spellcheck="false"
					required
					value={form?.username ?? data.prefill}
				/>
			</label>
			<PasswordField
				name="password"
				label="Passwort"
				autocomplete="current-password"
				autofocus={!!data.prefill && !form?.username}
			/>
			{#if form?.error}<p class="error" role="alert">{form.error}</p>{/if}
			<button class="btn btn-primary big" disabled={busy}>Anmelden</button>
		</form>
	</div>
</main>
