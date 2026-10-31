import { describe, expect, it } from 'vitest';
import { redact } from './log';

describe('redact', () => {
	it('masks sensitive keys recursively', () => {
		const out = redact({
			userId: 'abc',
			password: 'x',
			firstName: 'Max',
			nested: { sessionToken: 't', count: 3 },
			list: [{ email: 'a@b.c' }]
		});
		expect(out).toEqual({
			userId: 'abc',
			password: '[redacted]',
			firstName: '[redacted]',
			nested: { sessionToken: '[redacted]', count: 3 },
			list: [{ email: '[redacted]' }]
		});
	});

	it('reduces errors to name and message', () => {
		expect(redact(new TypeError('boom'))).toEqual({ error: 'TypeError', message: 'boom' });
	});
});
