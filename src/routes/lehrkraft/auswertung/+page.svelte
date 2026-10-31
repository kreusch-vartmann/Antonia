<script lang="ts">
	import { dateTime, fullName, pct } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let selected = $state<string[]>([]);
</script>

<svelte:head><title>Auswertung – Antonia</title></svelte:head>

<h1>Auswertung</h1>

{#if data.students.length === 0}
	<p class="muted">Noch keine Kinder angelegt.</p>
{:else}
	<div class="table-wrap">
		<table>
			<thead>
				<tr>
					<th></th>
					<th>Kind</th>
					<th class="num">Rennen (14 Tage)</th>
					<th class="num">Aufgaben</th>
					<th class="num">Sofort richtig</th>
					<th>Zuletzt geübt</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each data.students as s (s.id)}
					<tr>
						<td
							><input
								type="checkbox"
								value={s.id}
								bind:group={selected}
								aria-label="Für Export auswählen"
							/></td
						>
						<td>{fullName(s)}</td>
						<td class="num">{s.runs14}</td>
						<td class="num">{s.tasks14}</td>
						<td class="num">{s.tasks14 ? pct(s.firstTry14 / s.tasks14) : '–'}</td>
						<td>{dateTime(s.lastRun)}</td>
						<td><a class="btn small" href="/lehrkraft/kinder/{s.id}/auswertung">Details</a></td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<form method="GET" action="/lehrkraft/auswertung/export" class="card stack export">
		<h2>Export (CSV)</h2>
		<p class="muted small">
			Alle Antworten als Tabelle (Excel/LibreOffice). Enthält Anzeigenamen – bitte sicher
			aufbewahren.
		</p>
		{#each selected as id (id)}<input type="hidden" name="id" value={id} />{/each}
		<div class="grid-2">
			<label class="field"><span>Von</span><input type="date" name="from" /></label>
			<label class="field"><span>Bis</span><input type="date" name="to" /></label>
		</div>
		<div>
			<button class="btn btn-primary">
				{selected.length ? `${selected.length} Kind(er) exportieren` : 'Alle Kinder exportieren'}
			</button>
		</div>
	</form>
{/if}

<style>
	.export {
		margin-top: var(--space-6);
	}
</style>
