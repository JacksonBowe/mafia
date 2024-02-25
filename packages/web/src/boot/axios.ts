import { boot } from 'quasar/wrappers';
import { LocalStorage } from 'quasar'
import axios, { AxiosInstance } from 'axios';

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $axios: AxiosInstance;
    $api: AxiosInstance;
  }
}

interface Tokens {
	AccessToken: string
}

// Be careful when using SSR for cross-request state pollution
// due to creating a Singleton instance here;
// If any client changes this (global) instance, it might be a
// good idea to move this instance creation inside of the
// "export default () => {}" function below (which runs individually
// for each client)
console.log(import.meta.env.VITE_API_URL)
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

export default boot(() => {
	if (LocalStorage.has('mtokens')) {
		const tokens = LocalStorage.getItem('mtokens') as Tokens
		if (tokens && typeof tokens === 'object' && tokens.AccessToken) {
			// Access the AccessToken property safely
			api.defaults.headers.common = {
			  'Authorization': `Bearer ${tokens.AccessToken}`
			};
		  } else {
			console.error('Invalid tokens or AccessToken not found.');
		  }
	}
});

export { api };
