<script lang="ts">
	import { enhance } from '$app/forms';
	import RaceCar from '#lib/components/race/RaceCar.svelte';
	import IconButton from '#lib/components/IconButton.svelte';
	import { unlockMedia } from '#lib/client/media.ts';
	import { CAR_COLORS, CAR_MODELS } from '#lib/domain/cars.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	// svelte-ignore state_referenced_locally
	let model = $state(data.me.car.model);
	// svelte-ignore state_referenced_locally
	let color = $state(data.me.car.color);
</script>

<svelte:head><title>Garage – Antonia</title></svelte:head>

<main class="garage">
	<p class="row">
		<IconButton icon="home" label="Zur Übersicht" href="/ueben" />
		<IconButton icon="gear" label="Gerätetest" href="/ueben/technik" />
	</p>
	<h1>Deine Garage</h1>

	<div class="preview"><RaceCar {model} {color} size={260} label="Dein Auto" /></div>

	<form
		method="POST"
		use:enhance={() =>
			async ({ update }) =>
				update({ reset: false })}
		class="stack"
	>
		<fieldset>
			<legend>Welches Auto?</legend>
			<div class="opts">
				{#each CAR_MODELS as m (m.id)}
					<label class="opt" class:sel={model === m.id}>
						<input
							type="radio"
							name="model"
							value={m.id}
							bind:group={model}
							class="visually-hidden"
						/>
						<RaceCar model={m.id} {color} size={110} />
						<span>{m.label}</span>
					</label>
				{/each}
			</div>
		</fieldset>
		<fieldset>
			<legend>Welche Farbe?</legend>
			<div class="opts">
				{#each CAR_COLORS as c (c.id)}
					<label class="opt color" class:sel={color === c.id}>
						<input
							type="radio"
							name="color"
							value={c.id}
							bind:group={color}
							class="visually-hidden"
						/>
						<span class="swatch" style="background: {c.hex}"></span>
						<span>{c.label}</span>
					</label>
				{/each}
			</div>
		</fieldset>
		{#if form?.saved}<p class="success" role="status">Gespeichert! Dein Auto steht bereit.</p>{/if}
		<div><button class="btn btn-primary big" onclick={unlockMedia}>Speichern</button></div>
	</form>
</main>

<style>
	.garage {
		max-width: 50rem;
		margin: 0 auto;
		padding: var(--space-4);
	}
	.preview {
		display: flex;
		justify-content: center;
		padding: var(--space-6);
		background: #fff;
		border-radius: 1.2rem;
		margin-bottom: var(--space-4);
	}
	fieldset {
		background: #fff;
	}
	.opts {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
	}
	.opt {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-3);
		border: 3px solid var(--color-border);
		border-radius: 1rem;
		cursor: pointer;
		min-width: 7rem;
	}
	.opt.sel {
		border-color: var(--color-primary);
		background: #eef3fc;
	}
	.opt:focus-within {
		outline: 3px solid var(--color-focus);
	}
	.swatch {
		width: 3rem;
		height: 3rem;
		border-radius: 50%;
		border: 2px solid #0002;
	}
</style>
