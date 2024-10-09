<template>
	<q-btn
		size="sm"
		padding="xs sm"
		:label="cStore.channel[0]"
		glossy
		push
		:color="btnColor"
	>
		<q-menu
			fit
			class="bg-card-glossy q-pa-sm"
			anchor="top middle"
			self="bottom middle"
		>
			<q-list dense class="q-gutter-y-sm text-white">
				<q-item
					v-close-popup
					clickable
					dense
					class="bg-chat-global m-item"
					@click="cStore.channel = 'GLOBAL'"
				>
					<q-item-section>
						<q-item-label>Global</q-item-label>
					</q-item-section>
				</q-item>
				<q-item
					v-if="user?.lobby"
					v-close-popup
					clickable
					dense
					class="bg-chat-lobby m-item"
					@click="cStore.channel = 'LOBBY'"
				>
					<q-item-section>
						<q-item-label>Lobby</q-item-label>
					</q-item-section>
				</q-item>
			</q-list>
		</q-menu>
	</q-btn>
</template>

<script setup lang="ts">
import { useMe } from 'src/lib/user';
import { useChatStore } from 'src/stores/chat';
import { computed } from 'vue';

const cStore = useChatStore();
const { data: user } = useMe();

const btnColor = computed(() => {
	return cStore.channel === 'GLOBAL' ? 'red' : 'orange';
});
</script>

<style scoped>
.m-item {
	border-radius: 10px;
	box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
}
</style>
