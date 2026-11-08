<script lang="ts">
	import { enhance } from '$app/forms';
	import SettingsEditor from '#lib/components/SettingsEditor.svelte';
	import ModePicker from '#lib/components/ModePicker.svelte';
	import { MODE_LABEL } from '#lib/domain/modes.ts';
	import { resolveSettings } from '#lib/domain/settings.ts';
	import { date, fullName, stars } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const setResolved = $derived(resolveSettings({}));
	let pickerKey = $state(0);
	const forAssignment = $derived(resolveSettings({ set: data.set.settings }));
	const keep =
		() =>
		async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) =>
			update({ reset: false });
</script>

<svelte:head><title>{data.set.name} – Antonia</title></svelte:head>

<p><a href="/lehrkraft/sets">← Aufgabensets</a></p>
<h1>{data.set.name}</h1>

<section class="card stack">
	<h2>Set</h2>
	<form method="POST" action="?/update" use:enhance={keep} class="stack">
		<label class="field">
			<span>Name</span>
			<input name="name" required maxlength="120" value={data.set.name} />
		</label>
		<label class="field">
			<span>Beschreibung (für das Kind sichtbar)</span>
			<input name="description" maxlength="1000" value={data.set.description ?? ''} />
		</label>
		{#key data.set.updatedAt}
			<SettingsEditor
				level="set"
				layer={data.set.settings}
				inherited={setResolved.values}
				inheritedSources={setResolved.sources}
				title="Einstellungen für dieses Set"
			/>
		{/key}
		{#if form?.saved === 'set'}<p class="success" role="status">Gespeichert.</p>{/if}
		{#if form?.error}<p class="error">{form.error}</p>{/if}
		<div><button class="btn btn-primary">Speichern</button></div>
	</form>
</section>

<section class="card stack">
	<div class="spread">
		<h2>Aufgaben ({data.items.length})</h2>
		<div class="row">
			<form method="POST" action="?/shuffle" use:enhance>
				<button class="btn small" disabled={data.items.length < 2}
					>Reihenfolge per Zufall ändern</button
				>
			</form>
			<a class="btn small" href="/lehrkraft/sets/{data.set.id}/aufgabe/neu">Einzelne Aufgabe</a>
			<a class="btn btn-primary small" href="/lehrkraft/sets/{data.set.id}/aufgaben"
				>Aufgaben hinzufügen</a
			>
		</div>
	</div>
	{#if data.items.length === 0}
		<p class="muted">
			Noch keine Aufgaben. <a href="/lehrkraft/sets/{data.set.id}/aufgaben">Aufgaben hinzufügen</a>
		</p>
	{:else}
		<ol class="items">
			{#each data.items as item, i (item.itemId)}
				<li>
					<div class="spread">
						<span>
							<a href="/lehrkraft/sets/{data.set.id}/aufgabe/{item.taskId}">{item.label}</a>
							<span class="muted small">→ {item.answer}</span>
							{#if item.decompose}
								<span class="tag"
									>Zerlegung: {item.decompose === 'equation' ? 'neue Gleichung' : 'Kästchen'}</span
								>
							{/if}
						</span>
						<span class="row">
							<form method="POST" action="?/move" use:enhance>
								<input type="hidden" name="taskId" value={item.taskId} />
								<button
									class="btn small"
									name="dir"
									value="up"
									disabled={i === 0}
									aria-label="nach oben">↑</button
								>
								<button
									class="btn small"
									name="dir"
									value="down"
									disabled={i === data.items.length - 1}
									aria-label="nach unten">↓</button
								>
							</form>
							<form method="POST" action="?/remove" use:enhance>
								<input type="hidden" name="taskId" value={item.taskId} />
								<button class="btn small btn-danger" aria-label="aus Set entfernen">✕</button>
							</form>
						</span>
					</div>
				</li>
			{/each}
		</ol>
	{/if}
</section>

<section class="card stack" id="zuweisen">
	<h2>Zuweisungen</h2>
	{#if data.assignments.length > 0}
		<div class="table-wrap">
			<table>
				<thead
					><tr
						><th>Kind</th><th>Zeitraum</th><th>Rennarten</th><th class="num">Rennen</th><th
							>Beste</th
						><th></th></tr
					></thead
				>
				<tbody>
					{#each data.assignments as a (a.id)}
						<tr class:muted={a.archived}>
							<td>{fullName(a)}{a.archived ? ' (beendet)' : ''}</td>
							<td
								>{a.startsOn ? date(a.startsOn) : 'ab sofort'} – {a.endsOn
									? date(a.endsOn)
									: 'offen'}</td
							>
							<td>{a.modes.map((m) => MODE_LABEL[m]).join(', ')}</td>
							<td class="num">{a.runs}</td>
							<td>{stars(a.bestStars)}</td>
							<td><a class="btn small" href="/lehrkraft/zuweisungen/{a.id}">Bearbeiten</a></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	{#if data.students.length === 0}
		<p class="muted">Lege zuerst <a href="/lehrkraft/kinder/neu">Kinder</a> an.</p>
	{:else}
		<form
			method="POST"
			action="?/assign"
			use:enhance={() =>
				async ({ update }) => {
					await update();
					pickerKey++;
				}}
			class="stack"
		>
			<h3>Neu zuweisen</h3>
			<div class="row">
				{#each data.students as s (s.id)}
					<label class="row"
						><input type="checkbox" name="studentId" value={s.id} /> {fullName(s)}</label
					>
				{/each}
			</div>
			<div class="grid-2">
				<label class="field"><span>Ab (optional)</span><input type="date" name="startsOn" /></label>
				<label class="field"><span>Bis (optional)</span><input type="date" name="endsOn" /></label>
			</div>
			{#key pickerKey}
				<ModePicker taskCount={data.items.length} rounds={forAssignment.values.rounds} />
			{/key}
			<SettingsEditor
				level="assignment"
				layer={{}}
				inherited={forAssignment.values}
				inheritedSources={forAssignment.sources}
				exclude={['targetTime']}
				title="Weitere Optionen für diese Zuweisung"
			/>
			{#if form?.saved === 'assign'}<p class="success" role="status">Zugewiesen.</p>{/if}
			<div>
				<button class="btn btn-primary" disabled={data.items.length === 0}>Zuweisen</button>
			</div>
		</form>
	{/if}
</section>

<style>
	section {
		margin-top: var(--space-6);
	}
	.items {
		padding-left: var(--space-6);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	.items li {
		border-bottom: 1px solid var(--color-border);
		padding-bottom: var(--space-2);
	}
	.items form {
		display: inline-flex;
		gap: var(--space-1);
	}
</style>
