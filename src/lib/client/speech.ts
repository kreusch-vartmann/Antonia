/** Browser text-to-speech (Web Speech API), German. */
import { writable } from 'svelte/store';

/** True when the device has no speech API at all. Speech buttons are disabled then. */
export const speechBroken = writable(false);

/**
 * True when speaking was tried but stayed silent (no voice, muted device, …).
 * Only used for a small hint, speech is never switched off for good.
 */
export const speechSilent = writable(false);

let voice: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
	if (typeof speechSynthesis === 'undefined') return null;
	const voices = speechSynthesis.getVoices();
	return (
		voices.find((v) => v.lang === 'de-DE' && /female|anna|petra|helena|katja/i.test(v.name)) ??
		voices.find((v) => v.lang === 'de-DE') ??
		voices.find((v) => v.lang.replace('_', '-').startsWith('de')) ??
		null
	);
}

export function speechAvailable(): boolean {
	return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

// Keep a reference: some browsers drop an utterance that gets garbage collected while speaking.
const active = new Set<SpeechSynthesisUtterance>();

function say(text: string, rate: number, retry: boolean) {
	const u = new SpeechSynthesisUtterance(text.replace(/·/g, ' mal ').replace(/−/g, ' minus '));
	u.lang = 'de-DE';
	u.rate = rate;
	voice ??= pickVoice();
	if (voice) u.voice = voice;
	active.add(u);
	let started = false;
	u.onstart = () => {
		started = true;
		speechSilent.set(false);
	};
	u.onend = () => active.delete(u);
	u.onerror = (e) => {
		active.delete(u);
		if (e.error !== 'canceled' && e.error !== 'interrupted') {
			console.warn('speech synthesis failed:', e.error);
			speechSilent.set(true);
		}
	};
	speechSynthesis.resume();
	speechSynthesis.speak(u);
	// Some engines stay silent without an error: try once more, then only show a hint.
	setTimeout(() => {
		if (started || !active.has(u)) return;
		active.delete(u);
		if (retry) {
			speechSynthesis.cancel();
			say(text, rate, false);
		} else {
			console.warn('speech synthesis did not start: no speech engine or voice available?');
			speechSilent.set(true);
		}
	}, 1500);
}

export function speak(text: string, rate = 0.9) {
	if (!speechAvailable() || !text) return;
	// No timeout between cancel() and speak(): on iOS the call must stay inside the tap.
	if (speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel();
	say(text, rate, true);
}

/** For the device check page. */
export function speechInfo() {
	if (!speechAvailable()) return { available: false, voices: 0, voice: '' };
	return {
		available: true,
		voices: speechSynthesis.getVoices().length,
		voice: (voice ?? pickVoice())?.name ?? ''
	};
}

export function stopSpeaking() {
	if (speechAvailable()) speechSynthesis.cancel();
}

let unlocked = false;

/** Call inside a tap handler: iOS only allows speech after a first speak() during a gesture. */
export function unlockSpeech() {
	if (unlocked || !speechAvailable()) return;
	unlocked = true;
	try {
		const u = new SpeechSynthesisUtterance(' ');
		u.volume = 0;
		u.lang = 'de-DE';
		speechSynthesis.speak(u);
	} catch {
		unlocked = false;
	}
}

if (typeof window !== 'undefined') {
	if (!speechAvailable()) {
		speechBroken.set(true);
	} else {
		// The list of voices is loaded asynchronously and may stay empty on iOS although speech works.
		const refresh = () => {
			voice = pickVoice() ?? voice;
		};
		refresh();
		speechSynthesis.addEventListener?.('voiceschanged', refresh);
		document.addEventListener('visibilitychange', () => {
			if (document.hidden) stopSpeaking();
		});
	}
}
