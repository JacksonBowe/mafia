<template>
	<MCard class="column">
		<MCardContent class="col column" style="min-height: 0">
			<q-list
				dense
				class="col column no-wrap justify-evenly"
				style="min-height: 0; padding-left: 0px !important"
			>
				<GameActor
					v-for="i in 15"
					:key="i"
					style="min-height: 0"
					:number="i"
					:actor="actorForNumber(i)"
					:isPlayer="gameStore.actor?.number === i"
					:isAlly="gameStore.actor?.allies.map((a) => a.number).includes(i)"
					:phase="gameStore.phase"
				/>
			</q-list>
		</MCardContent>
	</MCard>
</template>

<script setup lang="ts">
import MCard from 'src/components/ui/Card/MCard.vue';
import MCardContent from 'src/components/ui/Card/MCardContent.vue';
import { useGameStore } from 'src/stores/game.js';
import GameActor from './GameActor.vue';

const gameStore = useGameStore();

const actorForNumber = (playerNumber: number) => {
	return gameStore.state?.actors.find((a) => a.number === playerNumber);
};
</script>

<style lang="scss" scoped>
.q-list--dense > .q-item {
	padding-left: 0px !important;
	padding: 2px 8px !important;
}
</style>
