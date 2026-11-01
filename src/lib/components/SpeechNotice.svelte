<script lang="ts">
	import { speechProblem } from '#lib/client/speech.ts';
</script>

{#if $speechProblem}
	<p class="notice" role="status">{$speechProblem}</p>
{/if}

<style>
	.notice {
		margin: 0;
		padding: var(--space-2) var(--space-3);
		border-radius: 0.6rem;
		background: #e6eef9;
		color: #23446e;
		font-weight: 600;
		text-align: center;
	}
</style>
