import { useQuery } from '@tanstack/vue-query';
import { api } from 'src/boot/axios';
import { useAuthStore } from 'src/stores/auth';

export const useActor = () => {
	return useQuery({
		queryKey: ['actor'],
		queryFn: async () => {
			const actor = await api.getMe();

			const aStore = useAuthStore();
			aStore.userId = actor.id;

			return actor;
		},
	});
};

export const usePresence = () => {
	return useQuery({
		queryKey: ['actor', 'presence'],
		queryFn: api.getPresence,
	});
};
