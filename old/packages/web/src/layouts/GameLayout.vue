<template>
  <q-layout view="hHh LpR lfr">
		<div class="bg-splash bg-black">
			<transition mode="out-in" appear enter-active-class="animated bounceInRight" leave-active-class="animated bounceOutLeft">
				<img key="morning" v-if="gStore?.stageName == 'MORNING'" src="~assets/mafia-village-morning.png" class="fit morning" />
				<img key="day" v-else-if="['DAY', 'DEFENSE', 'TRIAL', 'LYNCH', 'POLL'].indexOf(gStore?.stageNameSplit) > -1" src="~assets/mafia-village-day.png" class="fit day" />
				<img key="evening" v-else-if="gStore?.stageName == 'EVENING'" src="~assets/mafia-village-evening.png" class="fit trial" />
				<img key="night" v-else-if="gStore?.stageName == 'NIGHT'" src="~assets/mafia-village-night.png" class="fit prenight" />
                <img key="pregame" v-else src="~assets/mafia-village-night.png" class="fit prenight" />
            </transition>
		</div>
		<q-page-container>
			<!-- This is where pages get injected -->
			<router-view />
		</q-page-container>

	</q-layout>
</template>

<script setup lang="ts">
import { reactive } from 'vue';


const gStore = reactive({
	stageName: 'PREGAME',
	stageNameSplit: 'PREGAME',
});
</script>

<style scoped>
.bg-splash {
	position: fixed;
	height: 100%;
	width: 100%;
	z-index: 0;
}
</style>
