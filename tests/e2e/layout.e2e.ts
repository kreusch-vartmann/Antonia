/**
 * Layout and colour check of the race on every device profile (incl. the Safari engine in CI):
 * the track is shown completely, the keypad fits without scrolling, tiles are visible,
 * the first number is blue and the second red. Every project uses its own child and set.
 */
import { expect, test } from '@playwright/test';
import { a11y, shots, teacherLogin } from './helpers';

test.describe.configure({ mode: 'serial' });

let username = '';
let password = '';
let kidName = '';

test('teacher prepares a child and a plus set', async ({ page }, testInfo) => {
	const project = testInfo.project.name.replace(/[^a-z0-9]/gi, '');
	kidName = `Layout${project}`;
	await teacherLogin(page);

	await page.goto('/lehrkraft/kinder/neu');
	await page.getByLabel('Vorname *').fill(kidName);
	username = await page.getByLabel('Benutzername *').inputValue();
	password = await page.getByLabel('Passwort *').inputValue();
	await page.getByRole('button', { name: 'Anlegen', exact: true }).click();
	await expect(page.getByText('Das Kind wurde angelegt.')).toBeVisible();

	await page.goto('/lehrkraft/sets/neu');
	await page.getByRole('radio', { name: 'Plus', exact: true }).check({ force: true });
	await page.getByRole('radio', { name: 'bis 20' }).check({ force: true });
	await page.getByLabel('mit Übergang').check();
	await page.getByLabel('Anzahl der Aufgaben').fill('5');
	await page.getByRole('button', { name: 'Aufgaben erzeugen' }).click();
	await expect(page.getByRole('heading', { name: /Vorschau \(5 Aufgaben\)/ })).toBeVisible();
	await page.getByLabel('Name des Sets').fill(`Plus ${project}`);
	await page.getByRole('button', { name: 'Set speichern' }).click();
	await expect(page.getByRole('heading', { name: `Plus ${project}` })).toBeVisible();

	await page.getByLabel(kidName, { exact: true }).check();
	await page.getByRole('button', { name: 'Zuweisen' }).click();
	await expect(page.getByText('Zugewiesen.')).toBeVisible();
});

test('the race fits the screen and shows tiles and colours', async ({ page }, testInfo) => {
	const project = testInfo.project.name.replace(/[^a-z0-9]/gi, '');
	await page.goto('/login');
	await page.getByLabel('Benutzername').fill(username);
	await page.getByLabel('Passwort', { exact: true }).fill(password);
	await page.getByRole('button', { name: 'Anmelden' }).click();
	await expect(page.getByRole('heading', { name: `Hallo ${kidName}!` })).toBeVisible();
	await a11y(page);

	await page.getByRole('link', { name: new RegExp(`Plus ${project} – Normal`) }).click();
	await page.getByRole('button', { name: 'Los!' }).click();
	await expect(page.locator('.expr')).toBeVisible({ timeout: 15_000 });

	// the whole track is on the screen, in the right proportion
	const vp = page.viewportSize()!;
	const box = (await page.locator('.track-box').boundingBox())!;
	expect(box.x).toBeGreaterThanOrEqual(-1);
	expect(box.y).toBeGreaterThanOrEqual(-1);
	expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 1);
	expect(box.y + box.height).toBeLessThanOrEqual(vp.height + 1);
	expect(box.width / box.height).toBeGreaterThan(5 / 3 - 0.04);
	expect(box.width / box.height).toBeLessThan(5 / 3 + 0.04);
	const svg = (await page.locator('.track-box svg.track').boundingBox())!;
	expect(Math.abs(svg.width - box.width)).toBeLessThan(2);

	// keypad without scrolling
	await expect(page.getByRole('button', { name: 'Fertig' })).toBeInViewport();
	await expect(page.getByRole('button', { name: '0', exact: true })).toBeInViewport();
	if (shots) await page.screenshot({ path: `${shots}/layout-${project}-task.png` });

	// first number blue, second number red
	const color = (sel: string) =>
		page
			.locator(sel)
			.first()
			.evaluate((el) => getComputedStyle(el).color);
	expect(await color('.expr .num.role-a')).toBe('rgb(31, 95, 191)');
	expect(await color('.expr .num.role-b')).toBe('rgb(198, 40, 40)');

	// a wrong answer shows the tiles (not only text), second number red
	await page.getByRole('button', { name: '0', exact: true }).click();
	await page.getByRole('button', { name: 'Fertig' }).click();
	const tiles = page.locator('.hint svg.twenty');
	await expect(tiles).toBeVisible();
	expect((await tiles.boundingBox())!.width).toBeGreaterThan(150);
	await expect(page.locator('.hint svg.twenty circle[fill="#c62828"]').first()).toBeVisible();
	await expect(page.locator('.hint svg.twenty circle[fill="#e9812f"]')).toHaveCount(0);
	await expect(page.locator('.hint').getByText('Tipp:')).toHaveCount(0);
	if (shots) await page.screenshot({ path: `${shots}/layout-${project}-hint.png` });
});
