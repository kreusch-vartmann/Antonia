<script lang="ts">
	import { enhance } from '$app/forms';
	import SettingsEditor from '#lib/components/SettingsEditor.svelte';
	import ModePicker from '#lib/components/ModePicker.svelte';
	import {
		DEFAULT_SETTINGS,
		LAYER_LABELS,
		SETTING_META,
		formatSettingValue,
		type SettingKey
	} from '#lib/domain/settings.ts';
	import { fullName } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const a = $derived(data.a);
	const keys = Object.keys(DEFAULT_SETTINGS) as SettingKey[];
	// the target time is edited next to the race modes
	const editKeys = keys.filter((k) => k !== 'targetTime');
</script>

<svelte:head><title>Zuweisung – Antonia</title></svelte:head>

<p><a href="/lehrkraft/sets/{a.set.id}">← {a.set.name}</a></p>
<h1>Zuweisung: {a.set.name} → {fullName(a.student)}</h1>

<form
	method="POST"
	action="?/save"
	use:enhance={() =>
		async ({ update }) =>
			update({ reset: false })}
	class="stack card"
>
	<div class="grid-2">
		<label class="field"
			><span>Ab</span><input
				type="date"
				name="startsOn"
				value={a.assignment.startsOn ?? ''}
			/></label
		>
		<label class="field"
			><span>Bis</span><input type="date" name="endsOn" value={a.assignment.endsOn ?? ''} /></label
		>
	</div>
	<label class="row"
		><input type="checkbox" name="archived" checked={a.assignment.archived} /> beendet (für das Kind ausblenden)</label
	>
	{#key a.assignment.updatedAt}
		<ModePicker
			selected={a.assignment.modes}
			targetTime={a.assignment.settings.targetTime}
			inheritedTargetTime={data.below.values.targetTime}
		/>
		<SettingsEditor
			layer={a.assignment.settings}
			inherited={data.below.values}
			inheritedSources={data.below.sources}
			keys={editKeys}
			title="Einstellungen nur für diese Zuweisung"
			open
		/>
	{/key}
	{#if form?.error}<p class="error">{form.error}</p>{/if}
	{#if form?.saved}<p class="success" role="status">Gespeichert.</p>{/if}
	<div><button class="btn btn-primary">Speichern</button></div>
</form>

<section class="card">
	<h2>So gilt es jetzt</h2>
	<p class="muted small">
		Reihenfolge: Standard → Aufgabe → Set → Kind → Zuweisung. Aufgabenbezogene Werte können je
		Aufgabe abweichen.
	</p>
	<div class="table-wrap">
		<table>
			<thead><tr><th>Einstellung</th><th>Wert</th><th>Festgelegt in</th></tr></thead>
			<tbody>
				{#each keys as k (k)}
					<tr>
						<td>{SETTING_META[k].label}</td>
						<td>{formatSettingValue(k, data.effective.values[k])}</td>
						<td>{LAYER_LABELS[data.effective.sources[k]]}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>

<form
	method="POST"
	action="?/delete"
	class="del"
	onsubmit={(e) => {
		if (
			!confirm(
				'Zuweisung löschen? Alle Rennen und Ergebnisse dieser Zuweisung werden ebenfalls gelöscht. Zum Ausblenden lieber „beendet“ wählen.'
			)
		)
			e.preventDefault();
	}}
>
	<button class="btn btn-danger">Zuweisung mit Ergebnissen löschen</button>
</form>

<style>
	section,
	.del {
		margin-top: var(--space-6);
	}
</style>
