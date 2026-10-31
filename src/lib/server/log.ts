/**
 * Minimal structured logger (JSON lines to stdout/stderr).
 *
 * Privacy rule: never log personal data. Context objects are passed through
 * `redact`, which masks any key that looks sensitive. Still, callers should
 * only log technical identifiers (ids, counts, durations), never names or input.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const SENSITIVE_KEY =
	/pass(word)?|secret|token|cookie|session|auth|name|email|username|answer|input|totp|otp|key/i;

export function redact(value: unknown, depth = 0): unknown {
	if (depth > 5) return '[depth]';
	if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
	if (value instanceof Error) {
		return { error: value.name, message: value.message };
	}
	if (value && typeof value === 'object') {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value)) {
			out[k] = SENSITIVE_KEY.test(k) ? '[redacted]' : redact(v, depth + 1);
		}
		return out;
	}
	return value;
}

let threshold: LogLevel = 'info';

export function setLogLevel(level: LogLevel | undefined) {
	if (level) threshold = level;
}

function write(level: LogLevel, msg: string, ctx?: Record<string, unknown>) {
	if (ORDER[level] < ORDER[threshold]) return;
	const line = JSON.stringify({
		ts: new Date().toISOString(),
		level,
		msg,
		...(ctx ? (redact(ctx) as Record<string, unknown>) : {})
	});
	if (level === 'error' || level === 'warn') console.error(line);
	else console.log(line);
}

export const log = {
	debug: (msg: string, ctx?: Record<string, unknown>) => write('debug', msg, ctx),
	info: (msg: string, ctx?: Record<string, unknown>) => write('info', msg, ctx),
	warn: (msg: string, ctx?: Record<string, unknown>) => write('warn', msg, ctx),
	error: (msg: string, ctx?: Record<string, unknown>) => write('error', msg, ctx)
};
