<template>
	<q-card-section v-bind="props" :class="[density]">
		<slot />
	</q-card-section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
	defineProps<{
		class?: string;
		dense?: boolean;
		denser?: boolean;
		densest?: boolean;
	}>(),
	{
		dense: false,
		denser: false,
		densest: false,
	},
);

const density = computed(() => {
	if (props.densest) return 'q-py-none';
	if (props.denser) return 'q-py-xs';
	if (props.dense) return 'q-py-sm';
	return 'q-py-md';
});
</script>
