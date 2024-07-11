<template>
	<q-layout view="hHh Lpr fFf">
		<!-- Be sure to play with the Layout demo on docs -->
		<div class="bg-splash">
			<img src="~assets/mafia-village-night.png" class="fit" />
		</div>
		<q-header class="bg-transparent flex justify-center" height-hint="98">
			<MCard class="" style="width: 80%">
				<MCardHeader dense class="row">
					<div class="q-gutter-sm flex items-center">
						<span class="text-subtitle1 text-mafia">Mafia</span>
						<q-btn
							flat
							dense
							icon="fa-brands fa-github"
							color="grey-6"
							rounded
							size="sm"
							target="_blank"
							href="https://github.com/JacksonBowe/mafia"
						/>
					</div>

					<q-space />
					<div class="q-gutter-sm flex items-cente">
						<q-skeleton
							v-if="isLoading"
							type="rect"
							dark
							class="q-mr-sm"
							width="100px"
						/>
						<span v-else class="text-subtitle1 q-mr-sm">{{
							me?.username
						}}</span>

						<q-skeleton
							v-if="isLoading"
							type="QAvatar"
							dense
							size="24px"
							dark
							class="q-mr-sm"
						/>
						<q-avatar v-else size="sm" class="">
							<img
								:src="
									me?.avatar ||
									'https://cdn.quasar.dev/img/boy-avatar.png'
								"
								alt="Avatar"
							/>
						</q-avatar>
						<q-btn size="sm" color="primary" @click="test"
							>Test</q-btn
						>
					</div>
				</MCardHeader>
			</MCard>
		</q-header>

		<q-page-container>
			<!-- This is where pages get injected -->
			<router-view />
			<AdminFab />
		</q-page-container>
	</q-layout>
</template>

<script setup lang="ts">
import { IoT } from 'src/boot/iot';
import AdminFab from 'src/components/AdminFab.vue';
import { MCard, MCardHeader } from 'src/components/ui/card';
import { useMe } from 'src/lib/composables';
import { onMounted, onUnmounted } from 'vue';

const { data: me, isLoading } = useMe();
const decoder = new TextDecoder('utf-8');

// IoT
IoT.startPolling();
// onMounted(() => {

// });

onUnmounted(() => {
	IoT.stopPolling();

	IoT.connection?.unsubscribe('mafia/local/test');
});

const test = () => {
	// console.log('test', IoT.connection);
	// IoT.connection?.publish('mafia/local/test', 'test', 1);
	IoT.connection?.subscribe(
		'mafia/local/test',
		IoT.mqtt.QoS.AtLeastOnce,
		(topic, payload) => {
			console.log('test3', topic, JSON.parse(decoder.decode(payload)));
		}
	);
};
</script>

<style scoped>
.bg-splash {
	position: fixed;
	height: 100%;
	width: 100%;
	z-index: 0;
}
</style>
src/lib/composables
