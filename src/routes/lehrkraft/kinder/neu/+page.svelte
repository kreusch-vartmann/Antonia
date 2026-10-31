<script lang="ts">
	import { enhance } from '$app/forms';
	import StudentFields from '#lib/components/StudentFields.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>Kind anlegen – Antonia</title></svelte:head>

<p><a href="/lehrkraft/kinder">← Kinder</a></p>
<h1>Kind anlegen</h1>

{#if form?.created}
	<div class="card stack">
		<p class="success">Das Kind wurde angelegt.</p>
		<p>
			Zugangsdaten – bitte jetzt notieren oder <a href="/lehrkraft/kinder/karten">Karte drucken</a>:
		</p>
		<p class="creds">
			Benutzername: <strong>{form.created.username}</strong><br />
			Passwort: <strong>{form.created.password}</strong>
		</p>
		<p class="muted small">
			Das Passwort wird nur jetzt angezeigt. Du kannst es später jederzeit zurücksetzen.
		</p>
		<div class="row">
			<a class="btn btn-primary" href="/lehrkraft/kinder/{form.created.id}">Zum Kind</a>
			<a class="btn" href="/lehrkraft/kinder/neu" data-sveltekit-reload>Weiteres Kind anlegen</a>
		</div>
	</div>
{:else}
	<form method="POST" use:enhance class="stack">
		<StudentFields
			values={form ?? {}}
			settings={{}}
			autoUsername
			error={form?.error}
			field={form?.field}
		/>
		<label class="field">
			<span>Passwort *</span>
			<input
				name="password"
				required
				minlength="4"
				value={data.suggestedPassword}
				autocomplete="off"
			/>
			<small>Kindgerechter Vorschlag – du kannst ihn ändern.</small>
		</label>
		<div><button class="btn btn-primary big">Anlegen</button></div>
	</form>
{/if}

<style>
	.creds {
		font-size: 1.3rem;
	}
</style>
