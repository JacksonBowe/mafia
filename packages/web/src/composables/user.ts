import { useQuery } from '@tanstack/vue-query';
import { fetchMe } from '../lib/api/user';

export const useMe = () => {
	return useQuery({
		queryKey: ['me'],
		queryFn: fetchMe,
		retry: false,
	});
};
