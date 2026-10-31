<script lang="ts">
	import { OP_SYMBOL } from '#lib/domain/formats/arithmetic.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let selected = $state<string[]>([]);
	const available = $derived(data.tasks.filter((t) => !t.inSet));
</script>

<svelte:head><title>Aufgaben hinzufügen – Antonia</title></svelte:head>

<p><a href="/lehrkraft/sets/{data.set.id}">← {data.set.name}</a></p>
<h1>Aufgaben hinzufügen</h1>

<form method="GET" class="row filters">
	<label class="field"><span>Suche</span><input name="q" value={data.filter.q ?? ''} /></label>
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
</form>

<form method="POST" class="stack">
	<div class="row">
		<button type="button" class="btn small" onclick={() => (selected = available.map((t) => t.id))}
			>Alle gefundenen auswählen</button
		>
		<button type="button" class="btn small" onclick={() => (selected = [])}>Auswahl leeren</button>
		<button class="btn btn-primary" disabled={selected.length === 0}
			>{selected.length} hinzufügen</button
		>
	</div>
	{#if form?.error}<p class="error">{form.error}</p>{/if}
	<div class="table-wrap">
		<table>
			<thead
				><tr><th></th><th>Aufgabe</th><th class="num">Antwort</th><th>Schlagwörter</th></tr></thead
			>
			<tbody>
				{#each data.tasks as t (t.id)}
					<tr class:muted={t.inSet}>
						<td>
							{#if t.inSet}✓{:else}<input
									type="checkbox"
									name="id"
									value={t.id}
									bind:group={selected}
									aria-label="Auswählen"
								/>{/if}
						</td>
						<td>{t.label}{t.inSet ? ' (bereits im Set)' : ''}</td>
						<td class="num">{t.answer}</td>
						<td
							>{#each t.tags as tag (tag)}<span class="tag">{tag}</span>{/each}</td
						>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</form>

<style>
	.filters {
		align-items: end;
		margin: var(--space-4) 0;
	}
	.filters .field {
		min-width: 10rem;
	}
</style>
