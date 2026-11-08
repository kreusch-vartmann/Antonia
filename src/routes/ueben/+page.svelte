<script lang="ts">
	import RaceCar from '#lib/components/race/RaceCar.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import IconButton from '#lib/components/IconButton.svelte';
	import Trophy from '#lib/components/Trophy.svelte';
	import { MODE_HELP, MODE_LABEL, clock, clockPrecise, trophyFor } from '#lib/domain/modes.ts';
	import { date } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Üben – Antonia</title></svelte:head>

<main class="home">
	<header class="spread">
		<div class="hello">
			<RaceCar model={data.me.car.model} color={data.me.car.color} size={90} label="Dein Auto" />
			<h1>Hallo {data.me.displayName}!</h1>
		</div>
		<div class="row">
			<IconButton icon="trophy" label="Vitrine" href="/ueben/vitrine" />
			<IconButton icon="car" label="Garage" href="/ueben/garage" />
			<form method="POST" action="/logout">
				<IconButton icon="logout" label="Abmelden" type="submit" />
			</form>
		</div>
	</header>

	{#if data.races.length === 0}
		<p class="empty">
			Gerade gibt es keine Aufgaben für dich. Frag deine Lehrerin oder deinen Lehrer.
		</p>
	{:else}
		<h2>Deine Rennen</h2>
		<ul class="cards">
			{#each data.races as r (r.setId)}
				<li class="race-card">
					<span class="title">{r.setName}</span>
					{#if r.description}<span class="desc">{r.description}</span>{/if}
					<span class="meta">
						{r.items} Aufgaben
						{#if r.endsOn}· bis {date(r.endsOn)}{/if}
					</span>
					<div class="modes">
						{#each r.variants as v (v.assignmentId + v.mode)}
							{@const label = `${MODE_LABEL[v.mode]}${v.mode === 'time' ? ` · ${clock(v.targetTime * 1000)}` : ''}`}
							{@const kind = trophyFor(v.mode)}
							{#if v.mode === 'record' && !v.best}
								<div class="mode record locked">
									<span class="cup"><Icon name="stopwatch" size={34} /></span>
									<span class="mode-text">
										<strong>{label}</strong>
										<small
											>Fahre zuerst einmal „Fehlerfrei“, dann kannst du deine Bestzeit jagen.</small
										>
									</span>
								</div>
							{:else}
								<a
									class="mode {kind ?? 'record'}"
									data-sveltekit-preload-data="off"
									href="/ueben/rennen/{v.assignmentId}?mode={v.mode}"
									aria-label={v.mode === 'record' && v.best
										? `${r.setName} – ${label}, Bestzeit ${clockPrecise(v.best.durationMs)} vom ${date(v.best.at)}`
										: `${r.setName} – ${label}, ${v.stars} Sterne`}
								>
									{#if kind}
										<span class="cup"><Trophy {kind} /></span>
									{:else}
										<span class="cup"><Icon name="stopwatch" size={34} /></span>
									{/if}
									<span class="mode-text">
										<strong>{label}</strong>
										<small>
											{MODE_HELP[v.mode]}
											{#if v.endsOn}· bis {date(v.endsOn)}{/if}
										</small>
									</span>
									{#if v.mode === 'record' && v.best}
										<span class="best">
											<small>Bestzeit</small>
											<strong>{clockPrecise(v.best.durationMs)}</strong>
											<small>{date(v.best.at)}</small>
										</span>
									{:else}
										<span class="stars" aria-hidden="true">
											{#each [1, 2, 3] as n (n)}<span class:on={n <= v.stars}>★</span>{/each}
										</span>
									{/if}
								</a>
							{/if}
						{/each}
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</main>

<style>
	.home {
		max-width: 60rem;
		margin: 0 auto;
		padding: var(--space-4);
	}
	.hello {
		display: flex;
		align-items: center;
		gap: var(--space-4);
	}
	h1 {
		margin: 0;
	}
	.empty {
		font-size: 1.3em;
		margin-top: var(--space-8);
		text-align: center;
	}
	.cards {
		list-style: none;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr));
		gap: var(--space-4);
	}
	.race-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-6);
		background: #fff;
		border-radius: 1.2rem;
		border: 3px solid #d9e4d2;
		color: var(--color-text);
	}
	.modes {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin-top: auto;
	}
	.mode {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-2) var(--space-3);
		border: 3px solid var(--color-border);
		border-radius: 1rem;
		text-decoration: none;
		color: var(--color-text);
		min-height: 3.75rem;
	}
	.mode.bronze {
		border-color: #c27c43;
	}
	.mode.silver {
		border-color: #9aa4af;
	}
	.mode.gold {
		border-color: #e8b218;
	}
	.mode.record {
		border-color: #5b8fd9;
	}
	.mode.locked {
		opacity: 0.5;
		filter: grayscale(1);
		cursor: not-allowed;
		border-style: dashed;
	}
	.best {
		flex: none;
		margin-left: auto;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		line-height: 1.2;
		font-variant-numeric: tabular-nums;
	}
	.best strong {
		font-size: 1.4rem;
	}
	.best small {
		color: var(--color-muted);
		font-size: 0.8em;
	}
	.mode:hover:not(.locked),
	.mode:focus-visible:not(.locked) {
		background: #f4f8ff;
		border-color: var(--color-primary);
	}
	.cup {
		flex: none;
		width: 2.2rem;
		display: flex;
		justify-content: center;
	}
	.mode.record .cup {
		color: #5b8fd9;
	}
	.mode-text {
		display: flex;
		flex-direction: column;
	}
	.mode-text small {
		color: var(--color-muted);
		font-size: 0.8em;
	}
	.title {
		font-size: 1.4em;
		font-weight: 800;
	}
	.desc,
	.meta {
		color: var(--color-muted);
	}
	.stars {
		flex: none;
		margin-left: auto;
		font-size: 1.4rem;
		white-space: nowrap;
		color: #d8d8d8;
	}
	.stars .on {
		color: #f2b705;
	}
</style>
