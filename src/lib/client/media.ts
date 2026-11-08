/** Unlocks sound and speech on iOS/iPadOS; both need a first tap. */
import { sounds } from './sound';
import { unlockSpeech } from './speech';

let silentUrl: string | null = null;
let prepared = false;

/** Tiny silent WAV (8 kHz, 8 bit, 100 samples) as blob URL. */
function silentWav(): string {
	if (silentUrl) return silentUrl;
	const n = 100;
	const buf = new ArrayBuffer(44 + n);
	const v = new DataView(buf);
	const w = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
	w(0, 'RIFF');
	v.setUint32(4, 36 + n, true);
	w(8, 'WAVE');
	w(12, 'fmt ');
	v.setUint32(16, 16, true);
	v.setUint16(20, 1, true);
	v.setUint16(22, 1, true);
	v.setUint32(24, 8000, true);
	v.setUint32(28, 8000, true);
	v.setUint16(32, 1, true);
	v.setUint16(34, 8, true);
	w(36, 'data');
	v.setUint32(40, n, true);
	for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
	silentUrl = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
	return silentUrl;
}

/**
 * Must be called synchronously inside a tap/click handler.
 * Unlocks Web Audio and speech and lets sounds play although the iPhone is on silent.
 */
export function unlockMedia() {
	if (typeof window === 'undefined') return;
	sounds.unlock();
	unlockSpeech();
	if (prepared) return;
	prepared = true;
	try {
		const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
		if (session) session.type = 'playback';
	} catch {
		/* not supported */
	}
	try {
		const a = new Audio(silentWav());
		a.setAttribute('playsinline', '');
		void a.play().catch(() => {});
	} catch {
		/* ignore */
	}
}
