// boot/auth-guard.ts
import { InvalidRefreshTokenError } from '@openauthjs/openauth/error';
import { LocalStorage } from 'quasar';
import { boot } from 'quasar/wrappers';
import { client } from 'src/lib/auth';
import { useAuthStore } from 'src/stores/auth';
import type { NavigationGuardReturn, RouteLocationNormalizedGeneric } from 'vue-router';

type PKCEChallenge = { state: string; verifier: string };

function isString(v: unknown): v is string {
    return typeof v === 'string' && v.length > 0;
}

function stripAuthQuery(to: RouteLocationNormalizedGeneric) {
    const cleaned = { ...(to.query ?? {}) };
    delete cleaned.code;
    delete cleaned.state;
    return cleaned;
}

function getFlags(to: RouteLocationNormalizedGeneric) {
    const matched = to.matched;
    return {
        isProtected: matched.some(r => r.meta?.requiresAuth),
        isGuestOnly: matched.some(r => r.meta?.guestOnly),
        isPublic: matched.some(r => r.meta?.public),
    };
}

function isAuthed(auth: ReturnType<typeof useAuthStore>) {
    return !!auth.authenticated && !!auth.session?.accessToken;
}

async function tryPkceExchange(auth: ReturnType<typeof useAuthStore>, to: RouteLocationNormalizedGeneric) {
    const code = isString(to.query?.code) ? to.query.code : null;
    const state = isString(to.query?.state) ? to.query.state : null;
    const challenge = LocalStorage.getItem<PKCEChallenge>('challenge');

    if (!code || !state || !challenge?.state || !challenge?.verifier) return null;

    if (state !== challenge.state) {
        LocalStorage.remove('challenge');
        return { path: '/start', replace: true } satisfies NavigationGuardReturn;
    }

    const redirectUri = location.origin + to.path;
    const exchanged = await client.exchange(code, redirectUri, challenge.verifier);

    if (exchanged.err) {
        auth.clearSession();
        LocalStorage.remove('challenge');
        return { path: '/start', replace: true } satisfies NavigationGuardReturn;
    }

    auth.setSession({
        accessToken: exchanged.tokens.access,
        refreshToken: exchanged.tokens.refresh,
    });
    auth.authenticated = true;
    LocalStorage.remove('challenge');

    return {
        path: to.path,
        query: stripAuthQuery(to),
        replace: true,
    } satisfies NavigationGuardReturn;
}

async function tryRefresh(auth: ReturnType<typeof useAuthStore>, to: RouteLocationNormalizedGeneric, isProtected: boolean) {
    const refreshToken = auth.session?.refreshToken;
    const accessToken = auth.session?.accessToken;

    if (isAuthed(auth)) return true;
    if (!refreshToken || !accessToken) return isProtected ? ({ path: '/start', replace: true } as const) : true;

    const refreshed = await client.refresh(refreshToken, { access: accessToken });

    if (refreshed.err) {
        if (refreshed.err instanceof InvalidRefreshTokenError) {
            auth.clearSession();
            auth.authenticated = false;
            return isProtected ? ({ path: '/start', replace: true } as const) : true;
        }
        return isProtected ? ({ path: '/start', replace: true } as const) : true;
    }

    auth.authenticated = true;

    if (refreshed.tokens?.access) {
        auth.setSession({
            accessToken: refreshed.tokens.access,
            refreshToken: refreshed.tokens.refresh ?? refreshToken,
        });
    }

    return true;
}

export default boot(({ router }) => {
    router.beforeEach(async (to) => {
        const auth = useAuthStore();
        const { isProtected, isGuestOnly, isPublic } = getFlags(to);

        // hydrate once
        if (!auth.hydrated) auth.hydrate();

        // public route: never enforce auth
        if (isPublic || !isProtected) {
            // but still keep logged-in users off guest-only pages
            if (isGuestOnly && isAuthed(auth)) {
                const qRedirect = typeof to.query.redirect === 'string' ? to.query.redirect : null;
                if (qRedirect) return { path: qRedirect, replace: true };
                if (to.path === '/') return { path: '/home', replace: true };
            }
            return true;
        }

        // 1) PKCE callback can authenticate and keep user on same page
        if (!isAuthed(auth)) {
            const pkceResult = await tryPkceExchange(auth, to);
            if (pkceResult) return pkceResult;
        }

        // 2) silent refresh if needed
        const refreshResult = await tryRefresh(auth, to, isProtected);
        if (refreshResult !== true) return refreshResult;

        // 3) if still not authed, kick off login
        if (!isAuthed(auth)) {
            const redirectUri = location.origin + to.path;
            const { challenge, url } = await client.authorize(redirectUri, 'code', { pkce: true });

            LocalStorage.set('challenge', challenge);

            if (url) {
                location.href = url;
                return false;
            }

            return { path: '/start', replace: true };
        }

        // 4) guest-only protection (now we know we’re authed)
        if (isGuestOnly) {
            const qRedirect = typeof to.query.redirect === 'string' ? to.query.redirect : null;
            if (qRedirect) return { path: qRedirect, replace: true };
            if (to.path === '/') return { path: '/home', replace: true };
        }

        return true;
    });
});
