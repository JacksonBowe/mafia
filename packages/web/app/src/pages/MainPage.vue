<template>
	<q-page padding class="column">
		<div class="col row justify-evenly">
			<div class="col-5 column">
				<LobbiesCard class="fit" />
			</div>

			<div class="col-6 column">
				<div class="col column justify-between">
					<div class="col-6">
						<LobbyPreviewCard />
					</div>

					<div class="col-5">
						<MenuChatCard />
					</div>
				</div>
			</div>
		</div>
	</q-page>
</template>

<script setup lang="ts">
import LobbiesCard from 'src/components/Lobbies/LobbiesCard.vue';
import LobbyPreviewCard from 'src/components/LobbyPreview/LobbyPreviewCard.vue';
import MenuChatCard from 'src/components/MenuChat/MenuChatCard.vue';
</script>
