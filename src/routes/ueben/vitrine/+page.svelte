<script lang="ts">
	import RaceCar from '#lib/components/race/RaceCar.svelte';
	import Trophy from '#lib/components/Trophy.svelte';
	import IconButton from '#lib/components/IconButton.svelte';
	import { clock, trophyCount, type TrophyKind } from '#lib/domain/modes.ts';
	import { scenarioLabel, scenarioOrder } from '#lib/domain/scenarios.ts';
	import { dateTime, mistakes } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const KINDS: TrophyKind[] = ['bronze', 'silver', 'gold'];

	const boards = $derived(
		scenarioOrder(data.trophies.map((t) => t.scenario)).map((id) => {
			const list = data.trophies.filter((t) => t.scenario === id);
			return {
				id,
				label: scenarioLabel(id),
				trophies: list,
				counts: KINDS.map((kind) => ({ kind, n: list.filter((t) => t.kind === kind).length }))
			};
		})
	);

	let bands = $state<Record<string, HTMLUListElement | undefined>>({});
	let overflow = $state<Record<string, boolean>>({});

	function measure() {
		for (const [id, el] of Object.entries(bands)) {
			if (el) overflow[id] = el.scrollWidth > el.clientWidth + 1;
		}
	}

	$effect(() => {
		void boards;
		measure();
		window.addEventListener('resize', measure);
		return () => window.removeEventListener('resize', measure);
	});

	function scroll(id: string, dir: -1 | 1) {
		const el = bands[id];
		if (!el) return;
		const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
		el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: calm ? 'auto' : 'smooth' });
	}
</script>

<svelte:head><title>Vitrine – Antonia</title></svelte:head>

<main class="case">
	<p><IconButton icon="home" label="Zur Übersicht" href="/ueben" /></p>
	<h1>Deine Vitrine</h1>

	{#if data.trophies.length === 0}
		<p class="empty">
			Hier ist noch Platz für Pokale. Fahre ein Rennen bis ins Ziel und hole dir deinen ersten!
		</p>
	{:else}
		{#each boards as b (b.id)}
			<section class="scenario" aria-labelledby="sc-{b.id}">
				<div class="board">
					<h2 id="sc-{b.id}">
						{#if b.id === 'race'}<RaceCar model="racer" color="blue" size={64} />{/if}
						{b.label}
					</h2>
					<ul class="counts">
						{#each b.counts as c (c.kind)}
							<li class:none={c.n === 0} aria-label={trophyCount(c.kind, c.n)}>
								<span class="mini"><Trophy kind={c.kind} /></span>
								<span class="n" aria-hidden="true">× {c.n}</span>
							</li>
						{/each}
					</ul>
				</div>

				<div class="shelf">
					{#if overflow[b.id]}
						<button
							type="button"
							class="arrow"
							aria-label="Weiter nach links"
							onclick={() => scroll(b.id, -1)}>◀</button
						>
					{/if}
					<ul class="band" bind:this={bands[b.id]} onscroll={measure}>
						{#each b.trophies as t (t.id)}
							<li class="trophy">
								<a class="item" href="/ueben/vitrine/{t.id}">
									<div class="cup"><Trophy kind={t.kind} label /></div>
									<span class="set">{t.setName}</span>
									{#if t.mode === 'time' && t.durationMs !== null}
										<span class="time">Zeit: {clock(t.durationMs)}</span>
									{/if}
									<span class="meta">{dateTime(t.earnedAt)} Uhr</span>
									<span class="meta">{mistakes(t.mistakes)}</span>
								</a>
							</li>
						{/each}
					</ul>
					{#if overflow[b.id]}
						<button
							type="button"
							class="arrow"
							aria-label="Weiter nach rechts"
							onclick={() => scroll(b.id, 1)}>▶</button
						>
					{/if}
				</div>
			</section>
		{/each}
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
	.scenario {
		margin-top: var(--space-6);
	}
	.board {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3) var(--space-6);
		padding: var(--space-3) var(--space-5);
		background: #2b2f36;
		color: #fff;
		border-radius: 1rem;
	}
	.board h2 {
		margin: 0;
		display: flex;
		align-items: center;
		gap: var(--space-3);
		color: #fff;
	}
	.counts {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		gap: var(--space-5);
	}
	.counts li {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}
	.counts li.none {
		opacity: 0.45;
	}
	.mini {
		width: 2.6rem;
		display: block;
	}
	.n {
		font-size: 1.8rem;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
	}
	.shelf {
		display: flex;
		align-items: stretch;
		gap: var(--space-2);
		margin-top: var(--space-3);
		padding: var(--space-3);
		background: linear-gradient(#fff, #f3ecdf);
		border: 6px solid #8b6a43;
		border-radius: 1rem;
	}
	.band {
		list-style: none;
		margin: 0;
		padding: 0 0 var(--space-2);
		flex: 1 1 auto;
		min-width: 0;
		display: flex;
		gap: var(--space-4);
		overflow-x: auto;
		overscroll-behavior-x: contain;
		scroll-snap-type: x mandatory;
		-webkit-overflow-scrolling: touch;
	}
	.arrow {
		flex: none;
		align-self: center;
		width: 3rem;
		height: 3rem;
		min-height: 3rem;
		border-radius: 50%;
		border: 3px solid #8b6a43;
		background: #fff;
		font-size: 1.2rem;
		cursor: pointer;
	}
	.trophy {
		flex: 0 0 9rem;
		scroll-snap-align: start;
		border-bottom: 6px solid #b89868;
	}
	.item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1);
		text-align: center;
		padding: var(--space-2);
		border-radius: 0.8rem;
		color: inherit;
		text-decoration: none;
		height: 100%;
	}
	.item:hover,
	.item:focus-visible {
		background: #fff8e0;
	}
	.cup {
		width: 6rem;
	}
	.set {
		font-weight: 700;
		overflow-wrap: anywhere;
	}
	.time,
	.meta {
		font-variant-numeric: tabular-nums;
		color: var(--color-muted);
		font-size: 0.85rem;
	}
</style>
