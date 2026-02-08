import { useQuery } from '@tanstack/vue-query';
import { useAuthStore } from 'src/stores/auth';
import { getActor, getPresence } from './api';

export const useActor = () => {
	return useQuery({
		queryKey: ['actor'],
		queryFn: async () => {
			const actor = await getActor();

			const aStore = useAuthStore();
			aStore.userId = actor.id;

			return actor;
		},
	});
};

export const usePresence = () => {
	return useQuery({
		queryKey: ['actor', 'presence'],
		queryFn: getPresence,
	});
};
