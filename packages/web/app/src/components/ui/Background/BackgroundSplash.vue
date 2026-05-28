<template>
	<div class="bg-splash" aria-hidden="true">
		<img :src="imgSrc" class="fit" alt="" />
	</div>
</template>

<script setup lang="ts">
withDefaults(
	defineProps<{
		imgSrc?: string;
	}>(),
	{
		imgSrc: '/mafia-village-night.png',
	},
);
</script>

<style scoped>
.bg-splash {
	position: fixed;
	inset: 0;
	z-index: 0;
	pointer-events: none;
}
</style>
