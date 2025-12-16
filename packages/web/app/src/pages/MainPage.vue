<template>
	<q-page padding class="column">
		<div class="col row justify-evenly">
			<div class="col-5 column">
				<LobbyFinderCard class="fit" />
			</div>

			<div class="col-6 column">
				<div class="col column justify-between">
					<div class="col-6">
						<LobbyPreviewCard />
					</div>

					<div class="col-5">
						<!-- <MenuChatCard /> -->
						<MCard tone="primary" glo clickable>
							<MCardHeader eyebrow="Lobby" title="Informed Minority" subtitle="Join a game" />

							<MCardContent>
								<div>Card body goes here…</div>
							</MCardContent>

							<MCardActions align="right">
								<q-btn flat label="Cancel" />
								<q-btn color="primary" label="Continue" />
							</MCardActions>
						</MCard>
					</div>
				</div>
			</div>
		</div>
	</q-page>
</template>

<script setup lang="ts">
import LobbyFinderCard from 'src/components/LobbyFinder/LobbyFinderCard.vue';
import LobbyPreviewCard from 'src/components/LobbyPreview/LobbyPreviewCard.vue';
import { MCard, MCardActions, MCardContent, MCardHeader } from 'src/components/ui/Card';
</script>
