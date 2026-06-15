<template>
	<MCard class="column no-wrap">
		<!-- <MCardHeader title="Chat" subtitle="Game messages and events." /> -->
		<MCardContent class="col bg-dark rounded-borders text-white column">
			<q-scroll-area ref="scrollAreaRef" class="col" @scroll="handleScroll">
				<div class="game-chat q-pa-sm">
					<div v-if="messages.length === 0" class="text-caption text-grey-6">No messages yet.</div>
					<div v-for="message in messages" :key="message.id" class="game-chat__item text-caption">
						<span v-if="showName(message)" class="game-chat__name q-mr-xs">
							{{ displayName(message) }}:
						</span>
						<span :class="messageClass(message)">{{ message.text }}</span>
					</div>
				</div>
			</q-scroll-area>
		</MCardContent>
		<MCardContent class="row q-gutter-x-sm q-mt-sm">
			<q-input
				v-model="messageText"
				dense
				type="text"
				:placeholder="placeholder"
				borderless
				class="bg-dark q-pl-sm col rounded-borders"
				:disable="!canSend"
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
					:loading="sendGameMessage.isPending.value"
					:disable="!canSend"
					@click="sendMessage"
				/>
			</div>
		</MCardContent>
	</MCard>
</template>

<script setup lang="ts">
import { resolveGameChatSendPolicy } from '@mafia/sdk';
import type { QScrollArea } from 'quasar';
import { MCard, MCardContent } from 'src/components/ui/Card';
import { useSendGameMessage } from 'src/lib/game/hooks';
import type { Message } from 'src/lib/message';
import { useGameStore } from 'src/stores/game';
import { useMessageStore } from 'src/stores/message';
import { computed, nextTick, ref, watch } from 'vue';

const gameStore = useGameStore();
const messageStore = useMessageStore();
const scrollAreaRef = ref<QScrollArea | null>(null);
const autoScrollEnabled = ref(true);
const messageText = ref('');
const sendGameMessage = useSendGameMessage();

const messages = computed(() =>
	messageStore.sortedMessages.filter(
		(message) => message.scope === 'game' && message.gameId === gameStore.info?.id,
	),
);

const sendPolicy = computed(() => {
	const actor = gameStore.actor;
	if (!gameStore.info || !actor) return { canSend: false, reason: 'Loading chat...' } as const;
	return resolveGameChatSendPolicy({ phase: gameStore.phase ?? 'pregame', actor });
});

const canSend = computed(() => sendPolicy.value.canSend);

const placeholder = computed(() => {
	if (!gameStore.actor) return 'Loading chat...';
	if (!gameStore.actor.alive) return 'Talk to the dead...';
	if (sendPolicy.value.canSend && sendPolicy.value.channel === 'TEAM') return 'Talk to your team...';
	if (!sendPolicy.value.canSend) return sendPolicy.value.reason;
	return 'Type a message...';
});

function isAtBottom(verticalPercentage: number) {
	return verticalPercentage >= 0.98;
}

function handleScroll(details: { verticalPercentage: number }) {
	const atBottom = isAtBottom(details.verticalPercentage);
	if (autoScrollEnabled.value && !atBottom) {
		autoScrollEnabled.value = false;
		return;
	}

	if (!autoScrollEnabled.value && atBottom) {
		autoScrollEnabled.value = true;
	}
}

function scrollToBottom() {
	const scrollArea = scrollAreaRef.value;
	if (!scrollArea) return;
	scrollArea.setScrollPosition('vertical', Number.MAX_SAFE_INTEGER, 0);
}

function showName(message: Message) {
	return message.kind === 'USER' && message.sender.type === 'USER';
}

function displayName(message: Message) {
	if (message.sender.type === 'USER') return message.sender.displayName ?? 'Player';
	return message.sender.label ?? 'System';
}

function messageClass(message: Message) {
	if (message.kind === 'SYSTEM') return 'text-warning';
	if (message.kind === 'INFO') return 'text-info';
	if (message.channel === 'DEAD') return 'text-grey-5';
	if (message.channel === 'TEAM') return 'text-purple-3';
	if (message.channel === 'PRIVATE') return 'text-orange-3';
	return '';
}

const sendMessage = async () => {
	if (sendGameMessage.isPending.value || !canSend.value) return;
	const text = messageText.value.trim();
	if (!text) return;

	messageText.value = '';
	try {
		await sendGameMessage.mutateAsync(text);
	} catch {
		messageText.value = text;
	}
};

watch(
	() => messages.value.length,
	async () => {
		if (!autoScrollEnabled.value) return;
		await nextTick();
		scrollToBottom();
	},
	{ immediate: true },
);
</script>

<style scoped>
.game-chat__item {
	line-height: 1.35;
	margin-bottom: 6px;
}

.game-chat__item:last-child {
	margin-bottom: 0;
}

.game-chat__name {
	font-weight: 500;
	opacity: 0.85;
}
</style>
