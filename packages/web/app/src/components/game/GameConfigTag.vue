<template>
	<div>My component</div>
</template>

<script setup lang="ts">
withDefaults(
	defineProps<{
		tag: string;
	}>(),
	{
		tag: '',
	},
);
</script>
