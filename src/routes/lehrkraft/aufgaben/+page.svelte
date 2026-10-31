<script lang="ts">
	import { enhance } from '$app/forms';
	import { OP_SYMBOL } from '#lib/domain/formats/arithmetic.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let selected = $state<string[]>([]);
	let op = $state('newSet');
	const allSelected = $derived(selected.length > 0 && selected.length === data.tasks.length);

	function toggleAll() {
		selected = allSelected ? [] : data.tasks.map((t) => t.id);
	}
</script>

<svelte:head><title>Aufgaben – Antonia</title></svelte:head>

<div class="spread">
	<h1>Aufgabenpool</h1>
	<div class="row">
		<a class="btn" href="/lehrkraft/aufgaben/generator">Aufgaben erzeugen</a>
		<a class="btn btn-primary" href="/lehrkraft/aufgaben/neu">Aufgabe anlegen</a>
	</div>
</div>

<form method="GET" class="row filters">
	<label class="field">
		<span>Suche</span>
		<input name="q" value={data.filter.q ?? ''} placeholder="Zahl, Text, Schlagwort" />
	</label>
	<label class="field">
		<span>Schlagwort</span>
		<select name="tag">
			<option value="">alle</option>
			{#each data.tags as t (t)}<option value={t} selected={data.filter.tag === t}>{t}</option
				>{/each}
		</select>
	</label>
	<label class="field">
		<span>Rechenart</span>
		<select name="op">
			<option value="">alle</option>
			{#each ['+', '-', '*', ':'] as const as o (o)}
				<option value={o} selected={data.filter.op === o}>{OP_SYMBOL[o]}</option>
			{/each}
		</select>
	</label>
	<button class="btn">Filtern</button>
	<a class="btn" href="/lehrkraft/aufgaben">Zurücksetzen</a>
</form>

{#if data.tasks.length === 0}
	<p class="muted">Keine Aufgaben gefunden.</p>
{:else}
	<form method="POST" action="?/bulk" use:enhance class="stack">
		<div class="card bulk row">
			<strong>{selected.length} ausgewählt</strong>
			<select name="op" bind:value={op} aria-label="Aktion">
				<option value="newSet">als neues Set speichern</option>
				<option value="addToSet">zu Set hinzufügen</option>
				<option value="tag">Schlagwort hinzufügen</option>
				<option value="delete">löschen</option>
			</select>
			{#if op === 'newSet'}
				<input name="setName" placeholder="Name des Sets" aria-label="Name des Sets" />
			{:else if op === 'addToSet'}
				<select name="setId" aria-label="Set">
					{#each data.sets as s (s.id)}<option value={s.id}>{s.name}</option>{/each}
				</select>
			{:else if op === 'tag'}
				<input name="tag" placeholder="Schlagwort" aria-label="Schlagwort" />
			{/if}
			<button
				class="btn {op === 'delete' ? 'btn-danger' : 'btn-primary'}"
				disabled={selected.length === 0}
				onclick={(e) => {
					if (
						op === 'delete' &&
						!confirm('Ausgewählte Aufgaben löschen? Sie werden auch aus Sets entfernt.')
					)
						e.preventDefault();
				}}>Ausführen</button
			>
		</div>
		{#if form?.error}<p class="error">{form.error}</p>{/if}
		{#if form && 'message' in form && form.message}<p class="success">{form.message}</p>{/if}
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th
							><input
								type="checkbox"
								checked={allSelected}
								onchange={toggleAll}
								aria-label="Alle auswählen"
							/></th
						>
						<th>Aufgabe</th>
						<th class="num">Antwort</th>
						<th>Schlagwörter</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each data.tasks as t (t.id)}
						<tr>
							<td
								><input
									type="checkbox"
									name="id"
									value={t.id}
									bind:group={selected}
									aria-label="Auswählen"
								/></td
							>
							<td>
								<a href="/lehrkraft/aufgaben/{t.id}">{t.label}</a>
								{#if t.hasSettings}<span class="tag">eigene Einstellungen</span>{/if}
							</td>
							<td class="num">{t.answer}</td>
							<td
								>{#each t.tags as tag (tag)}<span class="tag">{tag}</span>{/each}</td
							>
							<td><a class="btn small" href="/lehrkraft/aufgaben/{t.id}">Bearbeiten</a></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</form>
{/if}

<style>
	.filters {
		align-items: end;
		margin: var(--space-4) 0;
	}
	.filters .field {
		min-width: 10rem;
	}
	.bulk {
		position: sticky;
		top: 4rem;
		z-index: 5;
		padding: var(--space-3);
	}
	.bulk input,
	.bulk select {
		width: auto;
	}
</style>
