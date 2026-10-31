<script lang="ts">
	import type { ArithmeticContent, Gap, Op } from '#lib/domain/formats/types.ts';
	import { expectedAnswer, OP_SYMBOL } from '#lib/domain/formats/arithmetic.ts';
	import { arithmetic } from '#lib/domain/formats/arithmetic.ts';

	interface Props {
		content?: ArithmeticContent;
		tags?: string[];
		allTags?: string[];
	}

	let { content, tags = [], allTags = [] }: Props = $props();

	// svelte-ignore state_referenced_locally
	const c = content;
	let mode = $state<'expr' | 'text' | 'both'>(
		c?.expr ? (c.text ? 'both' : 'expr') : c ? 'text' : 'expr'
	);
	let a = $state<number | null>(c?.expr?.a ?? null);
	let op = $state<Op>(c?.expr?.op ?? '*');
	let b = $state<number | null>(c?.expr?.b ?? null);
	let gap = $state<Gap>(c?.expr?.gap ?? 'result');
	let text = $state(c?.text ?? '');
	let answer = $state<number | null>(c?.answer ?? null);
	let answerTouched = $state(!!c);

	const computed = $derived(
		mode !== 'text' && a !== null && b !== null ? expectedAnswer({ a, op, b, gap }) : null
	);

	$effect(() => {
		if (!answerTouched && computed !== null) answer = computed;
	});

	const preview = $derived.by(() => {
		if (answer === null) return null;
		const draft: ArithmeticContent = {
			format: 'arithmetic',
			answer,
			text: mode !== 'expr' ? text || undefined : undefined,
			expr: mode !== 'text' && a !== null && b !== null ? { a, op, b, gap } : undefined
		};
		const v = arithmetic.validate(draft);
		return v.ok
			? { label: arithmetic.label1(v.content), hint: arithmetic.hint(v.content)?.text }
			: { error: v.error };
	});
</script>

<input type="hidden" name="mode" value={mode === 'text' ? 'text' : 'expr'} />

<fieldset class="stack">
	<legend>Aufgabe</legend>
	<div class="row" role="radiogroup" aria-label="Art der Aufgabe">
		<label class="row"><input type="radio" bind:group={mode} value="expr" /> Rechnung</label>
		<label class="row"
			><input type="radio" bind:group={mode} value="both" /> Rechnung mit Fragetext</label
		>
		<label class="row"
			><input type="radio" bind:group={mode} value="text" /> Nur Fragetext (Sachaufgabe)</label
		>
	</div>

	{#if mode !== 'expr'}
		<label class="field">
			<span>Fragetext</span>
			<textarea
				name="text"
				maxlength="500"
				bind:value={text}
				placeholder="z. B. Wie viele Finger haben 3 Hände?"></textarea>
		</label>
	{/if}

	{#if mode !== 'text'}
		<div class="expr">
			<label class="field">
				<span>Zahl 1</span>
				<input name="a" type="number" min="0" inputmode="numeric" bind:value={a} required />
			</label>
			<label class="field">
				<span>Rechenart</span>
				<select name="op" bind:value={op}>
					{#each ['+', '-', '*', ':'] as const as o (o)}
						<option value={o}>{OP_SYMBOL[o]}</option>
					{/each}
				</select>
			</label>
			<label class="field">
				<span>Zahl 2</span>
				<input name="b" type="number" min="0" inputmode="numeric" bind:value={b} required />
			</label>
			<label class="field">
				<span>Lücke</span>
				<select name="gap" bind:value={gap}>
					<option value="result">Ergebnis gesucht</option>
					<option value="a">Zahl 1 gesucht</option>
					<option value="b">Zahl 2 gesucht</option>
				</select>
			</label>
		</div>
	{/if}

	<div class="grid-2">
		<label class="field">
			<span>Richtige Antwort *</span>
			<input
				name="answer"
				type="number"
				min="0"
				inputmode="numeric"
				required
				bind:value={answer}
				oninput={() => (answerTouched = true)}
			/>
			{#if computed !== null && answer !== null && answer !== computed}
				<small class="warn">Achtung: Rechnerisch wäre die Antwort {computed}.</small>
			{/if}
		</label>
		<label class="field">
			<span>Falsche Antwortmöglichkeiten (optional)</span>
			<input
				name="distractors"
				value={c?.distractors?.join(', ') ?? ''}
				placeholder="z. B. 20, 25"
			/>
			<small>Für das Auswahl-Format. Leer = automatisch aus typischen Fehlern.</small>
		</label>
	</div>
	<label class="field">
		<span>Eigene Hilfe (optional)</span>
		<input
			name="hint"
			maxlength="500"
			value={c?.hint ?? ''}
			placeholder="Leer = automatische Hilfe"
		/>
	</label>
	<label class="field">
		<span>Schlagwörter</span>
		<input
			name="tags"
			value={tags.join(', ')}
			list="tag-list"
			placeholder="z. B. 1x1, 5er-Reihe, Klasse 2"
		/>
		<small>Durch Komma getrennt.</small>
		<datalist id="tag-list">
			{#each allTags as t (t)}<option value={t}></option>{/each}
		</datalist>
	</label>

	{#if preview}
		<div class="preview" aria-live="polite">
			{#if 'error' in preview}
				<span class="error">{preview.error}</span>
			{:else}
				<strong>Vorschau:</strong>
				{preview.label}
				{#if preview.hint}<br /><span class="muted small">Hilfe: {preview.hint}</span>{/if}
			{/if}
		</div>
	{/if}
</fieldset>

<style>
	.expr {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
		gap: var(--space-3);
	}
	.warn {
		color: var(--color-hint) !important;
	}
	.preview {
		background: #f3f6fb;
		padding: var(--space-3);
		border-radius: 0.5rem;
	}
</style>
