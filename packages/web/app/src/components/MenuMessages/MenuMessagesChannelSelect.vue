<template>
	<q-btn size="sm" round :label="buttonLabel" glossy :class="buttonClass">
		<MMenu>
			<q-list dense class="menu-channel-list">
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
		</MMenu>
	</q-btn>
</template>

<script setup lang="ts">
import { MMenu } from 'src/components/ui/Menu';
import type { MenuChannel } from 'src/lib/message';
import { usePresence } from 'src/lib/meta/hooks';
import { computed, watch } from 'vue';

const props = defineProps<{ modelValue: MenuChannel }>();
const emit = defineEmits<{ 'update:modelValue': [MenuChannel] }>();

const { data: presence } = usePresence();

const canUseLobby = computed(() => !!presence.value?.lobby?.id);
const buttonLabel = computed(() => (props.modelValue === 'LOBBY' ? 'L' : 'G'));
const buttonClass = computed(() =>
	props.modelValue === 'LOBBY' ? 'bg-lobby' : 'bg-primary text-white',
);

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
.menu-channel-list {
	display: flex;
	flex-direction: column;
	gap: 6px;
}
</style>
