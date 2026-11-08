<script lang="ts">
	import RaceStart from '#lib/components/race/RaceStart.svelte';
	import RaceGame from '#lib/components/race/RaceGame.svelte';
	import { startRun } from '#lib/client/runApi.ts';
	import type { RunPayload } from '#lib/server/services/runs.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let payload = $state<RunPayload | null>(null);
	let busy = $state(false);
	let error = $state<string | null>(null);
	let autostart = $state(false);
	// svelte-ignore state_referenced_locally
	let resumable = $state(data.resumable);

	async function start(fresh: boolean) {
		busy = true;
		error = null;
		const r = await startRun(data.assignmentId, data.mode, fresh);
		busy = false;
		if (r.ok) {
			payload = r.data;
			return;
		}
		if (r.kind === 'auth') {
			location.href = '/login';
			return;
		}
		error =
			r.kind === 'offline'
				? 'Keine Verbindung zum Internet. Prüfe das WLAN und tippe nochmal.'
				: (r.message ?? 'Das Rennen konnte nicht starten.');
	}

	function restart() {
		payload = null;
		resumable = null;
		autostart = true;
	}
</script>

<svelte:head><title>{data.setName} – Antonia</title></svelte:head>

{#if payload}
	{#key payload.runId}
		<RaceGame
			initial={payload}
			setName={data.setName}
			car={data.me.car}
			name={data.me.displayName}
			onrestart={restart}
		/>
	{/key}
{:else}
	<RaceStart
		setName={data.setName}
		mode={data.mode}
		car={data.me.car}
		best={data.best}
		targetTime={data.targetTime}
		{resumable}
		calm={data.kidSettings.calm}
		{autostart}
		{busy}
		{error}
		onstart={start}
	/>
{/if}
