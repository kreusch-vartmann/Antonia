<script lang="ts">
	import DeviceCheck from '#lib/components/DeviceCheck.svelte';
</script>

<svelte:head><title>Gerätetest – Antonia</title></svelte:head>

<p><a href="/lehrkraft/konto">← Konto</a></p>
<h1>Gerätetest (Ton &amp; Vorlesen)</h1>
<p class="muted">
	Prüft, ob dieses Gerät Töne und die Vorlesestimme abspielen kann. Bei Problemen die Angaben unten
	notieren.
</p>
<DeviceCheck />
