import { api } from 'boot/axios'
import { AxiosError } from 'axios';


export const authorizeDiscord = async () => {
	const r = await api.get('/auth/authorize/discord')
	return r.data
}


export interface AccessTokenResponse {
    AccessToken: string;
}

export const fetchTokensDiscord = async (code: string): Promise<AccessTokenResponse> => {
    console.log('Fetching with code', code);
    try {
        const response = await api.post('/auth/token/discord', null, { params: { code: code } });
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError) {
            if (error.response) {
                console.error('Request failed with status code', error.response.status);
                console.error('Response data:', error.response.data);
            } else if (error.request) {
                console.error('No response received:', error.request);
            } else {
                console.error('Error setting up the request:', error.message);
            }
        } else {
            console.error('Non-Axios error occurred:', (error as Error).message);
        }
        throw error;
    }
};

