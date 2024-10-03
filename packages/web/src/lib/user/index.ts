export * from './api';
export * from './types';

import { useQuery } from '@tanstack/vue-query';
import { fetchMe } from './api';

export const useMe = () => {
	return useQuery({
		queryKey: ['me'],
		queryFn: fetchMe,
		retry: false,
		staleTime: Infinity,
	});
};
