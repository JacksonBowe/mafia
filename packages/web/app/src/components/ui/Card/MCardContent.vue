<template>
	<q-card-section class="mafia-card__content">
		<slot />
	</q-card-section>
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
.mafia-card__content {
	color: var(--text-body);
	line-height: 1.55;
}
</style>
