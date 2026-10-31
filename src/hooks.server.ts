import type { Handle, HandleServerError, ServerInit } from '@sveltejs/kit/hooks';
import { LOG_LEVEL } from '$app/env/private';
import { dev } from '$app/env';
import { closeDb, runMigrations } from '#lib/server/db/index.ts';
import { closeKv } from '#lib/server/kv/index.ts';
import { log, setLogLevel } from '#lib/server/log.ts';

export const init: ServerInit = async () => {
	setLogLevel(LOG_LEVEL);
	if (!dev || process.env.MIGRATE_ON_DEV === '1') {
		await runMigrations('./drizzle');
		log.info('migrations applied');
	}

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
	const response = await resolve(event);
	for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
		if (!response.headers.has(k)) response.headers.set(k, v);
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
		log.error('unhandled error', {
			errorId,
			route: caught.event.route.id,
			error:
				err instanceof Error
					? {
							name: err.name,
							message: err.message,
							stack: err.stack?.split('\n').slice(1, 8).join('\n')
						}
					: 'non-error thrown'
		});
		return { status: 500, message: 'Interner Fehler', errorId };
	}
	return { errorId };
};
