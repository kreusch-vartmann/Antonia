<script lang="ts">
	import { onDestroy, onMount, untrack } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import RaceTrack, { type TrackCar } from './RaceTrack.svelte';
	import RaceCar from './RaceCar.svelte';
	import HintVisual from './HintVisual.svelte';
	import Icon from '../Icon.svelte';
	import Trophy from '../Trophy.svelte';
	import {
		CLOCK_OPPONENT,
		FAILED_TEXT,
		MODE_LABEL,
		TIME_LOST_TEXT,
		TROPHY_FOR_MODE,
		TROPHY_WON,
		clock
	} from '#lib/domain/modes.ts';
	import { speak, speechAvailable, stopSpeaking } from '#lib/client/speech.ts';
	import { sounds } from '#lib/client/sound.ts';
	import type { RunPayload } from '#lib/server/services/runs.ts';
	import type { Feedback } from '#lib/domain/run/engine.ts';

	interface Props {
		initial: RunPayload;
		assignmentId: string;
		setName: string;
		car: { model: string; color: string };
		name: string;
	}

	let { initial, assignmentId, setName, car, name }: Props = $props();

	// svelte-ignore state_referenced_locally
	let payload = $state<RunPayload>(initial);
	let input = $state('');
	let busy = $state(false);
	let message = $state<{ kind: 'good' | 'info' | 'warn'; text: string } | null>(null);
	let lastWrong = $state<string | null>(null);
	let confirmExit = $state(false);
	let netError = $state(false);

	const view = $derived(payload.view);
	const cur = $derived(view.current);
	const settings = $derived(payload.settings);
	const calm = $derived(settings.calm);
	const mode = $derived(view.mode);
	const lostToClock = $derived(mode === 'time' && view.status === 'timeUp');
	const trophyKind = $derived(view.status === 'finished' ? TROPHY_FOR_MODE[mode] : null);

	// Timing (client clock relative to server snapshot)
	let receivedAt = $state(performance.now());
	let now = $state(performance.now());
	let taskStart = performance.now();
	let sentTimeoutFor = '';
	let sentTick = false;
	let raf = 0;

	const runElapsed = $derived(view.elapsedMs + (view.status === 'running' ? now - receivedAt : 0));
	const taskElapsed = $derived(cur ? cur.shownElapsedMs + (now - receivedAt) : 0);
	const taskRemaining = $derived(
		cur && cur.taskTimeLimit > 0 ? cur.taskTimeLimit * 1000 - taskElapsed : null
	);
	const runRemaining = $derived(
		settings.runTimeLimit > 0 && view.status === 'running'
			? settings.runTimeLimit * 1000 - runElapsed
			: null
	);

	// svelte-ignore state_referenced_locally
	const progress = new Tween(initial.view.fraction, { duration: 900, easing: cubicOut });
	$effect(() => {
		const f = view.fraction;
		untrack(() => progress.set(f, { duration: calm ? 0 : 900 }));
	});

	const pacerFraction = $derived(
		settings.opponent === 'pacer'
			? Math.min(
					1,
					runElapsed / (settings.pacerSecondsPerTask * 1000 * Math.max(1, view.uniqueTasks))
				)
			: 0
	);

	// Race against the clock: this car reaches the finish exactly at the target time.
	const clockFraction = $derived(
		mode === 'time' ? Math.min(1, runElapsed / (settings.targetTime * 1000)) : 0
	);
	const timeLead = $derived(
		mode === 'time' && view.status === 'running'
			? view.fraction >= clockFraction
				? 'me'
				: 'clock'
			: null
	);

	function ghostAt(t: number): number {
		const tl = payload.ghost;
		if (!tl || tl.length === 0) return 0;
		if (t >= tl[tl.length - 1][0]) return tl[tl.length - 1][1];
		for (let i = 1; i < tl.length; i++) {
			if (tl[i][0] >= t) {
				// step function: ghost advances when a task was solved
				return tl[i - 1][1];
			}
		}
		return 0;
	}

	const cars = $derived.by(() => {
		const list: TrackCar[] = [];
		if (settings.opponent === 'ghost' && payload.ghost) {
			list.push({
				id: 'ghost',
				fraction: ghostAt(runElapsed),
				model: car.model,
				color: car.color,
				lane: -1,
				ghost: true
			});
		}
		if (settings.opponent === 'pacer') {
			list.push({ id: 'pacer', fraction: pacerFraction, model: 'racer', color: 'yellow', lane: 1 });
		}
		if (mode === 'time') {
			list.push({
				id: 'clock',
				fraction: clockFraction,
				model: 'monster',
				color: 'monster',
				scale: 1.2,
				lane: 1
			});
		}
		list.push({
			id: 'me',
			fraction: progress.current,
			model: car.model,
			color: car.color,
			lane: 0,
			broken: view.status === 'failed'
		});
		return list;
	});

	// New task → reset input, measure time, read aloud
	let lastKey = '';
	$effect(() => {
		const key = cur?.key ?? '';
		if (key && key !== lastKey) {
			lastKey = key;
			untrack(() => {
				input = '';
				lastWrong = null;
				taskStart = performance.now() - (cur?.shownElapsedMs ?? 0);
				if (settings.readAloud === 'auto' && cur) speak(cur.presentation.speech);
			});
		}
	});

	function loop() {
		now = performance.now();
		if (view.status === 'running') {
			if (
				cur &&
				taskRemaining !== null &&
				taskRemaining <= 0 &&
				sentTimeoutFor !== cur.key &&
				!busy
			) {
				sentTimeoutFor = cur.key;
				void send({ type: 'timeout', key: cur.key });
			}
			if (runRemaining !== null && runRemaining <= 0 && !sentTick && !busy) {
				sentTick = true;
				void send({ type: 'tick' });
			}
		}
		raf = requestAnimationFrame(loop);
	}

	onMount(() => {
		raf = requestAnimationFrame(loop);
		window.addEventListener('keydown', onKey);
	});
	onDestroy(() => {
		if (typeof window !== 'undefined') {
			cancelAnimationFrame(raf);
			window.removeEventListener('keydown', onKey);
			stopSpeaking();
		}
	});

	const PRAISE = ['Super!', 'Richtig!', 'Klasse!', 'Toll gemacht!', 'Prima!'];

	function feedbackMessage(fb: Feedback, given?: string) {
		if (fb.failed) {
			if (settings.sound) sounds.wrong();
			message = null;
		} else if (fb.outcome === 'correct') {
			if (settings.sound) sounds.correct();
			const text = fb.afterSolution
				? 'Gut gemacht!'
				: PRAISE[Math.floor(Math.random() * PRAISE.length)];
			message = { kind: 'good', text };
			if (settings.readAloud === 'auto') speak(text);
		} else if (fb.outcome === 'wrong') {
			if (settings.sound) sounds.wrong();
			lastWrong = given ?? null;
			let text = 'Noch nicht – probier es nochmal.';
			if (fb.lostGround) text = 'Noch nicht. Dein Auto rollt ein Stück zurück – du schaffst das!';
			const c = payload.view.current;
			if (c?.solution) text = `Die Lösung ist ${c.solution}. Gib sie ein.`;
			else if (c?.hint) text = `Boxenstopp! Hier ist ein Tipp.`;
			message = { kind: 'warn', text };
			if (settings.readAloud === 'auto')
				speak(c?.hint && !c.solution ? `${text} ${c.hint.text}` : text);
		} else if (fb.outcome === 'timeout') {
			const c = payload.view.current;
			const text = c?.solution
				? `Die Zeit ist um. Die Lösung ist ${c.solution}. Gib sie ein.`
				: 'Die Zeit ist um – diese Aufgabe kommt später nochmal.';
			message = { kind: 'info', text };
			if (settings.readAloud === 'auto') speak(text);
		}
	}

	let msgTimer: ReturnType<typeof setTimeout> | undefined;
	$effect(() => {
		if (message?.kind === 'good') {
			clearTimeout(msgTimer);
			msgTimer = setTimeout(() => (message = null), 1400);
		}
	});

	async function send(body: object, given?: string) {
		busy = true;
		netError = false;
		try {
			const res = await fetch(`/api/run/${payload.runId}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (res.status === 401 || res.status === 403) {
				location.href = '/login';
				return;
			}
			if (!res.ok) throw new Error(String(res.status));
			const data = (await res.json()) as RunPayload & { feedback: Feedback };
			const wasRunning = payload.view.status === 'running';
			payload = data;
			receivedAt = performance.now();
			now = receivedAt;
			sentTick = false;
			feedbackMessage(data.feedback, given);
			if (wasRunning && data.view.status !== 'running' && data.view.status !== 'aborted') {
				// engine failure already played its sound with the feedback
				const celebrate = data.view.status === 'finished' || !lostToClock;
				if (settings.sound && data.view.status !== 'failed' && celebrate) sounds.finish();
				if (settings.readAloud === 'auto') speak(endText());
			}
		} catch {
			netError = true;
		} finally {
			busy = false;
		}
	}

	function submit(value = input) {
		if (!cur || busy || value === '') return;
		if (settings.sound) sounds.unlock();
		const ms = Math.round(performance.now() - taskStart);
		void send({ type: 'answer', key: cur.key, value, ms }, value);
		input = '';
	}

	function press(d: string) {
		if (busy || !cur) return;
		if (settings.sound) {
			sounds.unlock();
			sounds.tap();
		}
		if (input.length < 6) input = (input === '0' ? '' : input) + d;
	}

	function backspace() {
		input = input.slice(0, -1);
	}

	function onKey(e: KeyboardEvent) {
		if (!cur || cur.answerFormat !== 'keypad' || confirmExit) return;
		if (/^\d$/.test(e.key)) press(e.key);
		else if (e.key === 'Backspace') backspace();
		else if (e.key === 'Enter') submit();
	}

	async function again() {
		busy = true;
		try {
			const res = await fetch('/api/run/start', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ assignmentId, mode })
			});
			if (!res.ok) throw new Error();
			payload = await res.json();
			receivedAt = performance.now();
			progress.set(0, { duration: 0 });
			message = null;
		} catch {
			netError = true;
		} finally {
			busy = false;
		}
	}

	async function quit() {
		await send({ type: 'abort' });
		location.href = '/ueben';
	}

	function endText() {
		const r = payload.view.result;
		if (!r) return '';
		if (payload.view.status === 'failed') return `Motorschaden! ${FAILED_TEXT}`;
		if (lostToClock) return TIME_LOST_TEXT;
		if (payload.view.status === 'timeUp')
			return `Die Zeit ist um! Du hast ${r.done} Aufgaben geschafft.`;
		const prize = trophyKind ? ` Du hast einen ${TROPHY_WON[trophyKind]} gewonnen!` : '';
		return `Geschafft! Du bist im Ziel.${prize} ${r.firstTry} von ${r.tasks} Aufgaben waren sofort richtig.`;
	}

	const ghostDuration = $derived(payload.ghost?.at(-1)?.[0] ?? null);
	const keypad = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
</script>

<div class="game" class:calm>
	<header class="bar">
		<span class="set">{setName}</span>
		{#if mode !== 'normal'}
			<span class="mode-chip">{MODE_LABEL[mode]}</span>
		{/if}
		<span class="sr-progress" aria-live="polite">
			{#if view.status === 'running'}Aufgabe {Math.min(view.done + 1, view.total)} von {view.total}{/if}
		</span>
		{#if runRemaining !== null && settings.showTimer}
			<span class="clock" aria-label="Restzeit"
				><Icon name="clock" /> {Math.max(0, Math.ceil(runRemaining / 1000))} s</span
			>
		{/if}
		{#if view.status === 'running'}
			<button class="btn small" onclick={() => (confirmExit = true)}>Pause</button>
		{/if}
	</header>

	<div class="layout">
		<div class="track-wrap">
			<RaceTrack {cars} {calm} />
			{#if trophyKind}
				<div class="trophy-pop" aria-hidden="true">
					<div class="trophy-glow"><Trophy kind={trophyKind} /></div>
				</div>
			{/if}
			{#if timeLead}
				<p class="lead" class:me={timeLead === 'me'}>
					{timeLead === 'me' ? 'Du liegst vorn!' : `Der ${CLOCK_OPPONENT} liegt vorn – gib Gas!`}
				</p>
			{/if}
			<div class="legend">
				<span class="me"><RaceCar model={car.model} color={car.color} size={34} /> {name}</span>
				{#if settings.opponent === 'ghost' && payload.ghost}
					<span><RaceCar model={car.model} color={car.color} size={34} ghost /> deine Bestzeit</span
					>
				{/if}
				{#if settings.opponent === 'pacer'}
					<span><RaceCar model="racer" color="yellow" size={34} /> Computer</span>
				{/if}
				{#if mode === 'time'}
					<span
						><RaceCar model="monster" color="monster" size={34} />
						{CLOCK_OPPONENT} (Ziel: {clock(settings.targetTime * 1000)})</span
					>
				{/if}
			</div>
		</div>

		<section class="panel">
			{#if confirmExit}
				<div class="center stack">
					<p class="big-text">Möchtest du aufhören?</p>
					<div class="row center-row">
						<button class="btn btn-primary big" onclick={() => (confirmExit = false)}
							>Weiterfahren</button
						>
						<button class="btn big" onclick={quit}>Aufhören</button>
					</div>
				</div>
			{:else if view.status !== 'running'}
				<div class="center stack finish" aria-live="polite">
					{#if view.status === 'aborted'}
						<p class="big-text">Pause gemacht.</p>
					{:else if view.status === 'failed'}
						<p class="big-text">Motorschaden!</p>
						<p>{FAILED_TEXT}</p>
					{:else if lostToClock}
						<p class="lost-text">{TIME_LOST_TEXT}</p>
					{:else}
						{#if trophyKind}
							<div class="won">
								<Trophy kind={trophyKind} size={64} />
							</div>
						{:else}
							<div class="flag"><Icon name="flag" size={72} /></div>
						{/if}
						<p class="big-text">
							{#if view.status === 'timeUp'}
								Die Zeit ist um!
							{:else}
								Geschafft!
							{/if}
						</p>
						{#if trophyKind}
							<p class="won-text">
								Du hast einen <strong>{TROPHY_WON[trophyKind]}</strong> gewonnen!
								<a href="/ueben/vitrine">Zur Vitrine</a>
							</p>
						{/if}
						{#if mode === 'time' && view.result}
							<p>
								Deine Zeit: <strong>{clock(view.result.durationMs)}</strong>
								(Ziel: {clock(settings.targetTime * 1000)})
							</p>
						{/if}
						{#if view.result}
							<div class="stars" aria-label="{view.result.stars} von 3 Sternen">
								{#each [1, 2, 3] as n (n)}
									<span class:on={n <= view.result.stars}>★</span>
								{/each}
							</div>
							<p>
								Du hast <strong>{view.result.done}</strong> Aufgaben gerechnet. {view.result
									.firstTry} davon waren sofort richtig.
							</p>
							{#if settings.opponent === 'ghost'}
								{#if ghostDuration === null}
									<p>Das war deine erste Fahrt – beim nächsten Mal fährt dein Geister-Auto mit!</p>
								{:else if view.status === 'finished' && view.result.durationMs < ghostDuration}
									<p><strong>Neue Bestzeit!</strong> Du warst schneller als dein Geister-Auto.</p>
								{:else}
									<p>Dein Geister-Auto war diesmal schneller. Beim nächsten Mal holst du es ein!</p>
								{/if}
							{/if}
						{/if}
					{/if}
					{#if view.status !== 'aborted' && settings.readAloud !== 'off' && speechAvailable()}
						<button class="btn small" onclick={() => speak(endText())}
							><Icon name="speaker" /> Vorlesen</button
						>
					{/if}
					<div class="row center-row">
						<button class="btn btn-primary big" onclick={again} disabled={busy}
							>{view.status === 'failed' || lostToClock ? 'Neu starten' : 'Nochmal fahren'}</button
						>
						<a class="btn big" href="/ueben">Zur Übersicht</a>
					</div>
				</div>
			{:else if cur}
				<div class="task">
					{#if cur.presentation.question}
						<p class="question">{cur.presentation.question}</p>
					{/if}
					<p class="expr" aria-live="polite">
						{#each cur.presentation.parts as part, i (i)}
							{#if part.kind === 'text'}
								<span>{part.value}</span>
							{:else}
								<span class="gap" class:filled={input !== ''} aria-label="Antwort"
									>{input || '?'}</span
								>
							{/if}
						{/each}
					</p>
					{#if settings.readAloud !== 'off' && speechAvailable()}
						<button
							class="btn small speak"
							onclick={() => speak(cur.presentation.speech)}
							aria-label="Aufgabe vorlesen"><Icon name="speaker" /> Vorlesen</button
						>
					{/if}
				</div>

				{#if taskRemaining !== null && settings.showTimer}
					{@const ratio = Math.max(0, taskRemaining / (cur.taskTimeLimit * 1000))}
					<div
						class="fuel"
						role="progressbar"
						aria-label="Zeit für diese Aufgabe"
						aria-valuenow={Math.round(ratio * 100)}
						aria-valuemin="0"
						aria-valuemax="100"
					>
						<Icon name="fuel" />
						<div class="fuel-bar"><div style="width: {ratio * 100}%"></div></div>
					</div>
				{/if}

				<div class="feedback" aria-live="assertive">
					{#if netError}
						<p class="msg warn">Keine Verbindung. Bitte nochmal versuchen.</p>
					{:else if message}
						<p class="msg {message.kind}">{message.text}</p>
					{/if}
					{#if lastWrong && !cur.solution && cur.answerFormat === 'keypad'}
						<p class="muted small">Deine Antwort war: {lastWrong}</p>
					{/if}
				</div>

				{#if cur.hint && !cur.solution}
					<div class="hint">
						<p><strong>Tipp:</strong> {cur.hint.text}</p>
						{#if cur.hint.visual}<HintVisual visual={cur.hint.visual} />{/if}
						{#if settings.readAloud !== 'off' && speechAvailable()}
							<button class="btn small" onclick={() => speak(cur.hint?.text ?? '')}
								><Icon name="speaker" /> Tipp vorlesen</button
							>
						{/if}
					</div>
				{/if}
				{#if cur.solution}
					<div class="hint solution">
						<p>
							Die Lösung ist <strong class="sol">{cur.solution}</strong>. {cur.answerFormat ===
							'keypad'
								? 'Tippe sie ein.'
								: 'Tippe sie an.'}
						</p>
						{#if cur.hint?.visual}<HintVisual visual={cur.hint.visual} />{/if}
					</div>
				{/if}

				{#if cur.answerFormat === 'choice' && cur.presentation.choices}
					<div class="choices">
						{#each cur.presentation.choices as c (c)}
							{@const disabled =
								cur.disabledChoices.includes(c) || (!!cur.solution && String(c) !== cur.solution)}
							<button
								class="choice"
								class:highlight={cur.solution === String(c)}
								disabled={busy || disabled}
								onclick={() => submit(String(c))}>{c}</button
							>
						{/each}
					</div>
				{:else}
					<div class="keypad" role="group" aria-label="Zahlenfeld">
						{#each keypad as d (d)}
							<button class="key" onclick={() => press(d)} disabled={busy}>{d}</button>
						{/each}
						<button
							class="key del"
							onclick={backspace}
							disabled={busy || input === ''}
							aria-label="Löschen">⌫</button
						>
						<button class="key" onclick={() => press('0')} disabled={busy}>0</button>
						<button
							class="key ok"
							onclick={() => submit()}
							disabled={busy || input === ''}
							aria-label="Fertig">✓</button
						>
					</div>
				{/if}
			{/if}
		</section>
	</div>
</div>

<style>
	.game {
		max-width: 75rem;
		margin: 0 auto;
		padding: var(--space-2) var(--space-3) var(--space-6);
		user-select: none;
		-webkit-user-select: none;
	}
	.bar {
		display: flex;
		gap: var(--space-3);
		align-items: center;
		justify-content: space-between;
		padding: var(--space-2) 0;
	}
	.set {
		font-weight: 700;
	}
	.mode-chip {
		background: #fff3d6;
		color: #7a4d00;
		font-weight: 700;
		font-size: 0.9rem;
		padding: 0.1rem 0.7rem;
		border-radius: 999px;
	}
	.sr-progress {
		color: var(--color-muted);
		font-size: 1rem;
	}
	.clock {
		font-variant-numeric: tabular-nums;
	}
	.layout {
		display: grid;
		gap: var(--space-4);
	}
	@media (min-width: 900px) and (orientation: landscape) {
		.layout {
			grid-template-columns: 1.1fr 1fr;
			align-items: start;
		}
		:global(.track) {
			max-height: 70dvh !important;
		}
	}
	.track-wrap {
		position: relative;
		background: #fff;
		border-radius: var(--radius);
		padding: var(--space-2);
	}
	.lead {
		margin: 0;
		text-align: center;
		font-weight: 700;
		color: #23446e;
	}
	.lead.me {
		color: #1d6b3d;
	}
	.trophy-pop {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
		animation: pop 0.9s cubic-bezier(0.2, 1.4, 0.4, 1) 1s both;
	}
	.trophy-glow {
		width: clamp(3.5rem, 16%, 7rem);
		padding: 0.6rem;
		border-radius: 50%;
		background: radial-gradient(circle, #fffbe6 0%, #fffbe6cc 55%, #fffbe600 100%);
		filter: drop-shadow(0 4px 8px #0004);
	}
	@keyframes pop {
		from {
			opacity: 0;
			transform: scale(0.2) translateY(2rem) rotate(-12deg);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}
	.calm .trophy-pop {
		animation: none;
	}
	@media (prefers-reduced-motion: reduce) {
		.trophy-pop {
			animation: none;
		}
	}
	.won {
		display: flex;
		justify-content: center;
	}
	.lost-text {
		margin: 0;
		font-size: 1.5em;
		font-weight: 700;
		line-height: 1.4;
		max-width: 28rem;
	}
	.won-text {
		margin: 0;
	}
	.legend {
		display: flex;
		gap: var(--space-4);
		flex-wrap: wrap;
		font-size: 0.95rem;
		padding: var(--space-1) var(--space-2);
	}
	.legend span {
		display: inline-flex;
		gap: var(--space-2);
		align-items: center;
	}
	.panel {
		background: #fff;
		border-radius: var(--radius);
		padding: var(--space-4);
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		min-height: 20rem;
	}
	.task {
		text-align: center;
	}
	.question {
		font-size: 1.3em;
		margin: 0 0 var(--space-2);
	}
	.expr {
		font-size: clamp(2.2rem, 7vw, 3.6rem);
		font-weight: 700;
		margin: var(--space-2) 0;
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 0.4em;
		flex-wrap: wrap;
		font-variant-numeric: tabular-nums;
	}
	.gap {
		min-width: 2.2em;
		padding: 0 0.3em;
		border-bottom: 5px solid var(--color-primary);
		color: #9aa3ad;
	}
	.gap.filled {
		color: var(--color-text);
	}
	.speak {
		margin: 0 auto;
	}
	.fuel {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}
	.fuel-bar {
		flex: 1;
		height: 0.9rem;
		background: #eee;
		border-radius: 999px;
		overflow: hidden;
	}
	.fuel-bar > div {
		height: 100%;
		background: #6aa84f;
	}
	.feedback {
		min-height: 2.5rem;
		text-align: center;
	}
	.msg {
		margin: 0;
		font-size: 1.15em;
		font-weight: 700;
		padding: var(--space-2);
		border-radius: 0.6rem;
	}
	.msg.good {
		color: #1d6b3d;
		background: #e5f4ea;
	}
	.msg.warn {
		color: #7a4d00;
		background: #fff3d6;
	}
	.msg.info {
		color: #23446e;
		background: #e6eef9;
	}
	@media (max-height: 900px) {
		.key {
			min-height: 3.4rem !important;
			font-size: 1.6rem !important;
		}
		.expr {
			font-size: clamp(2rem, 5vw, 2.8rem) !important;
			margin: 0 !important;
		}
		.panel {
			gap: var(--space-2) !important;
			padding: var(--space-3) !important;
		}
	}
	.hint {
		background: #fff8e6;
		border: 2px dashed #e0b84c;
		border-radius: var(--radius);
		padding: var(--space-2) var(--space-3);
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-4);
		align-items: center;
		justify-content: center;
		text-align: center;
	}
	.hint p {
		margin: 0;
	}
	.solution .sol {
		font-size: 1.6em;
	}
	.keypad {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-2);
		max-width: 24rem;
		width: 100%;
		margin: 0 auto;
	}
	.key {
		min-height: 4.2rem;
		font-size: 1.9rem;
		font-weight: 700;
		border-radius: 0.9rem;
		border: 2px solid #cfd6de;
		background: #f7f9fb;
		color: var(--color-text);
		cursor: pointer;
	}
	.key:active:not(:disabled) {
		background: #e2e9f1;
	}
	.key.ok {
		background: var(--color-success);
		border-color: var(--color-success);
		color: #fff;
	}
	.key.del {
		background: #f1eee8;
	}
	.key:disabled {
		opacity: 0.45;
	}
	.choices {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(6rem, 1fr));
		gap: var(--space-3);
	}
	.choice {
		min-height: 5rem;
		font-size: 2.2rem;
		font-weight: 700;
		border-radius: 1rem;
		border: 3px solid #cfd6de;
		background: #f7f9fb;
		cursor: pointer;
	}
	.choice:disabled {
		opacity: 0.3;
	}
	.choice.highlight {
		border-color: var(--color-success);
		background: #e5f4ea;
		opacity: 1;
	}
	.center {
		text-align: center;
		align-items: center;
		margin: auto;
	}
	.center-row {
		justify-content: center;
	}
	.big-text {
		font-size: 1.8em;
		font-weight: 800;
		margin: 0;
	}
	.flag {
		color: #222;
	}
	.stars {
		font-size: 3.5rem;
		color: #d8d8d8;
		letter-spacing: 0.1em;
	}
	.stars .on {
		color: #f2b705;
	}
	.calm .stars .on {
		color: #b8962e;
	}
</style>
