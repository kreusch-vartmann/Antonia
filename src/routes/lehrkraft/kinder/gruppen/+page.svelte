<script lang="ts">
	import { enhance } from '$app/forms';
	import { fullName } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const classes = $derived(data.groups.filter((g) => g.kind === 'class'));
	const subgroups = $derived(data.groups.filter((g) => g.kind === 'subgroup'));
	const classOf = (studentId: string, exceptId: string) =>
		classes.find((c) => c.id !== exceptId && c.memberIds.includes(studentId))?.name;
</script>

<svelte:head><title>Gruppen – Antonia</title></svelte:head>

<p><a href="/lehrkraft/kinder">← Kinder</a></p>
<h1>Gruppen</h1>
<p class="muted">
	Ein Kind kann in einer Klasse und in mehreren Untergruppen sein, z. B. „Förderkurs“ mit Kindern
	aus „Klasse 1a“ und „Klasse 1b“. Beim Zuweisen eines Sets wählst du eine ganze Gruppe mit einem
	Klick aus.
</p>

<form method="POST" action="?/create" use:enhance class="card stack">
	<h2>Neue Gruppe</h2>
	<div class="row">
		<label class="field">
			<span>Name</span>
			<input name="name" required maxlength="60" placeholder="z. B. Klasse 1a" />
		</label>
		<label class="field">
			<span>Art</span>
			<select name="kind">
				<option value="class">Klasse</option>
				<option value="subgroup">Untergruppe (klassenübergreifend)</option>
			</select>
		</label>
	</div>
	{#if form?.error}<p class="error" role="alert">{form.error}</p>{/if}
	<div><button class="btn btn-primary">Anlegen</button></div>
</form>

{#snippet block(title: string, list: typeof data.groups, kind: 'class' | 'subgroup')}
	<h2>{title}</h2>
	{#if list.length === 0}
		<p class="muted">Noch keine {kind === 'class' ? 'Klassen' : 'Untergruppen'}.</p>
	{/if}
	{#each list as g, i (g.id)}
		<section class="card stack group">
			<div class="spread">
				<form method="POST" action="?/rename" use:enhance class="row">
					<input type="hidden" name="id" value={g.id} />
					<input name="name" value={g.name} maxlength="60" required aria-label="Name der Gruppe" />
					<button class="btn small">Umbenennen</button>
				</form>
				<div class="row">
					<form method="POST" action="?/move" use:enhance class="row">
						<input type="hidden" name="id" value={g.id} />
						<button
							class="btn small"
							name="dir"
							value="up"
							disabled={i === 0}
							aria-label="Gruppe nach oben">↑</button
						>
						<button
							class="btn small"
							name="dir"
							value="down"
							disabled={i === list.length - 1}
							aria-label="Gruppe nach unten">↓</button
						>
					</form>
					<form
						method="POST"
						action="?/remove"
						use:enhance
						onsubmit={(e) => {
							if (!confirm('Gruppe löschen? Die Kinder bleiben erhalten.')) e.preventDefault();
						}}
					>
						<input type="hidden" name="id" value={g.id} />
						<button class="btn small btn-danger">Löschen</button>
					</form>
				</div>
			</div>
			<details>
				<summary>{g.memberIds.length} Kind(er) – Mitglieder bearbeiten</summary>
				<form
					method="POST"
					action="?/members"
					use:enhance={() =>
						async ({ update }) =>
							update({ reset: false })}
					class="stack"
				>
					<input type="hidden" name="id" value={g.id} />
					<div class="members">
						{#each data.students as s (s.id)}
							<label class="row">
								<input
									type="checkbox"
									name="studentId"
									value={s.id}
									checked={g.memberIds.includes(s.id)}
								/>
								{fullName(s)}
								{#if kind === 'class' && classOf(s.id, g.id)}
									<span class="muted small">(jetzt in {classOf(s.id, g.id)})</span>
								{/if}
							</label>
						{/each}
					</div>
					{#if form?.saved === g.id}<p class="success" role="status">Gespeichert.</p>{/if}
					<div><button class="btn btn-primary small">Speichern</button></div>
				</form>
			</details>
		</section>
	{/each}
{/snippet}

{@render block('Klassen', classes, 'class')}
{@render block('Untergruppen', subgroups, 'subgroup')}

<style>
	h2 {
		margin-top: var(--space-6);
	}
	.group {
		margin-top: var(--space-3);
	}
	.members {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
		gap: var(--space-2);
		margin: var(--space-3) 0;
	}
</style>
