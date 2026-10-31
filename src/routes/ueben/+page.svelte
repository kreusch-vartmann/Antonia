<script lang="ts">
	import RaceCar from '#lib/components/race/RaceCar.svelte';
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
				<li>
					<a class="race-card" href="/ueben/rennen/{a.id}">
						<span class="title">{a.setName}</span>
						{#if a.description}<span class="desc">{a.description}</span>{/if}
						<span class="meta">
							{a.items} Aufgaben
							{#if a.endsOn}· bis {date(a.endsOn)}{/if}
						</span>
						<span class="stars" aria-label="Beste Fahrt: {a.bestStars ?? 0} Sterne">
							{#each [1, 2, 3] as n (n)}<span class:on={n <= (a.bestStars ?? 0)}>★</span>{/each}
						</span>
						<span class="go">{a.runs > 0 ? 'Nochmal fahren' : 'Los geht’s!'}</span>
					</a>
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
		grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
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
		text-decoration: none;
		color: var(--color-text);
		min-height: 12rem;
	}
	.race-card:hover,
	.race-card:focus-visible {
		border-color: var(--color-primary);
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
	.go {
		margin-top: auto;
		align-self: flex-start;
		background: var(--color-success);
		color: #fff;
		font-weight: 800;
		padding: var(--space-2) var(--space-6);
		border-radius: 999px;
	}
</style>
