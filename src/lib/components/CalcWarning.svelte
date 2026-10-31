<script lang="ts">
	import type { Consistency } from '#lib/domain/formats/arithmetic.ts';

	let { result }: { result: Consistency } = $props();
</script>

{#if result.status === 'mismatch' || result.status === 'invalid'}
	<p class="calc-warning" role="alert">
		<strong>Die Rechnung geht nicht auf.</strong>
		{result.message}
		{#if result.status === 'mismatch'}Richtig wäre: <strong>{result.correct}</strong>.{/if}
	</p>
{/if}

<style>
	.calc-warning {
		margin: 0;
		padding: var(--space-2) var(--space-3);
		border-radius: 0.5rem;
		background: #fdecea;
		color: #8a1c1c;
		border: 1px solid #e3a9a4;
		font-size: 0.95rem;
	}
</style>
