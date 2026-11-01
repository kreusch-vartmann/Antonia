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
		expect(r1.feedback).toMatchObject({ outcome: 'wrong', lostGround: false });
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

	it('setback: wrong answer loses ground (task is added again)', () => {
		const s = setup({ onWrong: 'setback' });
		answer(s, { key: key(s), value: solution(s), ms: 1 }, 1);
		const before = view(s, 1).fraction;
		const r = answer(s, { key: key(s), value: '0', ms: 1 }, 2);
		expect(r.feedback.lostGround).toBe(true);
		expect(view(s, 2).fraction).toBeLessThan(before);
		// second wrong attempt on the same presentation does not add more
		answer(s, { key: key(s), value: '1', ms: 1 }, 3);
		expect(s.total).toBe(4);
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

	it('run time limit ends the run', () => {
		const s = setup({ runTimeLimit: 60 });
		answer(s, { key: key(s), value: solution(s), ms: 1 }, 1000);
		expect(tick(s, 61_000)).toBe(true);
		const v = view(s, 61_000);
		expect(v.status).toBe('timeUp');
		expect(v.result?.done).toBe(1);
		expect(v.result?.stars).toBe(1);
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
			const s = setup({ targetTime: 60, opponent: 'pacer' }, 2, 'time');
			expect(s.settings).toMatchObject({ runTimeLimit: 60, opponent: 'none' });
			answer(s, { key: key(s), value: '99', ms: 1 }, 1000);
			answer(s, { key: key(s), value: solution(s), ms: 1 }, 2000);
			answer(s, { key: key(s), value: solution(s), ms: 1 }, 59_000);
			// the task repeated after a mistake is still open
			answer(s, { key: key(s), value: solution(s), ms: 1 }, 59_999);
			expect(view(s, 59_999)).toMatchObject({ status: 'finished', mode: 'time' });
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
