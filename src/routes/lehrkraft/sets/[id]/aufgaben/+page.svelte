<script lang="ts">
	import SetWizard from '#lib/components/SetWizard.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>Aufgaben hinzufügen – Antonia</title></svelte:head>

<p><a href="/lehrkraft/sets/{data.set.id}">← {data.set.name}</a></p>
<h1>Aufgaben hinzufügen</h1>
<p class="muted">
	Die neuen Aufgaben werden am Ende des Sets „{data.set.name}“ angehängt.
</p>

<SetWizard target={{ kind: 'add', setId: data.set.id, setName: data.set.name }} {form} />
