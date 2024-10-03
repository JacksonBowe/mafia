<template>
	<MCard class="fit column">
		<MCardContent class="text-white col" style="flex-grow: 1">
			dsfdg
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
import { ref } from 'vue';
import { MCard, MCardHeader, MCardContent } from 'src/components/ui/card';

import MChatChannelSelect from './MChatChannelSelect.vue';
import MChatArea from './MChatArea.vue';
import { useChatStore } from 'src/stores/message';

const cStore = useChatStore();

const input = ref('');

const submit = () => {
	console.log(input.value);
	cStore.sendMessage(input.value);
	input.value = '';
};
</script>
