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
import {
	assign,
	createSet,
	activeAssignmentsForChild,
	listAssignmentsForSet,
	listAssignmentsForStudent,
	listSets,
	updateAssignment
} from '#lib/server/services/sets.ts';
import { act, startOrResumeRun, type RunPayload } from '#lib/server/services/runs.ts';
import { listTrophies, trophyDetail } from '#lib/server/services/trophies.ts';
import type { RunMode } from '#lib/domain/modes.ts';
import { exportCsv, overview, studentReport } from '#lib/server/services/analytics.ts';
import { generateMultiplicationRow } from '#lib/domain/generators.ts';
import { generateTotpSecret, totpAt } from '#lib/server/auth/totp.ts';
import { schema } from '#lib/server/db/types.ts';
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

		const T = Date.now();
		let p = await startOrResumeRun(db, kv, s, a.id, 'normal', T);
		expect(p.settings.readAloud).toBe('auto');
		expect(p.view.current?.presentation.parts[0]).toEqual({ kind: 'text', value: '1 · 5 =' });

		// resume returns the same run
		const again = await startOrResumeRun(db, kv, s, a.id, 'normal', T + 500);
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
			p = await act(db, kv, s, p.runId, { type: 'answer', key: c.key, value, ms: 800 }, T + 4000);
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

		const [setRow] = await listSets(db, t);
		expect(setRow).toMatchObject({ items: 3, assignments: 1 });
		expect((await listAssignmentsForSet(db, t, setId))[0]).toMatchObject({ runs: 1, bestStars: 2 });
		expect((await listAssignmentsForStudent(db, t, s))[0]).toMatchObject({ runs: 1, bestStars: 2 });
		expect((await activeAssignmentsForChild(db, s))[0]).toMatchObject({
			items: 3,
			runs: 1,
			bestStars: 2
		});
		const ov = await overview(db, t);
		expect(ov.find((o) => o.id === s)).toMatchObject({ runs14: 1, tasks14: 3, firstTry14: 2 });

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

