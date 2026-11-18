<script lang="ts">
	import { fullName } from '#lib/format.ts';
	import { sectionsByClass } from '#lib/domain/groups.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const subgroups = $derived(data.groups.filter((g) => g.kind === 'subgroup'));
	let filter = $state('');
	const shown = $derived.by(() => {
		const sub = subgroups.find((g) => g.id === filter);
		return sub ? data.students.filter((s) => sub.memberIds.includes(s.id)) : data.students;
	});
	const sections = $derived(sectionsByClass(shown, data.groups));
	const subgroupsOf = (id: string) => subgroups.filter((g) => g.memberIds.includes(id));
</script>

<svelte:head><title>Kinder – Antonia</title></svelte:head>

<div class="spread">
	<h1>Kinder</h1>
	<div class="row">
		<a class="btn" href="/lehrkraft/kinder/gruppen">Gruppen</a>
		<a class="btn" href="/lehrkraft/kinder/karten">Zugangskarten</a>
		<a class="btn btn-primary" href="/lehrkraft/kinder/neu">Kind anlegen</a>
	</div>
</div>

{#if data.students.length === 0}
	<p class="muted">Noch keine Kinder angelegt.</p>
{:else}
	{#if subgroups.length > 0}
		<label class="field filter">
			<span>Anzeigen</span>
			<select bind:value={filter}>
				<option value="">Alle Kinder</option>
				{#each subgroups as g (g.id)}
					<option value={g.id}>{g.name}</option>
				{/each}
			</select>
		</label>
	{/if}
	{#each sections as sec (sec.key)}
		{#if sec.name}<h2 class="class-name">{sec.name}</h2>{/if}
		<div class="table-wrap">
			<table>
				<thead>
					<tr
						><th>Name</th><th>Anzeigename</th><th>Benutzername</th>{#if subgroups.length > 0}<th
								>Untergruppen</th
							>{/if}<th></th></tr
					>
				</thead>
				<tbody>
					{#each sec.students as s (s.id)}
						<tr>
							<td>
								<a href="/lehrkraft/kinder/{s.id}">{fullName(s)}</a>
								{#if !s.owned}<span class="tag">geteilt</span>{/if}
							</td>
							<td>{s.displayName}</td>
							<td><code>{s.username}</code></td>
							{#if subgroups.length > 0}
								<td>
									{#each subgroupsOf(s.id) as g (g.id)}<span class="tag">{g.name}</span>{/each}
								</td>
							{/if}
							<td class="row">
								<a class="btn small" href="/lehrkraft/kinder/{s.id}"
									>{s.owned ? 'Bearbeiten' : 'Öffnen'}</a
								>
								<a class="btn small" href="/lehrkraft/kinder/{s.id}/auswertung">Auswertung</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/each}
{/if}

<p class="muted small">
	Tipp für den Datenschutz: Der Nachname ist optional. Kinder sehen nur ihren Anzeigenamen.
</p>

<style>
	.class-name {
		margin: var(--space-6) 0 var(--space-2);
		font-size: 1.15rem;
	}
	.filter {
		max-width: 22rem;
		margin-top: var(--space-3);
	}
</style>
