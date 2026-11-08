<script lang="ts" module>
	import type { ArithmeticContent } from '#lib/domain/formats/types.ts';

	/** A task draft; a blank row (manual input) has no numbers yet. */
	export interface DraftInit {
		expr?: ArithmeticContent['expr'];
		answer: number | null;
		hint?: string;
		decompose?: 'boxes' | 'equation';
	}
</script>

<script lang="ts">
	import CalcWarning from './CalcWarning.svelte';
	import {
		checkConsistency,
		decomposition,
		expectedAnswer,
		OP_SYMBOL
	} from '#lib/domain/formats/arithmetic.ts';
	import type { Gap, Op } from '#lib/domain/formats/types.ts';

	interface Props {
		index: number;
		draft: DraftInit;
		/** Reports whether the row is included and whether it is consistent (for the summary). */
		onstate?: (index: number, state: { include: boolean; problem: boolean }) => void;
		/** Shows a button to remove the row (manual input). */
		onremove?: () => void;
	}

	let { index, draft, onstate, onremove }: Props = $props();

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
	// svelte-ignore state_referenced_locally
	let decompose = $state<'' | 'boxes' | 'equation'>(draft.decompose ?? '');
	/** Once the teacher typed an answer, it is no longer calculated automatically. */
	let touched = false;

	$effect(() => {
		if (touched || a === null || b === null) return;
		const e = expectedAnswer({ a, op, b, gap });
		if (e !== null) answer = e;
	});

	/** An empty row of the manual input: ignored when saving. */
	const blank = $derived(a === null && b === null);
	const split = $derived(
		gap === 'result' && a !== null && b !== null ? decomposition(a, op, b) : null
	);
	const check = $derived(checkConsistency({ a, op, b, gap, answer }));
	const problem = $derived(
		include &&
			!blank &&
			(check.status === 'mismatch' || check.status === 'invalid' || check.status === 'incomplete')
	);

	$effect(() => {
		onstate?.(index, { include: include && !blank, problem });
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
			oninput={() => (touched = true)}
			aria-label="Antwort"
			aria-invalid={problem}
		/>
	</td>
	<td>
		<select
			name={n('decompose')}
			bind:value={decompose}
			disabled={!split}
			aria-label="Zahlzerlegung"
			title={split
				? `${b} = ${split[0]} + ${split[1]}`
				: 'Nur bei Plus/Minus mit gesuchtem Ergebnis'}
		>
			<option value="">keine</option>
			<option value="boxes">Kästchen</option>
			<option value="equation">neue Gleichung</option>
		</select>
	</td>
	<td
		><input
			name={n('hint')}
			placeholder="automatisch"
			aria-label="Eigene Hilfe"
			value={draft.hint ?? ''}
		/></td
	>
	{#if onremove}
		<td>
			<button
				type="button"
				class="btn small btn-danger"
				onclick={onremove}
				aria-label="Zeile entfernen">✕</button
			>
		</td>
	{/if}
</tr>
{#if include && !blank && (check.status === 'mismatch' || check.status === 'invalid')}
	<tr class="warn-row">
		<td></td>
		<td colspan="7"><CalcWarning result={check} /></td>
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
