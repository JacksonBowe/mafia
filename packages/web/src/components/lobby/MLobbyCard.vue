<template>
	<MCard class="text-white column">
		<q-card-section class="">
			<q-tabs v-model="tab" active-class="active-tab" dense animated no-caps align="justify" indicator-color="transparent" class="text-h6 tab-title" >
				<q-tab name="join" :ripple="false">Join</q-tab>
				<span class="tab-title">|</span>
				<q-tab name="host" :ripple="false">Host</q-tab>
			</q-tabs>
		</q-card-section>
		<q-card-section class="col q-pt-none">
			<q-tab-panels v-model="tab" animated class="full-height bg-transparent q-pa-none">
				<q-tab-panel name="join" class="q-pa-none">
					<MCard class=" fit">Doin Join Stuff</MCard>
					</q-tab-panel>
					<q-tab-panel name="host">
					Doin Host stuff
					</q-tab-panel>
			</q-tab-panels>
		</q-card-section>
	</MCard>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { MCard, MCardHeader, MCardContent } from 'src/components/ui/card';

const tab = ref('join')

</script>

<style>
	.q-tab .q-focus-helper {
        visibility: hidden;
    }

	.tab-title {
        color: rgba(255, 255, 255, 0.3);
    }

	.active-tab {
        color: rgba(255, 255, 255, 1);
    }

</style>
