/**
 * End-to-end: groups, division with remainder, display settings and the set overview.
 * Every project uses its own names. Uses only invented demo data.
 */
import { expect, test } from '@playwright/test';
import { a11y, teacherLogin } from './helpers';

test.describe.configure({ mode: 'serial' });

let username = '';
let password = '';
let kidName = '';
let className = '';
let setName = '';

test('teacher creates a class, a child and a division set with remainder and assigns it to the class', async ({
	page
}, testInfo) => {
	const project = testInfo.project.name.replace(/[^a-z0-9]/gi, '');
	kidName = `Gruppe${project}`;
	className = `Klasse ${project}`;
	await teacherLogin(page);

	await page.goto('/lehrkraft/kinder/neu');
	await page.getByLabel('Vorname *').fill(kidName);
	username = await page.getByLabel('Benutzername *').inputValue();
	password = await page.getByLabel('Passwort *').inputValue();
	await page.getByRole('button', { name: 'Anlegen', exact: true }).click();
	await expect(page.getByText('Das Kind wurde angelegt.')).toBeVisible();

	// class with the child as its member
	await page.goto('/lehrkraft/kinder/gruppen');
	await page.getByLabel('Name', { exact: true }).fill(className);
	await page.getByRole('button', { name: 'Anlegen' }).click();
	// the new class is the last one (there are no subgroups in this test)
	const card = page.locator('section.group').last();
	await expect(card.getByLabel('Name der Gruppe')).toHaveValue(className);
	await card.locator('summary').click();
	await card.getByLabel(kidName).check();
	await card.getByRole('button', { name: 'Speichern' }).click();
	await expect(card.getByText('Gespeichert.')).toBeVisible();
	await a11y(page);

	await page.goto('/lehrkraft/kinder');
	await expect(page.getByRole('heading', { name: className })).toBeVisible();

	// wizard: division by 5, only with remainder, base-ten material
	await page.goto('/lehrkraft/sets/neu');
	await page.getByRole('radio', { name: 'Geteilt', exact: true }).check({ force: true });
	await page.getByLabel('5er', { exact: true }).check();
	await page.getByLabel('nur mit Rest').check();
	await page.getByLabel('Anzahl der Aufgaben').fill('2');
	await page.getByRole('button', { name: 'Aufgaben erzeugen' }).click();
	await expect(page.getByRole('heading', { name: /Vorschau \(2 Aufgaben\)/ })).toBeVisible();
	// no decomposition column for divisions, but one for the remainder
	await expect(page.getByRole('columnheader', { name: 'Zerlegung' })).toHaveCount(0);
	await expect(page.getByRole('columnheader', { name: 'Rest' })).toBeVisible();
	setName = `Geteilt ${project}`;
	await page.getByLabel('Name des Sets').fill(setName);
	await page.getByText('Einstellungen für dieses Set').click();
	await page.getByLabel('Material bei Tipps und Lösungen').selectOption('dienes');
	await page.getByLabel('Farben der Zahlen').selectOption('placeValue');
	await page.getByLabel('Farbe der Einer').selectOption('orange');
	await page.getByRole('button', { name: 'Set speichern' }).click();
	await expect(page.getByRole('heading', { name: setName })).toBeVisible();

	// assign to the whole class with one click
	await page.getByRole('button', { name: new RegExp(`^${className} \\(1\\)`) }).click();
	await expect(page.getByLabel(kidName, { exact: true })).toBeChecked();
	await page.getByRole('button', { name: 'Zuweisen' }).click();
	await expect(page.getByText('Zugewiesen.')).toBeVisible();
});

test('the child enters quotient and remainder', async ({ page }) => {
	await page.goto('/login');
	await page.getByLabel('Benutzername').fill(username);
	await page.getByLabel('Passwort', { exact: true }).fill(password);
	await page.getByRole('button', { name: 'Anmelden' }).click();
	await expect(page.getByRole('heading', { name: `Hallo ${kidName}!` })).toBeVisible();

	await page.getByRole('link', { name: new RegExp(`${setName} – Normal`) }).click();
	await page.getByRole('button', { name: 'Los!' }).click();
	await expect(page.locator('.expr')).toBeVisible({ timeout: 15_000 });

	const tap = async (n: number) => {
		for (const d of String(n)) await page.getByRole('button', { name: d, exact: true }).click();
		await page.getByRole('button', { name: 'Fertig' }).click();
	};
	for (let i = 0; i < 2; i++) {
		// wait until the new task is shown (quotient still open), not the one just solved
		await expect(page.locator('.expr')).toHaveText(/=\s*\?\s*R\s*$/);
		const text = await page.locator('.expr').innerText();
		const [, a, b] = /(\d+)\s*:\s*(\d+)/.exec(text)!;
		await tap(Math.floor(Number(a) / Number(b)));
		await expect(page.getByText('Richtig! Weiter.')).toBeVisible();
		// a plain equation is not read aloud
		await expect(page.getByRole('button', { name: 'Aufgabe vorlesen' })).toHaveCount(0);
		await tap(Number(a) % Number(b));
	}
	await expect(page.getByText('Geschafft!')).toBeVisible({ timeout: 15_000 });
});

test('teacher sorts the set overview and uses an own heading', async ({ page }, testInfo) => {
	const project = testInfo.project.name.replace(/[^a-z0-9]/gi, '');
	await page.goto('/login');
	await teacherLogin(page);
	await page.goto('/lehrkraft/sets');
	await page.getByRole('button', { name: 'Reihenfolge und Überschriften bearbeiten' }).click();
	const heading = `Wochenplan ${project}`;
	await page.getByLabel('Name der neuen Überschrift').fill(heading);
	await page.getByRole('button', { name: 'Anlegen' }).click();
	await expect(page.getByRole('heading', { name: heading })).toBeVisible();
	await page.getByLabel(`Überschrift für ${setName}`).selectOption({ label: heading });
	const section = page.locator('h2', { hasText: heading });
	await expect(section).toBeVisible();
	await expect(page.locator('table', { hasText: setName })).toBeVisible();
	await page.getByRole('button', { name: 'Fertig' }).click();
	await expect(page.getByRole('link', { name: setName })).toBeVisible();
});
