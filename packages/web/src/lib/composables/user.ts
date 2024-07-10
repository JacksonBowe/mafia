import { useQuery } from '@tanstack/vue-query';
import { fetchMe } from '../api/user';

export const useMe = () => {
	return useQuery({
		queryKey: ['me'],
		queryFn: fetchMe,
		retry: false,
		staleTime: Infinity,
	});
};
