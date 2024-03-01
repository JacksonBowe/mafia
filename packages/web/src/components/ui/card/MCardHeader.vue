<template>
	<q-card-section v-bind="props" :class="[
		dense ? 'q-py-xs' : 'q-py-md',
	]">
		<slot />
	</q-card-section>
</template>

<script setup lang="ts">

const props = withDefaults(defineProps<{
	class?: string,
	dense: boolean,
}>() , {
	dense: false
});

</script>
