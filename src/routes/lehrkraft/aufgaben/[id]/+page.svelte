<script lang="ts">
	import { enhance } from '$app/forms';
	import TaskFields from '#lib/components/TaskFields.svelte';
	import SettingsEditor from '#lib/components/SettingsEditor.svelte';
	import { TASK_LEVEL_KEYS } from '#lib/domain/settings.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>Aufgabe bearbeiten – Antonia</title></svelte:head>

<p><a href="/lehrkraft/aufgaben">← Aufgabenpool</a></p>
<h1>Aufgabe bearbeiten</h1>
{#if data.usage > 0}
	<p class="notice">
		Diese Aufgabe ist in {data.usage} Set(s) enthalten. Änderungen gelten ab dem nächsten Rennen. Bisherige
		Ergebnisse bleiben unverändert.
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
	{#key data.task.updatedAt}
		<TaskFields content={data.task.content} tags={data.task.tags} allTags={data.allTags} />
		<SettingsEditor
			layer={data.task.settings}
			keys={TASK_LEVEL_KEYS}
			title="Einstellungen nur für diese Aufgabe"
		/>
	{/key}
	{#if form?.error}<p class="error" role="alert">{form.error}</p>{/if}
	{#if form?.saved}<p class="success" role="status">Gespeichert.</p>{/if}
	<div class="row">
		<button class="btn btn-primary big">Speichern</button>
	</div>
</form>

<form
	method="POST"
	action="?/delete"
	class="del"
	onsubmit={(e) => {
		if (!confirm('Aufgabe löschen?')) e.preventDefault();
	}}
>
	<button class="btn btn-danger">Aufgabe löschen</button>
</form>

<style>
	.del {
		margin-top: var(--space-8);
	}
</style>
