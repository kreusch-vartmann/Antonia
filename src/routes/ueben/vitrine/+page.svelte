<script lang="ts">
	import Trophy from '#lib/components/Trophy.svelte';
	import { clock } from '#lib/domain/modes.ts';
	import { dateTime, mistakes } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Vitrine – Antonia</title></svelte:head>

<main class="case">
	<p><a class="btn big" href="/ueben">← Zurück</a></p>
	<h1>Deine Vitrine</h1>

	{#if data.trophies.length === 0}
		<p class="empty">
			Hier ist noch Platz für Pokale. Fahre ein Rennen bis ins Ziel und hole dir deinen ersten!
		</p>
	{:else}
		<ul class="shelf">
			{#each data.trophies as t (t.id)}
				<li class="trophy">
					<a class="item" href="/ueben/vitrine/{t.id}" aria-describedby="tip-{t.id}">
						<div class="cup"><Trophy kind={t.kind} label /></div>
						<span class="set">{t.setName}</span>
						{#if t.mode === 'time' && t.durationMs !== null}
							<span class="time">Zeit: {clock(t.durationMs)}</span>
						{/if}
						<span role="tooltip" id="tip-{t.id}" class="tip">
							Erworben am {dateTime(t.earnedAt)} Uhr<br />{mistakes(t.mistakes)}
						</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</main>

<style>
	.case {
		max-width: 60rem;
		margin: 0 auto;
		padding: var(--space-4);
	}
	.empty {
		font-size: 1.3em;
		margin-top: var(--space-8);
		text-align: center;
	}
	.shelf {
		list-style: none;
		margin: 0;
		padding: var(--space-4);
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
		gap: var(--space-6) var(--space-4);
		background: linear-gradient(#fff, #f3ecdf);
		border: 6px solid #8b6a43;
		border-radius: 1rem;
	}
	.trophy {
		border-bottom: 6px solid #b89868;
	}
	.item {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1);
		text-align: center;
		padding: var(--space-2);
		border-radius: 0.8rem;
		color: inherit;
		text-decoration: none;
	}
	.item:hover,
	.item:focus-visible {
		background: #fff8e0;
	}
	.tip {
		visibility: hidden;
		position: absolute;
		bottom: calc(100% - 0.5rem);
		left: 50%;
		transform: translateX(-50%);
		z-index: 2;
		width: max-content;
		max-width: 14rem;
		padding: var(--space-2) var(--space-3);
		border-radius: 0.6rem;
		background: #2b2f36;
		color: #fff;
		font-size: 0.9rem;
		pointer-events: none;
	}
	.item:hover .tip,
	.item:focus-visible .tip {
		visibility: visible;
	}
	.cup {
		width: 6rem;
	}
	.set {
		font-weight: 700;
		overflow-wrap: anywhere;
	}
	.time {
		font-variant-numeric: tabular-nums;
		color: var(--color-muted);
	}
</style>
