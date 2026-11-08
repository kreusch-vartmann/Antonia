import { describe, expect, it } from 'vitest';
import {
	answer,
	createRun,
	pickTaskSettings,
	tick,
	timeout,
	view,
	type RunTaskDef
} from './engine';
import { DEFAULT_SETTINGS, type Settings } from '../settings';
import type { RunMode } from '../modes';
import { generateMultiplicationRow } from '../generators';
import type { ArithmeticContent } from '../formats/types';

function setup(overrides: Partial<Settings> = {}, n = 3, mode?: RunMode) {
	const settings = { ...DEFAULT_SETTINGS, ...overrides };
	const tasks: RunTaskDef[] = generateMultiplicationRow({ row: 5, from: 1, to: n }).map((d, i) => ({
		id: `t${i + 1}`,
		content: d.content,
		settings: pickTaskSettings(settings)
	}));
	return createRun({ tasks, settings, seed: 7, now: 0, mode });
}

const key = (s: ReturnType<typeof setup>) => view(s, 0).current!.key;
const solution = (s: ReturnType<typeof setup>) => String(s.tasks[s.current!.taskId].content.answer);

function setupFill(
	overrides: Partial<Settings> = {},
	decompose: 'fill' | 'show' = 'fill',
	mode?: RunMode
) {
	const settings = { ...DEFAULT_SETTINGS, ...overrides };
	const content: ArithmeticContent = {
		format: 'arithmetic',
		expr: { a: 8, op: '+', b: 7, gap: 'result' },
		answer: 15,
		decompose
	};
	const tasks: RunTaskDef[] = [{ id: 't1', content, settings: pickTaskSettings(settings) }];
	return createRun({ tasks, settings, seed: 7, now: 0, mode });
}

describe('decomposed tasks', () => {
	it('"fill": 2, 5, 15 solve one task in three steps', () => {
		const s = setupFill();
		expect(view(s, 0).current).toMatchObject({ step: 0, steps: 3 });
		const r1 = answer(s, { key: key(s), value: '2', ms: 100 }, 100);
		expect(r1.feedback).toMatchObject({ outcome: 'correct', step: true });
		expect(s.done).toBe(0);
		expect(view(s, 100).current).toMatchObject({ step: 1, steps: 3 });
		answer(s, { key: key(s), value: '5', ms: 100 }, 200);
		const r3 = answer(s, { key: key(s), value: '15', ms: 100 }, 300);
		expect(r3.feedback).toMatchObject({ outcome: 'correct', firstTry: true });
		expect(s.status).toBe('finished');
		expect(s.done).toBe(1);
		expect(s.firstTry).toBe(1);
		expect(r3.events[0]).toMatchObject({ step: 2, steps: 3, taskId: 't1' });
	});

	it('"fill": a wrong step costs the first try but not the progress', () => {
		const s = setupFill({ solutionAfter: 2 });
		answer(s, { key: key(s), value: '3', ms: 100 }, 100);
		expect(view(s, 100).current?.hint).not.toBeNull();
		answer(s, { key: key(s), value: '2', ms: 100 }, 200);
		// hint and solution count per step
		expect(view(s, 200).current).toMatchObject({ step: 1, hint: null, solution: null });
		answer(s, { key: key(s), value: '5', ms: 100 }, 300);
		answer(s, { key: key(s), value: '15', ms: 100 }, 400);
		expect(s.firstTry).toBe(0);
		// a task that went wrong is repeated once
		expect(s.status).toBe('running');
		expect(s.total).toBe(2);
	});

	it('"fill": the solution is shown per step', () => {
		const s = setupFill({ solutionAfter: 1 });
		answer(s, { key: key(s), value: '9', ms: 100 }, 100);
		expect(view(s, 100).current?.solution).toBe('2');
		answer(s, { key: key(s), value: '2', ms: 100 }, 200);
		expect(view(s, 200).current?.solution).toBeNull();
	});

	it('"fill" in a flawless race: a wrong step is an engine failure', () => {
		const s = setupFill({}, 'fill', 'flawless');
		answer(s, { key: key(s), value: '2', ms: 100 }, 100);
		const r = answer(s, { key: key(s), value: '4', ms: 100 }, 200);
		expect(r.feedback.failed).toBe(true);
		expect(s.status).toBe('failed');
	});

	it('"fill" with choices offers numbers for every step', () => {
		const s = setupFill({ answerFormat: 'choice', choiceCount: 3 });
		const c0 = view(s, 0).current!;
		expect(c0.presentation.choices).toHaveLength(3);
		expect(c0.presentation.choices).toContain(2);
		answer(s, { key: c0.key, value: '2', ms: 1 }, 1);
		const c1 = view(s, 1).current!;
		expect(c1.presentation.choices).toContain(5);
		expect(c1.disabledChoices).toEqual([]);
	});

	it('"show" is a normal one-step task', () => {
		const s = setupFill({}, 'show');
		expect(view(s, 0).current).toMatchObject({ step: 0, steps: 1 });
		answer(s, { key: key(s), value: '15', ms: 1 }, 1);
		expect(s.status).toBe('finished');
	});
});

