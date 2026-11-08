<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const keep =
		() =>
		async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) =>
			update({ reset: false });
</script>

<svelte:head><title>Verwaltung – Antonia</title></svelte:head>

<h1>Verwaltung der Lehrkräfte</h1>
<p class="muted">
	Admins verwalten die Konten der Lehrkräfte. Die Kinder und ihre Daten sehen sie dadurch nicht
	automatisch: Jede Lehrkraft sieht die Kinder, die sie angelegt hat, und die, die mit ihr geteilt
	wurden.
</p>

{#if form?.error}<p class="error" role="alert">{form.error}</p>{/if}
{#if form?.newPassword}
	<p class="success" role="status">
		Neues Passwort: <strong>{form.newPassword.password}</strong> – bitte direkt weitergeben. Es wird nur
		jetzt angezeigt.
	</p>
{/if}
{#if form?.transferred !== undefined}
	<p class="success" role="status">{form.transferred} Kind(er) übertragen.</p>
{/if}

<section class="card stack">
	<h2>Lehrkräfte</h2>
	<div class="table-wrap">
		<table>
			<thead>
				<tr>
					<th>Name</th><th>Benutzername</th><th>Rolle</th><th class="num">Kinder</th><th>Status</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each data.teachers as t (t.id)}
					<tr class:muted={!t.active}>
						<td>{t.displayName}</td>
						<td><code>{t.username}</code></td>
						<td>{t.role === 'admin' ? 'Admin' : 'Lehrkraft'}</td>
						<td class="num">{t.students}</td>
						<td>{t.active ? 'aktiv' : 'deaktiviert'}</td>
						<td>
							<div class="row">
								<form method="POST" action="?/password" use:enhance={keep}>
									<input type="hidden" name="id" value={t.id} />
									<button class="btn small">Neues Passwort</button>
								</form>
								<form method="POST" action="?/role" use:enhance={keep}>
									<input type="hidden" name="id" value={t.id} />
									<input
										type="hidden"
										name="role"
										value={t.role === 'admin' ? 'teacher' : 'admin'}
									/>
									<button class="btn small"
										>{t.role === 'admin' ? 'Admin-Rechte entfernen' : 'Zum Admin machen'}</button
									>
								</form>
								<form method="POST" action="?/active" use:enhance={keep}>
									<input type="hidden" name="id" value={t.id} />
									<input type="hidden" name="active" value={t.active ? 'false' : 'true'} />
									<button class="btn small {t.active ? 'btn-danger' : ''}"
										>{t.active ? 'Deaktivieren' : 'Aktivieren'}</button
									>
								</form>
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>

<section class="card stack">
	<h2>Lehrkraft anlegen</h2>
	<form method="POST" action="?/create" use:enhance={keep} class="stack narrow-form">
		<label class="field">
			<span>Name *</span>
			<input name="displayName" required maxlength="80" value={form?.displayName ?? ''} />
		</label>
		<label class="field">
			<span>Benutzername *</span>
			<input
				name="username"
				required
				autocapitalize="none"
				spellcheck="false"
				value={form?.username ?? ''}
			/>
			<small>3–32 Zeichen, Kleinbuchstaben, Ziffern, Punkt, Binde- oder Unterstrich.</small>
		</label>
		<div><button class="btn btn-primary">Anlegen</button></div>
	</form>
	{#if form?.created}
		<p class="success" role="status">
			Konto angelegt. Benutzername: <strong>{form.created.username}</strong>, Passwort:
			<strong>{form.created.password}</strong>. Bitte direkt weitergeben und nach der ersten
			Anmeldung unter „Konto“ ändern lassen. Das Passwort wird nur jetzt angezeigt.
		</p>
	{/if}
</section>

<section class="card stack">
	<h2>Kinder übertragen</h2>
	<p class="muted small">
		Alle Kinder einer Lehrkraft gehen an eine andere, zum Beispiel wenn jemand die Schule verlässt.
	</p>
	<form method="POST" action="?/transfer" use:enhance={keep} class="row">
		<label class="field">
			<span>Von</span>
			<select name="from" required>
				<option value="">bitte wählen</option>
				{#each data.teachers as t (t.id)}<option value={t.id}>{t.displayName} ({t.students})</option
					>{/each}
			</select>
		</label>
		<label class="field">
			<span>An</span>
			<select name="to" required>
				<option value="">bitte wählen</option>
				{#each data.teachers as t (t.id)}<option value={t.id}>{t.displayName}</option>{/each}
			</select>
		</label>
		<button class="btn" onclick={(e) => !confirm('Alle Kinder übertragen?') && e.preventDefault()}
			>Übertragen</button
		>
	</form>
</section>

<style>
	section {
		margin-top: var(--space-6);
	}
	.narrow-form {
		max-width: 26rem;
	}
</style>
