<template>
	<q-btn-dropdown
		v-if="gameStore.isSandbox"
		:label="sandboxVariant"
		size="sm"
		padding="xs md"
		color="primary"
		text-color="white"
		no-caps
	>
		<q-list dense style="min-width: 170px">
			<q-item
				v-for="variant in gameSandboxVariants"
				:key="variant"
				clickable
				v-close-popup
				:active="variant === sandboxVariant"
				@click="sandboxVariant = variant"
			>
				<q-item-section>{{ variant }}</q-item-section>
			</q-item>
		</q-list>
	</q-btn-dropdown>
</template>

<script setup lang="ts">
import {
	gameSandboxVariants,
	isGameSandboxVariant,
	loadGameSandbox,
	type GameSandboxVariant,
} from 'src/lib/dev/gameSandbox';
import { useGameStore } from 'src/stores/game';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const gameStore = useGameStore();
const route = useRoute();
const router = useRouter();

const sandboxVariant = computed<GameSandboxVariant>({
	get() {
		const devGame = typeof route.query.devGame === 'string' ? route.query.devGame : 'day';
		return isGameSandboxVariant(devGame) ? devGame : 'day';
	},
	set(variant) {
		loadGameSandbox(gameStore, variant);
		void router.replace({ query: { ...route.query, devGame: variant } });
	},
});
</script>
