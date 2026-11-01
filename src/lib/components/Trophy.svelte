<script lang="ts">
	import { TROPHY_LABEL, type TrophyKind } from '#lib/domain/modes.ts';

	interface Props {
		kind: TrophyKind;
		/** Rendered width in px; fills the container when omitted. */
		size?: number;
		/** Accessible name; the trophy is decorative when omitted. */
		label?: boolean;
	}

	let { kind, size, label = false }: Props = $props();

	const PALETTE: Record<TrophyKind, { main: string; light: string; dark: string }> = {
		bronze: { main: '#c27c43', light: '#e3a873', dark: '#8d5528' },
		silver: { main: '#b4bcc6', light: '#e6eaee', dark: '#7d8792' },
		gold: { main: '#e8b218', light: '#fbe27a', dark: '#b07f08' }
	};
	const c = $derived(PALETTE[kind]);
</script>

<svg
	viewBox="0 0 100 112"
	style:width={size ? `${size}px` : '100%'}
	role={label ? 'img' : undefined}
	aria-label={label ? TROPHY_LABEL[kind] : undefined}
	aria-hidden={label ? undefined : 'true'}
>
	<!-- handles -->
	<path
		d="M 25 20 C 4 20 4 52 32 58"
		fill="none"
		stroke={c.dark}
		stroke-width="6"
		stroke-linecap="round"
	/>
	<path
		d="M 75 20 C 96 20 96 52 68 58"
		fill="none"
		stroke={c.dark}
		stroke-width="6"
		stroke-linecap="round"
	/>
	<!-- cup -->
	<path
		d="M 24 10 H 76 V 36 C 76 56 64 66 50 66 C 36 66 24 56 24 36 Z"
		fill={c.main}
		stroke={c.dark}
		stroke-width="2.5"
		stroke-linejoin="round"
	/>
	<path
		d="M 31 15 H 40 V 36 C 40 50 44 57 47 60 C 36 56 31 48 31 36 Z"
		fill={c.light}
		opacity="0.75"
	/>
	<!-- star -->
	<polygon
		points="50,24 53.5,33 63,33.5 55.5,39.5 58,48.5 50,43.5 42,48.5 44.5,39.5 37,33.5 46.5,33"
		fill={c.light}
		stroke={c.dark}
		stroke-width="1.5"
		stroke-linejoin="round"
	/>
	<!-- stem and base -->
	<rect x="43" y="66" width="14" height="16" fill={c.dark} />
	<rect x="32" y="80" width="36" height="9" rx="3" fill={c.main} stroke={c.dark} stroke-width="2" />
	<rect x="24" y="89" width="52" height="14" rx="3" fill={c.dark} />
	<rect x="40" y="93" width="20" height="6" rx="2" fill={c.light} opacity="0.85" />
</svg>

<style>
	svg {
		display: block;
		height: auto;
		overflow: visible;
	}
</style>
