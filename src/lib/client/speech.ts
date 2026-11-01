/** Browser text-to-speech (Web Speech API), German. */

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

function say(text: string, rate: number) {
	const u = new SpeechSynthesisUtterance(text.replace(/·/g, ' mal ').replace(/−/g, ' minus '));
	u.lang = 'de-DE';
	u.rate = rate;
	if (voice) u.voice = voice;
	active.add(u);
	u.onend = u.onerror = () => active.delete(u);
	speechSynthesis.resume();
	speechSynthesis.speak(u);
}

export function speak(text: string, rate = 0.9) {
	if (!speechAvailable() || !text) return;
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

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
	speechSynthesis.addEventListener?.('voiceschanged', () => {
		voice = pickVoice();
	});
}
