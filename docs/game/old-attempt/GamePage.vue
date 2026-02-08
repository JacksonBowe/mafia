<template>
	<q-page class="column">
		<div class="bg-splash bg-black">
			<transition
				mode="out-in"
				appear
				enter-active-class="animated bounceInRight"
				leave-active-class="animated bounceOutLeft"
			>
				<img
					key="morning"
					v-if="gStore?.stageName == 'MORNING'"
					src="~assets/mafia-village-morning.png"
					class="fit morning"
				/>
				<img
					key="day"
					v-else-if="
						['DAY', 'DEFENSE', 'TRIAL', 'LYNCH', 'POLL'].indexOf(
							gStore?.stageNameSplit,
						) > -1
					"
					src="~assets/mafia-village-day.png"
					class="fit day"
				/>
				<img
					key="evening"
					v-else-if="gStore?.stageName == 'EVENING'"
					src="~assets/mafia-village-evening.png"
					class="fit trial"
				/>
				<img
					key="night"
					v-else-if="gStore?.stageName == 'NIGHT'"
					src="~assets/mafia-village-night.png"
					class="fit prenight"
				/>
				<img
					key="pregame"
					v-else
					src="~assets/mafia-village-night.png"
					class="fit prenight"
				/>
			</transition>
		</div>
		<q-toolbar class="q-pl-lg q-pr-md q-mb-non toolbar row justify-between">
			<div>
				<q-btn @click="load" label="Load" size="sm" color="positive" class="q-mr-sm" />
				<q-btn @click="unload" label="Unload" size="sm" color="negative" class="q-mr-sm" />
				<q-btn @click="f" label="Test" size="sm" color="primary" />
			</div>

			<div class="flex content-center justify-end col-2 row">
				<transition mode="out-in" class="" enter-active-class="animated slideInRight">
					<m-stage-timer v-if="gStore.game" class="full-width" />
				</transition>
			</div>
		</q-toolbar>

		<div class="col row justify-between q-mx-md q-mb-md">
			<div class="col-6 column justify-between q-mb-sm">
				<div class="col-4 row">
					<transition-group enter-active-class="animated slideInLeft">
						<m-graveyard
							v-if="gStore.game"
							key="graveyard"
							class="col-4 q-mx-sm m-card-inner"
						/>
						<m-roles-list v-if="gStore.game" key="roles" class="q-mx-sm m-card-inner" />
					</transition-group>
				</div>
				<div class="col-6 column">
					<transition enter-active-class="animated slideInLeft">
						<!-- <div v-if="gStore.game" key="chat" class="m-card m-card-inner col justify-center flex content-center text-white font-risque text-h6">
                            Chat goes here
                        </div> -->

						<m-game-chat-card v-if="gStore.game" key="chat" class="col" />
					</transition>
				</div>
			</div>
			<div class="col-3 column justify-between q-mb-xs overflow-hidden">
				<div class="col-5 row justify-end">
					<transition enter-active-class="animated slideInRight">
						<m-role-card
							v-if="gStore.actor"
							key="role"
							class="col-9 m-card-inner"
							:role-name="gStore.roleName"
							:config="gStore.roleConfig"
						/>
					</transition>
				</div>
				<div class="col items-end flex">
					<transition appear enter-active-class="animated slideInRight">
						<!-- removed the 'col-6' here -->
						<m-actions-card v-if="gStore.game" class="m-card full-width" />
					</transition>
				</div>
			</div>
			<div class="jury-container flex justify-center">
				<transition
					enter-active-class="animated bounceInDown"
					leave-active-class="animated bounceOutUp"
				>
					<m-jury-card
						v-if="
							gStore.playerOnTrial &&
							['DEFENSE', 'TRIAL'].indexOf(gStore?.stageNameSplit) > -1 &&
							gStore.playerOnTrial.number !== gStore.actor.number
						"
					/>
					<!-- <m-jury-card /> -->
				</transition>
			</div>
		</div>
	</q-page>
</template>

<script>
import MRolesList from 'src/components/game/MRolesList.vue';
import MGraveyard from 'src/components/game/MGraveyard.vue';
import MRoleCard from 'src/components/game/MRoleCard.vue';
import MActionsCard from 'src/components/game/MActionsCard.vue';
import MStageTimer from 'src/components/game/MStageTimer.vue';
import MJuryCard from 'src/components/game/MJuryCard.vue';
import MGameChatCard from 'src/components/game/chat/MGameChatCard.vue';

import { useGameStore } from 'src/stores/game';
import { onBeforeMount, ref, computed } from 'vue';
import { useMafiaStore } from 'src/stores/mafia';
import { useRouter } from 'vue-router';

