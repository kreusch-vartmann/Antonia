<script lang="ts">
	import { ERROR_PATTERN_LABELS } from '#lib/domain/formats/arithmetic.ts';
	import {
		date,
		dateTime,
		duration,
		fullName,
		pct,
		RUN_STATUS,
		seconds,
		stars
	} from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const r = $derived(data.report);
	const s = $derived(data.student);
	const strong = $derived(r.families.filter((f) => f.tasks >= 5 && f.firstTryRate >= 0.85));
	const practise = $derived(r.families.filter((f) => f.tasks >= 3 && f.firstTryRate < 0.6));
	const exportHref = $derived(
		`/lehrkraft/auswertung/export?id=${s.id}${data.period.from ? `&from=${data.period.from}` : ''}${data.period.to ? `&to=${data.period.to}` : ''}`
	);
</script>

<svelte:head><title>Auswertung {s.displayName} – Antonia</title></svelte:head>

<div class="no-print">
	<p><a href="/lehrkraft/kinder/{s.id}">← {fullName(s)}</a></p>
</div>

<div class="spread">
	<h1>Lernstand: {fullName(s)}</h1>
	<div class="row no-print">
		<a class="btn" href={exportHref}>CSV-Export</a>
		<button class="btn btn-primary" onclick={() => window.print()}
			>Kurzübersicht drucken / PDF</button
		>
	</div>
</div>
<p class="print-only muted">
	Zeitraum: {data.period.from ? date(data.period.from) : 'Beginn'} – {data.period.to
		? date(data.period.to)
		: 'heute'} · erstellt am {date(new Date())}
</p>

<form method="GET" class="row no-print period">
	<label class="field"
		><span>Von</span><input type="date" name="from" value={data.period.from ?? ''} /></label
	>
	<label class="field"
		><span>Bis</span><input type="date" name="to" value={data.period.to ?? ''} /></label
	>
	<button class="btn">Zeitraum anwenden</button>
</form>

