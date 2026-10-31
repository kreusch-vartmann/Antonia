/** Gentle synthesized sound effects (no audio files needed). */

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
	if (typeof window === 'undefined') return null;
	try {
		ctx ??= new AudioContext();
		if (ctx.state === 'suspended') void ctx.resume();
		return ctx;
	} catch {
		return null;
	}
}

function tone(
	freq: number,
	start: number,
	dur: number,
	gain = 0.12,
	type: OscillatorType = 'sine'
) {
	const c = audio();
	if (!c) return;
	const o = c.createOscillator();
	const g = c.createGain();
	o.type = type;
	o.frequency.value = freq;
	const t = c.currentTime + start;
	g.gain.setValueAtTime(0, t);
	g.gain.linearRampToValueAtTime(gain, t + 0.02);
	g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
	o.connect(g).connect(c.destination);
	o.start(t);
	o.stop(t + dur + 0.05);
}

export const sounds = {
	/** Unlock audio on first user interaction (iOS). */
	unlock() {
		audio();
	},
	correct() {
		tone(523.25, 0, 0.18);
		tone(659.25, 0.1, 0.25);
	},
	wrong() {
		tone(220, 0, 0.25, 0.08, 'triangle');
	},
	finish() {
		[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.12, 0.3, 0.1));
	},
	tap() {
		tone(880, 0, 0.05, 0.03);
	}
};
