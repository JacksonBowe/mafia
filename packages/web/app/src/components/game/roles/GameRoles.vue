<template>
	<MCard>
		<MCardHeader title="Roles" :separated="false" />
		<MCardContent>
			<div v-if="players.length === 0" class="text-body2 text-grey-4">No players.</div>
			<div v-else class="q-gutter-y-xs">
				<div
					v-for="p in players"
					:key="p.number"
					class="text-body2"
					:class="{
						'text-grey-6': !p.alive,
						'text-strike': !p.alive,
					}"
				>
					{{ p.number }} - {{ p.alias }}
					<span v-if="p.isYou" class="text-primary text-weight-medium"> (You)</span>
					<span v-if="p.onTrial" class="text-negative text-weight-medium"> (on trial) </span>
				</div>
			</div>
		</MCardContent>
	</MCard>
</template>

<script setup lang="ts">
import { MCard, MCardContent, MCardHeader } from 'src/components/ui/Card';

export interface RolesPlayer {
	number: number;
	alias: string;
	alive: boolean;
	onTrial: boolean;
	isYou: boolean;
}

withDefaults(
	defineProps<{
		players?: RolesPlayer[];
	}>(),
	{
		players: () => [],
	},
);
</script>
