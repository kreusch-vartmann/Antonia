<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// svelte-ignore state_referenced_locally
	let selected = $state<string[]>(
		data.preselected ? [data.preselected] : data.cards.map((c) => c.id)
	);
	const shown = $derived(data.cards.filter((c) => selected.includes(c.id)));
	const unknown = $derived(shown.filter((c) => !c.password).length);
</script>

<svelte:head><title>Zugangskarten – Antonia</title></svelte:head>

<div class="no-print stack">
	<p><a href="/lehrkraft/kinder">← Kinder</a></p>
	<h1>Zugangskarten</h1>
	<p>
		Auf jeder Karte stehen Adresse, Benutzername und Passwort sowie ein QR-Code. Der QR-Code öffnet
		die Anmeldeseite mit eingetragenem Benutzernamen, das Passwort tippt das Kind selbst ein.
	</p>
	<form method="POST" use:enhance class="stack card">
		<div class="row">
			{#each data.cards as c (c.id)}
				<label class="row">
					<input type="checkbox" name="id" value={c.id} bind:group={selected} />
					{c.displayName}
				</label>
			{/each}
		</div>
		{#if form?.error}<p class="error">{form.error}</p>{/if}
		{#if form?.renewed}
			<p class="success" role="status">
				Neue Passwörter für {form.renewed} Kind(er) erzeugt. Die Kinder wurden auf allen Geräten abgemeldet.
			</p>
		{/if}
		{#if unknown > 0}
			<p class="notice">
				Bei {unknown} Kind(ern) ist das Passwort nicht bekannt (es wurde vor diesem Update vergeben).
				Erzeuge neue Passwörter, dann stehen sie auf der Karte und bleiben dauerhaft sichtbar.
			</p>
		{/if}
		<div class="row">
			<button class="btn" disabled={selected.length === 0}>Neue Passwörter erzeugen</button>
			<button
				type="button"
				class="btn btn-primary"
				disabled={shown.length === 0}
				onclick={() => window.print()}>Drucken</button
			>
		</div>
	</form>
</div>

<div class="cards">
	{#each shown as c (c.id)}
		<div class="kcard">
			<div class="text">
				<div class="kname">{c.displayName}</div>
				<div><span class="muted">Adresse:</span> {page.url.origin}</div>
				<div><span class="muted">Benutzername:</span> <strong>{c.username}</strong></div>
				<div>
					<span class="muted">Passwort:</span>
					{#if c.password}<strong>{c.password}</strong>{:else}<span class="blank"></span>{/if}
				</div>
			</div>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			<div class="qr" role="img" aria-label="QR-Code zur Anmeldeseite">{@html c.qr}</div>
		</div>
	{/each}
</div>

<style>
	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(22rem, 1fr));
		gap: var(--space-4);
		margin-top: var(--space-6);
	}
	.kcard {
		display: flex;
		gap: var(--space-3);
		align-items: center;
		justify-content: space-between;
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
	.text {
		min-width: 0;
		word-break: break-word;
	}
	.qr {
		flex: none;
		width: 7.5rem;
	}
	.qr :global(svg) {
		width: 100%;
		height: auto;
		display: block;
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
