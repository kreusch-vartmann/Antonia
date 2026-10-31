/** RFC 6238 TOTP (SHA-1, 6 digits, 30 s) – compatible with common authenticator apps. */
import { createHmac, randomBytes } from 'node:crypto';
import QRCode from 'qrcode';
import { randomToken, sha256 } from './crypto';

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf: Buffer): string {
	let bits = 0;
	let value = 0;
	let out = '';
	for (const byte of buf) {
		value = (value << 8) | byte;
		bits += 8;
		while (bits >= 5) {
			out += B32[(value >>> (bits - 5)) & 31];
			bits -= 5;
		}
	}
	if (bits > 0) out += B32[(value << (5 - bits)) & 31];
	return out;
}

export function base32Decode(s: string): Buffer {
	const clean = s.replace(/=+$/, '').replace(/\s/g, '').toUpperCase();
	let bits = 0;
	let value = 0;
	const out: number[] = [];
	for (const ch of clean) {
		const idx = B32.indexOf(ch);
		if (idx < 0) throw new Error('invalid base32');
		value = (value << 5) | idx;
		bits += 5;
		if (bits >= 8) {
			out.push((value >>> (bits - 8)) & 255);
			bits -= 8;
		}
	}
	return Buffer.from(out);
}

export function generateTotpSecret(): string {
	return base32Encode(randomBytes(20));
}

export function totpAt(secret: string, counter: number): string {
	const buf = Buffer.alloc(8);
	buf.writeBigUInt64BE(BigInt(counter));
	const h = createHmac('sha1', base32Decode(secret)).update(buf).digest();
	const off = h[h.length - 1] & 0xf;
	const code = ((h.readUInt32BE(off) & 0x7fffffff) % 1_000_000).toString();
	return code.padStart(6, '0');
}

/** Returns the matched time step, or null. Accepts ±1 step clock drift. */
export function verifyTotp(secret: string, code: string, now = Date.now()): number | null {
	const c = code.replace(/\s/g, '');
	if (!/^\d{6}$/.test(c)) return null;
	const step = Math.floor(now / 30_000);
	for (const d of [0, -1, 1]) {
		if (totpAt(secret, step + d) === c) return step + d;
	}
	return null;
}

export function otpauthUri(secret: string, account: string): string {
	const label = encodeURIComponent(`Antonia:${account}`);
	return `otpauth://totp/${label}?secret=${secret}&issuer=Antonia&algorithm=SHA1&digits=6&period=30`;
}

export function qrSvg(text: string): Promise<string> {
	return QRCode.toString(text, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
}

/** 8 recovery codes like "k3fz-9q2m"; returns plain codes and their hashes. */
export function generateRecoveryCodes(): { plain: string[]; hashes: string[] } {
	const plain = Array.from({ length: 8 }, () => {
		const t = randomToken(8)
			.toLowerCase()
			.replace(/[^a-z0-9]/g, '')
			.padEnd(8, '0')
			.slice(0, 8);
		return `${t.slice(0, 4)}-${t.slice(4)}`;
	});
	return { plain, hashes: plain.map((p) => sha256(p)) };
}
