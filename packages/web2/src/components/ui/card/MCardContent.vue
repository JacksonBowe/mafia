<template>
	<q-card-section v-bind="props">
		<slot />
	</q-card-section>
</template>

<script setup lang="ts">
const props = withDefaults(
	defineProps<{
		class?: string;
	}>(),
	{},
);
</script>
