<script lang="ts">
	import RaceCar from '#lib/components/race/RaceCar.svelte';
	import Trophy from '#lib/components/Trophy.svelte';
	import { MODE_HELP, MODE_LABEL, TROPHY_FOR_MODE, clock } from '#lib/domain/modes.ts';
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
			<a class="btn big" href="/ueben/vitrine">Vitrine</a>
			<a class="btn big" href="/ueben/garage">Garage</a>
			<form method="POST" action="/logout"><button class="btn big">Abmelden</button></form>
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
							<a
								class="mode {TROPHY_FOR_MODE[v.mode]}"
								href="/ueben/rennen/{v.assignmentId}?mode={v.mode}"
								aria-label="{r.setName} – {label}, {v.stars} Sterne"
							>
								<span class="cup"><Trophy kind={TROPHY_FOR_MODE[v.mode]} /></span>
								<span class="mode-text">
									<strong>{label}</strong>
									<small>
										{MODE_HELP[v.mode]}
										{#if v.endsOn}· bis {date(v.endsOn)}{/if}
									</small>
								</span>
								<span class="stars" aria-hidden="true">
									{#each [1, 2, 3] as n (n)}<span class:on={n <= v.stars}>★</span>{/each}
								</span>
							</a>
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
	.mode:hover,
	.mode:focus-visible {
		background: #f4f8ff;
		border-color: var(--color-primary);
	}
	.cup {
		flex: none;
		width: 2.2rem;
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
