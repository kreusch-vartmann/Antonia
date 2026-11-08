<script lang="ts">
	import Icon from './Icon.svelte';
	import Trophy from './Trophy.svelte';
	import {
		MODE_HELP,
		MODE_LABEL,
		RUN_MODES,
		clock,
		trophyFor,
		type RunMode
	} from '#lib/domain/modes.ts';

	interface Props {
		/** Modes that are checked. */
		selected?: RunMode[];
		/** Target time in seconds, if set. */
		targetTime?: number;
		/** Number of tasks in the set, for a suggestion of the target time. */
		taskCount?: number;
	}

	let { selected = ['normal', 'flawless'], targetTime, taskCount = 0 }: Props = $props();

	// svelte-ignore state_referenced_locally
	let timeChecked = $state(selected.includes('time'));
	// svelte-ignore state_referenced_locally
	let flawlessChecked = $state(selected.includes('flawless'));
	// svelte-ignore state_referenced_locally
	let recordChecked = $state(selected.includes('record') && selected.includes('flawless'));
	// svelte-ignore state_referenced_locally
	let minutes = $state<number | null>(Math.floor((targetTime ?? 0) / 60));
	// svelte-ignore state_referenced_locally
	let seconds = $state<number | null>((targetTime ?? 0) % 60);
	const total = $derived((minutes ?? 0) * 60 + (seconds ?? 0));

	const QUICK = [60, 90, 120, 180, 300];
	// about 12 seconds per task, rounded to 15 seconds
	const suggestion = $derived(
		taskCount > 0 ? Math.max(30, Math.round((taskCount * 12) / 15) * 15) : 0
	);

	function set(totalSeconds: number) {
		minutes = Math.floor(totalSeconds / 60);
		seconds = totalSeconds % 60;
	}
</script>

<fieldset class="modes">
	<legend>Rennarten</legend>
	<p class="muted small">
		Das Kind kann nur die angehakten Rennarten mit diesem Set fahren. Für jede Rennart bekommt es
		einen eigenen Pokal. „Bestzeit jagen“ gibt keinen Pokal: Dort fährt das Kind gegen seine eigene
		Bestzeit aus „Fehlerfrei“.
	</p>
	{#each RUN_MODES as m (m)}
		<label class="mode">
			<input
				type="checkbox"
				name="mode"
				value={m}
				checked={m === 'record' ? recordChecked && flawlessChecked : selected.includes(m)}
				disabled={m === 'record' && !flawlessChecked}
				onchange={(e) => {
					const on = e.currentTarget.checked;
					if (m === 'time') timeChecked = on;
					else if (m === 'flawless') flawlessChecked = on;
					else if (m === 'record') recordChecked = on;
				}}
			/>
			<span class="cup">
				{#if trophyFor(m)}<Trophy kind={trophyFor(m)!} />{:else}<Icon
						name="stopwatch"
						size={26}
					/>{/if}
			</span>
			<span>
				<strong>{MODE_LABEL[m]}</strong>
				<small class="muted">
					{MODE_HELP[m]}
					{#if m === 'record' && !flawlessChecked}Dafür muss „Fehlerfrei“ angehakt sein.{/if}
				</small>
			</span>
		</label>
		{#if m === 'time' && timeChecked}
			<div class="target" role="group" aria-label="Zielzeit">
				<span class="label">Zielzeit</span>
				<label class="unit">
					<input type="number" min="0" max="120" bind:value={minutes} aria-label="Minuten" />
					Min
				</label>
				<label class="unit">
					<input type="number" min="0" max="59" bind:value={seconds} aria-label="Sekunden" />
					Sek
				</label>
				<input type="hidden" name="s.targetTime" value={total} />
				<span class="quick">
					{#each QUICK as q (q)}
						<button type="button" class="btn small" onclick={() => set(q)}>{clock(q * 1000)}</button
						>
					{/each}
				</span>
				{#if suggestion > 0}
					<p class="muted small">
						Vorschlag für {taskCount} Aufgaben (ca. 12 s pro Aufgabe):
						<button type="button" class="link" onclick={() => set(suggestion)}
							>{clock(suggestion * 1000)} übernehmen</button
						>
					</p>
				{/if}
				{#if total === 0}
					<p class="warn" role="status">Bitte eine Zielzeit eintragen.</p>
				{/if}
			</div>
		{/if}
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
		display: flex;
		justify-content: center;
	}
	.target {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-3);
		margin: 0 0 var(--space-2) 3.2rem;
		padding: var(--space-2) var(--space-3);
		background: #fff8e6;
		border-radius: 0.6rem;
	}
	.label {
		font-weight: 700;
	}
	.unit {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
	}
	.unit input {
		width: 4.5rem;
	}
	.quick {
		display: inline-flex;
		gap: var(--space-1);
		flex-wrap: wrap;
	}
	.target p {
		flex-basis: 100%;
		margin: 0;
	}
	.link {
		background: none;
		border: none;
		padding: 0;
		color: var(--color-primary);
		text-decoration: underline;
		cursor: pointer;
		font: inherit;
	}
	.warn {
		padding: var(--space-2) var(--space-3);
		background: #fff3d6;
		color: #7a4d00;
		border-radius: 0.5rem;
		font-weight: 600;
	}
</style>
