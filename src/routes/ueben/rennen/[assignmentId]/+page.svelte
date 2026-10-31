<script lang="ts">
	import RaceGame from '#lib/components/race/RaceGame.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>{data.setName} – Antonia</title></svelte:head>

{#key data.payload.runId}
	<RaceGame
		initial={data.payload}
		assignmentId={data.assignmentId}
		setName={data.setName}
		car={data.me.car}
		name={data.me.displayName}
	/>
{/key}
