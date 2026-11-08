<script lang="ts">
	import { enhance } from '$app/forms';
	import { dateTime } from '#lib/format.ts';
	import { RANGE_LABEL, RANGE_ORDER } from '#lib/domain/numberRange.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	/** Sets grouped by number range, in the order they are taught. */
	const groups = $derived(
		RANGE_ORDER.map((key) => ({
			key,
			sets: data.sets
				.filter((s) => s.range === key)
				.sort((a, b) => a.name.localeCompare(b.name, 'de', { numeric: true }))
		})).filter((g) => g.sets.length > 0)
	);
</script>

<svelte:head><title>Aufgabensets – Antonia</title></svelte:head>

<div class="spread">
	<h1>Aufgabensets</h1>
	<a class="btn btn-primary" href="/lehrkraft/sets/neu">Set anlegen</a>
</div>
{#if form && 'message' in form}<p class="success">{form.message}</p>{/if}

{#if data.sets.length === 0}
	<p class="muted">Noch keine Sets. Lege mit „Set anlegen“ dein erstes Aufgabenset an.</p>
{:else}
	{#each groups as g (g.key)}
		<h2 class="range">{RANGE_LABEL[g.key]}</h2>
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
					{#each g.sets as s (s.id)}
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
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/each}
{/if}

<style>
	.range {
		margin: var(--space-6) 0 var(--space-2);
		font-size: 1.15rem;
	}
</style>
