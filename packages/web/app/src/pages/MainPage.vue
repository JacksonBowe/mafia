<template>
	<q-page padding class="column">
		<div class="col row justify-evenly">
			<div class="col-5 column">
				<Transition name="lobby-swap" mode="out-in">
					<LobbyCard v-if="presence?.lobby" key="has-lobby" />
					<LobbyFinderCard v-else key="no-lobby" class="fit" />
				</Transition>
			</div>

			<div class="col-6 column">
				<div class="col column justify-between">
					<div class="col-6">
						<LobbyPreviewCard />
					</div>

					<div class="col-5">
						<MenuChatCard class="fit" />
						<!-- <MCard tone="primary" glow clickable>
							<MCardHeader eyebrow="Lobby" title="Informed Minority" subtitle="Join a game" />

							<MCardContent>
								<div>Card body goes here…</div>
							</MCardContent>

							<MCardActions align="right">
								<q-btn flat label="Cancel" />
								<q-btn color="primary" label="Continue" />
							</MCardActions>
						</MCard> -->
						<!-- <LobbyFinderCard class="fit" /> -->
					</div>
				</div>
			</div>
		</div>
	</q-page>
</template>

<script setup lang="ts">
import LobbyCard from 'src/components/Lobby/LobbyCard.vue';
import LobbyFinderCard from 'src/components/LobbyFinder/LobbyFinderCard.vue';
import LobbyPreviewCard from 'src/components/LobbyPreview/LobbyPreviewCard.vue';
import MenuChatCard from 'src/components/MenuChat/MenuChatCard.vue';
import { usePresence } from 'src/lib/meta/hooks';

const { data: presence } = usePresence();
</script>

<style scoped lang="scss">
.lobby-swap-enter-active,
.lobby-swap-leave-active {
	transition:
		opacity 160ms ease,
		transform 160ms ease;
}

.lobby-swap-enter-from,
.lobby-swap-leave-to {
	opacity: 0;
	transform: translatex(-10px);
}

.lobby-swap-enter-to,
.lobby-swap-leave-from {
	opacity: 1;
	transform: translateY(0);
}
</style>
