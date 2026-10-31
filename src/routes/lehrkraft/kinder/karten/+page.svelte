<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const passwords = $derived<Record<string, string>>(form?.passwords ?? {});
	const shown = $derived(
		Object.keys(passwords).length ? data.students.filter((s) => passwords[s.id]) : data.students
	);
</script>

<svelte:head><title>Zugangskarten – Antonia</title></svelte:head>

<div class="no-print stack">
	<p><a href="/lehrkraft/kinder">← Kinder</a></p>
	<h1>Zugangskarten</h1>
	<p>
		Passwörter sind sicher verschlüsselt gespeichert und können nicht angezeigt werden. Du kannst Karten
		ohne Passwort drucken (zum Selbsteintragen) oder für ausgewählte Kinder <strong>neue Passwörter</strong>
		erzeugen.
	</p>
	<form method="POST" use:enhance class="stack card">
		<div class="row">
			{#each data.students as s (s.id)}
				<label class="row"><input type="checkbox" name="id" value={s.id} /> {s.displayName}</label>
			{/each}
		</div>
		{#if form?.error}<p class="error">{form.error}</p>{/if}
		<div class="row">
			<button class="btn">Neue Passwörter erzeugen</button>
			<button type="button" class="btn btn-primary" onclick={() => window.print()}>Drucken</button>
		</div>
	</form>
	{#if Object.keys(passwords).length}
		<p class="notice">Neue Passwörter erzeugt. Jetzt drucken – sie werden nicht erneut angezeigt.</p>
	{/if}
</div>

<div class="cards">
	{#each shown as s (s.id)}
		<div class="kcard">
			<div class="kname">{s.displayName}</div>
			<div><span class="muted">Adresse:</span> {page.url.origin}</div>
			<div><span class="muted">Benutzername:</span> <strong>{s.username}</strong></div>
			<div>
				<span class="muted">Passwort:</span>
				{#if passwords[s.id]}<strong>{passwords[s.id]}</strong>{:else}<span class="blank"></span>{/if}
			</div>
		</div>
	{/each}
</div>

<style>
	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
		gap: var(--space-4);
		margin-top: var(--space-6);
	}
	.kcard {
		border: 2px dashed var(--color-border);
		border-radius: var(--radius);
		padding: var(--space-4);
		background: #fff;
		break-inside: avoid;
		font-size: 1.1rem;
		line-height: 1.8;
	}
	.kname {
		font-size: 1.5rem;
		font-weight: 800;
		color: var(--color-primary);
	}
	.blank {
		display: inline-block;
		width: 9rem;
		border-bottom: 1px solid #999;
	}
	@media print {
		.cards {
			grid-template-columns: 1fr 1fr;
			margin: 0;
		}
	}
</style>
