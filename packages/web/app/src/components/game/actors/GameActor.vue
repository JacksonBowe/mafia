<template>
	<q-item
		v-if="props.actor"
		class="rounded-borders no-select"
		:class="{ 'dead-actor': !props.actor.alive }"
		clickable
	>
		<q-item-section side class="q-pr-sm">
			<q-avatar
				class="no-select"
				size="sm"
				:text-color="props.isPlayer ? playerColor : 'slategrey'"
			>
				{{ props.actor?.number ?? '?' }}.
			</q-avatar>
		</q-item-section>

		<q-item-section>
			<q-item-label :style="{ color: actorTextColor }">
				{{ props.actor?.alias }}
				<span v-if="isPlayer" class="text-caption text-grey">(me)</span>
				<span v-if="isAlly" class="text-caption text-grey">(ally)</span>
			</q-item-label>
		</q-item-section>

		<template v-if="props.actor?.alive">
			<q-item-section
				side
				v-if="phase === 'poll' && gameStore.actor?.alive"
				style="gap: 8px"
				:class="{ 'reserve-space-hidden': isPlayer }"
			>
				<div class="flex" style="width: 60px">
					<q-btn
						size="sm"
						padding="2px lg"
						:color="isActorVotedByPlayer ? 'red' : 'grey-9'"
						glossy
						:label="isActorVotedByPlayer ? 'Cancel' : 'Vote'"
						no-caps
						width="60px"
						@click="voteTarget(actor)"
					/>
				</div>
				<div style="width: 10px; text-align: center">{{ voteCount }}</div>
			</q-item-section>
			<q-item-section side v-else-if="phase === 'evening'" style="gap: 8px">
				<div class="flex fit">
					<template v-for="(_targets, i) of gameStore.actor?.possibleTargets" :key="i">
						<q-btn
							v-if="canTargetSlot(actor, i)"
							size="sm"
							padding="2px lg"
							:color="isSelectedTarget(actor, i) ? 'negative' : 'primary'"
							:label="targetSlotLabel(i)"
							glossy
							no-caps
							width="60px"
							@click="setTarget(actor, i)"
						/>
					</template>
				</div>
			</q-item-section>
		</template>
	</q-item>

	<!-- Placeholder for empty slot keeping layout consistent -->
	<q-item v-else>
		<q-item-section side class="q-pr-sm">
			<q-avatar class="no-select" size="sm" rounded text-color="grey">{{ props.number }}.</q-avatar>
		</q-item-section>
	</q-item>
</template>

<script setup lang="ts">
import { type GameInfo, type GameState } from '@mafia/sdk';
import { useSetGameTargets, useSubmitGameVote } from 'src/lib/game/hooks';
import { useGameStore } from 'src/stores/game';
import { getCssVar } from 'src/util/colors';
import { computed } from 'vue';

type GameActor = GameState['actors'][number];
const props = defineProps<{
	actor: GameActor | undefined;
	number: number;
	isPlayer?: boolean;
	isAlly?: boolean | undefined;
	phase: GameInfo['phase'] | null;
}>();

const gameStore = useGameStore();

const playerColor = computed(() => {
	return getCssVar(`--player-${props.actor?.number}`) || 'grey';
});

const actorTextColor = computed(() => (props.actor?.alive ? playerColor.value : 'grey'));

/** Number of votes this actor has received (from realtime vote events). */
const voteCount = computed(
	() => Object.values(gameStore.votes).filter((target) => target === props.actor?.number).length,
);

const isActorVotedByPlayer = computed(() => {
	if (!props.actor) return false;
	const target = gameStore.votes[gameStore.actor?.number ?? -1];
	return target === props.actor.number;
});

/** Voting */
const { mutateAsync: submitVote } = useSubmitGameVote();

const voteTarget = (actor: GameActor | undefined) => {
	if (!gameStore.info || !gameStore.actor?.alive || !actor) return;
	const targetActorNumber = actor.number;
	if (!targetActorNumber) return;
	void submitVote({ gameId: gameStore.info.id, targetActorNumber });
};

/** Targeting */
const { mutateAsync: setTargets } = useSetGameTargets();

const targetSlotLabel = (slot: number) => String.fromCharCode(65 + slot);


const canTargetSlot = (actor: GameActor | undefined, slot: number) => {
	if (!actor) return false;
	if (slot > 0 && gameStore.actor?.targets[slot - 1] === undefined) return false;
	return gameStore.actor?.possibleTargets[slot]?.includes(actor.number) ?? false;
};


const isSelectedTarget = (actor: GameActor | undefined, slot: number) => {
	if (!actor) return false;
	return gameStore.actor?.targets[slot] === actor.number;
};

const setTarget = (actor: GameActor | undefined, slot: number) => {
	if (!gameStore.info || !gameStore.actor || !canTargetSlot(actor, slot)) return;
	if (!actor) return;

	const targetActorNumbers = gameStore.actor.targets.slice(0, slot);
	if (!isSelectedTarget(actor, slot)) {
		targetActorNumbers[slot] = actor.number;
	}

	void setTargets({ gameId: gameStore.info.id, targetActorNumbers }).then((result) => {
		if (!gameStore.actor) return;
		gameStore.actor = { ...gameStore.actor, targets: result.targetActorNumbers };
	});
};
</script>

<style scoped lang="scss">
.dead-actor {
	opacity: 0.6;
}

.dead-actor :deep(.q-item__label) {
	text-decoration: line-through;
}
</style>
