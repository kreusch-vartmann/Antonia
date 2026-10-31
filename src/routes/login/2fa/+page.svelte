<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<svelte:head><title>Bestätigung – Antonia</title></svelte:head>

<main class="center-page">
	<div class="card narrow">
		<h1>Zwei-Faktor-Anmeldung</h1>
		<p>
			Gib den 6-stelligen Code aus deiner Authenticator-App ein – oder einen Wiederherstellungscode.
		</p>
		<form method="POST" use:enhance class="stack">
			<label class="field">
				<span>Code</span>
				<!-- svelte-ignore a11y_autofocus -->
				<input name="code" inputmode="numeric" autocomplete="one-time-code" required autofocus />
			</label>
			{#if form?.error}<p class="error" role="alert">{form.error}</p>{/if}
			<button class="btn btn-primary big">Bestätigen</button>
		</form>
		<p><a href="/login">Zurück</a></p>
	</div>
</main>
