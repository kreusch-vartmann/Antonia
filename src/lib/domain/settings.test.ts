import { describe, expect, it } from 'vitest';
import {
	DEFAULT_SETTINGS,
	SETTING_META,
	formatSettingValue,
	keysForLevel,
	layerFromForm,
	resolveSettings,
	sanitizeLayer,
	settingsSchema,
	type SettingKey
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
			student: { taskTimeLimit: 0, readAloud: 'auto' },
			assignment: { order: 'shuffle' }
		});
		expect(r.values.taskTimeLimit).toBe(0);
		expect(r.sources.taskTimeLimit).toBe('student');
		expect(r.values.hintAfter).toBe(2);
		expect(r.sources.hintAfter).toBe('set');
		expect(r.values.readAloud).toBe('auto');
		expect(r.values.order).toBe('shuffle');
		expect(r.sources.order).toBe('assignment');
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
			['order', 'targetTime', 'tasksPerRun'].sort()
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

	it('stores only deviations from the value that applies anyway', () => {
		const f = new FormData();
		f.set('s.ghost', 'false');
		f.set('s.~ghost', 'false');
		f.set('s.order', 'shuffle');
		f.set('s.~order', 'fixed');
		f.set('s.hintAfter', '2');
		f.set('s.~hintAfter', '1');
		f.set('s.solutionAfter', '2');
		f.set('s.~solutionAfter', '2');
		expect(layerFromForm(f)).toEqual({ order: 'shuffle', hintAfter: 2 });
	});

	it('every dropdown option is a valid value and zero options have words, not a 0', () => {
		for (const key of Object.keys(SETTING_META) as SettingKey[]) {
			for (const o of SETTING_META[key].options ?? []) {
				const def = DEFAULT_SETTINGS[key];
				const value = typeof def === 'number' ? Number(o.value) : o.value;
				expect(settingsSchema.shape[key].safeParse(value).success, `${key}=${o.value}`).toBe(true);
				expect(o.label, key).not.toMatch(/^\d+$/);
			}
		}
		expect(formatSettingValue('tasksPerRun', 0)).toBe('Alle Aufgaben des Sets');
		expect(formatSettingValue('hintAfter', 0)).toBe('Kein Tipp');
		expect(formatSettingValue('taskTimeLimit', 0)).toBe('Keine Begrenzung');
		expect(formatSettingValue('taskTimeLimit', 25)).toBe('25 Sekunden');
	});
});
