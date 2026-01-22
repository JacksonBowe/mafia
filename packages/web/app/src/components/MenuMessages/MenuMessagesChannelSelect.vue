<template>
	<q-btn size="sm" round :label="buttonLabel" glossy :class="buttonClass">
		<q-menu class="menu-channel-menu">
			<q-list dense>
				<q-item
					clickable
					v-close-popup
					:active="modelValue === 'GLOBAL'"
					active-class="bg-primary text-white"
					@click="setChannel('GLOBAL')"
				>
					<q-item-section>Global</q-item-section>
				</q-item>
				<q-item
					v-if="canUseLobby"
					clickable
					v-close-popup
					:active="modelValue === 'LOBBY'"
					active-class="bg-primary text-white"
					@click="setChannel('LOBBY')"
				>
					<q-item-section>Lobby</q-item-section>
				</q-item>
			</q-list>
		</q-menu>
	</q-btn>
</template>

<script setup lang="ts">
import type { MenuChannel } from 'src/lib/message';
import { usePresence } from 'src/lib/meta/hooks';
import { computed, watch } from 'vue';

const props = defineProps<{ modelValue: MenuChannel }>();
const emit = defineEmits<{ 'update:modelValue': [MenuChannel] }>();

const { data: presence } = usePresence();

const canUseLobby = computed(() => !!presence.value?.lobby?.id);
const buttonLabel = computed(() => (props.modelValue === 'LOBBY' ? 'L' : 'G'));
const buttonClass = computed(() => (props.modelValue === 'LOBBY' ? 'bg-lobby' : 'bg-primary'));

const setChannel = (channel: MenuChannel) => {
	if (channel === 'LOBBY' && !canUseLobby.value) return;
	emit('update:modelValue', channel);
};

watch(
	() => canUseLobby.value,
	(canUse) => {
		if (!canUse && props.modelValue === 'LOBBY') {
			emit('update:modelValue', 'GLOBAL');
		}
	},
	{ immediate: true },
);
</script>

<style scoped>
:deep(.menu-channel-menu) {
	background: #1f1b16;
	border: 1px solid rgba(255, 255, 255, 0.08);
	box-shadow: 0 14px 40px rgba(0, 0, 0, 0.45);
	border-radius: 10px;
}

:deep(.menu-channel-menu .q-list) {
	padding: 6px;
}

:deep(.menu-channel-menu .q-item) {
	border-radius: 8px;
	min-height: 36px;
}

:deep(.menu-channel-menu .q-item__section) {
	font-size: 0.95rem;
}
</style>
