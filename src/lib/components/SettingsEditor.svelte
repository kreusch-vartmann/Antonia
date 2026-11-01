<script lang="ts">
	import {
		DEFAULT_SETTINGS,
		LAYER_FROM,
		SETTING_META,
		formatSettingValue,
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

	/** The value that applies when nothing is chosen here, and where it comes from. */
	function defaultLabel(k: SettingKey) {
		const src = inheritedSources?.[k] ?? 'default';
		const from = src === 'default' ? '' : ` (${LAYER_FROM[src]})`;
		return `Voreinstellung: ${formatSettingValue(k, inherited[k])}${from}`;
	}
</script>

<details class="settings" {open}>
	<summary>
		<strong>{title}</strong>
		<span class="muted small">
			{setCount === 0 ? 'alles wie voreingestellt' : `${setCount} abweichend festgelegt`}
		</span>
	</summary>
	<p class="muted small">
		Ohne eigene Angabe gilt die Voreinstellung. Mit „Voreinstellung“ bzw. einem leeren Feld wird
		eine eigene Angabe wieder zurückgenommen.
	</p>
	<div class="groups">
		{#each groups as [group, ks] (group)}
			<fieldset>
				<legend>{group}</legend>
				{#each ks as k (k)}
					{@const meta = SETTING_META[k]}
					<label class="field">
						<span>{meta.label}</span>
						{#if meta.type === 'number'}
							<input
								type="number"
								name={prefix + k}
								min={meta.min}
								max={meta.max}
								value={layer[k] ?? ''}
								placeholder={defaultLabel(k)}
							/>
						{:else}
							<select name={prefix + k}>
								<option value="" selected={layer[k] === undefined}>{defaultLabel(k)}</option>
								{#if meta.type === 'boolean'}
									<option value="true" selected={layer[k] === true}>ja</option>
									<option value="false" selected={layer[k] === false}>nein</option>
								{:else}
									{#each meta.options ?? [] as o (o.value)}
										<option value={o.value} selected={layer[k] === o.value}>{o.label}</option>
									{/each}
								{/if}
							</select>
						{/if}
						{#if meta.help}<small>{meta.help}</small>{/if}
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
