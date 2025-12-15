
// bot/auth-guard.ts
import { InvalidRefreshTokenError } from '@openauthjs/openauth/error';
import { LocalStorage } from 'quasar';
import { boot } from 'quasar/wrappers';
import { client } from 'src/lib/auth';
import { useAuthStore } from 'src/stores/auth';
import type { RouteLocationNormalizedGeneric } from 'vue-router';

type PKCEChallenge = {
    state: string;
    verifier: string;
};

function isString(v: unknown): v is string {
    return typeof v === 'string' && v.length > 0;
}

function stripAuthQuery(to: RouteLocationNormalizedGeneric) {
    const cleanedQuery = { ...(to.query ?? {}) };
    delete cleanedQuery.code;
    delete cleanedQuery.state;
    return cleanedQuery;
}

export default boot(({ router }) => {
    router.beforeEach(async (to) => {
        const auth = useAuthStore();

        // 1) Ensure we load any cached session once
        if (!auth.hydrated) {
            auth.hydrate();
        }

        const isProtected = to.matched.some(r => r.meta?.requiresAuth);
        const isGuestOnly = to.matched.some(r => r.meta?.guestOnly);
        const isPublic = to.matched.some(r => r.meta?.public);

        // Public route: never enforce auth
        if (isPublic || !isProtected) return true;

        // Helper flags
        const hasSession = !!auth.session;
        const authed = !!auth.authenticated && hasSession;

        // 2) If we are NOT authed, first try: handle PKCE callback (code+state)
        //    This supports protected routes too: if user was redirected back to a protected page,
        //    we exchange code and allow navigation.
        if (!authed) {
            const code = isString(to.query?.code) ? to.query.code : null;
            const state = isString(to.query?.state) ? to.query.state : null;
            const challenge = LocalStorage.getItem<PKCEChallenge>('challenge');

            if (code && state && challenge?.state && challenge?.verifier) {
                // Verify state matches
                if (state !== challenge.state) {
                    // State mismatch: clear challenge & treat as unauthenticated
                    LocalStorage.remove('challenge');
                } else {
                    // Exchange code -> tokens
                    const redirectUri = location.origin + to.path;
                    const exchanged = await client.exchange(code, redirectUri, challenge.verifier);

                    if (exchanged.err) {
                        // Failed exchange: treat as unauthenticated and send to /start
                        auth.clearSession();
                        LocalStorage.remove('challenge');
                        return { path: '/start', replace: true };
                    }

                    // Save session
                    auth.setSession({
                        accessToken: exchanged.tokens.access,
                        refreshToken: exchanged.tokens.refresh,
                    });
                    auth.authenticated = true;

                    // Clean up query + PKCE cache, but keep the user on the same page
                    LocalStorage.remove('challenge');

                    return {
                        path: to.path,
                        query: stripAuthQuery(to),
                        replace: true,
                    };
                }
            }
        }

        // Recompute after potential exchange
        const authedNow = !!auth.authenticated && !!auth.session;

        // 3) If not authed but we do have a session, try refresh (silent)
        if (!authedNow && auth.session?.refreshToken && auth.session?.accessToken) {
            console.log("Unauthenticated - attempting to refresh session")

            const refreshed = await client.refresh(auth.session.refreshToken, {
                access: auth.session.accessToken,
            });

            if (refreshed.err) {
                if (refreshed.err instanceof InvalidRefreshTokenError) {
                    // invalid refresh token: hard logout
                    auth.clearSession();
                    auth.authenticated = false;


                    // If they tried to hit a protected route, bounce to /start
                    if (isProtected) return { path: '/start', replace: true };
                    return true;
                }

                // other refresh errors: be conservative
                // if route is protected, send to /start, otherwise allow
                if (isProtected) return { path: '/start', replace: true };
                return true;
            }

            // Success: mark authed
            auth.authenticated = true;
            // If refresh returns rotated tokens and you want to store them,
            // adapt this depending on what openauth client returns.
            // Some clients only return new access; some rotate refresh too.
            if (refreshed.tokens?.access && typeof auth.setSession === 'function') {
                auth.setSession({
                    accessToken: refreshed.tokens.access,
                    refreshToken: refreshed.tokens.refresh ?? auth.session.refreshToken,
                });
            }

            console.log("Session refreshed successfully");

            // continue
        }

        // Recompute again
        const finalAuthed = !!auth.authenticated && !!auth.session;

        // 4) If route is protected and still not authed, start login (PKCE) or bounce
        if (isProtected && !finalAuthed) {
            // Kick off authorize flow:
            const redirectUri = location.origin + to.path;
            const { challenge, url } = await client.authorize(redirectUri, 'code', { pkce: true });

            LocalStorage.set('challenge', challenge);

            if (url) {
                // IMPORTANT: returning false prevents router from continuing navigation
                location.href = url;
                return false;
            }

            return { path: '/start', replace: true };
        }

        // if already logged in, keep them off guest-only pages
        if (isGuestOnly && authed) {
            // if a redirect was provided (e.g. after register), go there
            const qRedirect = typeof to.query.redirect === 'string' ? to.query.redirect : null;
            if (qRedirect) return { path: qRedirect, replace: true };

            // otherwise only bounce from '/' to /home
            if (to.path === '/') return { path: '/home', replace: true };

            return true;
        }

        return true;
    });
});
