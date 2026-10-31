<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head><title>Fehler – Antonia</title></svelte:head>

<main class="center-page">
	<div class="card narrow stack">
		<h1>
			{page.status === 404 ? 'Nicht gefunden' : page.status === 403 ? 'Kein Zugriff' : 'Hoppla!'}
		</h1>
		<p>{page.error?.message ?? 'Etwas ist schiefgelaufen.'}</p>
		{#if page.error?.errorId && page.status >= 500}
			<p class="muted small">Fehler-Nr.: {page.error.errorId}</p>
		{/if}
		<p><a class="btn btn-primary" href="/">Zur Startseite</a></p>
	</div>
</main>
