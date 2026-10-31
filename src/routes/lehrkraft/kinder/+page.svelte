<script lang="ts">
	import { fullName } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Kinder – Antonia</title></svelte:head>

<div class="spread">
	<h1>Kinder</h1>
	<div class="row">
		<a class="btn" href="/lehrkraft/kinder/karten">Zugangskarten</a>
		<a class="btn btn-primary" href="/lehrkraft/kinder/neu">Kind anlegen</a>
	</div>
</div>

{#if data.students.length === 0}
	<p class="muted">Noch keine Kinder angelegt.</p>
{:else}
	<div class="table-wrap">
		<table>
			<thead>
				<tr><th>Name</th><th>Anzeigename</th><th>Benutzername</th><th></th></tr>
			</thead>
			<tbody>
				{#each data.students as s (s.id)}
					<tr>
						<td><a href="/lehrkraft/kinder/{s.id}">{fullName(s)}</a></td>
						<td>{s.displayName}</td>
						<td><code>{s.username}</code></td>
						<td class="row">
							<a class="btn small" href="/lehrkraft/kinder/{s.id}">Bearbeiten</a>
							<a class="btn small" href="/lehrkraft/kinder/{s.id}/auswertung">Auswertung</a>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<p class="muted small">
	Tipp für den Datenschutz: Der Nachname ist optional. Kinder sehen nur ihren Anzeigenamen.
</p>
