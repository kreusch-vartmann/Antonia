import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes, timingSafeEqual } from 'node:crypto';

export function sha256(input: string): string {
	return createHash('sha256').update(input).digest('hex');
}

export function randomToken(bytes = 32): string {
	return randomBytes(bytes).toString('base64url');
}

export function safeEqual(a: string, b: string): boolean {
	const ba = Buffer.from(a);
	const bb = Buffer.from(b);
	return ba.length === bb.length && timingSafeEqual(ba, bb);
}

function deriveKey(secret: string, purpose: string): Buffer {
	return Buffer.from(hkdfSync('sha256', secret, 'antonia', purpose, 32));
}

/** AES-256-GCM encryption; output: v1.<iv>.<tag>.<ciphertext> (base64url). */
export function encrypt(plain: string, secret: string, purpose = 'totp'): string {
	const key = deriveKey(secret, purpose);
	const iv = randomBytes(12);
	const c = createCipheriv('aes-256-gcm', key, iv);
	const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
	return ['v1', iv.toString('base64url'), c.getAuthTag().toString('base64url'), enc.toString('base64url')].join('.');
}

export function decrypt(payload: string, secret: string, purpose = 'totp'): string {
	const [v, iv, tag, data] = payload.split('.');
	if (v !== 'v1' || !iv || !tag || !data) throw new Error('invalid ciphertext');
	const d = createDecipheriv('aes-256-gcm', deriveKey(secret, purpose), Buffer.from(iv, 'base64url'));
	d.setAuthTag(Buffer.from(tag, 'base64url'));
	return Buffer.concat([d.update(Buffer.from(data, 'base64url')), d.final()]).toString('utf8');
}
