<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ArithmeticContent } from '#lib/domain/formats/types.ts';
	import DraftRow from '#lib/components/DraftRow.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	let generator = $state<'multiplicationRow' | 'divisionRow' | 'addSub'>('multiplicationRow');
	let asSet = $state(true);

	interface Preview {
		generator: string;
		params: Record<string, string>;
		drafts: ArithmeticContent[];
		tags: string[];
		origin: unknown;
	}
	let preview = $state<Preview | null>(null);
	let lastForm: unknown = null;
	let previewId = $state(0);
	let problems = $state<Record<number, boolean>>({});
	const problemCount = $derived(Object.values(problems).filter(Boolean).length);
	function setProblem(i: number, p: boolean) {
		if (problems[i] !== p) problems[i] = p;
	}
	$effect(() => {
		if (form && 'drafts' in form && form.drafts && form !== lastForm) {
			lastForm = form;
			preview = form as Preview;
			previewId += 1;
			problems = {};
		}
	});
	const defaultSetName = $derived.by(() => {
		if (!preview) return '';
		const p = preview.params;
		if (preview.generator === 'multiplicationRow') return `Einmaleins ${p.row}er-Reihe`;
		if (preview.generator === 'divisionRow') return `Geteilt durch ${p.row}`;
		return `Rechnen bis ${p.max}`;
	});
</script>

<svelte:head><title>Aufgaben erzeugen – Antonia</title></svelte:head>

<p><a href="/lehrkraft/aufgaben">← Aufgabenpool</a></p>
<h1>Aufgaben erzeugen</h1>
<p class="muted">
	Der Generator erstellt Vorschläge. Du kannst jede Aufgabe anpassen oder abwählen, bevor sie
	gespeichert wird.
</p>

<form
	method="POST"
	action="?/preview"
	use:enhance={() =>
		async ({ update }) =>
			update({ reset: false })}
	class="card stack"
