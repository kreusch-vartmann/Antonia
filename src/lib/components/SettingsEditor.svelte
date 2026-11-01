<script lang="ts">
	import {
		DEFAULT_SETTINGS,
		LAYER_FROM,
		formatSettingValue,
		SETTING_META,
		keysForLevel,
		type LayerName,
		type SettingKey,
		type Settings,
		type SettingsLayer
	} from '#lib/domain/settings.ts';

	interface Props {
		/** Where the settings are edited; only settings that belong here are shown. */
		level: Exclude<LayerName, 'default'>;
		/** Values set on this level. */
		layer: SettingsLayer;
		/** Effective values without this level (what applies if nothing is set here). */
		inherited?: Settings;
		inheritedSources?: Record<SettingKey, LayerName>;
		/** Settings that are edited elsewhere in the same form. */
		exclude?: SettingKey[];
		prefix?: string;
		open?: boolean;
		title?: string;
	}

	let {
		level,
		layer,
		inherited = DEFAULT_SETTINGS,
		inheritedSources,
		exclude = [],
		prefix = 's.',
		open = false,
		title = 'Einstellungen'
	}: Props = $props();

	const keys = $derived(keysForLevel(level).filter((k) => !exclude.includes(k)));

	const groups = $derived.by(() => {
		const g: Record<string, SettingKey[]> = {};
		for (const k of keys) {
			const name = SETTING_META[k].group;
			(g[name] ??= []).push(k);
		}
		return Object.entries(g);
	});

	const setCount = $derived(keys.filter((k) => layer[k] !== undefined).length);

	/** Where an inherited value comes from, if not from the standard values. */
	function source(k: SettingKey) {
		const src = inheritedSources?.[k];
		return layer[k] === undefined && src && src !== 'default' ? LAYER_FROM[src] : null;
	}
</script>

<details class="settings" {open}>
	<summary>
		<strong>{title}</strong>
		<span class="muted small">
			{setCount === 0 ? 'alles wie Standard' : `${setCount} abweichend festgelegt`}
		</span>
	</summary>
	<p class="muted small">
		Hier stehen die Werte, die gelten. Gespeichert werden nur Abweichungen vom Standard.
	</p>
	<div class="groups">
		{#each groups as [group, ks] (group)}
			<fieldset>
				<legend>{group}</legend>
				{#each ks as k (k)}
					{@const meta = SETTING_META[k]}
					{@const current = layer[k] ?? inherited[k]}
					<label class="field">
						<span>{meta.label}</span>
						{#if meta.type === 'number'}
							<input
								type="number"
								name={prefix + k}
								min={meta.min}
								max={meta.max}
								value={current}
							/>
						{:else}
							<select name={prefix + k}>
								{#if meta.type === 'boolean'}
									<option value="true" selected={current === true}>Ja</option>
									<option value="false" selected={current === false}>Nein</option>
								{:else}
									{#each meta.options ?? [] as o (o.value)}
										<option value={o.value} selected={String(current) === o.value}>{o.label}</option
										>
									{/each}
									{#if !(meta.options ?? []).some((o) => o.value === String(current))}
										<!-- a stored value that is not among the usual choices -->
										<option value={String(current)} selected
											>{formatSettingValue(k, current)}</option
										>
									{/if}
								{/if}
							</select>
						{/if}
						<input type="hidden" name="{prefix}~{k}" value={String(inherited[k])} />
						{#if meta.help}<small>{meta.help}</small>{/if}
						{#if source(k)}<small class="source">Gilt so {source(k)}.</small>{/if}
					</label>
				{/each}
			</fieldset>
		{/each}
	</div>
</details>

<style>
	.settings {
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		background: var(--color-surface);
		padding: var(--space-3) var(--space-4);
	}
	summary {
		cursor: pointer;
		display: flex;
		gap: var(--space-3);
		align-items: baseline;
		min-height: 2.5rem;
		align-items: center;
	}
	.source {
		color: var(--color-muted);
		font-style: italic;
	}
	.groups {
		display: grid;
		gap: var(--space-4);
		grid-template-columns: repeat(auto-fit, minmax(21rem, 1fr));
		margin-top: var(--space-3);
	}
	fieldset {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}
</style>
