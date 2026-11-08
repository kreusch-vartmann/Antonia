import { expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export const SETUP_TOKEN = process.env.E2E_SETUP_TOKEN ?? 'local-setup-token-123';
// Erfundene Testdaten, kein echtes Passwort.
export const TEACHER = { username: 'testlehrkraft', password: 'Test-Passwort-123' }; // gitleaks:allow
export const shots = process.env.E2E_SCREENSHOTS;

/** Fails on serious/critical accessibility violations (WCAG 2.x A/AA). */
export async function a11y(page: Page) {
	const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
	const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
	expect(bad.map((v) => `${v.id}: ${v.nodes.length}× ${v.help}`)).toEqual([]);
}

/** Creates the teacher account on a fresh database, or logs in if it exists already. */
export async function teacherLogin(page: Page) {
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
}
