// See https://svelte.dev/docs/kit/types#app.d.ts
import type { SessionData } from '#lib/server/auth/session.ts';

declare global {
	namespace App {
		interface Error {
			/** Random id to correlate a user-facing error with server logs. */
			errorId?: string;
		}
		interface Locals {
			session: SessionData | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