export default {
	name: 'GamePage',
	components: {
		MRolesList,
		MGraveyard,
		MRoleCard,
		MActionsCard,
		MStageTimer,
		MJuryCard,
		MGameChatCard,
	},
	setup() {
		const gStore = useGameStore();
		const mStore = useMafiaStore();
		const router = useRouter();
		onBeforeMount(() => {
			if (!mStore.me.game) {
				// router.push('/home')
			}

			// gStore.getActor(123)
			// gStore.getGame(123)
		});

		const show = ref(false);

		const f = () => {
			// console.log('changing stage duration')
			// gStore.stage.name = Math.random().toString()
			// gStore.stage.duration = gStore.stage.duration + 1
			// show.value = !show.value
			// console.log('Killing a player')
			// for (let player of gStore.game.state.players) {
			//     if (player.alive) {
			//         player.alive = false
			//         break;
			//     }
			// }
			// console.log('Refreshing game')
			// gStore.getGame()
			// console.log(gStore.votesForPlayerByAlias('UncleGenghi'))
		};

		const showRole = computed(() => {
			return gStore.actor != null;
		});

		const load = () => {
			gStore.actor = {
				id: '9',
				name: 'UncleGenghi',
				alias: 'Scrooge',
				role: 'Jester',
				number: 13,
				alive: true,
				possible_targets: [
					[2, 4, 5, 6, 7, 8, 9, 10, 12, 15],
					[2, 4, 5, 6, 7, 8, 9, 10, 12, 15],
				],
				targets: [],
				allies: [],
				events: [],
			};

			gStore.game = {
				state: {
					day: 2,
					stage: 'morning',
					players: [
						{
							number: 3,
							alias: 'Bronson',
							alive: false,
						},
						{
							number: 1,
							alias: 'Brett',
							alive: false,
						},
						{
							number: 2,
							alias: 'Dinkle',
							alive: true,
						},
						{
							number: 4,
							alias: 'Rory',
							alive: true,
						},
						{
							number: 5,
							alias: 'Car',
							alive: true,
						},
						{
							number: 6,
							alias: 'Dog',
							alive: true,
						},
						{
							number: 8,
							alias: 'Mick',
							alive: true,
						},
						{
							number: 9,
							alias: 'Gordon',
							alive: true,
						},
						{
							number: 11,
							alias: 'Kody',
							alive: false,
						},
						{
							number: 12,
							alias: 'Muck',
							alive: true,
						},
						{
							number: 13,
							alias: 'Scrooge',
							alive: true,
						},
						{
							number: 14,
							alias: 'Wesley',
							alive: true,
						},
						{
							number: 15,
							alias: 'Brandon',
							alive: true,
						},
						{
							number: 10,
							alias: 'Jackson',
							alive: true,
						},
						{
							number: 7,
							alias: 'Bertha',
							alive: true,
						},
					],
					graveyard: [
						{
							number: 1,
							alias: 'Brett',
							deathDay: 2,
							deathReason: 'They were found riddled with bullets.',
							role: 'Bodyguard',
						},
						{
							number: 3,
							alias: 'Bronson',
							deathDay: 3,
							deathReason: 'They were lynched',
							role: 'Mafioso',
						},
						{
							number: 11,
							alias: 'Kody',
							deathDay: 2,
							deathReason: 'Died of verbal diarrhea',
							role: 'Crier',
						},
					],
				},
				config: {
					tags: [
						'town_government',
						'town_protective',
						'town_protective',
						'town_power',
						'town_investigative',
						'town_killing',
						'town_investigative',
						'town_random',
						'mafia_killing',
						'mafia_deception',
						'mafia_support',
						'neutral_evil',
						'neutral_benign',
						'neutral_random',
						'any_random',
					],
					settings: {},
					roles: {
						Citizen: {
							max: 1,
							weight: 1,
							settings: {
								maxVests: 2,
							},
						},
						Mayor: {
							max: 0,
							weight: 1,
							settings: {},
						},
						Doctor: {
							max: 1,
							weight: 1,
							settings: {},
						},
						Bodyguard: {
							max: 0,
							weight: 1,
							settings: {},
						},
						Escort: {
							max: 0,
							weight: 1,
							settings: {},
						},
						Sheriff: {
							max: 0,
							weight: 1,
							settings: {},
						},
						Investigator: {
							max: 0,
							weight: 1,
							settings: {},
						},
						Mafioso: {
							max: 1,
							weight: 1,
							settings: {},
						},
						Consort: {
							max: 1,
							weight: 1,
							settings: {},
						},
						Janitor: {
							max: 0,
							weight: 1,
							settings: {},
						},
						Survivor: {
							max: 0,
							weight: 1,
							settings: {},
						},
						SerialKiller: {
							max: 0,
							weight: 1,
							settings: {},
						},
						Enforcer: {
							max: 0,
							weight: 1,
							settings: {},
						},
						Jester: {
							max: 1,
							weight: 1,
							settings: {},
						},
					},
				},
			};

			gStore.stage = { name: 'NIGHT' };
		};

		const unload = () => {
			gStore.actor = null;
			gStore.game = null;
			gStore.stage = {};
		};

		return {
			gStore,
			f,
			show,
			load,
			unload,
		};
	},
};
</script>

<style scoped>
.bg-splash {
	position: fixed;
	height: 100%;
	width: 100%;
	z-index: -1;
}

.toolbar {
	overflow: hidden;
	/* background-color: rgba(255, 0, 0, 0.222); */
}

.jury-container {
	top: 25%;
	left: 50%;
	position: absolute;
	display: flex;
	justify-content: center;
	width: 30%;
	height: 20%;
	transform: translate(-50%, 0);
}
</style>