describe('race modes and trophies', () => {
	async function fixture(assignmentSettings = {}) {
		const t = await teacher();
		const s = await createStudent(db, t, {
			firstName: 'Mia',
			username: 'mia',
			password: 'sonne12'
		});
		const drafts = generateMultiplicationRow({ row: 5, from: 1, to: 2 });
		const ids = await createTasks(
			db,
			t,
			drafts.map((d) => ({ content: d.content, tags: d.tags, origin: d.origin }))
		);
		const setId = await createSet(db, t, { name: '5er-Reihe', taskIds: ids });
		await assign(db, t, { setId, studentIds: [s], settings: assignmentSettings });
		const [a] = await activeAssignmentsForChild(db, s);
		return { t, s, a };
	}

	const answerCurrent = (s: string, p: RunPayload, now: number, wrong = false) => {
		const c = p.view.current!;
		const expr = c.presentation.parts[0];
		const value =
			expr.kind === 'text' && !wrong
				? String(eval(expr.value.replace('·', '*').replace('=', '')))
				: '999';
		return act(db, kv, s, p.runId, { type: 'answer', key: c.key, value, ms: 500 }, now);
	};

	async function drive(s: string, assignmentId: string, mode: RunMode, T: number) {
		let p: RunPayload = await startOrResumeRun(db, kv, s, assignmentId, mode, T);
		let n = 0;
		while (p.view.status === 'running') p = await answerCurrent(s, p, T + 1000 * ++n);
		return p;
	}

	it('awards a bronze trophy for a normal race, with the set name', async () => {
		const { s, a } = await fixture();
		const p = await drive(s, a.id, 'normal', Date.now());
		expect(p.view.status).toBe('finished');
		const list = await listTrophies(db, s);
		expect(list).toHaveLength(1);
		expect(list[0]).toMatchObject({ kind: 'bronze', mode: 'normal', setName: '5er-Reihe' });
	});

	it('flawless: a mistake ends the run without a trophy, a clean run gets silver', async () => {
		const { s, a } = await fixture();
		const T = Date.now();
		let p = await startOrResumeRun(db, kv, s, a.id, 'flawless', T);
		const crash = await answerCurrent(s, p, T + 1000, true);
		p = crash;
		expect(crash.view.status).toBe('failed');
		expect(crash.feedback.failed).toBe(true);
		expect(await listTrophies(db, s)).toHaveLength(0);

		// the next attempt starts from scratch
		const next = await startOrResumeRun(db, kv, s, a.id, 'flawless', T + 2000);
		expect(next.runId).not.toBe(p.runId);
		expect(next.view).toMatchObject({ status: 'running', done: 0 });

		p = await drive(s, a.id, 'flawless', T + 3000);
		expect(p.view.status).toBe('finished');
		expect(p.runId).toBe(next.runId);
		expect(await listTrophies(db, s)).toMatchObject([{ kind: 'silver', mode: 'flawless' }]);
	});

	it('time race is not available without a target time', async () => {
		const { s, a } = await fixture();
		expect(a.targetTime).toBe(0);
		expect(a.modes).toEqual(['normal', 'flawless']);
		await expect(startOrResumeRun(db, kv, s, a.id, 'time', Date.now())).rejects.toBeInstanceOf(
			ValidationError
		);
	});

	it('time race awards gold with the time when the finish is reached in time', async () => {
		const { s, a } = await fixture({ targetTime: 60 });
		expect(a.targetTime).toBe(60);
		const T = Date.now();
		const start = await startOrResumeRun(db, kv, s, a.id, 'time', T);
		expect(start.settings).toMatchObject({ targetTime: 60, ghost: false });

		// too slow: no trophy
		const late = await act(db, kv, s, start.runId, { type: 'tick' }, T + 61_000);
		expect(late.view.status).toBe('timeUp');
		expect(await listTrophies(db, s)).toHaveLength(0);

		// mistakes allowed when fast enough
		let p = await startOrResumeRun(db, kv, s, a.id, 'time', T + 100_000);
		p = await answerCurrent(s, p, T + 101_000, true);
		expect(p.view.status).toBe('running');
		let n = 1;
		while (p.view.status === 'running') p = await answerCurrent(s, p, T + 101_000 + 1000 * ++n);
		expect(p.view.status).toBe('finished');
		const [gold] = await listTrophies(db, s);
		expect(gold).toMatchObject({ kind: 'gold', mode: 'time', targetMs: 60_000 });
		expect(gold.durationMs).toBeLessThan(60_000);
	});

	it('every successful race gives a new trophy, newest first', async () => {
		const { s, a } = await fixture({ targetTime: 600 });
		const T = Date.now();
		await drive(s, a.id, 'normal', T);
		await drive(s, a.id, 'flawless', T + 100_000);
		await drive(s, a.id, 'time', T + 200_000);
		await drive(s, a.id, 'normal', T + 300_000);
		expect((await listTrophies(db, s)).map((x) => x.kind)).toEqual([
			'bronze',
			'gold',
			'silver',
			'bronze'
		]);
		// a finished run is never rewarded twice
		const [run] = await db.select().from(schema.run).limit(1);
		await expect(
			db.insert(schema.trophy).values({
				studentId: s,
				runId: run.id,
				kind: 'bronze',
				mode: 'normal',
				setName: 'x'
			})
		).rejects.toThrow();
	});

	it('trophies are deleted together with the child', async () => {
		const { t, s, a } = await fixture();
		await drive(s, a.id, 'normal', Date.now());
		await deleteStudent(db, t, s);
		expect(await listTrophies(db, s)).toHaveLength(0);
	});

	it('stores the number of mistakes and shows the whole race with tips for wrong answers', async () => {
		const { t, s, a } = await fixture();
		const T = Date.now();
		let p = await startOrResumeRun(db, kv, s, a.id, 'normal', T);
		p = await answerCurrent(s, p, T + 1000, true); // wrong
		p = await answerCurrent(s, p, T + 2000, true); // wrong again (solution shown)
		let n = 2;
		while (p.view.status === 'running') p = await answerCurrent(s, p, T + 2000 + 1000 * ++n);
		const [row] = await listTrophies(db, s);
		expect(row.mistakes).toBe(2);

		const detail = await trophyDetail(db, s, row.id);
		expect(detail?.trophy).toMatchObject({ kind: 'bronze', setName: '5er-Reihe', mistakes: 2 });
		expect(detail?.tasks.map((x) => x.text)).toEqual(['1 · 5 = 5', '2 · 5 = 10']);
		expect(detail?.tasks[0].wrong).toEqual(['999', '999']);
		expect(detail?.tasks[0].hint?.text).toBeTruthy();
		expect(detail?.tasks[1].wrong).toEqual([]);
		expect(detail?.tasks[1].hint).toBeNull();

		// another child cannot open the trophy
		const other = await createStudent(db, t, {
			firstName: 'Tom',
			username: 'tom',
			password: 'abcd'
		});
		expect(await trophyDetail(db, other, row.id)).toBeNull();
	});

	it('the teacher decides which race modes the child may use', async () => {
		const { t, s, a } = await fixture({ targetTime: 600 });
		expect(a.modes).toEqual(['normal', 'flawless', 'time']);

		await updateAssignment(db, t, a.id, { modes: ['flawless'], settings: { targetTime: 600 } });
		const [only] = await activeAssignmentsForChild(db, s);
		expect(only.modes).toEqual(['flawless']);
		await expect(startOrResumeRun(db, kv, s, a.id, 'normal')).rejects.toBeInstanceOf(
			ValidationError
		);
		await expect(startOrResumeRun(db, kv, s, a.id, 'time')).rejects.toBeInstanceOf(ValidationError);
		expect((await startOrResumeRun(db, kv, s, a.id, 'flawless')).view.mode).toBe('flawless');

		await expect(updateAssignment(db, t, a.id, { modes: [] })).rejects.toBeInstanceOf(
			ValidationError
		);
		const list = await listAssignmentsForStudent(db, t, s);
		expect(list[0].modes).toEqual(['flawless']);
	});

	it('the time race needs a target time: the teacher is asked for it', async () => {
		const { t, s, a } = await fixture(); // no target time
		await expect(
			updateAssignment(db, t, a.id, { modes: ['time'], settings: {} })
		).rejects.toBeInstanceOf(ValidationError);
		await updateAssignment(db, t, a.id, { modes: ['time'], settings: { targetTime: 90 } });
		expect((await activeAssignmentsForChild(db, s))[0]).toMatchObject({
			modes: ['time'],
			targetTime: 90
		});
		// a leftover without target time (old data) is never offered to the child
		await db.update(schema.assignment).set({ settings: {} });
		expect((await activeAssignmentsForChild(db, s))[0].modes).toEqual([]);
	});

	it('new assignments can be restricted to certain modes right away', async () => {
		const t = await teacher();
		const s = await createStudent(db, t, {
			firstName: 'Mia',
			username: 'mia',
			password: 'sonne12'
		});
		const ids = await createTasks(
			db,
			t,
			generateMultiplicationRow({ row: 5, from: 1, to: 2 }).map((d) => ({
				content: d.content,
				tags: d.tags,
				origin: d.origin
			}))
		);
		const setId = await createSet(db, t, { name: 'Set', taskIds: ids });
		await assign(db, t, { setId, studentIds: [s], modes: ['normal'] });
		expect((await activeAssignmentsForChild(db, s))[0].modes).toEqual(['normal']);
		await expect(assign(db, t, { setId, studentIds: [s], modes: [] })).rejects.toBeInstanceOf(
			ValidationError
		);
	});

	it('ghost car: the best finished run of the assignment drives along, in every mode but the time race', async () => {
		const { s, a } = await fixture({ ghost: true, targetTime: 600 });
		const T = Date.now();
		const first = await startOrResumeRun(db, kv, s, a.id, 'normal', T);
		expect(first.settings.ghost).toBe(true);
		expect(first.ghost).toBeNull(); // no earlier run yet
		let p = first;
		let n = 0;
		while (p.view.status === 'running') p = await answerCurrent(s, p, T + 1000 * ++n);
		expect(p.view.status).toBe('finished');

		for (const mode of ['normal', 'flawless'] as const) {
			const next = await startOrResumeRun(db, kv, s, a.id, mode, T + 100_000);
			expect(next.ghost, mode).not.toBeNull();
			expect(next.ghost!.at(-1)![1]).toBe(1);
		}
		const time = await startOrResumeRun(db, kv, s, a.id, 'time', T + 100_000);
		expect(time.settings.ghost).toBe(false);
		expect(time.ghost).toBeNull();
	});
});
