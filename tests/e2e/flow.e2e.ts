/**
 * End-to-end: setup → child → wizard set → assignment → race → evaluation.
 * Uses only invented demo data. Requires a fresh database and SETUP_TOKEN.
 */
import { expect, test } from '@playwright/test';
import { TEACHER, a11y, shots, teacherLogin } from './helpers';

test.describe.configure({ mode: 'serial' });

let kidPassword = '';

test('teacher sets up account, child, set and assignment', async ({ page }) => {
	await teacherLogin(page);
	if (shots) await page.screenshot({ path: `${shots}/01-dashboard.png`, fullPage: true });
	await a11y(page);

	// child
	await page.goto('/lehrkraft/kinder/neu');
	await page.getByLabel('Vorname *').fill('Testkind');
	await expect(page.getByLabel('Benutzername *')).toHaveValue('testkind');
	kidPassword = await page.getByLabel('Passwort *').inputValue();
	await page.getByRole('button', { name: 'Anlegen', exact: true }).click();
	await expect(page.getByText('Das Kind wurde angelegt.')).toBeVisible();

	// wizard → set: times table 5, factors 1 to 3
	await page.goto('/lehrkraft/sets/neu');
	await page.getByRole('radio', { name: 'Mal', exact: true }).check({ force: true });
	await page.getByLabel('5er', { exact: true }).check();
	await page.getByText('Feineinstellung').click();
	await page.getByLabel('Faktor bis').fill('3');
	await page.getByLabel('Anzahl der Aufgaben').fill('3');
	await page.getByRole('button', { name: 'Aufgaben erzeugen' }).click();
	await expect(page.getByRole('heading', { name: /Vorschau \(3 Aufgaben\)/ })).toBeVisible();
	// warn while the calculation does not add up
	const answer0 = page.locator('input[name="d.0.answer"]');
	await answer0.fill('99');
	await expect(page.getByText('Die Rechnung geht nicht auf.')).toBeVisible();
	await expect(page.getByText('1 · 5 = 99 geht nicht auf.')).toBeVisible();
	await expect(page.getByText(/Bei 1 Aufgabe\(n\) geht die Rechnung nicht auf/)).toBeVisible();
	if (shots) await page.screenshot({ path: `${shots}/02b-wizard-warning.png`, fullPage: true });
	await answer0.fill('5');
	await expect(page.getByText('Die Rechnung geht nicht auf.')).toHaveCount(0);
	if (shots) await page.screenshot({ path: `${shots}/02-wizard.png`, fullPage: true });
	await page.getByRole('button', { name: 'Set speichern' }).click();
	await expect(page.getByRole('heading', { name: 'Einmaleins 5er-Reihe' })).toBeVisible();

	// assign with choice format for this assignment
	await page.getByLabel('Testkind').check();
	await page.getByRole('button', { name: 'Zuweisen' }).click();
	await expect(page.getByText('Zugewiesen.')).toBeVisible();
	if (shots) await page.screenshot({ path: `${shots}/03-set.png`, fullPage: true });
	await a11y(page);

	await page.getByRole('button', { name: 'Abmelden' }).click();
	await expect(page).toHaveURL(/login/);
});

