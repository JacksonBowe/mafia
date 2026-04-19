<template>
	<q-page class="column q-pa-m" padding>
		<!-- Loading / syncing state -->
		<div
			v-if="!gameStore.isReady"
			class="column items-center justify-center"
			style="min-height: 60vh"
		>
			<q-spinner-gears size="48px" color="primary" />
			<div class="text-body1 text-grey-5 q-mt-md">
				{{ gameStore.status === 'error' ? gameStore.error : 'Loading game...' }}
			</div>
			<q-btn
				v-if="gameStore.status === 'error'"
				class="q-mt-sm"
				label="Retry"
				size="sm"
				color="primary"
				no-caps
				@click="gameStore.syncFromServer()"
			/>
		</div>

		<!-- Game content -->
		<template v-else>
			<!-- Top bar -->
			<div class="row items-center justify-between q-mb-sm">
				<div class="row q-gutter-sm">
					<q-btn label="Leave" no-caps size="sm" color="negative" glossy push />
					<q-btn label="Menu" no-caps size="sm" color="primary" glossy push />
					<q-btn label="Logs" no-caps size="sm" color="info" glossy push />
					<q-btn label="Help" no-caps size="sm" color="warning" glossy push />
				</div>
				<game-timer :duration="200" />
			</div>

			<div class="row col q-col-gutter-sm">
				<div class="col-12 col-sm-6 column q-gutter-y-md">
					<div class="col row items-start orange">
						<transition-group
							tag="div"
							enter-active-class="animated slideInLeft"
							class="row col q-gutter-md"
						>
							<game-graveyard
								key="graveyard"
								class="col-12 col-sm-6 col-md-4"
								:entries="graveyardEntries"
							/>
							<game-roles key="roles" class="col-12 col-sm-5 col-md-3" />
						</transition-group>
					</div>

					<div class="col row items-stretch">
						<transition enter-active-class="animated slideInLeft">
							<game-chat key="chat" class="col-12 full-height" />
						</transition>
					</div>
				</div>

				<div class="col-12 col-sm-6 column q-gutter-y-md">
					<div class="col row justify-end items-stretch">
						<transition enter-active-class="animated slideInRight">
							<game-role
								v-if="gameStore.actor"
								key="role"
								class="col-12 col-sm-9 col-md-6 col-lg-5 full-height"
								:role-name="gameStore.actor.role ?? 'Unknown'"
								:config="roleConfig"
							/>
						</transition>
					</div>

					<div class="col row justify-end items-stretch">
						<transition appear enter-active-class="animated slideInRight">
							<game-actions
								class="col-12 col-sm-11 col-md-8 col-lg-6 full-height"
								:phase="gameStore.phase"
								:alive="gameStore.actor?.alive ?? false"
								:has-targets="hasTargets"
							/>
						</transition>
					</div>
				</div>
			</div>

			<div v-if="false" class="row justify-center q-mt-md">
				<transition
					enter-active-class="animated bounceInDown"
					leave-active-class="animated bounceOutUp"
				>
					<game-jury
						v-if="
							playerOnTrial &&
							gameStore.actor &&
							['defense', 'trial'].includes(gameStore.phase ?? '')
						"
						:player-label="trialPlayerLabel"
					/>
				</transition>
			</div>
		</template>
	</q-page>
</template>

<script setup lang="ts">
import GameTimer from 'src/components/game/GameTimer.vue';
import GameActions from 'src/components/game/actions/GameActions.vue';
import GameChat from 'src/components/game/chat/GameChat.vue';
import type { GraveyardEntry } from 'src/components/game/graveyard/GameGraveyard.vue';
import GameGraveyard from 'src/components/game/graveyard/GameGraveyard.vue';
import GameJury from 'src/components/game/jury/GameJury.vue';
import GameRole from 'src/components/game/role/GameRole.vue';
import GameRoles from 'src/components/game/roles/GameRoles.vue';
import { useGameStore } from 'src/stores/game';
import { computed, onUnmounted } from 'vue';

const gameStore = useGameStore();

onUnmounted(() => {
	gameStore.clearGame();
});

/** Build a simple role config display from actor data */
const roleConfig = computed<Record<string, string>>(() => {
	const actor = gameStore.actor;
	if (!actor) return {};

	const config: Record<string, string> = {};
	if (actor.allies.length > 0) {
		config['Allies'] = actor.allies.map((a) => a.alias).join(', ');
	}
	return config;
});

/** Graveyard entries from engine state */
const graveyardEntries = computed<GraveyardEntry[]>(() => {
	return (gameStore.state?.graveyard ?? []).map((g) => ({
		number: g.number,
		alias: g.alias,
		role: g.role,
		cod: g.cod,
		dod: g.dod,
	}));
});

/** Find the player currently on trial */
const playerOnTrial = computed(() => {
	return null; // vote/verdict/onTrial are now delivered via realtime events only
});

/** Label for the jury card */
const trialPlayerLabel = computed(() => {
	const p = playerOnTrial.value;
	if (!p) return 'Unknown';
	return 'Unknown';
});

/** Whether the actor has any possible targets this phase */
const hasTargets = computed(() => {
	const actor = gameStore.actor;
	if (!actor) return false;
	return actor.possibleTargets.some((targets) => targets.length > 0);
});
</script>
