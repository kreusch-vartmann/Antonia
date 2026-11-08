<script lang="ts">
	import { enhance } from '$app/forms';
	import { dateTime } from '#lib/format.ts';
	import PasswordField from '#lib/components/PasswordField.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const t = $derived(data.teacher);
</script>

<svelte:head><title>Konto – Antonia</title></svelte:head>

<h1>Konto</h1>
<p>Angemeldet als <strong>{t.displayName}</strong> (<code>{t.username}</code>)</p>

<section class="card stack">
	<h2>Passwort ändern</h2>
	<form method="POST" action="?/password" use:enhance class="stack narrow-form">
		<PasswordField name="current" label="Aktuelles Passwort" autocomplete="current-password" />
		<PasswordField
			name="next"
			label="Neues Passwort (mind. 10 Zeichen)"
			autocomplete="new-password"
			minlength={10}
		/>
		<PasswordField
			name="next2"
			label="Neues Passwort wiederholen"
			autocomplete="new-password"
			minlength={10}
		/>
		{#if form?.pwError}<p class="error">{form.pwError}</p>{/if}
		{#if form?.pwSaved}<p class="success">
				Passwort geändert. Andere Geräte wurden abgemeldet.
			</p>{/if}
		<div><button class="btn btn-primary">Ändern</button></div>
	</form>
</section>

<section class="card stack">
	<h2>Zwei-Faktor-Anmeldung (optional)</h2>
	{#if form?.recoveryCodes}
		<p class="success">2FA ist aktiv.</p>
		<p>
			<strong>Wiederherstellungscodes</strong> – jetzt ausdrucken oder sicher notieren. Jeder Code funktioniert
			einmal, falls dein Handy fehlt. Sie werden nicht erneut angezeigt.
		</p>
		<ul class="codes">
			{#each form.recoveryCodes as c (c)}<li><code>{c}</code></li>{/each}
		</ul>
	{:else if t.totpEnabled}
		<p>2FA ist <strong>aktiv</strong>. Verbleibende Wiederherstellungscodes: {t.recoveryLeft}</p>
		<form method="POST" action="?/disableTotp" use:enhance class="row">
			<PasswordField
				name="password"
				label="Passwort zur Bestätigung"
				autocomplete="current-password"
			/>
			<button class="btn btn-danger">2FA deaktivieren</button>
		</form>
		{#if form?.disableError}<p class="error">{form.disableError}</p>{/if}
	{:else if data.setup}
		<ol>
			<li>
				Öffne eine Authenticator-App (z. B. Aegis, Google Authenticator, Microsoft Authenticator).
			</li>
			<li>Scanne den QR-Code oder gib den Schlüssel manuell ein.</li>
			<li>Gib den angezeigten 6-stelligen Code ein.</li>
		</ol>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- QR-SVG wird serverseitig aus der eigenen Bibliothek erzeugt -->
		<div class="qr" aria-label="QR-Code für die Authenticator-App">{@html data.setup.qr}</div>
		<p class="small">Schlüssel: <code class="secret">{data.setup.secret}</code></p>
		<form method="POST" action="?/confirmTotp" use:enhance class="row">
			<label class="field"
				><span>Code</span><input
					name="code"
					inputmode="numeric"
					autocomplete="one-time-code"
					required
				/></label
			>
			<button class="btn btn-primary">Aktivieren</button>
		</form>
		{#if form?.totpError}<p class="error">{form.totpError}</p>{/if}
		<form method="POST" action="?/cancelTotp" use:enhance>
			<button class="btn small">Abbrechen</button>
		</form>
	{:else}
		<p>
			Mit 2FA brauchst du beim Anmelden zusätzlich einen Code aus einer App auf deinem Handy.
			Empfohlen.
		</p>
		{#if form?.disabled}<p class="success">2FA wurde deaktiviert.</p>{/if}
		<form method="POST" action="?/startTotp" use:enhance>
			<button class="btn btn-primary">2FA einrichten</button>
		</form>
	{/if}
</section>

<section class="card stack">
	<h2>Sitzungen</h2>
	<form method="POST" action="?/logoutAll" use:enhance>
		<button class="btn">Alle anderen Geräte abmelden</button>
		{#if form?.loggedOut}<span class="success">Erledigt.</span>{/if}
	</form>
</section>

<section class="card stack">
	<h2>Gerät</h2>
	<p><a class="btn" href="/lehrkraft/technik">Gerätetest (Ton &amp; Vorlesen)</a></p>
</section>

<section class="card stack">
	<h2>Protokoll (letzte Aktionen)</h2>
	<table>
		<tbody>
			{#each data.audit as a (a.id)}
				<tr><td>{dateTime(a.at)}</td><td>{a.label}</td></tr>
			{/each}
		</tbody>
	</table>
</section>

<style>
	section {
		margin-top: var(--space-6);
	}
	.narrow-form {
		max-width: 26rem;
	}
	.qr {
		width: 12rem;
		background: #fff;
	}
	.qr :global(svg) {
		width: 100%;
		height: auto;
	}
	.secret {
		word-break: break-all;
	}
	.codes {
		columns: 2;
		font-size: 1.2rem;
	}
</style>
