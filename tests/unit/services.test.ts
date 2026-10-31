import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from '../helpers/db';
import { MemoryKv } from '#lib/server/kv/types.ts';
import type { Db } from '#lib/server/db/types.ts';
import {
	createTeacher,
	enableTotp,
	login,
	verifySecondFactor,
	ValidationError
} from '#lib/server/services/accounts.ts';
import {
	createStudent,
	deleteStudent,
	getStudent,
	listStudents
} from '#lib/server/services/students.ts';
import { createTasks } from '#lib/server/services/tasks.ts';
import { assign, createSet, activeAssignmentsForChild } from '#lib/server/services/sets.ts';
import { act, startOrResumeRun } from '#lib/server/services/runs.ts';
import { exportCsv, studentReport } from '#lib/server/services/analytics.ts';
import { generateMultiplicationRow } from '#lib/domain/generators.ts';
import { generateTotpSecret, totpAt } from '#lib/server/auth/totp.ts';
import { createSession, destroyAllSessions, validateSession } from '#lib/server/auth/session.ts';

const SECRET = 'x'.repeat(40);
let db: Db;
let close: () => Promise<void>;
let kv: MemoryKv;

beforeEach(async () => {
	({ db, close } = await createTestDb());
	kv = new MemoryKv();
});
afterEach(async () => close());

async function teacher(name = 'lehrerin') {
	return createTeacher(db, {
		username: name,
		displayName: 'Frau Test',
		password: 'sehr-geheim-123'
	});
}

describe('accounts', () => {
	it('logs in teacher and student, rejects wrong passwords', async () => {
		const t = await teacher();
		await createStudent(db, t, { firstName: 'Mia', username: 'mia', password: 'sonne12' });
		expect(
			await login(db, kv, { username: 'Lehrerin', password: 'sehr-geheim-123', ip: '1' })
		).toMatchObject({
			ok: true,
			role: 'teacher',
			needs2fa: false
		});
		expect(await login(db, kv, { username: 'mia', password: 'sonne12', ip: '1' })).toMatchObject({
			ok: true,
			role: 'student'
		});
		expect(await login(db, kv, { username: 'mia', password: 'falsch', ip: '1' })).toMatchObject({
			ok: false
		});
		expect(await login(db, kv, { username: 'gibtsnicht', password: 'x', ip: '1' })).toMatchObject({
			ok: false
		});
	});

	it('locks an account after 5 failures', async () => {
		const t = await teacher();
		await createStudent(db, t, { firstName: 'Mia', username: 'mia', password: 'sonne12' });
		for (let i = 0; i < 5; i++) await login(db, kv, { username: 'mia', password: 'nein', ip: '2' });
		const r = await login(db, kv, { username: 'mia', password: 'sonne12', ip: '2' });
		expect(r).toMatchObject({ ok: false, error: 'locked' });
	});

	it('enforces unique usernames across teachers and students', async () => {
		const t = await teacher();
		await expect(
			createStudent(db, t, { firstName: 'X', username: 'lehrerin', password: 'abcd' })
		).rejects.toBeInstanceOf(ValidationError);
	});

	it('supports TOTP, prevents code reuse and accepts recovery codes once', async () => {
		const t = await teacher();
		const secret = generateTotpSecret();
		const code = totpAt(secret, Math.floor(Date.now() / 30_000));
		const recovery = await enableTotp(db, SECRET, t, secret, code);
		expect(recovery).toHaveLength(8);
		expect(
			(await login(db, kv, { username: 'lehrerin', password: 'sehr-geheim-123', ip: '3' })) as {
				needs2fa: boolean;
			}
		).toMatchObject({ needs2fa: true });
		const now = totpAt(secret, Math.floor(Date.now() / 30_000));
		expect((await verifySecondFactor(db, kv, SECRET, t, now)).ok).toBe(true);
		expect((await verifySecondFactor(db, kv, SECRET, t, now)).ok).toBe(false); // replay
		expect((await verifySecondFactor(db, kv, SECRET, t, recovery![0])).ok).toBe(true);
		expect((await verifySecondFactor(db, kv, SECRET, t, recovery![0])).ok).toBe(false);
	});

	it('sessions can be revoked for all devices', async () => {
		const token = await createSession(kv, 'student', 'abc');
		expect(await validateSession(kv, token)).toMatchObject({ userId: 'abc' });
		await destroyAllSessions(kv, 'student', 'abc');
		expect(await validateSession(kv, token)).toBeNull();
	});
});

