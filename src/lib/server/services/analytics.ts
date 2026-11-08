import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import type { Db } from '../db/types';
import { schema } from '../db/types';
import { formatOf } from '#lib/domain/formats/index.ts';
import { canSeeStudent } from './access';

const { run, answerEvent, student, taskSet } = schema;

export interface Period {
	from?: string; // YYYY-MM-DD
	to?: string;
}

function periodConds(p: Period) {
	const c = [];
	if (p.from) c.push(gte(run.startedAt, new Date(`${p.from}T00:00:00`)));
	if (p.to) c.push(lte(run.startedAt, new Date(`${p.to}T23:59:59`)));
	return c;
}

export function median(xs: number[]): number | null {
	if (xs.length === 0) return null;
	const s = [...xs].sort((a, b) => a - b);
	const m = Math.floor(s.length / 2);
	return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

function isoWeek(d: Date): string {
	const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
	const day = t.getUTCDay() || 7;
	t.setUTCDate(t.getUTCDate() + 4 - day);
	const y = t.getUTCFullYear();
	const w = Math.ceil(((t.getTime() - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
	return `${y}-KW${String(w).padStart(2, '0')}`;
}

type EventRow = typeof answerEvent.$inferSelect & { startedAt: Date; setName: string };

export interface FamilyStat {
	family: string;
	tasks: number;
	firstTry: number;
	firstTryRate: number;
	medianMs: number | null;
	hintRate: number;
	solutionRate: number;
}

export function summarize(events: EventRow[]) {
	// Group by presentation (run, task, round, presentation)
	const pres = new Map<string, EventRow[]>();
	for (const e of events) {
		const k = `${e.runId}|${e.taskId ?? JSON.stringify(e.taskSnapshot)}|${e.round}|${e.presentation}`;
		const list = pres.get(k) ?? [];
		list.push(e);
		pres.set(k, list);
	}
	const fam = new Map<
		string,
		{ tasks: number; firstTry: number; ms: number[]; hint: number; solution: number }
	>();
	const taskStats = new Map<
		string,
		{ label: string; tasks: number; errors: number; firstTry: number }
	>();
	const weekly = new Map<string, { tasks: number; firstTry: number }>();
	let tasks = 0;
	let firstTry = 0;
	const allMs: number[] = [];
	for (const list of pres.values()) {
		list.sort((a, b) => a.seq - b.seq);
		const first = list[0];
		if (first.presentation !== 1) continue; // repetitions are counted via errors only
		// right on the first try in every step (tasks with several answers have several events)
		const ok = list.every((e) => e.kind === 'answer' && e.correct && e.attempt === 1);
		const correctMs = list.filter((e) => e.correct && e.ms != null).map((e) => e.ms as number);
		const family = first.family ?? 'sonstige';
		const f = fam.get(family) ?? { tasks: 0, firstTry: 0, ms: [], hint: 0, solution: 0 };
		f.tasks++;
		tasks++;
		if (ok) {
			f.firstTry++;
			firstTry++;
		}
		if (correctMs.length > 0) {
			const total = correctMs.reduce((x, y) => x + y, 0);
			f.ms.push(total);
			allMs.push(total);
		}
		if (list.some((e) => e.hintShown)) f.hint++;
		if (list.some((e) => e.solutionShown)) f.solution++;
		fam.set(family, f);

		const label = formatOf(first.taskSnapshot).label1(first.taskSnapshot);
		const t = taskStats.get(label) ?? { label, tasks: 0, errors: 0, firstTry: 0 };
		t.tasks++;
		if (ok) t.firstTry++;
		taskStats.set(label, t);

		const w = isoWeek(first.startedAt);
		const ws = weekly.get(w) ?? { tasks: 0, firstTry: 0 };
		ws.tasks++;
		if (ok) ws.firstTry++;
		weekly.set(w, ws);
	}
	const patterns = new Map<string, number>();
	for (const e of events) {
		if (!e.correct && e.kind === 'answer') {
			const label = formatOf(e.taskSnapshot).label1(e.taskSnapshot);
			const t = taskStats.get(label);
			if (t) t.errors++;
			if (e.errorPattern) patterns.set(e.errorPattern, (patterns.get(e.errorPattern) ?? 0) + 1);
		}
	}
	const families: FamilyStat[] = [...fam.entries()]
		.map(([family, f]) => ({
			family,
			tasks: f.tasks,
			firstTry: f.firstTry,
			firstTryRate: f.tasks ? f.firstTry / f.tasks : 0,
			medianMs: median(f.ms),
			hintRate: f.tasks ? f.hint / f.tasks : 0,
			solutionRate: f.tasks ? f.solution / f.tasks : 0
		}))
		.sort((a, b) => a.family.localeCompare(b.family, 'de'));
	return {
		tasks,
		firstTry,
		firstTryRate: tasks ? firstTry / tasks : 0,
		medianMs: median(allMs),
		families,
		patterns: [...patterns.entries()]
			.sort((a, b) => b[1] - a[1])
			.map(([pattern, count]) => ({ pattern, count })),
		hardest: [...taskStats.values()]
			.filter((t) => t.errors > 0)
			.sort((a, b) => b.errors - a.errors || a.firstTry / a.tasks - b.firstTry / b.tasks)
			.slice(0, 10),
		weekly: [...weekly.entries()]
			.sort((a, b) => a[0].localeCompare(b[0]))
			.map(([week, w]) => ({
				week,
				tasks: w.tasks,
				firstTryRate: w.tasks ? w.firstTry / w.tasks : 0
			}))
	};
}

async function eventsFor(
	db: Db,
	teacherId: string,
	studentIds: string[],
	p: Period
): Promise<EventRow[]> {
	if (studentIds.length === 0) return [];
	const rows = await db
		.select({ e: answerEvent, startedAt: run.startedAt, setName: taskSet.name })
		.from(answerEvent)
		.innerJoin(run, eq(run.id, answerEvent.runId))
		.innerJoin(student, eq(student.id, run.studentId))
		.innerJoin(taskSet, eq(taskSet.id, run.setId))
		.where(and(canSeeStudent(teacherId), inArray(run.studentId, studentIds), ...periodConds(p)))
		.orderBy(run.startedAt, answerEvent.seq);
	return rows.map((r) => ({ ...r.e, startedAt: r.startedAt, setName: r.setName }));
}

export async function studentReport(db: Db, teacherId: string, studentId: string, p: Period = {}) {
	const events = await eventsFor(db, teacherId, [studentId], p);
	const runs = await db
		.select({
			id: run.id,
			setName: taskSet.name,
			status: run.status,
			mode: run.mode,
			startedAt: run.startedAt,
			durationMs: run.durationMs,
			stars: run.stars,
			tasksTotal: run.tasksTotal,
			tasksDone: run.tasksDone,
			firstTryCorrect: run.firstTryCorrect
		})
		.from(run)
		.innerJoin(taskSet, eq(taskSet.id, run.setId))
		.innerJoin(student, eq(student.id, run.studentId))
		.where(and(eq(run.studentId, studentId), canSeeStudent(teacherId), ...periodConds(p)))
		.orderBy(desc(run.startedAt))
		.limit(100);
	return { ...summarize(events), runs };
}

export async function overview(db: Db, teacherId: string) {
	return db
		.select({
			id: student.id,
			displayName: student.displayName,
			firstName: student.firstName,
			lastName: student.lastName,
			lastRun: sql<Date | null>`(select max(started_at) from run r where r.student_id = "student"."id")`,
			runs14: sql<number>`(select count(*)::int from run r where r.student_id = "student"."id" and r.status in ('finished','timeUp') and r.started_at > now() - interval '14 days')`,
			tasks14: sql<number>`(select coalesce(sum(tasks_total),0)::int from run r where r.student_id = "student"."id" and r.status in ('finished','timeUp') and r.started_at > now() - interval '14 days')`,
			firstTry14: sql<number>`(select coalesce(sum(first_try_correct),0)::int from run r where r.student_id = "student"."id" and r.status in ('finished','timeUp') and r.started_at > now() - interval '14 days')`,
			openAssignments: sql<number>`(select count(*)::int from assignment a where a.student_id = "student"."id" and a.archived = false and (a.ends_on is null or a.ends_on >= current_date))`
		})
		.from(student)
		.where(canSeeStudent(teacherId))
		.orderBy(student.firstName);
}

export async function runDetail(db: Db, teacherId: string, runId: string) {
	const [r] = await db
		.select({ run, setName: taskSet.name, studentName: student.displayName, studentId: student.id })
		.from(run)
		.innerJoin(student, eq(student.id, run.studentId))
		.innerJoin(taskSet, eq(taskSet.id, run.setId))
		.where(and(eq(run.id, runId), canSeeStudent(teacherId)));
	if (!r) return null;
	const events = await db
		.select()
		.from(answerEvent)
		.where(eq(answerEvent.runId, runId))
		.orderBy(answerEvent.seq);
	return { ...r, events };
}

function csvCell(v: unknown): string {
	if (v === null || v === undefined) return '';
	let s = String(v);
	// Prevent formula injection in spreadsheet programs.
	if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
	return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV (semicolon separated, for German Excel/LibreOffice). */
export async function exportCsv(db: Db, teacherId: string, studentIds: string[], p: Period = {}) {
	const owned = studentIds.length
		? await db
				.select({ id: student.id, displayName: student.displayName })
				.from(student)
				.where(and(canSeeStudent(teacherId), inArray(student.id, studentIds)))
		: [];
	const names = new Map(owned.map((s) => [s.id, s.displayName]));
	const rows = owned.length
		? await db
				.select({
					e: answerEvent,
					startedAt: run.startedAt,
					setName: taskSet.name,
					studentId: run.studentId
				})
				.from(answerEvent)
				.innerJoin(run, eq(run.id, answerEvent.runId))
				.innerJoin(taskSet, eq(taskSet.id, run.setId))
				.where(and(inArray(run.studentId, [...names.keys()]), ...periodConds(p)))
				.orderBy(run.startedAt, answerEvent.seq)
		: [];
	const header = [
		'Datum',
		'Kind',
		'Set',
		'Aufgabe',
		'Lösung',
		'Antwort',
		'Richtig',
		'Versuch',
		'Durchgang',
		'Hilfe gezeigt',
		'Lösung gezeigt',
		'Zeit (s)',
		'Aufgabenart',
		'Fehlermuster',
		'Art'
	];
	const lines = [header.join(';')];
	for (const r of rows) {
		const e = r.e;
		const fmt = formatOf(e.taskSnapshot);
		lines.push(
			[
				new Date(e.createdAt).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }),
				names.get(r.studentId) ?? '',
				r.setName,
				fmt.label1(e.taskSnapshot),
				fmt.solution(e.taskSnapshot),
				e.given,
				e.correct ? 'ja' : 'nein',
				e.attempt,
				e.presentation,
				e.hintShown ? 'ja' : 'nein',
				e.solutionShown ? 'ja' : 'nein',
				e.ms != null ? (e.ms / 1000).toFixed(1).replace('.', ',') : '',
				e.family,
				e.errorPattern,
				e.kind === 'timeout' ? 'Zeit abgelaufen' : 'Antwort'
			]
				.map(csvCell)
				.join(';')
		);
	}
	return '\ufeff' + lines.join('\r\n') + '\r\n';
}

/** Full data export of one child (GDPR access request). */
export async function exportStudentJson(db: Db, teacherId: string, studentId: string) {
	const [s] = await db
		.select({
			id: student.id,
			firstName: student.firstName,
			lastName: student.lastName,
			displayName: student.displayName,
			username: student.username,
			settings: student.settings,
			car: student.car,
			notes: student.notes,
			createdAt: student.createdAt
		})
		.from(student)
		.where(and(eq(student.id, studentId), eq(student.teacherId, teacherId)));
	if (!s) return null;
	const assignments = await db
		.select()
		.from(schema.assignment)
		.where(eq(schema.assignment.studentId, studentId));
	const runs = await db.select().from(run).where(eq(run.studentId, studentId));
	const runIds = runs.map((r) => r.id);
	const answers = runIds.length
		? await db.select().from(answerEvent).where(inArray(answerEvent.runId, runIds))
		: [];
	return { exportedAt: new Date().toISOString(), student: s, assignments, runs, answers };
}
