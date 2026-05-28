<template>
	<MCard>
		<MCardHeader subtitle="Roles" :separated="false" />
		<MCardContent>
			<div v-for="tag in tags" :key="tag" class="">
				<GameRoleTag :tag="tag" />
			</div>
		</MCardContent>
	</MCard>
</template>

<script setup lang="ts">
import type { GameConfig } from '@mafia/sdk';
import { MCard, MCardContent, MCardHeader } from 'src/components/ui/Card';
import GameRoleTag from '../role/GameRoleTag.vue';

withDefaults(
	defineProps<{
		tags: GameConfig['tags'];
	}>(),
	{
		tags: () => [],
	},
);
</script>
