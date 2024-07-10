<template>
	<MCard class="column">
		<MCardHeader denser> Players </MCardHeader>
		<q-separator color="primary" inset />
		<MCardContent
			v-if="selectedLobby?.users?.length"
			class="col row q-py-xs"
		>
			<MLobbyPreviewUsersList
				:users="selectedLobby?.users?.slice(0, 8)"
			/>
			<q-separator vertical color="accent" class="q-mx-sm" inset />
			<MLobbyPreviewUsersList
				:users="selectedLobby?.users?.slice(8, 15)"
			/>
		</MCardContent>
	</MCard>
</template>

<script setup lang="ts">
import { MCard, MCardHeader, MCardContent } from '../ui/card';

import MLobbyPreviewUsersList from './MLobbyPreviewUsersList.vue';

import { useSelectedLobby } from 'src/lib/composables';

const selectedLobby = useSelectedLobby();
</script>
