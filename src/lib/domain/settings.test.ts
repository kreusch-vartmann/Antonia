import { describe, expect, it } from 'vitest';
import {
	DEFAULT_SETTINGS,
	keysForLevel,
	layerFromForm,
	resolveSettings,
	sanitizeLayer
} from './settings';

describe('settings inheritance', () => {
	it('uses defaults when nothing is set', () => {
		const r = resolveSettings({});
		expect(r.values).toEqual(DEFAULT_SETTINGS);
		expect(r.sources.hintAfter).toBe('default');
	});

	it('more specific layers win: set < student, assignment last', () => {
		const r = resolveSettings({
			set: { taskTimeLimit: 10, hintAfter: 2 },
			student: { taskTimeLimit: 0, readAloud: 'auto', ghost: true },
			assignment: { ghost: false }
		});
		expect(r.values.taskTimeLimit).toBe(0);
		expect(r.sources.taskTimeLimit).toBe('student');
		expect(r.values.hintAfter).toBe(2);
		expect(r.sources.hintAfter).toBe('set');
		expect(r.values.readAloud).toBe('auto');
		expect(r.values.ghost).toBe(false);
		expect(r.sources.ghost).toBe('assignment');
	});

	it('every setting is only effective where it can be edited', () => {
		const r = resolveSettings({
			task: { taskTimeLimit: 5 },
			set: { readAloud: 'auto', targetTime: 99, hintAfter: 3 },
			setItem: { hintAfter: 4 },
			student: { targetTime: 120, solutionAfter: 6 },
			assignment: { sound: false, targetTime: 150 }
		});
		expect(r.values.taskTimeLimit).toBe(DEFAULT_SETTINGS.taskTimeLimit);
		expect(r.values.readAloud).toBe(DEFAULT_SETTINGS.readAloud);
		expect(r.values.sound).toBe(DEFAULT_SETTINGS.sound);
		expect(r.values.solutionAfter).toBe(DEFAULT_SETTINGS.solutionAfter);
		expect(r.values.hintAfter).toBe(3);
		expect(r.values.targetTime).toBe(150);
		expect(r.sources.targetTime).toBe('assignment');
	});

	it('lists the settings of a level', () => {
		expect(keysForLevel('assignment').sort()).toEqual(
			['ghost', 'order', 'targetTime', 'tasksPerRun'].sort()
		);
		expect(keysForLevel('student')).toContain('readAloud');
		expect(keysForLevel('set')).not.toContain('readAloud');
	});

	it('ignores invalid or unknown stored values', () => {
		expect(sanitizeLayer({ choiceCount: 9, foo: 1, sound: false })).toEqual({ sound: false });
	});

	it('parses form data; empty means inherit', () => {
		const f = new FormData();
		f.set('s.answerFormat', 'choice');
		f.set('s.choiceCount', '4');
		f.set('s.sound', 'false');
		f.set('s.hintAfter', '');
		expect(layerFromForm(f)).toEqual({ answerFormat: 'choice', choiceCount: 4, sound: false });
	});
});
