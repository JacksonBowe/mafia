<template>
	<MCard class="fit column">
		<MCardContent class="text-white col" style="flex-grow: 1">
			<MChatArea />
		</MCardContent>
		<MCard class="row" dense>
			<MCardHeader
				class="q-my-none q-px-sm row fit q-col-gutter-x-md"
				densest
			>
				<div class="flex flex-center">
					<MChatChannelSelect />
				</div>
				<div class="col">
					<q-input
						v-model="input"
						hide-underline
						borderless
						placeholder="Type a message..."
						color="white"
						dense
						class="fit"
						input-class="text-white"
						@keydown.enter.prevent="submit"
					/>
				</div>
			</MCardHeader>
		</MCard>
	</MCard>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { MCard, MCardHeader, MCardContent } from 'src/components/ui/card';

import MChatChannelSelect from './MChatChannelSelect.vue';
import MChatArea from './MChatArea.vue';
import { useSendMessage } from 'src/lib/chat';
import { useRealtime } from 'src/lib/realtime';
import { useChatStore } from 'src/stores/chat';
import { useMe } from 'src/lib/user';

const cStore = useChatStore();
const { data: me } = useMe();

const input = ref('');

const { send } = useSendMessage();

const submit = () => {
	console.log(input.value);
	let target;
	switch (cStore.channel) {
		case 'GLOBAL':
			target = 'GLOBAL';
			break;
		case 'LOBBY':
			if (!me.value?.lobby) return;
			target = me.value?.lobby;
			break;
		default:
			target = 'GLOBAL';
	}

	send(input.value, target);
	input.value = '';
};

const { subscribe, unsubscribe } = useRealtime();

onMounted(() => {
	subscribe('chat');
});

onUnmounted(() => {
	unsubscribe('chat');
});
</script>
