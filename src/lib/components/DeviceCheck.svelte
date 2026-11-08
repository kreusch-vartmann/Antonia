<script lang="ts">
	import { onMount } from 'svelte';
	import { audioState, sounds } from '#lib/client/sound.ts';
	import { speak, speechInfo, speechSilent } from '#lib/client/speech.ts';
	import { unlockMedia } from '#lib/client/media.ts';

	let info = $state({
		speech: false,
		voices: 0,
		voice: '',
		audioSession: false,
		audio: '',
		screen: '',
		agent: ''
	});

	function refresh() {
		const s = speechInfo();
		info = {
			speech: s.available,
			voices: s.voices,
			voice: s.voice,
			audioSession: 'audioSession' in navigator,
			audio: audioState(),
			screen: `${innerWidth} × ${innerHeight} (Faktor ${devicePixelRatio})`,
			agent: navigator.userAgent
		};
	}

	onMount(() => {
		refresh();
		const t = setInterval(refresh, 1000);
		return () => clearInterval(t);
	});

	function testSound() {
		unlockMedia();
		sounds.correct();
		refresh();
	}

	function testSpeech() {
		unlockMedia();
		speak('Hallo! So klingt Antonia.');
	}

	const yesNo = (b: boolean) => (b ? 'ja' : 'nein');
</script>

<div class="stack">
	<div class="row">
		<button class="btn big" onclick={testSound}>Ton testen</button>
		<button class="btn big" onclick={testSpeech} disabled={!info.speech}>Vorlesen testen</button>
	</div>
	{#if $speechSilent}
		<p class="notice">
			Vorlesen blieb stumm. Ist der Ton am Gerät angeschaltet und nicht auf lautlos gestellt?
		</p>
	{/if}
	<dl class="facts">
		<dt>Sprachausgabe vorhanden</dt>
		<dd>{yesNo(info.speech)}</dd>
		<dt>Stimmen gefunden</dt>
		<dd>{info.voices}{info.voice ? ` (gewählt: ${info.voice})` : ''}</dd>
		<dt>Ton auch bei „lautlos“</dt>
		<dd>{info.audioSession ? 'ja (audioSession)' : 'nein'}</dd>
		<dt>Audiosystem</dt>
		<dd>{info.audio}</dd>
		<dt>Bildschirm</dt>
		<dd>{info.screen}</dd>
		<dt>Browser</dt>
		<dd class="agent">{info.agent}</dd>
	</dl>
</div>

<style>
	.facts {
		display: grid;
		grid-template-columns: max-content 1fr;
		gap: var(--space-2) var(--space-4);
		margin: 0;
	}
	dt {
		font-weight: 600;
	}
	dd {
		margin: 0;
	}
	.agent {
		color: var(--color-muted);
		font-size: 0.8rem;
		word-break: break-word;
	}
</style>
