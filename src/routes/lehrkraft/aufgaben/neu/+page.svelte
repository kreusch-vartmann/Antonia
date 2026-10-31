<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import TaskFields from '#lib/components/TaskFields.svelte';
	import SettingsEditor from '#lib/components/SettingsEditor.svelte';
	import { TASK_LEVEL_KEYS } from '#lib/domain/settings.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>Aufgabe anlegen – Antonia</title></svelte:head>

<p><a href="/lehrkraft/aufgaben">← Aufgabenpool</a></p>
<h1>Aufgabe anlegen</h1>
{#if page.url.searchParams.get('saved')}<p class="success">
		Aufgabe gespeichert. Nächste Aufgabe:
	</p>{/if}

<form method="POST" use:enhance class="stack">
	<TaskFields allTags={data.allTags} />
	<SettingsEditor layer={{}} keys={TASK_LEVEL_KEYS} title="Einstellungen nur für diese Aufgabe" />
	{#if form?.error}<p class="error" role="alert">{form.error}</p>{/if}
	<div class="row">
		<button class="btn btn-primary big">Speichern</button>
		<button class="btn big" name="another" value="1">Speichern & nächste</button>
	</div>
</form>
