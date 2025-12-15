// boot/axios.ts
import { defineBoot } from '#q-app/wrappers';
import axios, { type AxiosInstance } from 'axios';
import { Notify } from 'quasar';
import { useAuthStore } from 'src/stores/auth';

declare module 'vue' {
    interface ComponentCustomProperties {
        $axios: AxiosInstance
        $api: AxiosInstance
    }
}

declare module 'axios' {
    export interface InternalAxiosRequestConfig {
        metadata?: {
            startTime: number;
        };
    }

    export interface AxiosError {
        duration?: number;
    }
}

const api = axios.create({ baseURL: import.meta.env.VITE_API_ENDPOINT! })




export default defineBoot(({ router }) => {

    // Attach request/response interceptors
    api.interceptors.request.use(
        (config) => {
            config.metadata = { startTime: new Date().getTime() };
            const authStore = useAuthStore();
            const token = authStore.session?.accessToken;

            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }

            return config;
        },
        (error) => Promise.reject(new Error(error?.message ?? 'Request error')),
    );


    api.interceptors.response.use(
        (response) => response,
        async (error) => {
            const authStore = useAuthStore();
            const originalRequest = error.config;

            if (error.config?.metadata?.startTime) {
                error.duration = new Date().getTime() - error.config.metadata.startTime;
            }

            const status = error.response?.status;
            // 401 – try refresh
            if (status === 401 && !originalRequest._retry && authStore.session?.refreshToken) {
                console.log("Unauthorized", error)
                if (error.response.data.code === 'user_not_found' || error.response.data.code === 'invalid_access_token') {
                    authStore.clearSession()
                    await router.push('/start')
                }


            }

            // 403 – Forbidden
            if (status === 403) {
                Notify.create({ message: 'Access denied', color: 'negative', timeout: 2000 });
                authStore.clearSession();
            }

            // 422 – Validation
            if (status === 422) {
                Notify.create({
                    message: 'Validation error',
                    caption: 'Please report this to support',
                    color: 'negative',
                    timeout: 0,
                    actions: [
                        {
                            label: 'Copy',
                            color: 'white',
                            handler: () => {
                                void navigator.clipboard.writeText(JSON.stringify(error.response.data, null, 2));
                            },
                        },
                    ],
                });
            }

            // 400 – Bad request
            if (status === 400) {
                Notify.create({
                    message: error.response.data.message ?? 'Bad request',
                    caption: error.response.data.details,
                    color: 'warning',
                    icon: 'warning',
                    timeout: 4000,
                });
            }

            // 500 – Server error
            if (status === 500) {
                Notify.create({
                    message:
                        error.duration > 10000
                            ? 'Request timed out'
                            : (error.response?.data?.message ?? 'Server error'),
                    color: 'negative',
                    timeout: 2000,
                });
            }

            return Promise.reject(new Error(error?.message ?? 'Request error'));
        },
    );

})

export { api };

