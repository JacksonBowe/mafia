import { useQuery, useMutation } from '@tanstack/vue-query';
import { fetchLobbies, hostLobby } from '../api/lobby';

export const useLobbies = () => {
	return useQuery({
		queryKey: ['lobbies'],
		queryFn: fetchLobbies,
		retry: false,
	});
};

export const mutLobbies = {
	// ...
};

export const hostLobbyMutation = () => {
	return useMutation({
		mutationFn: hostLobby,
		onSuccess: () => {
			console.log('Host success');
		},
		onError: () => {
			console.log('Host error');
		},
	});
};
