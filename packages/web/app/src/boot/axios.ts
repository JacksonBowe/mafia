// boot/axios.ts
import { defineBoot } from '#q-app/wrappers';
import { type PublicError } from '@mafia/core/error';
import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { Notify } from 'quasar';
import { useAuthStore } from 'src/stores/auth';

declare module 'vue' {
    interface ComponentCustomProperties {
        $axios: AxiosInstance;
        $api: AxiosInstance;
    }
}

type RequestMeta = { startTime: number };
type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean; metadata?: RequestMeta };
type TimedAxiosError = AxiosError & { duration?: number };

const api = axios.create({
    baseURL: import.meta.env.VITE_API_ENDPOINT!,
});

function nowMs() {
    return Date.now();
}

function notifyValidation(payload: unknown) {
    Notify.create({
        message: 'Validation error',
        caption: 'Please report this to support',
        color: 'negative',
        timeout: 0,
        actions: [
            {
                label: 'Copy',
                color: 'white',
                handler: () => void navigator.clipboard.writeText(JSON.stringify(payload, null, 2)),
            },
        ],
    });
}

function notifyBadRequest(data: PublicError) {
    Notify.create({
        message: data?.message ?? 'Bad request',
        caption: data?.details ? JSON.stringify(data.details) : '',
        color: 'warning',
        icon: 'warning',
        timeout: 4000,
    });
}

function notifyServerError(err: TimedAxiosError) {
    Notify.create({
        message: err.duration && err.duration > 10_000
            ? 'Request timed out'
            : (err.response?.data as PublicError)?.message ?? 'Server error',
        color: 'negative',
        timeout: 2000,
    });
}

export default defineBoot(({ app, router }) => {
    const authStore = useAuthStore();

    api.interceptors.request.use((config) => {
        const cfg = config as RetryableConfig;
        cfg.metadata = { startTime: nowMs() };

        const token = authStore.session?.accessToken;
        if (token) {
            cfg.headers = cfg.headers ?? {};
            cfg.headers.Authorization = `Bearer ${token}`;
        }

        return cfg;
    });

    api.interceptors.response.use(
        (res) => res,
        async (e: TimedAxiosError) => {
            const err = e;
            const cfg = err.config as RetryableConfig | undefined;

            if (cfg?.metadata?.startTime) {
                err.duration = nowMs() - cfg.metadata.startTime;
            }

            const status = err.response?.status;
            const data = err.response?.data as PublicError;

            // 401 – your current behaviour: clear + bounce on specific codes
            if (status === 401 && !cfg?._retry && authStore.session?.refreshToken) {
                const code = data?.code;
                if (code === 'user_not_found' || code === 'invalid_access_token') {
                    authStore.clearSession();
                    await router.push('/start');
                }
                // If you later add refresh here, set cfg._retry = true before retrying.
            }

            if (status === 403) {
                Notify.create({ message: 'Access denied', color: 'negative', timeout: 2000 });
                authStore.clearSession();
            } else if (status === 422) {
                notifyValidation(data);
            } else if (status === 400) {
                notifyBadRequest(data);
            } else if (status === 500) {
                notifyServerError(err);
            }

            // Preserve Axios error for callers (don’t wrap/lose response/config)
            return Promise.reject(err);
        },
    );

    // Optional: make it available as this.$api in Options API components
    app.config.globalProperties.$api = api;
});

export { api };
