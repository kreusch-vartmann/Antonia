import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, layerFromForm, resolveSettings, sanitizeLayer } from './settings';

describe('settings inheritance', () => {
	it('uses defaults when nothing is set', () => {
		const r = resolveSettings({});
		expect(r.values).toEqual(DEFAULT_SETTINGS);
		expect(r.sources.onWrong).toBe('default');
	});

	it('more specific layers win: task < set < student < assignment', () => {
		const r = resolveSettings({
			task: { taskTimeLimit: 5, answerFormat: 'choice' },
			set: { taskTimeLimit: 10 },
			student: { taskTimeLimit: 0, readAloud: 'auto' },
			assignment: { readAloud: 'off' }
		});
		expect(r.values.taskTimeLimit).toBe(0);
		expect(r.sources.taskTimeLimit).toBe('student');
		expect(r.values.answerFormat).toBe('choice');
		expect(r.sources.answerFormat).toBe('task');
		expect(r.values.readAloud).toBe('off');
		expect(r.sources.readAloud).toBe('assignment');
	});

	it('ignores invalid or unknown stored values', () => {
		expect(sanitizeLayer({ choiceCount: 9, foo: 1, sound: false })).toEqual({ sound: false });
	});

	it('parses form data; empty means inherit', () => {
		const f = new FormData();
		f.set('s.answerFormat', 'choice');
		f.set('s.choiceCount', '4');
		f.set('s.sound', 'false');
		f.set('s.onWrong', '');
		expect(layerFromForm(f)).toEqual({ answerFormat: 'choice', choiceCount: 4, sound: false });
	});
});
