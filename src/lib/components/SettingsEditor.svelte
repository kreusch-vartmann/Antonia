<script lang="ts">
	import {
		DEFAULT_SETTINGS,
		LAYER_LABELS,
		SETTING_META,
		formatSettingValue,
		type LayerName,
		type SettingKey,
		type Settings,
		type SettingsLayer
	} from '#lib/domain/settings.ts';

	interface Props {
		/** Values set on this level. */
		layer: SettingsLayer;
		/** Effective values without this level (what would be inherited). */
		inherited?: Settings;
		inheritedSources?: Record<SettingKey, LayerName>;
		keys?: SettingKey[];
		prefix?: string;
		open?: boolean;
		title?: string;
	}

	let {
		layer,
		inherited = DEFAULT_SETTINGS,
		inheritedSources,
		keys = Object.keys(DEFAULT_SETTINGS) as SettingKey[],
		prefix = 's.',
		open = false,
		title = 'Einstellungen'
	}: Props = $props();

	const groups = $derived.by(() => {
		const g: Record<string, SettingKey[]> = {};
		for (const k of keys) {
			const name = SETTING_META[k].group;
			(g[name] ??= []).push(k);
		}
		return Object.entries(g);
	});

	const setCount = $derived(keys.filter((k) => layer[k] !== undefined).length);

	function inheritLabel(k: SettingKey) {
		const src = inheritedSources?.[k];
		const from = src ? ` – ${LAYER_LABELS[src]}` : '';
		return `erben: ${formatSettingValue(k, inherited[k])}${from}`;
	}
</script>

<details class="settings" {open}>
	<summary>
		<strong>{title}</strong>
		<span class="muted small">
			{setCount === 0 ? 'alles geerbt' : `${setCount} hier festgelegt`}
		</span>
	</summary>
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
								placeholder={inheritLabel(k)}
							/>
						{:else}
							<select name={prefix + k}>
								<option value="" selected={layer[k] === undefined}>{inheritLabel(k)}</option>
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
		grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
		margin-top: var(--space-3);
	}
	fieldset {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}
</style>