describe('tenant isolation', () => {
	it('a teacher cannot see or delete students of another teacher', async () => {
		const a = await teacher('lehrer.a');
		const b = await teacher('lehrer.b');
		const s = await createStudent(db, a, { firstName: 'Ben', username: 'ben', password: 'abcd' });
		expect(await getStudent(db, b, s)).toBeNull();
		expect(await listStudents(db, b)).toHaveLength(0);
		expect(await deleteStudent(db, b, s)).toBe(false);
		expect(await getStudent(db, a, s)).not.toBeNull();
	});
});

describe('full flow: set → assignment → race → evaluation', () => {
	it('runs the 5 times table race and stores results', async () => {
		const t = await teacher();
		const s = await createStudent(db, t, {
			firstName: 'Mia',
			username: 'mia',
			password: 'sonne12',
			settings: { readAloud: 'auto' }
		});
		const drafts = generateMultiplicationRow({ row: 5, from: 1, to: 3 });
		const ids = await createTasks(
			db,
			t,
			drafts.map((d) => ({ content: d.content, tags: d.tags, origin: d.origin }))
		);
		const setId = await createSet(db, t, {
			name: '5er-Reihe',
			taskIds: ids,
			settings: { hintAfter: 1 }
		});
		await assign(db, t, { setId, studentIds: [s] });

		const [a] = await activeAssignmentsForChild(db, s);
		expect(a.setName).toBe('5er-Reihe');

		let p = await startOrResumeRun(db, kv, s, a.id, 1000);
		expect(p.settings.readAloud).toBe('auto');
		expect(p.view.current?.presentation.parts[0]).toEqual({ kind: 'text', value: '1 · 5 =' });

		// resume returns the same run
		const again = await startOrResumeRun(db, kv, s, a.id, 1500);
		expect(again.runId).toBe(p.runId);

		// first task wrong once (neighbor error), then right
		let r = await act(
			db,
			kv,
			s,
			p.runId,
			{ type: 'answer', key: p.view.current!.key, value: '10', ms: 2000 },
			2000
		);
		expect(r.feedback.outcome).toBe('wrong');
		expect(r.view.current?.hint).not.toBeNull();
		r = await act(
			db,
			kv,
			s,
			p.runId,
			{ type: 'answer', key: r.view.current!.key, value: '5', ms: 1000 },
			3000
		);
		expect(r.feedback.outcome).toBe('correct');
		p = r;
		while (p.view.status === 'running') {
			const c = p.view.current!;
			const expr = c.presentation.parts[0];
			const value =
				expr.kind === 'text' ? String(eval(expr.value.replace('·', '*').replace('=', ''))) : '0';
			p = await act(db, kv, s, p.runId, { type: 'answer', key: c.key, value, ms: 800 }, 4000);
		}
		expect(p.view.status).toBe('finished');
		expect(p.view.result).toMatchObject({ tasks: 3, firstTry: 2, stars: 2 });

		// other students cannot act on this run
		const other = await createStudent(db, t, {
			firstName: 'Tom',
			username: 'tom',
			password: 'abcd'
		});
		await expect(act(db, kv, other, p.runId, { type: 'tick' })).rejects.toBeInstanceOf(
			ValidationError
		);

		const report = await studentReport(db, t, s);
		expect(report.tasks).toBe(3);
		expect(report.firstTry).toBe(2);
		expect(report.patterns).toEqual([{ pattern: 'neighbor', count: 1 }]);
		expect(report.runs[0]).toMatchObject({ status: 'finished', stars: 2, tasksTotal: 3 });

		const csv = await exportCsv(db, t, [s]);
		expect(csv.split('\r\n')[0]).toContain('Datum;Kind;Set;Aufgabe');
		expect(csv).toContain('1 · 5 = ?');

		// deleting the child removes all results
		await deleteStudent(db, t, s);
		expect((await studentReport(db, t, s)).tasks).toBe(0);
	});
});
