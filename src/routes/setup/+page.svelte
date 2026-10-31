<script lang="ts">
	import { enhance } from '$app/forms';
	import PasswordField from '#lib/components/PasswordField.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>Ersteinrichtung – Antonia</title></svelte:head>

<main class="center-page">
	<div class="card narrow">
		<h1>Ersteinrichtung</h1>
		{#if !data.tokenConfigured}
			<p class="notice">
				Die Einrichtung ist gesperrt. Setze in Coolify die Umgebungsvariable <code>SETUP_TOKEN</code
				>
				(mind. 16 zufällige Zeichen), starte die App neu und rufe diese Seite erneut auf.
			</p>
		{:else}
			<p>Lege das Lehrkraft-Konto an. Danach ist diese Seite deaktiviert.</p>
			<form method="POST" use:enhance class="stack">
				<PasswordField
					name="token"
					label="Einrichtungs-Token (aus Coolify)"
					autocomplete="off"
					ignoreManagers
					hint="Nur zur Einrichtung. Wird nicht dein Passwort."
				/>
				<label class="field">
					<span>Dein Name (wird nur dir angezeigt)</span>
					<input name="displayName" required value={form?.displayName ?? ''} />
				</label>
				<label class="field">
					<span>Benutzername</span>
					<input
						name="username"
						required
						autocapitalize="none"
						autocomplete="username"
						value={form?.username ?? ''}
					/>
				</label>
				<PasswordField
					name="password"
					label="Passwort (mind. 10 Zeichen)"
					autocomplete="new-password"
					minlength={10}
				/>
				<PasswordField
					name="password2"
					label="Passwort wiederholen"
					autocomplete="new-password"
					minlength={10}
				/>
				{#if form?.error}<p class="error" role="alert">{form.error}</p>{/if}
				<button class="btn btn-primary big">Konto anlegen</button>
			</form>
		{/if}
	</div>
</main>
