<script lang="ts">
	import SettingsEditor from './SettingsEditor.svelte';
	import type { SettingsLayer } from '#lib/domain/settings.ts';

	interface Props {
		values: {
			firstName?: string;
			lastName?: string | null;
			displayName?: string;
			username?: string;
			notes?: string | null;
		};
		settings: SettingsLayer;
		autoUsername?: boolean;
		error?: string;
		field?: string;
	}

	let { values, settings, autoUsername = false, error, field }: Props = $props();

	// svelte-ignore state_referenced_locally
	let firstName = $state(values.firstName ?? '');
	// svelte-ignore state_referenced_locally
	let username = $state(values.username ?? '');
	let touched = $state(false);

	function slug(s: string) {
		return s
			.toLowerCase()
			.replace(/ä/g, 'ae')
			.replace(/ö/g, 'oe')
			.replace(/ü/g, 'ue')
			.replace(/ß/g, 'ss')
			.normalize('NFKD')
			.replace(/[^a-z0-9]/g, '')
			.slice(0, 20);
	}

	$effect(() => {
		if (autoUsername && !touched) username = slug(firstName);
	});
</script>

<div class="grid-2">
	<label class="field">
		<span>Vorname *</span>
		<input name="firstName" required maxlength="60" bind:value={firstName} aria-invalid={field === 'firstName'} />
	</label>
	<label class="field">
		<span>Nachname (optional)</span>
		<input name="lastName" maxlength="60" value={values.lastName ?? ''} />
	</label>
	<label class="field">
		<span>Anzeigename</span>
		<input name="displayName" maxlength="40" value={values.displayName ?? ''} placeholder="wie Vorname" />
		<small>Wird dem Kind angezeigt.</small>
	</label>
	<label class="field">
		<span>Benutzername *</span>
		<input
			name="username"
			required
			autocapitalize="none"
			spellcheck="false"
			bind:value={username}
			oninput={() => (touched = true)}
			aria-invalid={field === 'username'}
		/>
		<small>Kleinbuchstaben und Ziffern, mind. 3 Zeichen.</small>
	</label>
</div>
<label class="field">
	<span>Notizen (nur für dich)</span>
	<textarea name="notes" maxlength="2000">{values.notes ?? ''}</textarea>
	<small>Bitte keine Diagnosen oder Gesundheitsdaten eintragen.</small>
</label>

<SettingsEditor
	layer={settings}
	title="Einstellungen für dieses Kind (z. B. Nachteilsausgleich)"
/>

{#if error}<p class="error" role="alert">{error}</p>{/if}
