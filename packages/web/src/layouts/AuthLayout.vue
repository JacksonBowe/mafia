<template>
	<q-layout view="hHh Lpr fFf">
		<div class="bg-splash">
			<img src="~assets/mafia-village-night.png" class="fit" />
		</div>
		<q-page-container>
			<router-view />
		</q-page-container>
	</q-layout>
</template>

<script setup lang="ts">

</script>

<style>

.bg-splash {
    position: fixed;
    height: 100%;
    width: 100%;
    z-index: 0;
}

</style>
