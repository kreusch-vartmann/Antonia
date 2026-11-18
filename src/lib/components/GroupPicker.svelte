<script lang="ts">
	import { toggleGroup, type GroupLite } from '#lib/domain/groups.ts';

	interface Props {
		groups: GroupLite[];
		selected: string[];
	}

	let { groups, selected = $bindable() }: Props = $props();

	const active = (g: GroupLite) =>
		g.memberIds.length > 0 && g.memberIds.every((id) => selected.includes(id));
</script>

{#if groups.length > 0}
	<div class="row" role="group" aria-label="Ganze Gruppe auswählen">
		<span class="muted">Ganze Gruppe:</span>
		{#each groups as g (g.id)}
			<button
				type="button"
				class="btn small"
				class:btn-primary={active(g)}
				aria-pressed={active(g)}
				disabled={g.memberIds.length === 0}
				onclick={() => (selected = toggleGroup(selected, g.memberIds))}
				>{g.name} ({g.memberIds.length})</button
			>
		{/each}
	</div>
{/if}
