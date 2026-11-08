<script lang="ts">
	import { onDestroy, onMount, untrack } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import RaceTrack, { type TrackCar } from './RaceTrack.svelte';
	import RaceCar from './RaceCar.svelte';
	import HintVisual from './HintVisual.svelte';
	import Icon from '../Icon.svelte';
	import IconButton from '../IconButton.svelte';
	import Trophy from '../Trophy.svelte';
	import Confetti from '../Confetti.svelte';
	import Stopwatch from '../Stopwatch.svelte';
	import {
		CLOCK_OPPONENT,
		FAILED_TEXT,
		MODE_LABEL,
		TIME_LOST_TEXT,
		TROPHY_WON,
		clock,
		clockPrecise,
		trophyFor
	} from '#lib/domain/modes.ts';
	import { speak, speechBroken, speechSilent, stopSpeaking } from '#lib/client/speech.ts';
	import { sounds } from '#lib/client/sound.ts';
	import { unlockMedia } from '#lib/client/media.ts';
	import { newActionId, sendAction } from '#lib/client/runApi.ts';
	import type { RunPayload } from '#lib/server/services/runs.ts';
	import type { Feedback } from '#lib/domain/run/engine.ts';

	interface Props {
		initial: RunPayload;
		setName: string;
		car: { model: string; color: string };
		name: string;
		/** Back to the start screen for a new run. */
		onrestart: () => void;
	}

	let { initial, setName, car, name, onrestart }: Props = $props();

	// svelte-ignore state_referenced_locally
	let payload = $state<RunPayload>(initial);
	let input = $state('');
	let busy = $state(false);
	let message = $state<{ kind: 'good' | 'info' | 'warn'; text: string } | null>(null);
	let lastWrong = $state<string | null>(null);
	let confirmExit = $state(false);
	let problem = $state<{ kind: 'offline' | 'expired' | 'server'; text: string } | null>(null);

	const view = $derived(payload.view);
	const cur = $derived(view.current);
	const hasSplit = $derived(!!cur?.presentation.parts.some((p) => p.kind === 'num' && p.split));
	const settings = $derived(payload.settings);
	const calm = $derived(settings.calm);
	const mode = $derived(view.mode);
	const lostToClock = $derived(mode === 'time' && view.status === 'timeUp');
	const trophyKind = $derived(view.status === 'finished' ? trophyFor(mode) : null);
	const best = $derived(payload.best);
	const newRecord = $derived(
		mode === 'record' &&
			view.status === 'finished' &&
			!!view.result &&
			!!best &&
			view.result.durationMs < best.durationMs
	);

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
	// Only the race against the clock limits the whole run.
	const runRemaining = $derived(
		mode === 'time' && view.status === 'running' ? settings.targetTime * 1000 - runElapsed : null
	);

	// svelte-ignore state_referenced_locally
	const progress = new Tween(initial.view.fraction, { duration: 900, easing: cubicOut });
	$effect(() => {
		const f = view.fraction;
		untrack(() => progress.set(f, { duration: calm ? 0 : 900 }));
	});

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
		if (mode === 'record' && payload.ghost) {
			list.push({
				id: 'ghost',
				fraction: ghostAt(runElapsed),
				model: car.model,
				color: car.color,
				lane: -1,
				ghost: true
			});
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

	// Layout flags (the CSS uses the same media queries).
	let wide = $state(false);
	let short = $state(false);
	let small = $state(false);
	let tiny = $state(false);
	const trackHeight = $derived(short ? 60 : wide ? 70 : tiny ? 22 : small ? 26 : 34);
	let stopMedia = () => {};

	onMount(() => {
		raf = requestAnimationFrame(loop);
		window.addEventListener('keydown', onKey);
		const mqWide = matchMedia('(orientation: landscape) and (min-width: 700px)');
		const mqShort = matchMedia('(orientation: landscape) and (max-height: 500px)');
		const mqSmall = matchMedia('(orientation: portrait) and (max-height: 700px)');
		const mqTiny = matchMedia('(orientation: portrait) and (max-height: 600px)');
		const update = () => {
			wide = mqWide.matches;
			short = mqShort.matches;
			small = mqSmall.matches;
			tiny = mqTiny.matches;
		};
		update();
		const all = [mqWide, mqShort, mqSmall, mqTiny];
		// older Safari only knows addListener
		for (const mq of all) {
			if (mq.addEventListener) mq.addEventListener('change', update);
			else mq.addListener(update);
		}
		stopMedia = () => {
			for (const mq of all) {
				if (mq.removeEventListener) mq.removeEventListener('change', update);
				else mq.removeListener(update);
			}
		};
	});
	onDestroy(() => {
		if (typeof window !== 'undefined') {
			cancelAnimationFrame(raf);
			window.removeEventListener('keydown', onKey);
			stopMedia();
			stopSpeaking();
		}
	});

	const PRAISE = ['Super!', 'Richtig!', 'Klasse!', 'Toll gemacht!', 'Prima!'];

	function feedbackMessage(fb: Feedback, given?: string) {
		if (fb.failed) {
			if (settings.sound) sounds.wrong();
			message = null;
		} else if (fb.outcome === 'correct' && fb.step) {
			// a step of a decomposed task: the next question is read aloud by the new task effect
			if (settings.sound) sounds.tap();
			message = { kind: 'good', text: 'Richtig! Weiter.' };
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

	/** Sends an action; returns false if it did not arrive. */
	async function send(body: Record<string, unknown>, given?: string): Promise<boolean> {
		busy = true;
		problem = null;
		const r = await sendAction(
			payload.runId,
			body.type === 'tick' ? body : { ...body, actionId: newActionId() }
		);
		busy = false;
		if (!r.ok) {
			if (r.kind === 'auth') {
				location.href = '/login';
			} else if (r.kind === 'offline') {
				problem = { kind: 'offline', text: 'Keine Verbindung zum Internet. Bitte nochmal tippen.' };
			} else if (r.kind === 'expired') {
				problem = { kind: 'expired', text: 'Dieses Rennen ist abgelaufen.' };
			} else {
				problem = { kind: 'server', text: r.message ?? 'Hoppla, da ist etwas schiefgelaufen.' };
			}
			return false;
		}
		const data = r.data;
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
		return true;
	}

	async function submit(value = input) {
		if (!cur || busy || value === '') return;
		unlockMedia();
		const ms = Math.round(performance.now() - taskStart);
		const wasKeypad = value === input;
		input = '';
		const ok = await send({ type: 'answer', key: cur.key, value, ms }, value);
		// Keep the typed number if it did not arrive, so the child only has to tap again.
		if (!ok && wasKeypad && input === '') input = value;
	}

	function press(d: string) {
		if (busy || !cur) return;
		unlockMedia();
		if (settings.sound) sounds.tap();
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

	async function quit() {
		await send({ type: 'abort' });
		location.href = '/ueben';
	}

	function restartRun() {
		unlockMedia();
		onrestart();
	}

	$effect(() => {
		if (confirmExit && settings.readAloud === 'auto') untrack(() => speak('Möchtest du aufhören?'));
	});

	function endText() {
		const r = payload.view.result;
		if (!r) return '';
		if (payload.view.status === 'failed') return `Motorschaden! ${FAILED_TEXT}`;
		if (lostToClock) return TIME_LOST_TEXT;
		if (payload.view.status === 'timeUp')
			return `Die Zeit ist um! Du hast ${r.done} Aufgaben geschafft.`;
		if (mode === 'record' && best) {
			return newRecord
				? `Neue Bestzeit! ${clockPrecise(r.durationMs)}. Vorher waren es ${clockPrecise(best.durationMs)}.`
				: `Geschafft! Deine Zeit war ${clockPrecise(r.durationMs)}. Deine Bestzeit ist ${clockPrecise(best.durationMs)}. Beim nächsten Mal klappt es bestimmt.`;
		}
		const prize = trophyKind ? ` Du hast einen ${TROPHY_WON[trophyKind]} gewonnen!` : '';
		return `Geschafft! Du bist im Ziel.${prize} ${r.firstTry} von ${r.tasks} Aufgaben waren sofort richtig.`;
	}

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
		{#if view.status === 'running' && !confirmExit}
			<IconButton icon="stop" label="Aufhören" onclick={() => (confirmExit = true)} />
		{/if}
	</header>

	<div class="layout">
		<div class="track-wrap">
			<RaceTrack {cars} {calm} heightVh={trackHeight} />
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
				{#if mode === 'record' && payload.ghost && best}
					<span
						><RaceCar model={car.model} color={car.color} size={34} ghost /> deine Bestzeit ({clockPrecise(
							best.durationMs
						)})</span
					>
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
					{#if mode === 'time'}<p>Der {CLOCK_OPPONENT} fährt weiter.</p>{/if}
					<div class="row center-row">
						<IconButton
							icon="play"
							label="Weiterfahren"
							primary
							large
							onclick={() => (confirmExit = false)}
						/>
						<IconButton icon="restart" label="Neu starten" large onclick={restartRun} />
						<IconButton icon="home" label="Aufhören" large onclick={quit} />
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
					{:else if mode === 'record' && view.status === 'finished' && view.result}
						{#if newRecord && best}
							{#if !calm}<Confetti />{/if}
							<Stopwatch ms={view.result.durationMs} />
							<p class="big-text">Neue Bestzeit!</p>
							<p>
								Du warst schneller als deine alte Bestzeit von
								<strong>{clockPrecise(best.durationMs)}</strong>.
							</p>
						{:else}
							<div class="flag"><Icon name="flag" size={72} /></div>
							<p class="big-text">Geschafft!</p>
							<p>
								Deine Zeit: <strong>{clockPrecise(view.result.durationMs)}</strong>
								{#if best}(Bestzeit: {clockPrecise(best.durationMs)}){/if}
							</p>
							<p>Die Bestzeit hast du diesmal nicht geschlagen. Beim nächsten Mal klappt es!</p>
						{/if}
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
							{#if mode === 'flawless' && view.status === 'finished' && !best}
								<p>
									Deine Zeit: <strong>{clockPrecise(view.result.durationMs)}</strong>. Das ist jetzt
									deine Bestzeit – du kannst sie in „Bestzeit jagen“ schlagen!
								</p>
							{/if}
						{/if}
					{/if}
					{#if view.status !== 'aborted' && settings.readAloud !== 'off'}
						<button class="btn small" disabled={$speechBroken} onclick={() => speak(endText())}
							><Icon name="speaker" /> Vorlesen</button
						>
					{/if}
					<div class="row center-row">
						{#if view.status === 'failed' || lostToClock}
							<IconButton
								icon="restart"
								label="Neu starten"
								primary
								large
								disabled={busy}
								onclick={restartRun}
							/>
						{:else}
							<IconButton
								icon="replay"
								label="Nochmal fahren"
								primary
								large
								disabled={busy}
								onclick={restartRun}
							/>
						{/if}
						<IconButton icon="home" label="Zur Übersicht" href="/ueben" large />
						<IconButton icon="trophy" label="Zur Vitrine" href="/ueben/vitrine" large />
					</div>
				</div>
			{:else if cur}
				<div class="task">
					{#if cur.presentation.question}
						<p class="question">{cur.presentation.question}</p>
					{/if}
					<p class="expr" class:with-split={hasSplit} class:long={cur.steps > 1} aria-live="polite">
						{#each cur.presentation.parts as part, i (i)}
							{#if part.kind === 'gap'}
								<span class="gap role-{part.role}" class:filled={input !== ''} aria-label="Antwort"
									>{input || '?'}</span
								>
							{:else if part.kind === 'blank'}
								<span class="blank role-{part.role}" aria-hidden="true"></span>
							{:else if part.kind === 'num'}
								<span class="num role-{part.role}"
									>{part.value}{#if part.split}<span
											class="split"
											role="img"
											aria-label="{part.value} ist {part.split[0]} und {part.split[1]}"
											><svg viewBox="0 0 40 16" width="40" height="16" aria-hidden="true"
												><path
													d="M20 0 L6 16 M20 0 L34 16"
													stroke="currentColor"
													stroke-width="2"
													fill="none"
												/></svg
											><span class="split-parts"
												><span>{part.split[0]}</span><span>{part.split[1]}</span></span
											></span
										>{/if}</span
								>
							{:else}
								<span>{part.value}</span>
							{/if}
							<!-- space keeps the text readable for screen readers and tests; flex ignores it -->
							<!-- eslint-disable-next-line svelte/no-useless-mustaches -->
							{' '}
						{/each}
					</p>
					{#if settings.readAloud !== 'off'}
						<button
							class="btn small speak"
							disabled={$speechBroken}
							onclick={() => speak(cur.presentation.speech)}
							aria-label="Aufgabe vorlesen"><Icon name="speaker" /> Vorlesen</button
						>
						{#if $speechSilent}
							<p class="muted small">
								Vorlesen klappt auf diesem Gerät gerade nicht. Ist der Ton an?
							</p>
						{/if}
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
					{#if problem}
						<p class="msg warn">{problem.text}</p>
						{#if problem.kind !== 'offline'}
							<IconButton icon="restart" label="Neu starten" large onclick={restartRun} />
						{/if}
					{:else if message}
						<p class="msg {message.kind}">{message.text}</p>
					{/if}
					{#if lastWrong && !cur.solution && cur.answerFormat === 'keypad'}
						<p class="muted small">Deine Antwort war: {lastWrong}</p>
					{/if}
				</div>

				{#if cur.hint && !cur.solution}
					<div class="hint">
						<!-- tiles speak for themselves; the text is only read aloud -->
						{#if cur.hint.visual?.kind !== 'twenty'}
							<p><strong>Tipp:</strong> {cur.hint.text}</p>
						{/if}
						{#if cur.hint.visual}<HintVisual visual={cur.hint.visual} />{/if}
						{#if settings.readAloud !== 'off'}
							<button
								class="btn small"
								disabled={$speechBroken}
								onclick={() => speak(cur.hint?.text ?? '')}
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
		flex: 1 1 auto;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
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
		white-space: nowrap;
	}
	.clock {
		font-variant-numeric: tabular-nums;
	}
	.layout {
		display: grid;
		gap: var(--space-4);
	}
	@media (orientation: landscape) and (min-width: 700px) {
		.layout {
			grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
			align-items: start;
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
		justify-content: center;
		font-size: 0.95rem;
		padding: var(--space-1) var(--space-2);
	}
	.legend span {
		display: inline-flex;
		gap: var(--space-2);
		align-items: center;
	}
	.panel {
		container-type: inline-size;
		background: #fff;
		border-radius: var(--radius);
		padding: var(--space-4);
		display: flex;
		flex-direction: column;
		gap: clamp(0.4rem, 1.5vh, 1rem);
		min-height: 0;
	}
	@media (min-height: 800px) {
		.panel {
			min-height: 20rem;
		}
	}
	.task {
		text-align: center;
	}
	.question {
		font-size: 1.3em;
		margin: 0 0 var(--space-2);
	}
	.expr {
		font-size: 2.6rem;
		font-size: clamp(1.8rem, min(7vw, 6vh), 3.6rem);
		font-weight: 700;
		margin: var(--space-2) 0;
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 0.25em;
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
	.num.role-a {
		color: var(--color-num-a);
	}
	.num.role-b,
	.num.role-part {
		color: var(--color-num-b);
	}
	.blank {
		display: inline-block;
		min-width: 1.4em;
		height: 1.1em;
		border: 3px dashed #c3c9d0;
		border-radius: 0.2em;
	}
	.blank.role-b,
	.blank.role-part {
		border-color: #e8a3a3;
	}
	.num {
		position: relative;
	}
	.expr.with-split {
		padding-bottom: 1.5em;
	}
	/* decomposed task: 8 + 7 = 8 + 2 + 5 = 15 stays on one line */
	.expr.long {
		flex-wrap: nowrap;
		gap: 0.2em;
		font-size: 1.6rem;
		font-size: clamp(1.2rem, 4.2vw, 2.1rem);
	}
	@supports (width: 1cqw) {
		.expr.long {
			font-size: clamp(1.2rem, 7.5cqw, 2.1rem);
		}
	}
	.expr.long .gap {
		min-width: 1.6em;
	}
	.expr.long .blank {
		min-width: 1em;
	}
	.split {
		position: absolute;
		top: 100%;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		font-size: 0.5em;
		line-height: 1.1;
		color: var(--color-num-b);
	}
	.split-parts {
		display: flex;
		gap: 0.7em;
	}
	.gap.role-a {
		border-bottom-color: var(--color-num-a);
	}
	.gap.role-b,
	.gap.role-part {
		border-bottom-color: var(--color-num-b);
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
		min-height: clamp(1.6rem, 5vh, 2.5rem);
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
	/* Phone held sideways: very little height */
	@media (orientation: landscape) and (max-height: 500px) {
		.layout {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
			align-items: start;
		}
		.game {
			padding-top: 0;
			padding-bottom: var(--space-2);
		}
		.bar {
			padding: 0;
		}
		.bar :global(.ibtn) {
			width: 3rem;
			height: 3rem;
			min-height: 3rem;
		}
		.panel {
			padding: var(--space-2);
			gap: 0.3rem;
		}
		.key {
			min-height: 2.6rem;
			font-size: 1.3rem;
		}
		.feedback {
			min-height: 1.5rem;
		}
		.legend {
			display: none;
		}
	}
	/* narrow screens: the progress text would squeeze the name of the set */
	@media (max-width: 460px) {
		.sr-progress {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip: rect(0, 0, 0, 0);
			white-space: nowrap;
		}
	}
	/* Phone held upright */
	@media (orientation: portrait) and (max-height: 700px) {
		.legend {
			display: none;
		}
		.game {
			padding-bottom: var(--space-2);
		}
		.layout {
			gap: var(--space-2);
		}
		.bar {
			padding: 0;
			gap: var(--space-2);
		}
		.bar :global(.ibtn) {
			width: 3.5rem;
			height: 3.5rem;
			min-height: 3.5rem;
		}
		.track-wrap {
			padding: var(--space-1);
		}
		.panel {
			padding: var(--space-2);
		}
		.expr {
			margin: 0;
		}
		.feedback {
			min-height: 1.5rem;
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
		min-height: 3.6rem;
		min-height: clamp(2.6rem, 7vh, 4.2rem);
		font-size: 1.6rem;
		font-size: clamp(1.4rem, 4vh, 1.9rem);
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
