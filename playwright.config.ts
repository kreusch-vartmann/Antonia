import { defineConfig, devices } from '@playwright/test';

// Set E2E_BASE_URL to test against an already running server (e.g. local smoke test).
const external = process.env.E2E_BASE_URL;

export default defineConfig({
	testDir: 'tests/e2e',
	testMatch: '**/*.e2e.{ts,js}',
	workers: 1,
	use: {
		baseURL: external ?? 'http://localhost:4173',
		screenshot: 'only-on-failure',
		// Local smoke test over plain http behind PROTOCOL_HEADER=x-forwarded-proto
		extraHTTPHeaders: external ? { 'x-forwarded-proto': 'http' } : undefined
	},
	projects: [
		{ name: 'ipad', use: { ...devices['iPad Pro 11 landscape'], browserName: 'chromium' } },
		{ name: 'desktop', use: { ...devices['Desktop Chrome'] } },
		// Safari engine: only in CI, WebKit cannot be installed on every development machine.
		// The long flow test uses fixed names and runs once (project "ipad"); these only check the layout.
		{
			name: 'ipad-webkit',
			use: { ...devices['iPad (gen 7) landscape'] },
			testIgnore: /flow\.e2e/
		},
		{
			name: 'ipad-webkit-portrait',
			use: { ...devices['iPad (gen 7)'] },
			testIgnore: /flow\.e2e/
		},
		{ name: 'iphone-webkit', use: { ...devices['iPhone 13'] }, testIgnore: /flow\.e2e/ },
		{ name: 'iphone-se-webkit', use: { ...devices['iPhone SE'] }, testIgnore: /flow\.e2e/ }
	],
	webServer: external ? undefined : { command: 'npm run build && npm run preview', port: 4173 }
});
