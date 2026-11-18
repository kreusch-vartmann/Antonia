<script lang="ts">
	import { enhance } from '$app/forms';
	import { dateTime } from '#lib/format.ts';
	import { RANGE_LABEL, RANGE_ORDER } from '#lib/domain/numberRange.ts';
	import { groupSets, rangeHeading, customHeading } from '#lib/domain/setOrder.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let sorting = $state(false);

	/** Sets under their headings, in the order chosen by the teacher. */
	const groups = $derived(
		groupSets(
			data.sets.map((s) => ({ ...s, autoRange: s.range })),
			data.headings,
			data.headingOrder
		)
	);
	const visible = $derived(
		groups.filter((g) => g.sets.length > 0 || (sorting && g.key.startsWith('custom:')))
	);
	const ownIds = $derived(new Set(data.headings.map((h) => customHeading(h.id))));
</script>

<svelte:head><title>Aufgabensets – Antonia</title></svelte:head>

<div class="spread">
	<h1>Aufgabensets</h1>
	<div class="row">
		{#if data.sets.length > 0}
			<button type="button" class="btn" aria-pressed={sorting} onclick={() => (sorting = !sorting)}>
				{sorting ? 'Fertig' : 'Reihenfolge und Überschriften bearbeiten'}
			</button>
		{/if}
		<a class="btn btn-primary" href="/lehrkraft/sets/neu">Set anlegen</a>
	</div>
</div>
{#if form && 'message' in form}<p class="success">{form.message}</p>{/if}
{#if form && 'error' in form && form.error}<p class="error" role="alert">{form.error}</p>{/if}

{#if sorting}
	<p class="muted">
		Das Programm sortiert neue Sets automatisch ein (z. B. nach Zehnerübergang). Hier kannst du das
		ändern, z. B. wenn 15 + 5 für dich nicht als Übergang zählt, und eigene Überschriften anlegen.
	</p>
{/if}

{#if data.sets.length === 0}
	<p class="muted">Noch keine Sets. Lege mit „Set anlegen“ dein erstes Aufgabenset an.</p>
{:else}
	{#each visible as g (g.key)}
		<div class="spread head">
			<h2 class="range">{g.label}</h2>
			{#if sorting}
				<div class="row">
					<form method="POST" action="?/moveHeading" use:enhance class="inline">
						<input type="hidden" name="key" value={g.key} />
						<button class="btn small" name="dir" value="up" aria-label="Überschrift nach oben"
							>↑</button
						>
						<button class="btn small" name="dir" value="down" aria-label="Überschrift nach unten"
							>↓</button
						>
					</form>
					{#if ownIds.has(g.key)}
						{@const id = g.key.slice(7)}
						<form method="POST" action="?/renameHeading" use:enhance class="inline">
							<input type="hidden" name="id" value={id} />
							<input name="name" value={g.label} maxlength="60" aria-label="Name der Überschrift" />
							<button class="btn small">Umbenennen</button>
						</form>
						<form
							method="POST"
							action="?/deleteHeading"
							use:enhance
							onsubmit={(e) => {
								if (!confirm('Überschrift löschen? Die Sets bleiben erhalten.')) e.preventDefault();
							}}
						>
							<input type="hidden" name="id" value={id} />
							<button class="btn small btn-danger">Löschen</button>
						</form>
					{/if}
				</div>
			{/if}
		</div>
		{#if g.sets.length === 0}
			<p class="muted">Noch keine Sets.</p>
		{:else}
			<div class="table-wrap">
				<table>
					<thead>
						<tr
							><th>Name</th><th class="num">Aufgaben</th><th class="num">Zuweisungen</th><th
								>Geändert</th
							><th></th></tr
						>
					</thead>
					<tbody>
						{#each g.sets as s, i (s.id)}
							<tr>
								<td>
									<a href="/lehrkraft/sets/{s.id}">{s.name}</a>
									{#if s.description}<div class="muted">{s.description}</div>{/if}
								</td>
								<td class="num">{s.items}</td>
								<td class="num">{s.assignments}</td>
								<td>{dateTime(s.updatedAt)}</td>
								<td>
									<div class="row">
										{#if sorting}
											<form method="POST" action="?/moveSet" use:enhance class="inline">
												<input type="hidden" name="id" value={s.id} />
												<button
													class="btn small"
													name="dir"
													value="up"
													disabled={i === 0}
													aria-label="Set nach oben">↑</button
												>
												<button
													class="btn small"
													name="dir"
													value="down"
													disabled={i === g.sets.length - 1}
													aria-label="Set nach unten">↓</button
												>
											</form>
											<form method="POST" action="?/setHeading" use:enhance class="inline">
												<input type="hidden" name="id" value={s.id} />
												<select
													name="heading"
													aria-label="Überschrift für {s.name}"
													onchange={(e) => e.currentTarget.form?.requestSubmit()}
												>
													<option value="" selected={!s.heading}
														>Automatisch ({RANGE_LABEL[s.range]})</option
													>
													{#each RANGE_ORDER as key (key)}
														<option
															value={rangeHeading(key)}
															selected={s.heading === rangeHeading(key)}>{RANGE_LABEL[key]}</option
														>
													{/each}
													{#each data.headings as h (h.id)}
														<option
															value={customHeading(h.id)}
															selected={s.heading === customHeading(h.id)}>{h.name}</option
														>
													{/each}
												</select>
											</form>
										{:else}
											<form method="POST" action="?/duplicate" use:enhance>
												<input type="hidden" name="id" value={s.id} />
												<button class="btn small">Kopieren</button>
											</form>
											<form
												method="POST"
												action="?/remove"
												use:enhance
												onsubmit={(e) => {
													if (!confirm('Set löschen? Wenn schon geübt wurde, wird es archiviert.'))
														e.preventDefault();
												}}
											>
												<input type="hidden" name="id" value={s.id} />
												<button class="btn small btn-danger">Löschen</button>
											</form>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/each}

	{#if sorting}
		<form method="POST" action="?/createHeading" use:enhance class="card stack new-heading">
			<h2>Neue Überschrift</h2>
			<div class="row">
				<input name="name" maxlength="60" required aria-label="Name der neuen Überschrift" />
				<button class="btn btn-primary">Anlegen</button>
			</div>
		</form>
	{/if}
{/if}

<style>
	.range {
		margin: var(--space-6) 0 var(--space-2);
		font-size: 1.15rem;
	}
	.head {
		align-items: flex-end;
	}
	form.inline {
		display: inline-flex;
		gap: var(--space-1);
		align-items: center;
	}
	.new-heading {
		margin-top: var(--space-6);
	}
</style>
