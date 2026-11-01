/** Browser text-to-speech (Web Speech API), German. */
import { writable } from 'svelte/store';

/**
 * True when speech output really does not work on this device: no speech API, no
 * voice installed, or an attempt to speak did not start. Buttons are disabled then.
 */
export const speechBroken = writable(false);

let voice: SpeechSynthesisVoice | null | undefined;

function pickVoice(): SpeechSynthesisVoice | null {
	if (typeof speechSynthesis === 'undefined') return null;
	const voices = speechSynthesis.getVoices();
	return (
		voices.find((v) => v.lang === 'de-DE' && /female|anna|petra|helena|katja/i.test(v.name)) ??
		voices.find((v) => v.lang === 'de-DE') ??
		voices.find((v) => v.lang.startsWith('de')) ??
		null
	);
}

export function speechAvailable(): boolean {
	return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

// Keep a reference: some browsers drop an utterance that gets garbage collected while speaking.
const active = new Set<SpeechSynthesisUtterance>();
let broken = false;
speechBroken.subscribe((b) => (broken = b));

function say(text: string, rate: number) {
	const u = new SpeechSynthesisUtterance(text.replace(/·/g, ' mal ').replace(/−/g, ' minus '));
	u.lang = 'de-DE';
	u.rate = rate;
	if (voice) u.voice = voice;
	active.add(u);
	let started = false;
	u.onstart = () => {
		started = true;
		speechBroken.set(false);
	};
	u.onend = () => active.delete(u);
	u.onerror = (e) => {
		active.delete(u);
		if (e.error !== 'canceled' && e.error !== 'interrupted') {
			console.warn('speech synthesis failed:', e.error);
			speechBroken.set(true);
		}
	};
	speechSynthesis.resume();
	speechSynthesis.speak(u);
	// Chromium without a speech engine (e.g. Linux without speech-dispatcher) stays silent without an error.
	setTimeout(() => {
		if (!started && active.has(u)) {
			console.warn('speech synthesis did not start: no speech engine or voice available?');
			speechBroken.set(true);
		}
	}, 2000);
}

export function speak(text: string, rate = 0.9) {
	if (!speechAvailable() || broken || !text) return;
	if (!voice) voice = pickVoice();
	if (speechSynthesis.speaking || speechSynthesis.pending) {
		// Some browsers silently drop a speak() that directly follows cancel().
		speechSynthesis.cancel();
		setTimeout(() => say(text, rate), 80);
	} else {
		say(text, rate);
	}
}

export function stopSpeaking() {
	if (speechAvailable()) speechSynthesis.cancel();
}

/** Decide early, without any click, whether speech output can work at all. */
function detect() {
	if (!speechAvailable()) {
		speechBroken.set(true);
		return;
	}
	const check = () => {
		voice = pickVoice();
		if (speechSynthesis.getVoices().length > 0) speechBroken.set(false);
	};
	check();
	speechSynthesis.addEventListener?.('voiceschanged', check);
	// Chromium loads the voices asynchronously; an empty list afterwards means: no voice installed.
	if (speechSynthesis.getVoices().length === 0) {
		setTimeout(() => {
			if (speechSynthesis.getVoices().length === 0) speechBroken.set(true);
		}, 2000);
	}
}

if (typeof window !== 'undefined') detect();
