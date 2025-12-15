<template>
	<q-separator v-if="separated" dark />
	<q-card-actions class="mafia-card__actions" :align="align">
		<slot />
	</q-card-actions>
</template>

<script setup lang="ts">
withDefaults(
	defineProps<{
		separated?: boolean;
		align?: 'left' | 'right' | 'center' | 'between' | 'around' | 'evenly';
	}>(),
	{
		separated: true,
		align: 'right',
	},
);
</script>

<style scoped lang="scss">
.mafia-card__actions {
	padding-top: 8px;
}
</style>
