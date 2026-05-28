<template>
	<MCard>
		<MCardHeader title="Actions" :separated="false" />
		<MCardContent>
			<div class="text-body1 q-mb-sm">
				{{ phaseLabel }}
			</div>
		</MCardContent>
		<MCardActions>
			<q-btn size="sm" color="primary" label="Vote" no-caps :disable="!canVote" />
			<q-btn size="sm" color="secondary" label="Ability" no-caps :disable="!canUseAbility" />
			<q-btn size="sm" color="grey-8" label="Skip" no-caps :disable="!canAct" />
		</MCardActions>
	</MCard>
</template>

<script setup lang="ts">
import type { GamePhase } from '@mafia/sdk';
import { computed } from 'vue';
import { MCard, MCardActions, MCardContent, MCardHeader } from 'src/components/ui/Card';

const DAY_PHASES: GamePhase[] = ['day', 'poll', 'defense', 'trial'];
const NIGHT_PHASES: GamePhase[] = ['night'];

const props = withDefaults(
	defineProps<{
		phase?: GamePhase | null;
		alive?: boolean;
		hasTargets?: boolean;
	}>(),
	{
		phase: null,
		alive: false,
		hasTargets: false,
	},
);

const phaseLabel = computed(() => {
	if (!props.phase) return 'Waiting for game to start...';
	if (props.phase === 'pregame') return 'Waiting for game to start...';
	if (!props.alive) return 'You are dead.';
	if (DAY_PHASES.includes(props.phase)) return `Day phase: ${props.phase}`;
	if (NIGHT_PHASES.includes(props.phase)) return 'Choose your night action.';
	return `Phase: ${props.phase}`;
});

const canAct = computed(() => props.alive && !!props.phase && props.phase !== 'pregame');

const canVote = computed(
	() => canAct.value && !!props.phase && DAY_PHASES.includes(props.phase),
);

const canUseAbility = computed(() => canAct.value && props.hasTargets);
</script>
