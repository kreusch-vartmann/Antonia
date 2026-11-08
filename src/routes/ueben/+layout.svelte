<script lang="ts">
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

<div class="kid" class:calm={data.display.calm} class:large={data.display.largeText}>
	{@render children()}
</div>

<style>
	.kid {
		min-height: 100vh;
		min-height: 100dvh;
		padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom)
			env(safe-area-inset-left);
		background: #eef5ea;
		--font-size-base: 1.25rem;
		font-size: var(--font-size-base);
	}
	.kid.large {
		--font-size-base: 1.5rem;
	}
	.kid.calm {
		background: #f4f4f1;
		--motion-duration: 0ms;
	}
</style>
