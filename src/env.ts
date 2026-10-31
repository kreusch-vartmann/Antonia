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
		description: 'Redis connection string, e.g. redis://:pass@host:6379/0',
		schema: url(['redis://', 'rediss://'])
	},
	LOG_LEVEL: {
		description: 'debug | info | warn | error (default: info)',
		schema: z.enum(['debug', 'info', 'warn', 'error']).optional()
	}
});
