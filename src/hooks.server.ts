import type { Handle, HandleServerError, ServerInit } from '@sveltejs/kit/hooks';
import { LOG_LEVEL } from '$app/env/private';
import { dev } from '$app/env';
import { closeDb, getDb, runMigrations } from '#lib/server/db/index.ts';
import { closeKv, getKv } from '#lib/server/kv/index.ts';
import { log, setLogLevel } from '#lib/server/log.ts';
import { SESSION_COOKIE, validateSession } from '#lib/server/auth/session.ts';
import { cleanupStaleRuns } from '#lib/server/services/runs.ts';

export const init: ServerInit = async () => {
	setLogLevel(LOG_LEVEL);
	if (!dev || process.env.MIGRATE_ON_DEV === '1') {
		await runMigrations('./drizzle');
		log.info('migrations applied');
	}
	cleanupStaleRuns(getDb()).catch((e) => log.warn('cleanup failed', { error: e }));

	process.on('sveltekit:shutdown', async () => {
		await Promise.allSettled([closeDb(), closeKv()]);
	});
};

const SECURITY_HEADERS: Record<string, string> = {
	'X-Content-Type-Options': 'nosniff',
	'Referrer-Policy': 'same-origin',
	'X-Frame-Options': 'DENY',
	'Cross-Origin-Opener-Policy': 'same-origin',
	'Cross-Origin-Resource-Policy': 'same-origin',
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
};

export const handle: Handle = async ({ event, resolve }) => {
	// JSON API: same-origin only (form actions are protected by SvelteKit itself).
	if (event.url.pathname.startsWith('/api/') && event.request.method !== 'GET') {
		const origin = event.request.headers.get('origin');
		if (!origin || origin !== event.url.origin) {
			return new Response('Forbidden', { status: 403 });
		}
	}

	const token = event.cookies.get(SESSION_COOKIE);
	event.locals.session = null;
	if (token && !event.url.pathname.startsWith('/healthz')) {
		try {
			event.locals.session = await validateSession(getKv(), token);
		} catch (e) {
			log.error('session validation failed', { error: e });
		}
		if (!event.locals.session) event.cookies.delete(SESSION_COOKIE, { path: '/' });
	}

	const response = await resolve(event);
	for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
		if (!response.headers.has(k)) response.headers.set(k, v);
	}
	if (event.locals.session && !response.headers.has('Cache-Control')) {
		response.headers.set('Cache-Control', 'private, no-store');
	}
	if (!dev) {
		response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	}
	return response;
};

export const handleError: HandleServerError = (caught) => {
	const errorId = crypto.randomUUID();
	if (caught.kind === 'unknown') {
		// Only technical info; no request bodies, no user data.
		const err = caught.error;
		// Query errors contain bound parameters (possibly personal data) – strip them.
		const strip = (s: string | undefined) => s?.split('\nparams:')[0];
		log.error('unhandled error', {
			errorId,
			route: caught.event.route.id,
			error:
				err instanceof Error
					? {
							type: err.name,
							message: strip(err.message),
							cause: err.cause instanceof Error ? strip(err.cause.message) : undefined,
							stack: err.stack
								?.split('\n')
								.filter((l) => l.trimStart().startsWith('at '))
								.slice(0, 8)
								.join('\n')
						}
					: 'non-error thrown'
		});
		return { status: 500, message: 'Interner Fehler', errorId };
	}
	return { errorId };
};
