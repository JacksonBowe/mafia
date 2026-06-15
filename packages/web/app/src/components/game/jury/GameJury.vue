<template>
	<MCard class="jury-card">
		<MCardHeader :title="'Vote on the fate of ' + playerLabel" :separated="false" />
		<MCardContent class="fit column justify-evenly q-mt-md" style="gap: 20px">
			<div class="row q-col-gutter-x-sm q-mb-sm">
				<div class="col">
					<q-btn
						class="full-width"
						:color="currentVerdict === 'guilty' ? 'negative' : 'grey-9'"
						:loading="isPending && pendingVerdict === 'guilty'"
						:disable="isDisabled || currentVerdict === 'guilty'"
						label="Guilty"
						no-caps
						glossy
						@click="submitVerdict('guilty')"
					/>
				</div>
				<div class="col">
					<q-btn
						class="full-width"
						:color="currentVerdict === 'abstain' ? 'warning' : 'grey-9'"
						:loading="isPending && pendingVerdict === 'abstain'"
						:disable="isDisabled || currentVerdict === 'abstain'"
						label="Abstain"
						no-caps
						glossy
						@click="submitVerdict('abstain')"
					/>
				</div>
				<div class="col">
					<q-btn
						class="full-width"
						:color="currentVerdict === 'innocent' ? 'positive' : 'grey-9'"
						:loading="isPending && pendingVerdict === 'innocent'"
						:disable="isDisabled || currentVerdict === 'innocent'"
						label="Innocent"
						no-caps
						glossy
						@click="submitVerdict('innocent')"
					/>
				</div>
			</div>

			<div class="row justify-between text-caption text-grey-4">
				<span>Guilty: {{ guiltyCount }}</span>
				<span>Abstain: {{ abstainCount }}</span>
				<span>Innocent: {{ innocentCount }}</span>
			</div>
			<div v-if="disabledReason" class="text-caption text-grey-5 q-mt-xs">{{ disabledReason }}</div>
		</MCardContent>
	</MCard>
</template>

<script setup lang="ts">
import type { Verdict } from '@mafia/sdk';
import { MCard, MCardContent, MCardHeader } from 'src/components/ui/Card';
import { useSubmitGameVerdict } from 'src/lib/game/hooks';
import { useGameStore } from 'src/stores/game';
import { computed, ref } from 'vue';

withDefaults(
	defineProps<{
		playerLabel?: string;
	}>(),
	{
		playerLabel: 'Unknown',
	},
);

const gameStore = useGameStore();
const { mutateAsync: submitGameVerdict, isPending } = useSubmitGameVerdict();
const pendingVerdict = ref<Verdict | null>(null);

const currentVerdict = computed(() => {
	const actorNumber = gameStore.actor?.number;
	if (!actorNumber) return null;
	return gameStore.verdicts[actorNumber] ?? null;
});

const guiltyCount = computed(
	() => Object.values(gameStore.verdicts).filter((verdict) => verdict === 'guilty').length,
);

const abstainCount = computed(
	() => Object.values(gameStore.verdicts).filter((verdict) => verdict === 'abstain').length,
);

const innocentCount = computed(
	() => Object.values(gameStore.verdicts).filter((verdict) => verdict === 'innocent').length,
);

const disabledReason = computed(() => {
	if (!gameStore.info || !gameStore.actor) return 'Waiting for game sync.';
	if (gameStore.phase !== 'trial') return 'Verdict opens during trial.';
	if (!gameStore.actor.alive) return 'Dead players cannot submit verdicts.';
	if (gameStore.actor.number === gameStore.onTrialActorNumber)
		return 'Player on trial cannot submit verdict.';
	return '';
});

const isDisabled = computed(() => isPending.value || Boolean(disabledReason.value));

const submitVerdict = (verdict: Verdict) => {
	if (!gameStore.info || isDisabled.value || currentVerdict.value === verdict) return;
	pendingVerdict.value = verdict;
	void submitGameVerdict({ gameId: gameStore.info.id, verdict }).finally(() => {
		pendingVerdict.value = null;
	});
};
</script>

<style scoped>
.jury-card {
	min-width: 240px;
}
</style>
