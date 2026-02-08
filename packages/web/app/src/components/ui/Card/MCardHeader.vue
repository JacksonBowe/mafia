<template>
	<q-card-section class="mafia-card__header">
		<slot name="header">
			<div class="row items-start justify-between q-gutter-sm">
				<div class="col">
					<div v-if="eyebrow" class="text-overline mafia-card__eyebrow">
						{{ eyebrow }}
					</div>
					<div v-if="title" class="text-h6 mafia-card__title">
						{{ title }}
					</div>
					<div v-if="subtitle" class="text-caption mafia-card__subtitle">
						{{ subtitle }}
					</div>
				</div>

				<div v-if="$slots.topRight" class="col-auto">
					<slot name="topRight" />
				</div>
			</div>
		</slot>
	</q-card-section>

	<q-separator v-if="separated" dark class="q-my-sm" />
</template>

<script setup lang="ts">
withDefaults(
	defineProps<{
		title?: string;
		eyebrow?: string;
		subtitle?: string;
		separated?: boolean;
	}>(),
	{
		separated: true,
	},
);
</script>

<style scoped lang="scss">
.mafia-card__header {
	padding-bottom: 10px;
}

.mafia-card__eyebrow {
	color: var(--tone-text);
	letter-spacing: 0.08em;
}

.mafia-card__subtitle {
	font-size: 0.9em;
}

.mafia-card__subtitle {
	color: var(--text-muted);
}
</style>
