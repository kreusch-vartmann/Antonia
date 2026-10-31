<script lang="ts">
	import { ERROR_PATTERN_LABELS } from '#lib/domain/formats/arithmetic.ts';
	import { SETTING_META, formatSettingValue, type SettingKey } from '#lib/domain/settings.ts';
	import { dateTime, duration, RUN_STATUS, seconds, stars } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const r = $derived(data.run);
	const settingKeys = $derived(
		Object.keys(r.settings).filter((k) => k in SETTING_META) as SettingKey[]
	);
</script>

<svelte:head><title>Rennen – Antonia</title></svelte:head>

<p><a href="/lehrkraft/kinder/{data.studentId}/auswertung">← Auswertung {data.studentName}</a></p>
<h1>{data.setName} – {data.studentName}</h1>
<p>
	{dateTime(r.startedAt)} · {RUN_STATUS[r.status] ?? r.status} · Dauer {duration(r.durationMs)} · {stars(
		r.stars
	)} ·
	{r.firstTryCorrect} von {r.tasksTotal} sofort richtig
</p>

<div class="table-wrap">
	<table>
		<thead>
			<tr>
				<th class="num">#</th>
				<th>Aufgabe</th>
				<th>Antwort</th>
				<th>Ergebnis</th>
				<th class="num">Versuch</th>
				<th>Hilfe</th>
				<th class="num">Zeit</th>
				<th>Fehlermuster</th>
			</tr>
		</thead>
		<tbody>
			{#each data.events as e (e.id)}
				<tr class:ok={e.correct}>
					<td class="num">{e.seq}</td>
					<td>{e.label}{e.presentation > 1 ? ` (Wdh. ${e.presentation - 1})` : ''}</td>
					<td>{e.kind === 'timeout' ? 'Zeit abgelaufen' : e.given}</td>
					<td>{e.correct ? 'richtig' : `falsch (Lösung ${e.solution})`}</td>
					<td class="num">{e.attempt}</td>
					<td>{e.solutionShown ? 'Lösung gezeigt' : e.hintShown ? 'Tipp gezeigt' : '–'}</td>
					<td class="num">{seconds(e.ms)}</td>
					<td>{e.errorPattern ? (ERROR_PATTERN_LABELS[e.errorPattern] ?? e.errorPattern) : ''}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<details class="card settings">
	<summary>Einstellungen in diesem Rennen</summary>
	<ul>
		{#each settingKeys as k (k)}
			<li>{SETTING_META[k].label}: {formatSettingValue(k, r.settings[k])}</li>
		{/each}
	</ul>
</details>

<style>
	tr.ok td:nth-child(4) {
		color: var(--color-success);
		font-weight: 600;
	}
	.settings {
		margin-top: var(--space-6);
	}
</style>
