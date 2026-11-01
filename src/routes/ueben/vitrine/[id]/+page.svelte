<script lang="ts">
	import HintVisual from '#lib/components/race/HintVisual.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import Trophy from '#lib/components/Trophy.svelte';
	import { speak, speechAvailable } from '#lib/client/speech.ts';
	import { TROPHY_LABEL, clock } from '#lib/domain/modes.ts';
	import { dateTime, mistakes } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const t = $derived(data.trophy);
</script>

<svelte:head><title>{TROPHY_LABEL[t.kind]} – Antonia</title></svelte:head>

<main class="detail">
	<p><a class="btn big" href="/ueben/vitrine">← Zur Vitrine</a></p>

	<header class="head">
		<div class="cup"><Trophy kind={t.kind} label /></div>
		<div>
			<h1>{t.setName}</h1>
			<p>{TROPHY_LABEL[t.kind]} · erworben am {dateTime(t.earnedAt)} Uhr</p>
			<p>
				<strong>{mistakes(t.mistakes)}</strong>
				{#if t.mode === 'time' && t.durationMs !== null}
					· Zeit: <strong>{clock(t.durationMs)}</strong>
					{#if t.targetMs !== null}(Ziel: {clock(t.targetMs)}){/if}
				{/if}
			</p>
		</div>
	</header>

	{#if data.tasks.length === 0}
		<p class="empty">Die Einzelheiten zu diesem Rennen sind nicht mehr gespeichert.</p>
	{:else}
		<h2>Deine Aufgaben</h2>
		<ol class="tasks">
			{#each data.tasks as task, i (i)}
				<li class="task" class:wrong={task.wrong.length > 0}>
					{#if task.question}<p class="question">{task.question}</p>{/if}
					<p class="line">
						<span class="mark" aria-hidden="true">{task.wrong.length === 0 ? '✓' : '!'}</span>
						<span class="expr">{task.text}</span>
						<span class="visually-hidden">
							{task.wrong.length === 0 ? 'gleich richtig' : 'mit Fehlern'}
						</span>
					</p>
					{#if task.wrong.length > 0}
						<p class="given">
							Deine falschen Antworten: <strong>{task.wrong.join(', ')}</strong>
						</p>
						{#if task.hint}
							<div class="hint">
								<p><strong>Tipp:</strong> {task.hint.text}</p>
								{#if task.hint.visual}<HintVisual visual={task.hint.visual} />{/if}
								{#if speechAvailable()}
									<button class="btn small" onclick={() => speak(task.hint?.text ?? '')}
										><Icon name="speaker" /> Tipp vorlesen</button
									>
								{/if}
							</div>
						{/if}
					{/if}
				</li>
			{/each}
		</ol>
	{/if}
</main>

<style>
	.detail {
		max-width: 50rem;
		margin: 0 auto;
		padding: var(--space-4);
	}
	.head {
		display: flex;
		align-items: center;
		gap: var(--space-6);
		background: #fff;
		border-radius: 1.2rem;
		padding: var(--space-4) var(--space-6);
	}
	.head h1,
	.head p {
		margin: 0 0 var(--space-1);
	}
	.cup {
		width: 6rem;
		flex: none;
	}
	.empty {
		margin-top: var(--space-6);
		font-size: 1.2em;
	}
	.tasks {
		list-style: none;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}
	.task {
		background: #fff;
		border: 3px solid #d9e4d2;
		border-radius: 1rem;
		padding: var(--space-3) var(--space-4);
	}
	.task.wrong {
		border-color: #e0b84c;
	}
	.question,
	.given {
		margin: 0 0 var(--space-1);
	}
	.line {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		margin: 0;
		font-size: 1.5em;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.mark {
		width: 1.6em;
		height: 1.6em;
		border-radius: 50%;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: #e5f4ea;
		color: #1d6b3d;
		font-size: 0.8em;
	}
	.wrong .mark {
		background: #fff3d6;
		color: #7a4d00;
	}
	.hint {
		background: #fff8e6;
		border: 2px dashed #e0b84c;
		border-radius: var(--radius);
		padding: var(--space-2) var(--space-3);
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-4);
		align-items: center;
	}
	.hint p {
		margin: 0;
	}
</style>
