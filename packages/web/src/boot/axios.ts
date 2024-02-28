import { boot } from 'quasar/wrappers';
import { LocalStorage, Notify } from 'quasar'
import axios, { AxiosInstance } from 'axios';
import { useAuthStore } from 'src/stores/auth';

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $axios: AxiosInstance;
    $api: AxiosInstance;
  }
}

// Be careful when using SSR for cross-request state pollution
// due to creating a Singleton instance here;
// If any client changes this (global) instance, it might be a
// good idea to move this instance creation inside of the
// "export default () => {}" function below (which runs individually
// for each client)
console.log(import.meta.env.VITE_API_URL)
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

api.interceptors.response.use(
	(response) => {
		return response;
	},
	(error) => {
		// const origionalRequest = error.config;

		// 401 Unauthorized
		if (error.response.status === 401) {
			Notify.create({
				message: 'You are not authenticated.',
				color: 'negative',
				timeout: 2000
			});

		}

		// TODO: 403 Forbidden
		if (error.response.status === 403) {
			
		}


		// TODO: 422 MalformedRequest

		// BadRequest
		if (error.response.status === 400) {
			Notify.create({
				message: error.response.data.message,
				color: 'warning',
				timeout: 2000
			});
		}

		// InternalServerError
		if (error.response.status === 500) {
			Notify.create({
				message: error.response.data.message,
				color: 'negative',
				timeout: 2000
			});
		}

		return Promise.reject(error);
	}
);

export default boot(() => {
	const aStore = useAuthStore();

	if (aStore.accessToken) {
		api.defaults.headers.common = {
			'Authorization': `Bearer ${aStore.accessToken}`
		};
	}
});

export { api };
