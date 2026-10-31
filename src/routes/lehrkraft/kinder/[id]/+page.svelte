<script lang="ts">
	import { enhance } from '$app/forms';
	import StudentFields from '#lib/components/StudentFields.svelte';
	import { date, fullName, stars } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const s = $derived(data.student);
</script>

<svelte:head><title>{s.displayName} – Antonia</title></svelte:head>

<p><a href="/lehrkraft/kinder">← Kinder</a></p>
<div class="spread">
	<h1>{fullName(s)}</h1>
	<div class="row">
		<a class="btn" href="/lehrkraft/kinder/{s.id}/auswertung">Auswertung</a>
	</div>
</div>

<section class="card stack">
	<h2>Stammdaten & Einstellungen</h2>
	<form
		method="POST"
		action="?/update"
		use:enhance={() =>
			async ({ update }) =>
				update({ reset: false })}
		class="stack"
	>
		{#key s.updatedAt}
			<StudentFields
				values={s}
				settings={s.settings}
				error={form?.error && !form?.newPassword ? form.error : undefined}
				field={form?.field}
			/>
		{/key}
		{#if form?.saved}<p class="success" role="status">Gespeichert.</p>{/if}
		<div><button class="btn btn-primary">Speichern</button></div>
	</form>
</section>

<section class="card stack">
	<h2>Zuweisungen</h2>
	{#if data.assignments.length === 0}
		<p class="muted">
			Noch keine Aufgabensets zugewiesen. <a href="/lehrkraft/sets">Zu den Sets</a>
		</p>
	{:else}
		<div class="table-wrap">
			<table>
				<thead
					><tr><th>Set</th><th>Zeitraum</th><th class="num">Rennen</th><th>Beste</th><th></th></tr
					></thead
				>
				<tbody>
					{#each data.assignments as a (a.id)}
						<tr class:archived={a.archived}>
							<td
								><a href="/lehrkraft/sets/{a.setId}">{a.setName}</a>{a.archived
									? ' (beendet)'
									: ''}</td
							>
							<td
								>{a.startsOn ? date(a.startsOn) : 'ab sofort'} – {a.endsOn
									? date(a.endsOn)
									: 'offen'}</td
							>
							<td class="num">{a.runs}</td>
							<td>{stars(a.bestStars)}</td>
							<td><a class="btn small" href="/lehrkraft/zuweisungen/{a.id}">Einstellungen</a></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>

<section class="card stack">
	<h2>Zugang</h2>
	<p>Benutzername: <code>{s.username}</code></p>
	<form method="POST" action="?/password" use:enhance class="row">
		<label class="field">
			<span>Neues Passwort</span>
			<input
				name="password"
				required
				minlength="4"
				value={data.suggestedPassword}
				autocomplete="off"
			/>
		</label>
		<button class="btn">Passwort setzen</button>
	</form>
	{#if form?.newPassword}
		<p class="success" role="status">
			Neues Passwort: <strong>{form.newPassword}</strong> – das Kind wurde auf allen Geräten abgemeldet.
		</p>
	{/if}
	<form method="POST" action="?/logoutAll" use:enhance>
		<button class="btn">Auf allen Geräten abmelden</button>
		{#if form?.loggedOut}<span class="success">Abgemeldet.</span>{/if}
	</form>
</section>

<section class="card stack">
	<h2>Datenschutz</h2>
	<p>
		<a class="btn" href="/lehrkraft/kinder/{s.id}/export" download>Alle Daten exportieren (JSON)</a>
	</p>
	<details>
		<summary class="btn btn-danger">Kind löschen …</summary>
		<form method="POST" action="?/delete" class="stack del">
			<p>
				Löscht das Kind <strong>mit allen Zuweisungen, Rennen und Antworten</strong> unwiderruflich.
				Tippe zur Bestätigung den Vornamen <strong>{s.firstName}</strong> ein.
			</p>
			<input name="confirm" autocomplete="off" />
			{#if form?.deleteError}<p class="error">{form.deleteError}</p>{/if}
			<div><button class="btn btn-danger">Endgültig löschen</button></div>
		</form>
	</details>
</section>

<style>
	section {
		margin-top: var(--space-6);
	}
	.archived {
		color: var(--color-muted);
	}
	.del {
		margin-top: var(--space-3);
	}
	summary.btn {
		list-style: none;
	}
</style>
