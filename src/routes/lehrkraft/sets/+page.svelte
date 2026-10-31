<script lang="ts">
	import { enhance } from '$app/forms';
	import { dateTime } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>Aufgabensets – Antonia</title></svelte:head>

<div class="spread">
	<h1>Aufgabensets</h1>
	<a class="btn btn-primary" href="/lehrkraft/sets/neu">Set anlegen</a>
</div>
{#if form && 'message' in form}<p class="success">{form.message}</p>{/if}

{#if data.sets.length === 0}
	<p class="muted">
		Noch keine Sets. Tipp: Im <a href="/lehrkraft/aufgaben/generator">Generator</a> kannst du Aufgaben
		direkt als Set speichern.
	</p>
{:else}
	<div class="table-wrap">
		<table>
			<thead>
				<tr
					><th>Name</th><th>Szenario</th><th class="num">Aufgaben</th><th class="num"
						>Zuweisungen</th
					><th>Geändert</th><th></th></tr
				>
			</thead>
			<tbody>
				{#each data.sets as s (s.id)}
					<tr>
						<td><a href="/lehrkraft/sets/{s.id}">{s.name}</a></td>
						<td>Autorennen</td>
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
{/if}
