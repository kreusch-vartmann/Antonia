<script lang="ts">
	import RaceCar from '#lib/components/race/RaceCar.svelte';
	import Trophy from '#lib/components/Trophy.svelte';
	import { MODE_HELP, MODE_LABEL, RUN_MODES, TROPHY_FOR_MODE, clock } from '#lib/domain/modes.ts';
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

	{#if data.assignments.length === 0}
		<p class="empty">
			Gerade gibt es keine Aufgaben für dich. Frag deine Lehrerin oder deinen Lehrer.
		</p>
	{:else}
		<h2>Deine Rennen</h2>
		<ul class="cards">
			{#each data.assignments as a (a.id)}
				{@const modes = RUN_MODES.filter((m) => m !== 'time' || a.targetTime > 0)}
				<li class="race-card">
					<span class="title">{a.setName}</span>
					{#if a.description}<span class="desc">{a.description}</span>{/if}
					<span class="meta">
						{a.items} Aufgaben
						{#if a.endsOn}· bis {date(a.endsOn)}{/if}
					</span>
					<span class="stars" aria-label="Beste Fahrt: {a.bestStars ?? 0} Sterne">
						{#each [1, 2, 3] as n (n)}<span class:on={n <= (a.bestStars ?? 0)}>★</span>{/each}
					</span>
					<div class="modes">
						{#each modes as m (m)}
							<a
								class="mode {TROPHY_FOR_MODE[m]}"
								href="/ueben/rennen/{a.id}?mode={m}"
								aria-label="{a.setName} – {MODE_LABEL[m]}{m === 'time'
									? `, Ziel ${clock(a.targetTime * 1000)}`
									: ''}"
							>
								<span class="cup"><Trophy kind={TROPHY_FOR_MODE[m]} /></span>
								<span class="mode-text">
									<strong
										>{MODE_LABEL[m]}{m === 'time' ? ` · ${clock(a.targetTime * 1000)}` : ''}</strong
									>
									<small>{MODE_HELP[m]}</small>
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
		min-height: 12rem;
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
		font-size: 2rem;
		color: #d8d8d8;
	}
	.stars .on {
		color: #f2b705;
	}
</style>
