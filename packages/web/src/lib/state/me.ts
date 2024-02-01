import {
	useQuery
} from '@tanstack/vue-query'
import { fetchMe } from "../api/users"

export const useMe = () => {
	return useQuery({
		queryKey: ['me'],
		queryFn: fetchMe
	})
}
