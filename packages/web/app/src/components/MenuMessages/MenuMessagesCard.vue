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
				<MenuMessagesChannelSelect />
			</div>
			<q-input
				v-model="messageText"
				dense
				type="text"
				placeholder="  Type a message..."
				borderless
				class="input-bo bg-dark q-pl-sm col rounded-borders"
				@keydown.enter="sendMessage"
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
import { MCard, MCardContent } from 'src/components/ui/Card';
import { sendMenuGlobalMessage } from 'src/lib/chat/api';
import { ref } from 'vue';
import MenuMessagesArea from './MenuMessagesArea.vue';
import MenuMessagesChannelSelect from './MenuMessagesChannelSelect.vue';

const messageText = ref('');
const sending = ref(false);

const sendMessage = async () => {
	const text = messageText.value.trim();
	if (!text) return;

	sending.value = true;
	try {
		await sendMenuGlobalMessage(text);
		messageText.value = '';
	} finally {
		sending.value = false;
	}
};
</script>
