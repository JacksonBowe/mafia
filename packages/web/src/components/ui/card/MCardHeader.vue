<template>
	<q-card-section v-bind="props" :class="[density]">
		<slot />
	</q-card-section>
</template>

<script setup lang="ts">
import { computed } from 'vue';


const props = withDefaults(defineProps<{
	class?: string,
	dense: boolean,
	denser: boolean,
}>(), {
	dense: false,
	denser: false
});

const density = computed(() => {
	if (props.denser) return 'q-py-xs';
	if (props.dense) return 'q-py-sm';
	return 'q-py-md';
});

</script>
