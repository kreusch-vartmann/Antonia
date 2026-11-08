<script lang="ts">
	import { enhance } from '$app/forms';
	import StudentFields from '#lib/components/StudentFields.svelte';
	import { MODE_LABEL, clock, clockPrecise } from '#lib/domain/modes.ts';
	import { date, dateTime, fullName, stars } from '#lib/format.ts';
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
	<h2>Rennen</h2>
	{#if data.races.length === 0}
		<p class="muted">
			Noch keine Aufgabensets zugewiesen. <a href="/lehrkraft/sets">Zu den Sets</a>
		</p>
	{:else}
		{#each data.races as race (race.setId)}
			{@const resetAt = race.assignments
				.map((a) => a.progressResetAt)
				.filter((d) => d !== null)
				.sort()
				.at(-1)}
			<article class="race" class:archived={race.archived}>
				<header class="spread">
					<h3>
						<a href="/lehrkraft/sets/{race.setId}">{race.setName}</a>{race.archived
							? ' (beendet)'
							: ''}
					</h3>
					{#if race.best}
						<span class="muted"
							>Bestzeit: <strong>{clockPrecise(race.best.durationMs)}</strong></span
						>
					{/if}
				</header>
				<ul class="assignments">
					{#each race.assignments as a (a.id)}
						<li class:archived={a.archived}>
							<span class="period">
								{a.startsOn ? date(a.startsOn) : 'ab sofort'} – {a.endsOn
									? date(a.endsOn)
									: 'offen'}
								{a.archived ? '(beendet)' : ''}
							</span>
							<span class="chips">
								{#each a.modes as m (m)}
									<span class="tag">
										{MODE_LABEL[m]}{m === 'time' && a.targetTime > 0
											? ` ${clock(a.targetTime * 1000)}`
											: ''}
										{#if m !== 'record'}{stars(a.starsByMode[m])}{/if}
									</span>
								{/each}
							</span>
							<span class="muted">{a.runs} Rennen</span>
							{#if a.editable}
								<a class="btn small" href="/lehrkraft/zuweisungen/{a.id}">Einstellungen</a>
							{/if}
						</li>
					{/each}
				</ul>
				<form
					method="POST"
					action="?/resetProgress"
					use:enhance
					class="row"
					onsubmit={(e) => {
						if (
							!confirm(
								`Spielstand für „${race.setName}“ zurücksetzen? Sterne und Bestzeit beginnen für das Kind neu. Die Auswertung bleibt erhalten.`
							)
						)
							e.preventDefault();
					}}
				>
					<input type="hidden" name="setId" value={race.setId} />
					<button class="btn small">Spielstand zurücksetzen</button>
					{#if resetAt}
						<span class="muted small">Zuletzt zurückgesetzt: {dateTime(resetAt)}</span>
					{/if}
					{#if form?.progressReset === race.setId}
						<span class="success" role="status">Zurückgesetzt.</span>
					{/if}
				</form>
			</article>
		{/each}
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
	.race {
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: var(--space-3) var(--space-4);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	.race h3 {
		margin: 0;
	}
	.assignments {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	.assignments li {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-4);
		align-items: center;
		border-top: 1px solid var(--color-border);
		padding-top: var(--space-2);
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
	}
	.del {
		margin-top: var(--space-3);
	}
	summary.btn {
		list-style: none;
	}
</style>