test('child races and finishes', async ({ page }) => {
	await page.goto('/login');
	// Improvement 1: show/hide password
	const pw = page.getByLabel('Passwort', { exact: true });
	await expect(pw).toHaveAttribute('type', 'password');
	await page.getByRole('button', { name: 'Passwort anzeigen' }).click();
	await expect(pw).toHaveAttribute('type', 'text');
	await page.getByRole('button', { name: 'Passwort verbergen' }).click();
	await expect(pw).toHaveAttribute('type', 'password');
	await page.getByLabel('Benutzername').fill('testkind');
	await page.getByLabel('Passwort', { exact: true }).fill(kidPassword);
	await page.getByRole('button', { name: 'Anmelden' }).click();
	await expect(page.getByRole('heading', { name: 'Hallo Testkind!' })).toBeVisible();
	if (shots) await page.screenshot({ path: `${shots}/04-kid-home.png`, fullPage: true });
	await a11y(page);

	await page.getByRole('link', { name: 'Einmaleins 5er-Reihe – Normal' }).click();
	// the race only starts with "Los!" (and a short countdown)
	await page.getByRole('button', { name: 'Los!' }).click();
	await expect(page.getByText('1 · 5 =')).toBeVisible({ timeout: 15_000 });

	// wrong answer → hint (Boxenstopp)
	await page.getByRole('button', { name: '9', exact: true }).click();
	await page.getByRole('button', { name: 'Fertig' }).click();
	await expect(page.getByText('Boxenstopp! Hier ist ein Tipp.')).toBeVisible();
	if (shots) await page.screenshot({ path: `${shots}/05-race-hint.png` });
	await a11y(page);

	const solve = async (expected: string) => {
		for (const d of expected) await page.getByRole('button', { name: d, exact: true }).click();
		await page.getByRole('button', { name: 'Fertig' }).click();
	};
	await solve('5');
	await expect(page.getByText('2 · 5 =')).toBeVisible();
	if (shots) await page.screenshot({ path: `${shots}/06-race.png` });
	await solve('10');
	await expect(page.getByText('3 · 5 =')).toBeVisible();
	await solve('15');
	// repeated task 1 (was wrong first)
	await expect(page.getByText('1 · 5 =')).toBeVisible();
	await solve('5');
	await expect(page.getByText('Geschafft!')).toBeVisible();
	if (shots) await page.screenshot({ path: `${shots}/07-finish.png` });
	await expect(page.getByLabel('2 von 3 Sternen')).toBeVisible();
	await expect(page.getByText('bronzenen Pokal')).toBeVisible();

	// "Nochmal fahren" counts down and starts a new run; stopping it leads back to the overview
	await page.getByRole('button', { name: 'Nochmal fahren' }).click();
	await expect(page.getByText('1 · 5 =')).toBeVisible({ timeout: 15_000 });
	await page.getByRole('button', { name: 'Aufhören' }).click();
	await expect(page.getByText('Möchtest du aufhören?')).toBeVisible();
	await page.getByRole('button', { name: 'Weiterfahren' }).click();
	await page.getByRole('button', { name: 'Aufhören' }).click();
	await page.getByRole('button', { name: 'Aufhören' }).click();
	await expect(page).toHaveURL(/\/ueben$/);

	// the trophy is in the display case, with the name of the set
	await page.getByRole('link', { name: 'Vitrine' }).click();
	await expect(page.getByRole('heading', { name: 'Deine Vitrine' })).toBeVisible();
	await expect(page.getByRole('img', { name: 'Bronzener Pokal' })).toBeVisible();
	await expect(page.getByText('Einmaleins 5er-Reihe')).toBeVisible();
	await a11y(page);

	// hovering shows when the trophy was earned and the number of mistakes
	await page.getByRole('img', { name: 'Bronzener Pokal' }).hover();
	await expect(page.getByRole('tooltip')).toContainText('Erworben am');
	await expect(page.getByRole('tooltip')).toContainText('1 Fehler');

	// clicking shows the whole race with a tip for the task that went wrong
	await page.getByRole('img', { name: 'Bronzener Pokal' }).click();
	await expect(page.getByRole('heading', { name: 'Einmaleins 5er-Reihe' })).toBeVisible();
	await expect(page.getByText('1 · 5 = 5', { exact: true })).toBeVisible();
	await expect(page.getByText('2 · 5 = 10', { exact: true })).toBeVisible();
	await expect(page.getByText('Deine falschen Antworten: 9')).toBeVisible();
	await expect(page.getByText('Tipp:')).toBeVisible();
	await a11y(page);
});

test('teacher sees the evaluation', async ({ page }) => {
	await page.goto('/login');
	await page.getByLabel('Benutzername').fill(TEACHER.username);
	await page.getByLabel('Passwort', { exact: true }).fill(TEACHER.password);
	await page.getByRole('button', { name: 'Anmelden' }).click();
	await expect(page.getByRole('heading', { name: /Hallo/ })).toBeVisible();
	await page.goto('/lehrkraft/auswertung');
	await page.getByRole('link', { name: 'Details' }).first().click();
	await expect(page.getByRole('heading', { name: /Lernstand: Testkind/ })).toBeVisible();
	await expect(page.getByText('1·1 Kernaufgabe')).toBeVisible();
	if (shots) await page.screenshot({ path: `${shots}/08-report.png`, fullPage: true });
	await a11y(page);
	const csv = await page.request.get('/lehrkraft/auswertung/export');
	expect(await csv.text()).toContain('1 · 5 = ?');
});

test('teacher sees the password again, prints access cards and manages accounts', async ({
	page,
	browser
}) => {
	await page.goto('/login');
	await page.getByLabel('Benutzername').fill(TEACHER.username);
	await page.getByLabel('Passwort', { exact: true }).fill(TEACHER.password);
	await page.getByRole('button', { name: 'Anmelden' }).click();
	await expect(page.getByRole('heading', { name: /Hallo/ })).toBeVisible();

	// the password of a child stays visible for its teacher
	await page.goto('/lehrkraft/kinder');
	await page.getByRole('link', { name: 'Testkind' }).first().click();
	await page.getByRole('button', { name: 'Anzeigen' }).click();
	await expect(page.getByText(kidPassword)).toBeVisible();

	// access card: password and QR code
	await page.goto('/lehrkraft/kinder/karten');
	await expect(page.getByText(kidPassword)).toBeVisible();
	await expect(page.getByRole('img', { name: 'QR-Code zur Anmeldeseite' })).toBeVisible();
	if (shots) await page.screenshot({ path: `${shots}/09-cards.png`, fullPage: true });
	await a11y(page);

	// the QR code opens the login page with the user name filled in
	const ctx = await browser.newContext();
	const guest = await ctx.newPage();
	await guest.goto('/login?u=testkind');
	await expect(guest.getByLabel('Benutzername')).toHaveValue('testkind');
	await ctx.close();

	// the first account is the admin
	await page.getByRole('link', { name: 'Verwaltung' }).click();
	await expect(page.getByRole('heading', { name: 'Verwaltung der Lehrkräfte' })).toBeVisible();
	await expect(page.getByRole('cell', { name: TEACHER.username })).toBeVisible();
	if (shots) await page.screenshot({ path: `${shots}/10-admin.png`, fullPage: true });
	await a11y(page);
});
