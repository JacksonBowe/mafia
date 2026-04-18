import { useQuery } from '@tanstack/vue-query';
import { computed, unref, type MaybeRef } from 'vue';
import { fetchActiveGame, fetchGame } from './api';

export const useGame = (gameId: MaybeRef<string | null>) => {
	const gameIdRef = computed(() => unref(gameId));

	return useQuery({
		queryKey: computed(() => ['game', gameIdRef.value ?? ''] as const),
		queryFn: () => fetchGame(gameIdRef.value!),
		enabled: computed(() => !!gameIdRef.value),
	});
};

export const useActiveGame = () =>
	useQuery({
		queryKey: ['game', 'active'],
		queryFn: fetchActiveGame,
	});
