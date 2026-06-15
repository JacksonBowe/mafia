<template>
	<q-item clickable class="graveyard-item relative-position no-select q-my-xs">
		<q-item-section avatar class="graveyard-item__avatar">
			<q-icon name="fa-solid fa-skull" size="16px" />
		</q-item-section>

		<q-item-section class="graveyard-item__main">
			<q-item-label class="row items-center no-wrap q-gutter-x-xs">
				<span class="graveyard-item__alias ellipsis text-weight-semibold">
					{{ entry.alias }}
				</span>
				<span class="text-grey-6">as</span>
				<span
					class="graveyard-item__role ellipsis text-weight-semibold"
					:style="{ color: colorForRole(entry.role) }"
				>
					{{ entry.role }}
				</span>
			</q-item-label>
			<q-item-label caption class="graveyard-item__cause">
				{{ entry.cod }}
			</q-item-label>
		</q-item-section>

		<q-item-section side class="text-caption text-grey-6 q-pl-sm">
			#{{ entry.number }}
		</q-item-section>
	</q-item>
</template>

<script setup lang="ts">
import type { StateGraveyardRecord } from '@mafia/sdk';
import { colorForRole } from 'src/util/colors';

defineProps<{
	entry: StateGraveyardRecord;
}>();
</script>

<style scoped lang="scss">
.graveyard-item {
	border-radius: 10px;
	padding: 7px 9px;
	background: rgba(255, 255, 255, 0.035);
	border: 1px solid rgba(255, 255, 255, 0.06);
	transition:
		background 120ms ease,
		border-color 120ms ease,
		transform 120ms ease;
}

.graveyard-item:hover {
	background: rgba(255, 255, 255, 0.055);
	border-color: rgba(255, 255, 255, 0.12);
	transform: translateY(-1px);
}

.graveyard-item__avatar {
	min-width: 30px;
	color: rgba(255, 255, 255, 0.42);
}

.graveyard-item__main {
	min-width: 0;
}

.graveyard-item__alias {
	max-width: 42%;
	color: rgba(255, 255, 255, 0.9);
}

.graveyard-item__role {
	max-width: 42%;
}

.graveyard-item__cause {
	color: rgba(255, 255, 255, 0.48);
}
</style>
