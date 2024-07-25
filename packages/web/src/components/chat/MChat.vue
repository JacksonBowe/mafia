<template>
	<MCard class="fit column">
		<MCardContent class="text-white col" style="flex-grow: 1">
			dsfdg
		</MCardContent>
		<MCard class="row" dense>
			<MCardHeader
				class="q-my-none q-px-sm row fit q-col-gutter-x-md"
				densest
			>
				<div class="flex flex-center">
					<q-btn
						dens
						size="sm"
						padding="xs sm"
						label="L"
						color="orange"
					/>
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
					/>
				</div>
			</MCardHeader>
		</MCard>
	</MCard>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { MCard, MCardHeader, MCardContent } from 'src/components/ui/card';

const input = ref('');
</script>
