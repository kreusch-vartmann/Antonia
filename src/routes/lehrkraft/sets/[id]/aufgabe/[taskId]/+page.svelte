<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import TaskFields from '#lib/components/TaskFields.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head
	><title>{data.task ? 'Aufgabe bearbeiten' : 'Aufgabe anlegen'} – Antonia</title></svelte:head
>

<p><a href="/lehrkraft/sets/{data.set.id}">← {data.set.name}</a></p>
<h1>{data.task ? 'Aufgabe bearbeiten' : 'Einzelne Aufgabe hinzufügen'}</h1>
{#if page.url.searchParams.get('saved')}
	<p class="success" role="status">
		{data.task ? 'Gespeichert.' : 'Aufgabe gespeichert. Nächste Aufgabe:'}
	</p>
{/if}
{#if data.sharedWith > 0}
	<p class="notice">
		Diese Aufgabe kommt auch in {data.sharedWith} anderen Set(s) vor. Wenn du sie änderst, bekommt nur
		dieses Set die geänderte Aufgabe.
	</p>
{/if}

<form
	method="POST"
	action="?/save"
	use:enhance={() =>
		async ({ update }) =>
			update({ reset: false })}
	class="stack"
>
	{#key data.task?.id + '/' + data.task?.updatedAt}
		<TaskFields content={data.task?.content} />
	{/key}
	{#if form?.error}<p class="error" role="alert">{form.error}</p>{/if}
	<div class="row">
		<button class="btn btn-primary big">Speichern</button>
		{#if !data.task}<button class="btn big" name="another" value="1">Speichern & nächste</button
			>{/if}
	</div>
</form>

{#if data.task}
	<form
		method="POST"
		action="?/remove"
		class="del"
		onsubmit={(e) => {
			if (!confirm('Aufgabe aus dem Set entfernen?')) e.preventDefault();
		}}
	>
		<button class="btn btn-danger">Aus dem Set entfernen</button>
	</form>
{/if}

<style>
	.del {
		margin-top: var(--space-8);
	}
</style>
