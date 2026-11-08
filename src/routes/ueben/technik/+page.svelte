<script lang="ts">
	import DeviceCheck from '#lib/components/DeviceCheck.svelte';
	import IconButton from '#lib/components/IconButton.svelte';
</script>

<svelte:head><title>Gerätetest – Antonia</title></svelte:head>

<main class="page">
	<p><IconButton icon="home" label="Zur Übersicht" href="/ueben" /></p>
	<h1>Gerätetest</h1>
	<p>Tippe auf die Knöpfe. Hörst du den Ton und die Stimme?</p>
	<DeviceCheck />
</main>

<style>
	.page {
		max-width: 40rem;
		margin: 0 auto;
		padding: var(--space-4);
	}
</style>
