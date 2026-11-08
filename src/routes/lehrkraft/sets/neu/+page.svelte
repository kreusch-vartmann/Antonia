<script lang="ts">
	import SetWizard from '#lib/components/SetWizard.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<svelte:head><title>Set anlegen – Antonia</title></svelte:head>

<p><a href="/lehrkraft/sets">← Aufgabensets</a></p>
<h1>Aufgabenset anlegen</h1>
<p class="muted">
	Beantworte ein paar Fragen, dann entstehen die Aufgaben von selbst. Du kannst jede Aufgabe vor dem
	Speichern ändern oder abwählen.
</p>

<SetWizard target={{ kind: 'new' }} {form} />
