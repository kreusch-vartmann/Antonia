/**
 * Database schema.
 *
 * After changing this file run `npm run db:generate` to create a SQL migration
 * in ./drizzle. Migrations are applied automatically on app start.
 *
 * Privacy: personal data lives only in `teacher` and `student`. Deleting a
 * student cascades to all of their assignments, runs, answers and trophies.
 */
import {
	boolean,
	date,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid
} from 'drizzle-orm/pg-core';
import type { SettingsLayer } from '#lib/domain/settings.ts';
import type { TaskContent, TaskOrigin } from '#lib/domain/formats/types.ts';
import type { RunMode, TrophyKind } from '#lib/domain/modes.ts';

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow();

/** Technical key/value metadata. Never personal data. */
export const appMeta = pgTable('app_meta', {
	key: text('key').primaryKey(),
	value: text('value').notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const teacher = pgTable(
	'teacher',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		username: text('username').notNull(),
		displayName: text('display_name').notNull(),
		passwordHash: text('password_hash').notNull(),
		/** AES-GCM encrypted TOTP secret (null = 2FA off). */
		totpSecretEnc: text('totp_secret_enc'),
		/** SHA-256 hashes of unused recovery codes. */
		recoveryCodes: jsonb('recovery_codes').$type<string[]>().notNull().default([]),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [uniqueIndex('teacher_username_uq').on(t.username)]
);

export const student = pgTable(
	'student',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		teacherId: uuid('teacher_id')
			.notNull()
			.references(() => teacher.id, { onDelete: 'cascade' }),
		firstName: text('first_name').notNull(),
		lastName: text('last_name'),
		/** Shown to the child and in the race. */
		displayName: text('display_name').notNull(),
		username: text('username').notNull(),
		passwordHash: text('password_hash').notNull(),
		/** Child-specific settings (e.g. compensation for disadvantages). */
		settings: jsonb('settings').$type<SettingsLayer>().notNull().default({}),
		car: jsonb('car').$type<{ model: string; color: string }>(),
		notes: text('notes'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('student_username_uq').on(t.username),
		index('student_teacher_idx').on(t.teacherId)
	]
);

export const task = pgTable(
	'task',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		teacherId: uuid('teacher_id')
			.notNull()
			.references(() => teacher.id, { onDelete: 'cascade' }),
		subject: text('subject').notNull().default('mathe'),
		format: text('format').notNull(),
		content: jsonb('content').$type<TaskContent>().notNull(),
		tags: text('tags').array().notNull().default([]),
		origin: jsonb('origin').$type<TaskOrigin>().notNull().default({ kind: 'manual' }),
		settings: jsonb('settings').$type<SettingsLayer>().notNull().default({}),
		archived: boolean('archived').notNull().default(false),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [index('task_teacher_idx').on(t.teacherId)]
);

export const taskSet = pgTable(
	'task_set',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		teacherId: uuid('teacher_id')
			.notNull()
			.references(() => teacher.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		description: text('description'),
		scenario: text('scenario').notNull().default('race'),
		settings: jsonb('settings').$type<SettingsLayer>().notNull().default({}),
		archived: boolean('archived').notNull().default(false),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [index('task_set_teacher_idx').on(t.teacherId)]
);

export const taskSetItem = pgTable(
	'task_set_item',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		setId: uuid('set_id')
			.notNull()
			.references(() => taskSet.id, { onDelete: 'cascade' }),
		taskId: uuid('task_id')
			.notNull()
			.references(() => task.id, { onDelete: 'cascade' }),
		position: integer('position').notNull(),
		settings: jsonb('settings').$type<SettingsLayer>().notNull().default({})
	},
	(t) => [index('task_set_item_set_idx').on(t.setId, t.position)]
);

export const assignment = pgTable(
	'assignment',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		setId: uuid('set_id')
			.notNull()
			.references(() => taskSet.id, { onDelete: 'cascade' }),
		studentId: uuid('student_id')
			.notNull()
			.references(() => student.id, { onDelete: 'cascade' }),
		startsOn: date('starts_on'),
		endsOn: date('ends_on'),
		settings: jsonb('settings').$type<SettingsLayer>().notNull().default({}),
		/** Race modes the child may use with this assignment. */
		modes: text('modes')
			.array()
			.$type<RunMode[]>()
			.notNull()
			.default(['normal', 'flawless', 'time']),
		/** Child-facing progress (stars, best time, unlock) only counts runs started after this. */
		progressResetAt: timestamp('progress_reset_at', { withTimezone: true }),
		archived: boolean('archived').notNull().default(false),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [index('assignment_student_idx').on(t.studentId), index('assignment_set_idx').on(t.setId)]
);

export type RunStatus = 'running' | 'finished' | 'aborted' | 'timeUp' | 'failed';

export const run = pgTable(
	'run',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		assignmentId: uuid('assignment_id')
			.notNull()
			.references(() => assignment.id, { onDelete: 'cascade' }),
		studentId: uuid('student_id')
			.notNull()
			.references(() => student.id, { onDelete: 'cascade' }),
		setId: uuid('set_id')
			.notNull()
			.references(() => taskSet.id, { onDelete: 'cascade' }),
		status: text('status').$type<RunStatus>().notNull().default('running'),
		mode: text('mode').$type<RunMode>().notNull().default('normal'),
		startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
		finishedAt: timestamp('finished_at', { withTimezone: true }),
		durationMs: integer('duration_ms'),
		stars: integer('stars'),
		tasksTotal: integer('tasks_total').notNull().default(0),
		tasksDone: integer('tasks_done').notNull().default(0),
		firstTryCorrect: integer('first_try_correct').notNull().default(0),
		/** Snapshot of effective run-level settings. */
		settings: jsonb('settings').$type<Record<string, unknown>>().notNull().default({}),
		/** Progress over time [[ms, fraction], ...] for the ghost car. */
		timeline: jsonb('timeline').$type<[number, number][]>().notNull().default([])
	},
	(t) => [
		index('run_student_idx').on(t.studentId, t.startedAt),
		index('run_assignment_idx').on(t.assignmentId)
	]
);

/**
 * One trophy per successfully finished race. Name and times are snapshots so the
 * display case stays intact when the set is renamed or deleted.
 */
export const trophy = pgTable(
	'trophy',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		studentId: uuid('student_id')
			.notNull()
			.references(() => student.id, { onDelete: 'cascade' }),
		runId: uuid('run_id').references(() => run.id, { onDelete: 'set null' }),
		kind: text('kind').$type<TrophyKind>().notNull(),
		mode: text('mode').$type<RunMode>().notNull(),
		setName: text('set_name').notNull(),
		durationMs: integer('duration_ms'),
		targetMs: integer('target_ms'),
		/** Wrong answers during the race. */
		mistakes: integer('mistakes').notNull().default(0),
		earnedAt: timestamp('earned_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		index('trophy_student_idx').on(t.studentId, t.earnedAt),
		uniqueIndex('trophy_run_uq').on(t.runId)
	]
);

export const answerEvent = pgTable(
	'answer_event',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		runId: uuid('run_id')
			.notNull()
			.references(() => run.id, { onDelete: 'cascade' }),
		/** Set null if the task is deleted later; snapshot keeps the evaluation readable. */
		taskId: uuid('task_id').references(() => task.id, { onDelete: 'set null' }),
		taskSnapshot: jsonb('task_snapshot').$type<TaskContent>().notNull(),
		family: text('family'),
		seq: integer('seq').notNull(),
		kind: text('kind').$type<'answer' | 'timeout'>().notNull(),
		given: text('given'),
		correct: boolean('correct').notNull(),
		/** Attempt number within this presentation (1 = first try). */
		attempt: integer('attempt').notNull(),
		/** Presentation number of this task within the run (1 = first time). */
		presentation: integer('presentation').notNull().default(1),
		/** Pass through the whole set (0 = first), when the set is practised several times. */
		round: integer('round').notNull().default(0),
		/** Step of a multi-step task (decomposition): 0-based, and the number of steps. */
		step: integer('step').notNull().default(0),
		steps: integer('steps').notNull().default(1),
		hintShown: boolean('hint_shown').notNull().default(false),
		solutionShown: boolean('solution_shown').notNull().default(false),
		ms: integer('ms'),
		errorPattern: text('error_pattern'),
		createdAt: createdAt()
	},
	(t) => [index('answer_event_run_idx').on(t.runId, t.seq)]
);

export const auditLog = pgTable(
	'audit_log',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		teacherId: uuid('teacher_id').references(() => teacher.id, { onDelete: 'cascade' }),
		action: text('action').notNull(),
		targetType: text('target_type'),
		targetId: uuid('target_id'),
		at: timestamp('at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('audit_teacher_idx').on(t.teacherId, t.at)]
);