{#if r.tasks === 0}
	<p class="muted">Im gewählten Zeitraum wurde noch nicht geübt.</p>
{:else}
	<section class="kpis">
		<div class="card kpi">
			<span class="v">{r.runs.filter((x) => x.status !== 'running').length}</span><span>Rennen</span
			>
		</div>
		<div class="card kpi"><span class="v">{r.tasks}</span><span>Aufgaben</span></div>
		<div class="card kpi">
			<span class="v">{pct(r.firstTryRate)}</span><span>sofort richtig</span>
		</div>
		<div class="card kpi">
			<span class="v">{seconds(r.medianMs)}</span><span>typische Antwortzeit (Median)</span>
		</div>
	</section>

	<section class="card stack">
		<h2>Auf einen Blick</h2>
		<div class="grid-2">
			<div>
				<h3>Sicher</h3>
				{#if strong.length}
					<ul>
						{#each strong as f (f.family)}<li>{f.family} ({pct(f.firstTryRate)})</li>{/each}
					</ul>
				{:else}<p class="muted">Noch nicht genug Daten.</p>{/if}
			</div>
			<div>
				<h3>Noch üben</h3>
				{#if practise.length}
					<ul>
						{#each practise as f (f.family)}<li>{f.family} ({pct(f.firstTryRate)})</li>{/each}
					</ul>
				{:else}<p class="muted">Keine Auffälligkeiten.</p>{/if}
			</div>
		</div>
		<p class="muted small">
			Hinweis: Die Werte sind Beobachtungen aus der App und ersetzen keine Diagnostik. Lange
			Antwortzeiten können z. B. auch durch Ablenkung, Lesen oder Motorik entstehen.
		</p>
	</section>

	<section class="card stack">
		<h2>Nach Aufgabenart</h2>
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th>Aufgabenart</th>
						<th class="num">Aufgaben</th>
						<th class="num">Sofort richtig</th>
						<th class="num">Antwortzeit (Median)</th>
						<th class="num">mit Hilfe</th>
						<th class="num">Lösung gezeigt</th>
					</tr>
				</thead>
				<tbody>
					{#each r.families as f (f.family)}
						<tr>
							<td>{f.family}</td>
							<td class="num">{f.tasks}</td>
							<td class="num">
								<span class="bar"><span style="width: {f.firstTryRate * 100}%"></span></span>
								{pct(f.firstTryRate)}
							</td>
							<td class="num">{seconds(f.medianMs)}</td>
							<td class="num">{pct(f.hintRate)}</td>
							<td class="num">{pct(f.solutionRate)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<div class="grid-2 two">
		<section class="card stack">
			<h2>Typische Fehler</h2>
			{#if r.patterns.length === 0}
				<p class="muted">Keine typischen Fehlermuster erkannt.</p>
			{:else}
				<table>
					<tbody>
						{#each r.patterns as p (p.pattern)}
							<tr
								><td>{ERROR_PATTERN_LABELS[p.pattern] ?? p.pattern}</td><td class="num"
									>{p.count}×</td
								></tr
							>
						{/each}
					</tbody>
				</table>
			{/if}
		</section>
		<section class="card stack">
			<h2>Schwierige Aufgaben</h2>
			{#if r.hardest.length === 0}
				<p class="muted">Keine.</p>
			{:else}
				<table>
					<thead
						><tr><th>Aufgabe</th><th class="num">Fehler</th><th class="num">sofort richtig</th></tr
						></thead
					>
					<tbody>
						{#each r.hardest as t (t.label)}
							<tr
								><td>{t.label}</td><td class="num">{t.errors}</td><td class="num"
									>{t.firstTry}/{t.tasks}</td
								></tr
							>
						{/each}
					</tbody>
				</table>
			{/if}
		</section>
	</div>

	{#if r.weekly.length > 0}
		{@const w = Math.max(r.weekly.length * 60, 300)}
		<section class="card stack">
			<h2>Verlauf (sofort richtig je Woche)</h2>
			<svg viewBox="0 0 {w} 180" class="chart" role="img" aria-label="Verlauf je Woche">
				<line x1="30" y1="150" x2={w} y2="150" stroke="#ccc" />
				<line x1="30" y1="15" x2={w} y2="15" stroke="#eee" />
				<text x="0" y="19" font-size="11" fill="#777">100%</text>
				<text x="8" y="154" font-size="11" fill="#777">0%</text>
				{#each r.weekly as wk, i (wk.week)}
					{@const h = wk.firstTryRate * 135}
					<rect x={40 + i * 60} y={150 - h} width="36" height={h} fill="#2f6fd6" rx="3" />
					<text x={58 + i * 60} y={145 - h} font-size="11" text-anchor="middle"
						>{pct(wk.firstTryRate)}</text
					>
					<text x={58 + i * 60} y="168" font-size="10" text-anchor="middle" fill="#555"
						>{wk.week.slice(5)}</text
					>
					<text x={58 + i * 60} y="179" font-size="9" text-anchor="middle" fill="#888"
						>{wk.tasks} Aufg.</text
					>
				{/each}
			</svg>
		</section>
	{/if}

	<section class="card stack">
		<h2>Rennen</h2>
		<div class="table-wrap">
			<table>
				<thead>
					<tr
						><th>Datum</th><th>Set</th><th>Status</th><th class="num">Aufgaben</th><th class="num"
							>sofort richtig</th
						><th>Dauer</th><th>Sterne</th><th class="no-print"></th></tr
					>
				</thead>
				<tbody>
					{#each r.runs as run (run.id)}
						<tr>
							<td>{dateTime(run.startedAt)}</td>
							<td>{run.setName}</td>
							<td>{RUN_STATUS[run.status] ?? run.status}</td>
							<td class="num">{run.tasksDone}/{run.tasksTotal}</td>
							<td class="num">{run.firstTryCorrect}</td>
							<td>{duration(run.durationMs)}</td>
							<td>{stars(run.stars)}</td>
							<td class="no-print"
								><a class="btn small" href="/lehrkraft/auswertung/lauf/{run.id}">Details</a></td
							>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>
{/if}

<style>
	section {
		margin-top: var(--space-6);
	}
	.period {
		align-items: end;
	}
	.period .field {
		width: auto;
	}
	.kpis {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
		gap: var(--space-3);
	}
	.kpi {
		display: flex;
		flex-direction: column;
		padding: var(--space-4);
	}
	.kpi .v {
		font-size: 1.8rem;
		font-weight: 800;
		color: var(--color-primary);
	}
	.two section {
		margin-top: 0;
	}
	.two {
		margin-top: var(--space-6);
	}
	.bar {
		display: inline-block;
		width: 4rem;
		height: 0.6rem;
		background: #eee;
		border-radius: 999px;
		overflow: hidden;
		vertical-align: middle;
		margin-right: var(--space-2);
	}
	.bar span {
		display: block;
		height: 100%;
		background: var(--color-success);
	}
	.chart {
		width: 100%;
		max-height: 14rem;
	}
	.print-only {
		display: none;
	}
	@media print {
		.print-only {
			display: block;
		}
		section {
			break-inside: avoid;
		}
	}
</style>
