import { api } from 'boot/axios'

export const authorizeDiscord = async () => {
	const r = await api.get('/auth/authorize/discord')
	return r.data
}

