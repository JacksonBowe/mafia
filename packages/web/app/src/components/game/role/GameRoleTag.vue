<template>
	<div>{{ tagDisplay }}</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
	defineProps<{
		tag: string;
	}>(),
	{
		tag: '',
	},
);

const tagDisplay = computed(() => {
	return props.tag
		.split('_')
		.map((s) => s.charAt(0).toUpperCase() + s.slice(1))
		.join(' ');
});
</script>
