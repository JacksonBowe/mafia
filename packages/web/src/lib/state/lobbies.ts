import { useQuery } from '@tanstack/vue-query';
import { fetchLobbies } from '../api/lobby';

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
