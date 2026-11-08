import { error, redirect, type RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { dev } from '$app/env';
import { schema } from '../db/types';
import { getDb } from '../db';
import { getKv } from '../kv';
import { createSession, destroySession, SESSION_COOKIE, SESSION_TTL, type Role } from './session';

type Ev = Pick<RequestEvent, 'locals' | 'url' | 'cookies'>;

export function requireTeacher(event: Ev): string {
	const s = event.locals.session;
	if (!s) redirect(303, `/login?next=${encodeURIComponent(event.url.pathname)}`);
	if (s.role !== 'teacher') error(403, 'Kein Zugriff');
	return s.userId;
}

/** Teachers with the role "admin" only. */
export async function requireAdmin(event: Ev): Promise<string> {
	const id = requireTeacher(event);
	const [t] = await getDb()
		.select({ role: schema.teacher.role, active: schema.teacher.active })
		.from(schema.teacher)
		.where(eq(schema.teacher.id, id));
	if (!t?.active || t.role !== 'admin') error(403, 'Nur für Admins');
	return id;
}

export function requireStudent(event: Ev): string {
	const s = event.locals.session;
	if (!s) redirect(303, '/login');
	if (s.role !== 'student') error(403, 'Kein Zugriff');
	return s.userId;
}

export async function startSession(event: Ev, role: Role, userId: string) {
	const token = await createSession(getKv(), role, userId);
	event.cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		secure: !dev,
		sameSite: 'lax',
		maxAge: SESSION_TTL[role]
	});
}

export async function endSession(event: Ev) {
	await destroySession(getKv(), event.cookies.get(SESSION_COOKIE));
	event.cookies.delete(SESSION_COOKIE, { path: '/' });
}

export function db() {
	return getDb();
}

export function kv() {
	return getKv();
}

/** Only allow local redirect targets. */
export function safeNext(next: string | null, fallback: string): string {
	if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\'))
		return fallback;
	return next;
}
