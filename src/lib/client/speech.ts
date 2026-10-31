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

export function speak(text: string, rate = 0.9) {
	if (!speechAvailable() || !text) return;
	if (voice === undefined) voice = pickVoice();
	speechSynthesis.cancel();
	const u = new SpeechSynthesisUtterance(text.replace(/·/g, ' mal ').replace(/−/g, ' minus '));
	u.lang = 'de-DE';
	u.rate = rate;
	if (voice) u.voice = voice;
	speechSynthesis.speak(u);
}

export function stopSpeaking() {
	if (speechAvailable()) speechSynthesis.cancel();
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
	speechSynthesis.addEventListener?.('voiceschanged', () => {
		voice = pickVoice();
	});
}
