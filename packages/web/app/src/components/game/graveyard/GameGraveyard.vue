<template>
	<MCard>
		<MCardHeader title="Graveyard" :separated="false" />
		<MCardContent class="fit">
			<q-scroll-area
				class="fit graveyard-scroll"
				:bar-style="{ backgroundColor: 'transparent' }"
				:thumb-style="{ backgroundColor: 'transparent' }"
			>
				<div v-if="entries.length === 0" class="text-body2 text-grey-4">No eliminations yet.</div>

				<div v-else class="q-gutter-y-sm graveyard-content">
					<div v-for="group in groupedByDay" :key="group.day">
						<TextSeparator class="text-caption text-grey-5 q-mb-xs">
							Day {{ group.day }}
						</TextSeparator>

						<q-list dense class="graveyard-list">
							<GameGraveyardItem v-for="entry in group.deaths" :key="entry.number" :entry="entry" />
						</q-list>
					</div>
				</div>
			</q-scroll-area>
		</MCardContent>
	</MCard>
</template>

<script setup lang="ts">
import type { StateGraveyardRecord } from '@mafia/sdk';
import { MCard, MCardContent, MCardHeader } from 'src/components/ui/Card';
import TextSeparator from 'src/components/ui/TextSeparator.vue';
import { computed } from 'vue';
import GameGraveyardItem from './GameGraveyardItem.vue';

const props = withDefaults(
	defineProps<{
		entries?: StateGraveyardRecord[];
	}>(),
	{
		entries: () => [],
	},
);

const groupedByDay = computed(() => {
	const groups = new Map<number, StateGraveyardRecord[]>();
	for (const entry of props.entries) {
		const deaths = groups.get(entry.dod) ?? [];
		deaths.push(entry);
		groups.set(entry.dod, deaths);
	}

	return [...groups.entries()].sort(([a], [b]) => b - a).map(([day, deaths]) => ({ day, deaths }));
});
</script>

<style scoped lang="scss">
.graveyard-scroll {
	overflow-x: hidden;
}

.graveyard-content,
.graveyard-list {
	width: 100%;
	max-width: 100%;
	min-width: 0;
}

.graveyard-list {
	padding: 0;
}
</style>
