import { api } from 'boot/axios';



export const fetchMe = async () => {
	const r = await api.get('/users/me')
	return r.data
}
