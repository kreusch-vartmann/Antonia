import type { RunPayload } from '#lib/server/services/runs.ts';
import type { Feedback } from '#lib/domain/run/engine.ts';

export type ApiFailure = {
	ok: false;
	/** offline: no response; expired: run gone; auth: logged out; server: anything else */
	kind: 'offline' | 'expired' | 'auth' | 'server';
	status: number;
	code?: string;
	message?: string;
};
export type ApiResult<T> = { ok: true; data: T } | ApiFailure;

export function newActionId(): string {
	return (
		globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
	);
}

const DELAYS = [400, 1200, 2500];
const wait = (attempt: number) => new Promise((r) => setTimeout(r, DELAYS[attempt] ?? 2500));

/**
 * POSTs JSON. Network errors and 5xx are retried; this is safe because answers carry
 * an `actionId` and the server ignores a repeated one.
 */
async function post<T>(url: string, body: unknown, retries: number): Promise<ApiResult<T>> {
	for (let attempt = 0; ; attempt++) {
		let res: Response;
		try {
			res = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
				body: JSON.stringify(body),
				credentials: 'same-origin'
			});
		} catch {
			if (attempt < retries) {
				await wait(attempt);
				continue;
			}
			return { ok: false, kind: 'offline', status: 0 };
		}
		const isJson = res.headers.get('content-type')?.includes('application/json') ?? false;
		const data = isJson ? await res.json().catch(() => null) : null;
		if (res.ok && data) return { ok: true, data: data as T };
		if (res.status === 401 || res.status === 403 || res.redirected || (res.ok && !isJson))
			return { ok: false, kind: 'auth', status: res.status };
		if (res.status >= 500 && attempt < retries) {
			await wait(attempt);
			continue;
		}
		return {
			ok: false,
			kind: res.status === 404 ? 'expired' : 'server',
			status: res.status,
			code: data?.code,
			message: data?.message
		};
	}
}

export function startRun(assignmentId: string, mode: string, fresh: boolean) {
	return post<RunPayload>('/api/run/start', { assignmentId, mode, fresh }, 2);
}

export function sendAction(runId: string, action: Record<string, unknown>) {
	return post<RunPayload & { feedback: Feedback }>(`/api/run/${runId}`, action, 3);
}