describe('several rounds through the set', () => {
	it('3 rounds of 5 tasks make 15 tasks with the real task ids in the events', () => {
		const s = setup({ rounds: 3 }, 5);
		expect(s.total).toBe(15);
		expect(s.uniqueTasks).toBe(15);
		const ids: string[] = [];
		const rounds: number[] = [];
		for (let i = 0; i < 15; i++) {
			expect(s.status).toBe('running');
			const r = answer(s, { key: key(s), value: solution(s), ms: 100 }, 100 * (i + 1));
			ids.push(r.events[0].taskId);
			rounds.push(r.events[0].round);
		}
		expect(s.status).toBe('finished');
		expect(ids).toEqual(Array.from({ length: 15 }, (_, i) => `t${(i % 5) + 1}`));
		expect(rounds).toEqual([0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2]);
		expect(view(s, 2000).result).toMatchObject({ tasks: 15, firstTry: 15, stars: 3 });
	});

	it('shuffles every round and never repeats a task directly at the border of two rounds', () => {
		for (let seed = 1; seed <= 40; seed++) {
			const settings = { ...DEFAULT_SETTINGS, rounds: 2, order: 'shuffle' as const };
			const tasks: RunTaskDef[] = generateMultiplicationRow({ row: 5, from: 1, to: 4 }).map(
				(d, i) => ({ id: `t${i}`, content: d.content, settings: pickTaskSettings(settings) })
			);
			const s = createRun({ tasks, settings, seed, now: 0 });
			const order = [s.current!.taskId, ...s.queue].map((k) => s.tasks[k].id);
			expect(new Set(order.slice(0, 4)).size).toBe(4);
			expect(new Set(order.slice(4)).size).toBe(4);
			expect(order[3]).not.toBe(order[4]);
		}
	});

	it('repeating a wrongly solved task still works in a later round', () => {
		const s = setup({ rounds: 2, solutionAfter: 1 }, 2);
		for (let i = 0; i < 2; i++) answer(s, { key: key(s), value: solution(s), ms: 1 }, 10 + i);
		// round 2, first task: wrong, then the solution is shown and typed in
		answer(s, { key: key(s), value: '0', ms: 1 }, 20);
		answer(s, { key: key(s), value: solution(s), ms: 1 }, 21);
		expect(s.total).toBe(5);
		answer(s, { key: key(s), value: solution(s), ms: 1 }, 22);
		answer(s, { key: key(s), value: solution(s), ms: 1 }, 23);
		expect(s.status).toBe('finished');
	});
});

