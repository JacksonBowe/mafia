<template>
	<MCard>
		<!-- <MCardContent class="fit flex justify-center content-center bg-dark rounded-borders">
			<div>Not Implemented</div>
		</MCardContent> -->
		<MCardContent class="bg-dark rounded-borders text-white column" style="flex-grow: 1">
			<MenuMessagesArea class="fit" />
		</MCardContent>
		<MCardContent class="row q-gutter-x-sm q-mt-sm">
			<div class="content-center">
				<MenuMessagesChannelSelect v-model="selectedChannel" />
			</div>
			<q-input
				v-model="messageText"
				dense
				type="text"
				placeholder="Type a message..."
				borderless
				class="input-bo bg-dark q-pl-sm col rounded-borders"
				@keydown.enter.stop.prevent="sendMessage"
				@keydown.space.stop
			/>
			<div class="content-center">
				<q-btn
					class="bg-primary text-white"
					size="sm"
					round
					icon="send"
					glossy
					:loading="sending"
					@click="sendMessage"
				/>
			</div>
		</MCardContent>
	</MCard>
</template>

<script setup lang="ts">
import type { MenuChannel } from 'src/lib/message';
import { MCard, MCardContent } from 'src/components/ui/Card';
import { sendMenuMessage } from 'src/lib/chat/api';
import { usePresence } from 'src/lib/meta/hooks';
import { computed, ref } from 'vue';
import MenuMessagesArea from './MenuMessagesArea.vue';
import MenuMessagesChannelSelect from './MenuMessagesChannelSelect.vue';

const messageText = ref('');
const sending = ref(false);
const selectedChannel = ref<MenuChannel>('GLOBAL');

const { data: presence } = usePresence();
const lobbyId = computed(() => presence.value?.lobby?.id ?? null);

const sendMessage = async () => {
	if (sending.value) return;
	const text = messageText.value.trim();
	if (!text) return;

	messageText.value = '';
	sending.value = true;
	try {
		if (selectedChannel.value === 'LOBBY' && !lobbyId.value) return;
		await sendMenuMessage(text, selectedChannel.value);
	} finally {
		sending.value = false;
	}
};
</script>
