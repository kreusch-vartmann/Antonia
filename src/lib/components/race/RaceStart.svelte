<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import RaceCar from './RaceCar.svelte';
	import Trophy from '../Trophy.svelte';
	import Icon from '../Icon.svelte';
	import IconButton from '../IconButton.svelte';
	import {
		CLOCK_OPPONENT,
		MODE_LABEL,
		clock,
		clockPrecise,
		trophyFor,
		type RunMode
	} from '#lib/domain/modes.ts';
	import { unlockMedia } from '#lib/client/media.ts';

	interface Props {
		setName: string;
		mode: RunMode;
		car: { model: string; color: string };
		best: { durationMs: number; at: string } | null;
		targetTime: number;
		resumable: { runId: string; done: number; total: number } | null;
		calm: boolean;
		/** Skip the "Los!" button and count down at once (after "Nochmal fahren"). */
		autostart?: boolean;
		busy?: boolean;
		error?: string | null;
		onstart: (fresh: boolean) => void;
	}

	let {
		setName,
		mode,
		car,
		best,
		targetTime,
		resumable,
		calm,
		autostart = false,
		busy = false,
		error = null,
		onstart
	}: Props = $props();

	const kind = $derived(trophyFor(mode));
	/** 3, 2, 1, 0 ("Los!"), null = no countdown running. */
	let count = $state<number | null>(null);
	let timer: ReturnType<typeof setTimeout> | undefined;
	let fresh = true;

	function go(isFresh: boolean) {
		fresh = isFresh;
		if (calm) {
			onstart(isFresh);
			return;
		}
		count = 3;
		timer = setTimeout(step, 1000);
	}

	function step() {
		count = (count ?? 1) - 1;
		if (count > 0) timer = setTimeout(step, 1000);
		else {
			timer = setTimeout(() => onstart(fresh), 450);
		}
	}

	/** Called from a tap: unlocks sound and speech before anything asynchronous happens. */
	function begin(isFresh: boolean) {
		unlockMedia();
		go(isFresh);
	}

	onMount(() => {
		if (autostart) go(true);
	});
	onDestroy(() => clearTimeout(timer));

	$effect(() => {
		if (error) {
			clearTimeout(timer);
			count = null;
		}
	});
</script>

<main class="start">
	<p class="set">{setName}</p>
	<div class="car">
		<RaceCar model={car.model} color={car.color} size={150} label="Dein Auto" />
	</div>
	<p class="mode">
		<span class="cup">
			{#if kind}<Trophy {kind} />{:else}<Icon name="stopwatch" size={40} />{/if}
		</span>
		<strong>{MODE_LABEL[mode]}{mode === 'time' ? ` · ${clock(targetTime * 1000)}` : ''}</strong>
	</p>
	{#if mode === 'record' && best}
		<p>Deine Bestzeit: <strong>{clockPrecise(best.durationMs)}</strong></p>
	{:else if mode === 'time'}
		<p>Der {CLOCK_OPPONENT} fährt in {clock(targetTime * 1000)} ins Ziel.</p>
	{/if}

	<div class="action" aria-live="polite">
		{#if count !== null}
			<p class="count" class:go={count === 0}>{count === 0 ? 'Los!' : count}</p>
		{:else if error}
			<p class="msg warn" role="alert">{error}</p>
			<IconButton
				icon="replay"
				label="Nochmal versuchen"
				primary
				large
				onclick={() => onstart(true)}
			/>
		{:else if busy}
			<p class="wait">Einen Moment …</p>
		{:else if resumable}
			<p>
				Du warst bei Aufgabe {Math.min(resumable.done + 1, resumable.total)} von {resumable.total}.
			</p>
			<div class="row buttons">
				<IconButton icon="play" label="Weiterfahren" primary large onclick={() => begin(false)} />
				<IconButton icon="restart" label="Neu starten" large onclick={() => begin(true)} />
			</div>
		{:else}
			<button class="go-btn" onclick={() => begin(true)}>Los!</button>
		{/if}
	</div>

	<p class="back"><IconButton icon="home" label="Zur Übersicht" href="/ueben" /></p>
</main>

<style>
	.start {
		max-width: 38rem;
		margin: 0 auto;
		padding: var(--space-6) var(--space-4);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-3);
		text-align: center;
	}
	.start p {
		margin: 0;
	}
	.set {
		font-size: 1.6em;
		font-weight: 800;
	}
	.mode {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: 1.3em;
	}
	.cup {
		width: 2.6rem;
		display: flex;
		justify-content: center;
		color: #5b8fd9;
	}
	.action {
		min-height: 11rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-3);
		margin: var(--space-3) 0;
	}
	.buttons {
		justify-content: center;
		gap: var(--space-4);
	}
	.go-btn {
		width: 10rem;
		height: 10rem;
		border-radius: 50%;
		border: 0.5rem solid #14804a;
		background: var(--color-success);
		color: #fff;
		font-size: 2.6rem;
		font-weight: 800;
		cursor: pointer;
		box-shadow: 0 6px 0 #14633a;
	}
	.go-btn:active {
		transform: translateY(4px);
		box-shadow: 0 2px 0 #14633a;
	}
	.count {
		font-size: 6rem;
		font-weight: 800;
		line-height: 1;
		color: var(--color-primary);
		animation: pulse 1s ease-out;
	}
	.count.go {
		color: var(--color-success);
		font-size: 4.5rem;
	}
	@keyframes pulse {
		from {
			transform: scale(1.6);
			opacity: 0.2;
		}
		to {
			transform: none;
			opacity: 1;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.count {
			animation: none;
		}
	}
	.wait {
		font-size: 1.3em;
		color: var(--color-muted);
	}
	.msg {
		font-size: 1.15em;
		font-weight: 700;
		padding: var(--space-2) var(--space-3);
		border-radius: 0.6rem;
	}
	.msg.warn {
		color: #7a4d00;
		background: #fff3d6;
	}
</style>
