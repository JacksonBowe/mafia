import { acceptHMRUpdate, defineStore } from 'pinia';
import { loadPersisted, removePersisted, savePersisted } from 'src/util/storage';

export type Session = {
    accessToken: string;
    refreshToken?: string;
};

export const useAuthStore = defineStore('auth', {
    state: () => ({
        authenticated: false,
        session: null as Session | null,
        hydrated: false,      // <- know if we’ve already tried to load once
    }),
    getters: {
        isAuthenticated: (s) => !!s.session,
    },
    actions: {
        hydrate() {
            if (this.hydrated) return;
            const s = loadPersisted<Session>('session');
            if (s) this.session = s;
            this.hydrated = true;
        },

        setSession(session: Session) {
            this.session = session;
            savePersisted('session', session);
        },

        updateSession(newSession: Session) {
            // preserve refreshToken if your API doesn't return one on refresh
            const merged: Session = {
                ...newSession,
                ...(this.session?.refreshToken && !newSession.refreshToken
                    ? { refreshToken: this.session.refreshToken }
                    : {}),
            };
            this.setSession(merged);
        },

        clearSession() {
            this.session = null;
            this.hydrated = true;
            removePersisted('session');
        },
    },
});

if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot));
}