>
	<label class="field">
		<span>Art</span>
		<select name="generator" bind:value={generator}>
			<option value="multiplicationRow">Einmaleins-Reihe (z. B. 1 · 5 … 10 · 5)</option>
			<option value="divisionRow">Geteilt-Reihe (z. B. 15 : 5)</option>
			<option value="addSub">Plus/Minus im Zahlenraum</option>
		</select>
	</label>

	{#if generator === 'multiplicationRow'}
		<div class="grid-2">
			<label class="field"
				><span>Reihe</span><input
					name="p.row"
					type="number"
					min="0"
					max="20"
					value="5"
					required
				/></label
			>
			<label class="field"
				><span>Von (Faktor)</span><input
					name="p.from"
					type="number"
					min="0"
					max="20"
					value="1"
				/></label
			>
			<label class="field"
				><span>Bis (Faktor)</span><input
					name="p.to"
					type="number"
					min="0"
					max="20"
					value="10"
				/></label
			>
			<label class="field">
				<span>Schreibweise</span>
				<select name="p.orientation">
					<option value="kxn">3 · 5 (Reihe hinten)</option>
					<option value="nxk">5 · 3 (Reihe vorne)</option>
					<option value="both">beides (Tauschaufgaben)</option>
				</select>
			</label>
			<label class="field">
				<span>Gesucht</span>
				<select name="p.gap">
					<option value="result">Ergebnis</option>
					<option value="factor">Faktor (Lücke)</option>
					<option value="mixed">gemischt</option>
				</select>
			</label>
			<label class="row"><input type="checkbox" name="p.shuffle" /> Zufällige Reihenfolge</label>
		</div>
	{:else if generator === 'divisionRow'}
		<div class="grid-2">
			<label class="field"
				><span>Geteilt durch</span><input
					name="p.row"
					type="number"
					min="1"
					max="20"
					value="5"
					required
				/></label
			>
			<label class="field"
				><span>Ergebnis von</span><input
					name="p.from"
					type="number"
					min="0"
					max="20"
					value="1"
				/></label
			>
			<label class="field"
				><span>Ergebnis bis</span><input
					name="p.to"
					type="number"
					min="0"
					max="20"
					value="10"
				/></label
			>
			<label class="field">
				<span>Gesucht</span>
				<select name="p.gap">
					<option value="result">Ergebnis</option>
					<option value="mixed">gemischt (auch Teiler)</option>
				</select>
			</label>
			<label class="row"><input type="checkbox" name="p.shuffle" /> Zufällige Reihenfolge</label>
		</div>
	{:else}
		<div class="grid-2">
			<label class="field">
				<span>Rechenart</span>
				<select name="p.op">
					<option value="+">Plus</option>
					<option value="-">Minus</option>
					<option value="mixed">gemischt</option>
				</select>
			</label>
			<label class="field"
				><span>Zahlenraum bis</span><input
					name="p.max"
					type="number"
					min="5"
					max="1000"
					value="20"
				/></label
			>
			<label class="field"
				><span>Anzahl Aufgaben</span><input
					name="p.count"
					type="number"
					min="1"
					max="50"
					value="10"
				/></label
			>
			<label class="field">
				<span>Zehnerübergang</span>
				<select name="p.transition">
					<option value="any">egal</option>
					<option value="without">ohne Übergang</option>
					<option value="with">mit Übergang</option>
				</select>
			</label>
			<label class="field"
				><span>Kleinste Zahl</span><input
					name="p.minOperand"
					type="number"
					min="0"
					max="999"
					value="1"
				/></label
			>
			<label class="field">
				<span>Gesucht</span>
				<select name="p.gap">
					<option value="result">Ergebnis</option>
					<option value="mixed">gemischt (auch Lücken)</option>
				</select>
			</label>
		</div>
	{/if}
	{#if form?.error && !preview}<p class="error">{form.error}</p>{/if}
	<div><button class="btn btn-primary">Vorschau erzeugen</button></div>
</form>

{#if preview}
	<form
		method="POST"
		action="?/save"
		use:enhance={() =>
			async ({ update }) =>
				update({ reset: false })}
		class="stack preview"
	>
		<h2>Vorschau ({preview.drafts.length} Aufgaben)</h2>
		<input type="hidden" name="count" value={preview.drafts.length} />
		<input type="hidden" name="origin" value={JSON.stringify(preview.origin)} />
		<div class="table-wrap">
			<table>
				<thead>
					<tr
						><th>Nehmen</th><th>Zahl 1</th><th></th><th>Zahl 2</th><th>Gesucht</th><th>Antwort</th
						><th>Eigene Hilfe</th></tr
					>
				</thead>
				<tbody>
					{#each preview.drafts as d, i (previewId + '-' + i)}
						<DraftRow index={i} draft={d} onstate={setProblem} />
					{/each}
				</tbody>
			</table>
		</div>
		<label class="field">
			<span>Schlagwörter für alle</span>
			<input name="tags" value={preview.tags.join(', ')} />
		</label>
		<label class="row"
			><input type="checkbox" name="asSet" bind:checked={asSet} /> Direkt als Aufgabenset speichern</label
		>
		{#if asSet}
			<label class="field">
				<span>Name des Sets</span>
				<input name="setName" value={defaultSetName} />
			</label>
		{/if}
		{#if problemCount > 0}
			<p class="calc-summary" role="status">
				Bei {problemCount} Aufgabe(n) geht die Rechnung nicht auf. Bitte oben korrigieren oder die Aufgabe
				abwählen.
			</p>
		{/if}
		{#if form?.error}<p class="error">{form.error}</p>{/if}
		<div><button class="btn btn-primary big">Speichern</button></div>
	</form>
{/if}

<style>
	.preview {
		margin-top: var(--space-8);
	}
	.calc-summary {
		margin: 0;
		padding: var(--space-2) var(--space-3);
		border-radius: 0.5rem;
		background: #fdecea;
		color: #8a1c1c;
		border: 1px solid #e3a9a4;
		font-weight: 600;
	}
</style>
