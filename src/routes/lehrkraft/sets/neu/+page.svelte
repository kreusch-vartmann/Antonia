<script lang="ts">
	import { enhance } from '$app/forms';
	import SettingsEditor from '#lib/components/SettingsEditor.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<svelte:head><title>Set anlegen – Antonia</title></svelte:head>

<p><a href="/lehrkraft/sets">← Aufgabensets</a></p>
<h1>Aufgabenset anlegen</h1>

<form method="POST" use:enhance class="stack">
	<label class="field">
		<span>Name *</span>
		<input
			name="name"
			required
			maxlength="120"
			value={form?.name ?? ''}
			placeholder="z. B. 5er-Reihe Autorennen"
		/>
	</label>
	<label class="field">
		<span>Beschreibung (für das Kind sichtbar)</span>
		<input name="description" maxlength="1000" value={form?.description ?? ''} />
	</label>
	<p class="muted small">Szenario: Autorennen. Weitere Szenarien folgen.</p>
	<SettingsEditor level="set" layer={{}} title="Einstellungen für dieses Set" />
	{#if form?.error}<p class="error">{form.error}</p>{/if}
	<div><button class="btn btn-primary big">Anlegen & Aufgaben auswählen</button></div>
</form>
