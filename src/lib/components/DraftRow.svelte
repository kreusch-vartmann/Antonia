<script lang="ts">
	import CalcWarning from './CalcWarning.svelte';
	import { checkConsistency, OP_SYMBOL } from '#lib/domain/formats/arithmetic.ts';
	import type { ArithmeticContent, Gap, Op } from '#lib/domain/formats/types.ts';

	interface Props {
		index: number;
		draft: ArithmeticContent;
		/** Reports whether the row is included and consistent (for the summary). */
		onstate?: (index: number, problem: boolean) => void;
	}

	let { index, draft, onstate }: Props = $props();

	let include = $state(true);
	// svelte-ignore state_referenced_locally
	let a = $state<number | null>(draft.expr?.a ?? null);
	// svelte-ignore state_referenced_locally
	let op = $state<Op>(draft.expr?.op ?? '+');
	// svelte-ignore state_referenced_locally
	let b = $state<number | null>(draft.expr?.b ?? null);
	// svelte-ignore state_referenced_locally
	let gap = $state<Gap>(draft.expr?.gap ?? 'result');
	// svelte-ignore state_referenced_locally
	let answer = $state<number | null>(draft.answer);

	const check = $derived(checkConsistency({ a, op, b, gap, answer }));
	const problem = $derived(
		include &&
			(check.status === 'mismatch' || check.status === 'invalid' || check.status === 'incomplete')
	);

	$effect(() => {
		onstate?.(index, problem);
	});

	const n = (k: string) => `d.${index}.${k}`;
</script>

<tr class:bad={problem} class:off={!include}>
	<td>
		<input
			type="checkbox"
			name={n('include')}
			bind:checked={include}
			aria-label="Aufgabe {index + 1} übernehmen"
		/>
	</td>
	<td><input class="n" name={n('a')} type="number" min="0" bind:value={a} aria-label="Zahl 1" /></td
	>
	<td>
		<select name={n('op')} bind:value={op} aria-label="Rechenart">
			{#each ['+', '-', '*', ':'] as const as o (o)}
				<option value={o}>{OP_SYMBOL[o]}</option>
			{/each}
		</select>
	</td>
	<td><input class="n" name={n('b')} type="number" min="0" bind:value={b} aria-label="Zahl 2" /></td
	>
	<td>
		<select name={n('gap')} bind:value={gap} aria-label="Gesucht">
			<option value="result">Ergebnis</option>
			<option value="a">Zahl 1</option>
			<option value="b">Zahl 2</option>
		</select>
	</td>
	<td>
		<input
			class="n"
			name={n('answer')}
			type="number"
			min="0"
			bind:value={answer}
			aria-label="Antwort"
			aria-invalid={problem}
		/>
	</td>
	<td><input name={n('hint')} placeholder="automatisch" aria-label="Eigene Hilfe" /></td>
</tr>
{#if include && (check.status === 'mismatch' || check.status === 'invalid')}
	<tr class="warn-row">
		<td></td>
		<td colspan="6"><CalcWarning result={check} /></td>
	</tr>
{/if}

<style>
	input.n {
		width: 5.5rem;
	}
	td select {
		width: auto;
	}
	tr.bad input.n[aria-invalid='true'] {
		border-color: #c0392b;
		background: #fdecea;
	}
	tr.off {
		opacity: 0.5;
	}
	.warn-row td {
		border-bottom: 1px solid var(--color-border);
		padding-top: 0;
	}
</style>
