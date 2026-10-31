import { defineEnvVars } from '@sveltejs/kit/env';
import { z } from 'zod';

const url = (protocols: string[]) =>
	z
		.string()
		.min(1)
		.refine((v) => protocols.some((p) => v.startsWith(p)), {
			message: `must start with one of: ${protocols.join(', ')}`
		});

export const variables = defineEnvVars({
	DATABASE_URL: {
		description: 'PostgreSQL connection string, e.g. postgres://user:pass@host:5432/antonia',
		schema: url(['postgres://', 'postgresql://'])
	},
	REDIS_URL: {
		description:
			'Redis connection string, e.g. redis://:pass@host:6379/0. "memory://" = In-Memory (nur Entwicklung/Tests).',
		schema: url(['redis://', 'rediss://', 'memory://'])
	},
	APP_SECRET: {
		description:
			'Mind. 32 zufällige Zeichen. Schlüssel für die Verschlüsselung von 2FA-Geheimnissen. Nie ändern, sonst müssen 2FA-Einrichtungen wiederholt werden.',
		schema: z.string().min(32, 'APP_SECRET must be at least 32 characters')
	},
	SETUP_TOKEN: {
		description:
			'Optional. Erlaubt einmalig das Anlegen des ersten Lehrkraft-Kontos unter /setup. Nach der Einrichtung entfernen.',
		schema: (v) => {
			if (!v) return undefined;
			if (v.length < 16) throw new Error('SETUP_TOKEN must be at least 16 characters');
			return v;
		}
	},
	LOG_LEVEL: {
		description: 'debug | info | warn | error (default: info)',
		schema: (v) => {
			if (!v) return undefined;
			const r = z.enum(['debug', 'info', 'warn', 'error']).safeParse(v);
			if (!r.success) throw new Error('LOG_LEVEL must be debug, info, warn or error');
			return r.data;
		}
	}
});
