<script lang="ts">
	import Trophy from './Trophy.svelte';
	import {
		MODE_HELP,
		MODE_LABEL,
		RUN_MODES,
		TROPHY_FOR_MODE,
		type RunMode
	} from '#lib/domain/modes.ts';

	interface Props {
		/** Modes that are checked. */
		selected?: RunMode[];
	}

	let { selected = [...RUN_MODES] }: Props = $props();
</script>

<fieldset class="modes">
	<legend>Rennarten für das Kind</legend>
	<p class="muted small">
		Das Kind kann nur die angehakten Rennarten mit diesem Set fahren. Das Zeitrennen erscheint
		außerdem nur, wenn unter „Rennen“ eine Zielzeit eingestellt ist.
	</p>
	{#each RUN_MODES as m (m)}
		<label class="mode">
			<input type="checkbox" name="mode" value={m} checked={selected.includes(m)} />
			<span class="cup"><Trophy kind={TROPHY_FOR_MODE[m]} /></span>
			<span>
				<strong>{MODE_LABEL[m]}</strong>
				<small class="muted">{MODE_HELP[m]}</small>
			</span>
		</label>
	{/each}
</fieldset>

<style>
	.mode {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-1) 0;
	}
	.mode span:last-child {
		display: flex;
		flex-direction: column;
	}
	.cup {
		width: 1.6rem;
		flex: none;
	}
</style>
