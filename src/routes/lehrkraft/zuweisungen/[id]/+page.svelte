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
	import { dateTime, fullName } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const a = $derived(data.a);
	const keys = Object.keys(DEFAULT_SETTINGS) as SettingKey[];
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
			taskCount={data.taskCount}
			rounds={data.effective.values.rounds}
		/>
		<SettingsEditor
			level="assignment"
			layer={a.assignment.settings}
			inherited={data.below.values}
			inheritedSources={data.below.sources}
			exclude={['targetTime']}
			title="Weitere Optionen für diese Zuweisung"
			open
		/>
	{/key}
	{#if form?.error}<p class="error">{form.error}</p>{/if}
	{#if form?.saved}<p class="success" role="status">Gespeichert.</p>{/if}
	<div><button class="btn btn-primary">Speichern</button></div>
</form>

<section class="card stack">
	<h2>Spielstand</h2>
	<p class="muted small">
		Sterne, Bestzeit und die Freischaltung von „Bestzeit jagen“ beginnen für das Kind neu. Alle
		Rennen bleiben in der Auswertung, die Pokale bleiben in der Vitrine. Gilt für alle Zuweisungen
		dieses Sets an {fullName(a.student)}.
	</p>
	<form
		method="POST"
		action="?/resetProgress"
		use:enhance
		class="row"
		onsubmit={(e) => {
			if (!confirm('Spielstand zurücksetzen? Die Auswertung bleibt erhalten.')) e.preventDefault();
		}}
	>
		<button class="btn">Spielstand zurücksetzen</button>
		{#if form?.progressReset}<span class="success" role="status">Zurückgesetzt.</span>{/if}
		{#if a.assignment.progressResetAt}
			<span class="muted small"
				>Zuletzt zurückgesetzt: {dateTime(a.assignment.progressResetAt)}</span
			>
		{/if}
	</form>
</section>

<section class="card">
	<h2>So gilt es jetzt</h2>
	<p class="muted small">
		So spielt das Kind mit diesem Set. Die Spalte „Festgelegt in“ zeigt, wo man den Wert ändert:
		Einstellungen zum Kind beim Kind, zum Üben beim Aufgabenset, zum Rennen hier in der Zuweisung.
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
