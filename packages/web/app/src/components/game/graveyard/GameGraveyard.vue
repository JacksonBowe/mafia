<template>
	<MCard>
		<MCardHeader title="Graveyard" :separated="false" />
		<MCardContent>
			<div v-if="entries.length === 0" class="text-body2 text-grey-4">No eliminations yet.</div>
			<div v-else class="q-gutter-y-xs">
				<div v-for="e in entries" :key="e.number" class="text-body2 text-grey-4">
					<span class="text-grey-2">{{ e.alias }}</span>
					&mdash; {{ e.role }}
					<span class="text-caption text-grey-6">({{ e.cod }}, day {{ e.dod }})</span>
				</div>
			</div>
		</MCardContent>
	</MCard>
</template>

<script setup lang="ts">
import type { StateGraveyardRecord } from '@mafia/sdk';
import { MCard, MCardContent, MCardHeader } from 'src/components/ui/Card';

export type GraveyardEntry = StateGraveyardRecord;

withDefaults(
	defineProps<{
		entries?: GraveyardEntry[];
	}>(),
	{
		entries: () => [],
	},
);
</script>
