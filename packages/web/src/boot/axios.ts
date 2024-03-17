import { boot } from 'quasar/wrappers';
import { Notify } from 'quasar';
import axios, { AxiosInstance } from 'axios';
import { useAuthStore } from 'src/stores/auth';
import { refreshSession } from 'src/api/auth';

declare module '@vue/runtime-core' {
	interface ComponentCustomProperties {
		$axios: AxiosInstance;
		$api: AxiosInstance;
	}
}

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

api.interceptors.response.use(
	(response) => {
		return response;
	},
	async (error) => {
		const originalRequest = error.config;
		const aStore = useAuthStore();

		// 401 Unauthorized
		if (error.response.status === 401) {
			if (!originalRequest._retry && aStore.refreshToken) {
				console.log('Unauthorized, attempting to refresh');
				originalRequest._retry = true;
				try {
					const tokens = await refreshSession(aStore.refreshToken);
					aStore.authenticate(tokens);

					// Update the headers of the original request and retry
					originalRequest.headers[
						'Authorization'
					] = `Bearer ${tokens.AccessToken}`;
					return api(originalRequest);
				} catch (refreshError) {
					console.error('Error refreshing session:', refreshError);
					Notify.create({
						message:
							'Error refreshing session. Please log in again.',
						color: 'negative',
						timeout: 2000,
					});
				}
			}
			console.log('Unauthorized');
			aStore.doLogout();
		}

		// 403 Forbidden
		if (error.response.status === 403) {
			Notify.create({
				message: 'Access denied',
				color: 'negative',
				timeout: 2000,
			});
		}

		// 422 MalformedRequest
		if (error.response.status === 422) {
			// Handle the 422 error here, for example, display a notification
			Notify.create({
				message: 'Api request is munted',
				caption: 'Please report this so it can be fixed',
				color: 'negative',
				timeout: 0,
				actions: [
					{
						label: 'Copy Error',
						class: 'q-ml-md',
						color: 'white',
						dense: true,
						handler: () => {
							navigator.clipboard.writeText(
								JSON.stringify(error.response.data, null, 2)
							);
						},
					},
				],
			});
		}

		// BadRequest
		if (error.response.status === 400) {
			Notify.create({
				message: error.response.data.message,
				color: 'warning',
				timeout: 2000,
			});
		}

		// InternalServerError
		if (error.response.status === 500) {
			Notify.create({
				message: error.response.data.message,
				color: 'negative',
				timeout: 2000,
			});
		}

		return Promise.reject(error);
	}
);

export default boot(() => {
	const aStore = useAuthStore();

	if (aStore.accessToken) {
		api.defaults.headers.common = {
			Authorization: `Bearer ${aStore.accessToken}`,
		};
	}
});

export { api };
