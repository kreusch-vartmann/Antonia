/**
 * End-to-end: setup → child → generator set → assignment → race → evaluation.
 * Uses only invented demo data. Requires a fresh database and SETUP_TOKEN.
 */
import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** Fails on serious/critical accessibility violations (WCAG 2.x A/AA). */
async function a11y(page: Page) {
	const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
	const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
	expect(bad.map((v) => `${v.id}: ${v.nodes.length}× ${v.help}`)).toEqual([]);
}

const SETUP_TOKEN = process.env.E2E_SETUP_TOKEN ?? 'local-setup-token-123';
// Erfundene Testdaten, kein echtes Passwort.
const TEACHER = { username: 'testlehrkraft', password: 'Test-Passwort-123' }; // gitleaks:allow
const shots = process.env.E2E_SCREENSHOTS;

test.describe.configure({ mode: 'serial' });

let kidPassword = '';

test('teacher sets up account, child, set and assignment', async ({ page }) => {
	await page.goto('/setup');
	if (
		await page
			.getByLabel('Einrichtungs-Token')
			.isVisible()
			.catch(() => false)
	) {
		await page.getByLabel('Einrichtungs-Token').fill(SETUP_TOKEN);
		await page.getByLabel('Dein Name').fill('Frau Beispiel');
		await page.getByLabel('Benutzername').fill(TEACHER.username);
		await page.getByLabel('Passwort (mind. 10 Zeichen)').fill(TEACHER.password);
		await page.getByLabel('Passwort wiederholen').fill(TEACHER.password);
		await page.getByRole('button', { name: 'Konto anlegen' }).click();
	} else {
		await page.goto('/login');
		await page.getByLabel('Benutzername').fill(TEACHER.username);
		await page.getByLabel('Passwort', { exact: true }).fill(TEACHER.password);
		await page.getByRole('button', { name: 'Anmelden' }).click();
	}
	await expect(page.getByRole('heading', { name: /Hallo/ })).toBeVisible();
	if (shots) await page.screenshot({ path: `${shots}/01-dashboard.png`, fullPage: true });
	await a11y(page);

	// child
	await page.goto('/lehrkraft/kinder/neu');
	await page.getByLabel('Vorname *').fill('Testkind');
	await expect(page.getByLabel('Benutzername *')).toHaveValue('testkind');
	kidPassword = await page.getByLabel('Passwort *').inputValue();
	await page.getByRole('button', { name: 'Anlegen', exact: true }).click();
	await expect(page.getByText('Das Kind wurde angelegt.')).toBeVisible();

	// generator → set
	await page.goto('/lehrkraft/aufgaben/generator');
	await page.locator('input[name="p.to"]').fill('3');
	await page.getByRole('button', { name: 'Vorschau erzeugen' }).click();
	await expect(page.getByRole('heading', { name: /Vorschau \(3 Aufgaben\)/ })).toBeVisible();
	// Improvement 2: warn while the calculation does not add up
	const answer0 = page.locator('input[name="d.0.answer"]');
	await answer0.fill('99');
	await expect(page.getByText('Die Rechnung geht nicht auf.')).toBeVisible();
	await expect(page.getByText('1 · 5 = 99 geht nicht auf.')).toBeVisible();
	await expect(page.getByText(/Bei 1 Aufgabe\(n\) geht die Rechnung nicht auf/)).toBeVisible();
	if (shots) await page.screenshot({ path: `${shots}/02b-generator-warning.png`, fullPage: true });
	await answer0.fill('5');
	await expect(page.getByText('Die Rechnung geht nicht auf.')).toHaveCount(0);
	if (shots) await page.screenshot({ path: `${shots}/02-generator.png`, fullPage: true });
	await page.getByRole('button', { name: 'Speichern', exact: true }).click();
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

	await page.getByRole('link', { name: /Einmaleins 5er-Reihe/ }).click();
	await expect(page.getByText('1 · 5 =')).toBeVisible();

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
