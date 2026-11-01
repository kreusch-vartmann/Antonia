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
		/** Target time set on this level (seconds), if any. */
		targetTime?: number;
		/** Target time inherited from the levels below (seconds). */
		inheritedTargetTime?: number;
	}

	let { selected = [...RUN_MODES], targetTime, inheritedTargetTime = 0 }: Props = $props();

	// svelte-ignore state_referenced_locally
	let timeChecked = $state(selected.includes('time'));
	// svelte-ignore state_referenced_locally
	let typed = $state<number | null | undefined>(targetTime);
	// an empty field inherits the value from the levels below
	const effective = $derived(typed == null ? inheritedTargetTime : typed);
</script>

<fieldset class="modes">
	<legend>Rennarten für das Kind</legend>
	<p class="muted small">Das Kind kann nur die angehakten Rennarten mit diesem Set fahren.</p>
	{#each RUN_MODES as m (m)}
		<label class="mode">
			<input
				type="checkbox"
				name="mode"
				value={m}
				checked={selected.includes(m)}
				onchange={m === 'time' ? (e) => (timeChecked = e.currentTarget.checked) : undefined}
			/>
			<span class="cup"><Trophy kind={TROPHY_FOR_MODE[m]} /></span>
			<span>
				<strong>{MODE_LABEL[m]}</strong>
				<small class="muted">{MODE_HELP[m]}</small>
			</span>
		</label>
	{/each}

	<label class="field target">
		<span>Zielzeit für „Gegen die Zeit“ (Sekunden)</span>
		<input
			type="number"
			name="s.targetTime"
			min="0"
			max="7200"
			bind:value={typed}
			placeholder="erben: {inheritedTargetTime === 0 ? 'keine' : `${inheritedTargetTime} s`}"
		/>
		<small class="muted">Der Zeitmonstertruck erreicht das Ziel genau nach dieser Zeit.</small>
	</label>
	{#if timeChecked && effective === 0}
		<p class="warn" role="status">
			Ohne Zielzeit sieht das Kind „Gegen die Zeit“ nicht. Bitte eine Zielzeit eintragen.
		</p>
	{/if}
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
	.target {
		margin-top: var(--space-3);
		max-width: 24rem;
	}
	.warn {
		margin: var(--space-2) 0 0;
		padding: var(--space-2) var(--space-3);
		background: #fff3d6;
		color: #7a4d00;
		border-radius: 0.5rem;
		font-weight: 600;
	}
</style>
