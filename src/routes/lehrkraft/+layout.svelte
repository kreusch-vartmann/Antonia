<script lang="ts">
	import { page } from '$app/state';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const nav = [
		{ href: '/lehrkraft', label: 'Übersicht', exact: true },
		{ href: '/lehrkraft/kinder', label: 'Kinder' },
		{ href: '/lehrkraft/sets', label: 'Aufgabensets' },
		{ href: '/lehrkraft/auswertung', label: 'Auswertung' },
		{ href: '/lehrkraft/konto', label: 'Konto' }
	];

	function active(href: string, exact?: boolean) {
		const p = page.url.pathname;
		return exact ? p === href : p === href || p.startsWith(href + '/');
	}
</script>

<div class="shell">
	<header class="top no-print">
		<a class="logo" href="/lehrkraft">Antonia</a>
		<nav aria-label="Hauptnavigation">
			{#each nav as n (n.href)}
				<a href={n.href} aria-current={active(n.href, n.exact) ? 'page' : undefined}>{n.label}</a>
			{/each}
		</nav>
		<form method="POST" action="/logout" class="logout">
			<span class="muted small">{data.teacher.displayName}</span>
			<button class="btn small">Abmelden</button>
		</form>
	</header>
	<main class="content">
		{@render children()}
	</main>
</div>

<style>
	.shell {
		min-height: 100vh;
		min-height: 100dvh;
	}
	.top {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-2) var(--space-4);
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
		position: sticky;
		top: 0;
		z-index: 10;
	}
	.logo {
		font-weight: 800;
		color: var(--color-primary);
		text-decoration: none;
		font-size: 1.25rem;
	}
	nav {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
		flex: 1;
	}
	nav a {
		padding: var(--space-2) var(--space-3);
		border-radius: 0.5rem;
		text-decoration: none;
		color: var(--color-text);
	}
	nav a[aria-current='page'] {
		background: #e9eef8;
		color: var(--color-primary);
		font-weight: 700;
	}
	.logout {
		display: flex;
		gap: var(--space-2);
		align-items: center;
	}
	.content {
		max-width: 72rem;
		margin: 0 auto;
		padding: var(--space-6) var(--space-4) var(--space-8);
	}
	@media print {
		.content {
			max-width: none;
			padding: 0;
		}
	}
</style>
