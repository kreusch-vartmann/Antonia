<script lang="ts">
	import { dateTime, fullName, pct } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Übersicht – Antonia</title></svelte:head>

<h1>Hallo {data.teacher.displayName}</h1>

{#if data.students.length === 0 || data.setCount === 0}
	<section class="card stack">
		<h2>Erste Schritte</h2>
		<ol class="steps">
			<li class:done={data.students.length > 0}>
				<a href="/lehrkraft/kinder/neu">Kinder anlegen</a> – mit Benutzername und Passwort.
			</li>
			<li class:done={data.setCount > 0}>
				<a href="/lehrkraft/sets/neu">Aufgabenset erstellen</a> – Rechenart und Zahlenraum wählen, die
				Aufgaben entstehen von selbst. Danach dem Kind zuweisen.
			</li>
		</ol>
	</section>
{/if}

<section class="stack">
	<div class="spread">
		<h2>Kinder – letzte 14 Tage</h2>
		<a class="btn" href="/lehrkraft/auswertung">Zur Auswertung</a>
	</div>
	{#if data.students.length === 0}
		<p class="muted">Noch keine Kinder angelegt.</p>
	{:else}
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th>Kind</th>
						<th class="num">Rennen</th>
						<th class="num">Aufgaben</th>
						<th class="num">Sofort richtig</th>
						<th class="num">Offene Zuweisungen</th>
						<th>Zuletzt geübt</th>
					</tr>
				</thead>
				<tbody>
					{#each data.students as s (s.id)}
						<tr>
							<td><a href="/lehrkraft/kinder/{s.id}/auswertung">{fullName(s)}</a></td>
							<td class="num">{s.runs14}</td>
							<td class="num">{s.tasks14}</td>
							<td class="num">{s.tasks14 ? pct(s.firstTry14 / s.tasks14) : '–'}</td>
							<td class="num">{s.openAssignments}</td>
							<td>{dateTime(s.lastRun)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>

<style>
	.steps li {
		margin-bottom: var(--space-2);
	}
	.steps li.done {
		color: var(--color-muted);
		text-decoration: line-through;
	}
	section + section {
		margin-top: var(--space-8);
	}
</style>