describe('run engine', () => {
	it('finishes with 3 stars when everything is right on the first try', () => {
		const s = setup();
		for (let i = 0; i < 3; i++) {
			const r = answer(s, { key: key(s), value: solution(s), ms: 1000 }, 1000 * (i + 1));
			expect(r.feedback.outcome).toBe('correct');
			expect(r.events[0].correct).toBe(true);
		}
		const v = view(s, 4000);
		expect(v.status).toBe('finished');
		expect(v.fraction).toBe(1);
		expect(v.result).toMatchObject({ stars: 3, firstTry: 3, tasks: 3 });
	});

	it('pitstop: wrong answer does not move the car; hint then solution', () => {
		const s = setup({ hintAfter: 1, solutionAfter: 2 });
		const r1 = answer(s, { key: key(s), value: '99', ms: 500 }, 100);
		expect(r1.feedback).toMatchObject({ outcome: 'wrong' });
		expect(view(s, 100).fraction).toBe(0);
		expect(view(s, 100).current!.hint).not.toBeNull();
		expect(view(s, 100).current!.solution).toBeNull();
		answer(s, { key: key(s), value: '98', ms: 500 }, 200);
		expect(view(s, 200).current!.solution).toBe('5');
		const r3 = answer(s, { key: key(s), value: '5', ms: 500 }, 300);
		expect(r3.feedback).toMatchObject({ outcome: 'correct', afterSolution: true });
		// repeated later: total grows by one, car still moved forward
		expect(s.total).toBe(4);
		expect(view(s, 300).fraction).toBeCloseTo(1 / 4);
	});

	it('repeats an unsolved task only once', () => {
		const s = setup({ solutionAfter: 1 }, 1);
		answer(s, { key: key(s), value: '0', ms: 1 }, 1);
		answer(s, { key: key(s), value: '5', ms: 1 }, 2);
		expect(s.total).toBe(2);
		answer(s, { key: key(s), value: '0', ms: 1 }, 3);
		answer(s, { key: key(s), value: '5', ms: 1 }, 4);
		expect(s.status).toBe('finished');
		expect(s.total).toBe(2);
		expect(view(s, 5).result?.stars).toBe(1);
	});

	it('choice mode: offers distinct choices incl. the answer and disables wrong picks', () => {
		const s = setup({ answerFormat: 'choice', choiceCount: 3 });
		const c = view(s, 0).current!;
		expect(c.presentation.choices).toHaveLength(3);
		expect(c.presentation.choices).toContain(5);
		const wrongChoice = c.presentation.choices!.find((x) => x !== 5)!;
		answer(s, { key: c.key, value: String(wrongChoice), ms: 1 }, 1);
		expect(view(s, 1).current!.disabledChoices).toEqual([wrongChoice]);
		const again = answer(s, { key: c.key, value: String(wrongChoice), ms: 1 }, 2);
		expect(again.feedback.outcome).toBe('ignored');
	});

	it('ignores answers for an outdated task key', () => {
		const s = setup();
		const r = answer(s, { key: 'nope', value: '5', ms: 1 }, 1);
		expect(r.feedback.outcome).toBe('ignored');
		expect(r.events).toHaveLength(0);
	});

	it('task timeout (retryLater) moves the task to the end, then shows the solution', () => {
		const s = setup({ taskTimeLimit: 10 }, 1);
		const k = key(s);
		expect(timeout(s, { key: k }, 5_000).feedback.outcome).toBe('ignored'); // too early
		const r = timeout(s, { key: k }, 10_000);
		expect(r.feedback.outcome).toBe('timeout');
		expect(r.events[0].kind).toBe('timeout');
		expect(s.done).toBe(0);
		const k2 = view(s, 10_000).current!.key;
		expect(k2).not.toBe(k);
		timeout(s, { key: k2 }, 20_000);
		expect(view(s, 20_000).current!.solution).toBe('5');
		expect(view(s, 20_000).current!.taskTimeLimit).toBe(0);
	});

	it('respects tasksPerRun and shuffle deterministically', () => {
		const a = setup({ tasksPerRun: 2, order: 'shuffle' }, 10);
		const b = setup({ tasksPerRun: 2, order: 'shuffle' }, 10);
		expect(a.uniqueTasks).toBe(2);
		expect(a.current!.taskId).toBe(b.current!.taskId);
	});

	it('view never contains the solution before it is due', () => {
		const s = setup();
		const v = view(s, 0);
		expect(JSON.stringify(v.current)).not.toContain('"answer"');
		expect(v.current!.solution).toBeNull();
	});

	it('records a progress timeline for the ghost car', () => {
		const s = setup();
		answer(s, { key: key(s), value: solution(s), ms: 1 }, 2000);
		expect(s.timeline.at(-1)).toEqual([2000, 0.333]);
	});

	describe('race against the best time', () => {
		it('is flawless: a single mistake is an engine failure', () => {
			const s = setup({}, 3, 'record');
			answer(s, { key: key(s), value: solution(s), ms: 1 }, 100);
			const r = answer(s, { key: key(s), value: '99', ms: 1 }, 200);
			expect(r.feedback).toMatchObject({ outcome: 'wrong', failed: true });
			expect(view(s, 300).status).toBe('failed');
		});
	});

	describe('flawless race', () => {
		it('finishes without mistakes', () => {
			const s = setup({}, 3, 'flawless');
			for (let i = 0; i < 3; i++)
				answer(s, { key: key(s), value: solution(s), ms: 1 }, 100 * (i + 1));
			expect(view(s, 400)).toMatchObject({ status: 'finished', mode: 'flawless' });
		});

		it('a single mistake is an engine failure', () => {
			const s = setup({}, 3, 'flawless');
			answer(s, { key: key(s), value: solution(s), ms: 1 }, 100);
			const r = answer(s, { key: key(s), value: '99', ms: 1 }, 200);
			expect(r.feedback).toMatchObject({ outcome: 'wrong', failed: true });
			expect(r.events[0].correct).toBe(false);
			const v = view(s, 200);
			expect(v).toMatchObject({ status: 'failed', current: null });
			expect(v.result?.stars).toBe(0);
			// the failed run accepts no further answers
			expect(answer(s, { key: 'x', value: '1', ms: 1 }, 300).feedback.outcome).toBe('ignored');
		});

		it('a timeout counted as a mistake is an engine failure too', () => {
			const s = setup({ taskTimeLimit: 10, onTimeout: 'wrong' }, 3, 'flawless');
			const r = timeout(s, { key: key(s) }, 11_000);
			expect(r.feedback).toMatchObject({ outcome: 'timeout', failed: true });
			expect(s.status).toBe('failed');
		});

		it('a timeout that only postpones the task is no mistake', () => {
			const s = setup({ taskTimeLimit: 10, onTimeout: 'retryLater' }, 3, 'flawless');
			timeout(s, { key: key(s) }, 11_000);
			expect(s.status).toBe('running');
		});

		it('normal race tolerates mistakes', () => {
			const s = setup({}, 3, 'normal');
			answer(s, { key: key(s), value: '99', ms: 1 }, 100);
			expect(s.status).toBe('running');
		});
	});

	describe('race against the clock', () => {
		it('needs a target time', () => {
			expect(() => setup({ targetTime: 0 }, 3, 'time')).toThrow();
		});

		it('is won by reaching the finish in time, mistakes allowed', () => {
			const s = setup({ targetTime: 60 }, 2, 'time');
			answer(s, { key: key(s), value: '99', ms: 1 }, 1000);
			answer(s, { key: key(s), value: solution(s), ms: 1 }, 2000);
			answer(s, { key: key(s), value: solution(s), ms: 1 }, 59_000);
			// the task repeated after a mistake is still open
			answer(s, { key: key(s), value: solution(s), ms: 1 }, 59_999);
			expect(view(s, 59_999)).toMatchObject({ status: 'finished', mode: 'time' });
		});

		it('a normal race has no time limit', () => {
			const s = setup({ targetTime: 60 }, 3, 'normal');
			expect(tick(s, 3_600_000)).toBe(false);
			expect(s.status).toBe('running');
		});

		it('is lost when the clock car reaches the finish first', () => {
			const s = setup({ targetTime: 60 }, 3, 'time');
			answer(s, { key: key(s), value: solution(s), ms: 1 }, 1000);
			const r = answer(s, { key: key(s), value: solution(s), ms: 1 }, 60_000);
			expect(r.feedback.outcome).toBe('ignored');
			expect(view(s, 60_000).status).toBe('timeUp');
		});
	});
});
