// boot/auth-guard.ts
import { InvalidRefreshTokenError } from '@openauthjs/openauth/error';
import { LocalStorage } from 'quasar';
import { boot } from 'quasar/wrappers';
import { client } from 'src/lib/auth';
import { getLogger } from 'src/lib/log';
import { useAuthStore } from 'src/stores/auth';
import { useGameStore } from 'src/stores/game';
import type { NavigationGuardReturn, RouteLocationNormalizedGeneric } from 'vue-router';

type PKCEChallenge = { state: string; verifier: string };

const log = getLogger('boot:auth-guard');

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
		isProtected: matched.some((r) => r.meta?.requiresAuth),
		isGuestOnly: matched.some((r) => r.meta?.guestOnly),
		isPublic: matched.some((r) => r.meta?.public),
		requiresGame: matched.some((r) => r.meta?.requiresGame),
	};
}

function isAuthed(auth: ReturnType<typeof useAuthStore>) {
	return !!auth.authenticated && !!auth.session?.accessToken;
}

async function tryPkceExchange(
	auth: ReturnType<typeof useAuthStore>,
	to: RouteLocationNormalizedGeneric,
) {
	const code = isString(to.query?.code) ? to.query.code : null;
	const state = isString(to.query?.state) ? to.query.state : null;
	const challenge = LocalStorage.getItem<PKCEChallenge>('challenge');

	if (!code || !state || !challenge?.state || !challenge?.verifier) return null;

	log.debug('pkce: callback detected', {
		to: to.fullPath,
		hasCode: true,
		hasState: true,
		hasChallenge: true,
	});

	if (state !== challenge.state) {
		log.warn('pkce: state mismatch; clearing challenge', {
			to: to.fullPath,
			receivedState: state,
			storedState: challenge.state,
		});
		LocalStorage.remove('challenge');
		return { path: '/start', replace: true } satisfies NavigationGuardReturn;
	}

	const redirectUri = location.origin + to.path;
	log.debug('pkce: exchanging code', { redirectUri });
	const exchanged = await client.exchange(code, redirectUri, challenge.verifier);

	if (exchanged.err) {
		log.warn('pkce: exchange failed; clearing session', {
			redirectUri,
			error: exchanged.err instanceof Error ? exchanged.err.message : String(exchanged.err),
		});
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

	log.info('pkce: exchange success; user authenticated', {
		redirectUri,
		hasAccess: true,
		hasRefresh: true,
	});

	return {
		path: to.path,
		query: stripAuthQuery(to),
		replace: true,
	} satisfies NavigationGuardReturn;
}

async function tryRefresh(
	auth: ReturnType<typeof useAuthStore>,
	to: RouteLocationNormalizedGeneric,
	isProtected: boolean,
) {
	const refreshToken = auth.session?.refreshToken;
	const accessToken = auth.session?.accessToken;

	if (isAuthed(auth)) {
		log.trace('refresh: already authed; skipping', { to: to.fullPath });
		return true;
	}

	// ✅ NEW: no tokens = nothing to refresh. Let the guard continue to step (3).
	if (!refreshToken || !accessToken) {
		log.debug('refresh: cannot refresh (missing tokens)', {
			to: to.fullPath,
			isProtected,
			hasRefresh: !!refreshToken,
			hasAccess: !!accessToken,
		});
		return true;
	}

	log.debug('refresh: attempting silent refresh', { to: to.fullPath });

	const refreshed = await client.refresh(refreshToken, { access: accessToken });

	if (refreshed.err) {
		if (refreshed.err instanceof InvalidRefreshTokenError) {
			log.info('refresh: invalid refresh token; clearing session', { to: to.fullPath });
			auth.clearSession();
			auth.authenticated = false;

			// 👇 For protected routes, you can either:
			// A) allow step (3) to re-authorize (recommended), OR
			// B) send them to /start.
			//
			// I recommend A: return true and let step (3) do authorize.
			return true;
		}

		log.warn('refresh: refresh failed', {
			to: to.fullPath,
			error: refreshed.err instanceof Error ? refreshed.err.message : String(refreshed.err),
		});

		// Let step (3) authorize rather than bouncing to /start.
		return true;
	}

	auth.authenticated = true;

	if (refreshed.tokens?.access) {
		auth.setSession({
			accessToken: refreshed.tokens.access,
			refreshToken: refreshed.tokens.refresh ?? refreshToken,
		});

		log.info('refresh: success; tokens updated', {
			to: to.fullPath,
			accessToken: refreshed.tokens.access, // redacted
			refreshToken: refreshed.tokens.refresh ?? refreshToken, // redacted
		});
	} else {
		log.info('refresh: success; no new access token returned', { to: to.fullPath });
	}

	return true;
}

export default boot(({ router }) => {
	router.beforeEach(async (to) => {
		const auth = useAuthStore();
		const gameStore = useGameStore();
		const { isProtected, isGuestOnly, isPublic, requiresGame } = getFlags(to);

		log.debug('route', { to: to.fullPath, isProtected, isGuestOnly, isPublic, requiresGame });

		// hydrate once
		if (!auth.hydrated) {
			log.debug('hydrating auth store');
			auth.hydrate();
		}

		log.debug('auth snapshot', {
			authenticated: auth.authenticated,
			hasAccess: !!auth.session?.accessToken,
			hasRefresh: !!auth.session?.refreshToken,
			// If you ever accidentally pass the tokens, they’ll be redacted by the logger
			accessToken: auth.session?.accessToken,
			refreshToken: auth.session?.refreshToken,
		});

		// public route: never enforce auth
		if (isPublic || !isProtected) {
			// but still keep logged-in users off guest-only pages
			if (isGuestOnly && isAuthed(auth)) {
				const qRedirect = typeof to.query.redirect === 'string' ? to.query.redirect : null;

				log.debug('guest-only: authed user blocked from guest page', {
					to: to.fullPath,
					qRedirect,
				});

				if (qRedirect) return { path: qRedirect, replace: true };
				if (to.path === '/') return { path: '/home', replace: true };
			}
			return true;
		}

		log.debug('protected: enforcing auth');

		// 1) PKCE callback can authenticate and keep user on same page
		if (!isAuthed(auth)) {
			const pkceResult = await tryPkceExchange(auth, to);
			if (pkceResult) {
				log.debug('protected: pkce handled navigation', { to: to.fullPath });
				return pkceResult;
			}
		}

		// 2) silent refresh if needed
		const refreshResult = await tryRefresh(auth, to, isProtected);
		if (refreshResult !== true) {
			log.debug('protected: refresh caused redirect', { to: to.fullPath });
			return refreshResult;
		}

		// 3) if still not authed, kick off login
		if (!isAuthed(auth)) {
			const redirectUri = location.origin + to.path;

			log.info('protected: initiating authorize redirect', {
				to: to.fullPath,
				redirectUri,
			});

			const { challenge, url } = await client.authorize(redirectUri, 'code', { pkce: true });

			LocalStorage.set('challenge', challenge);

			if (url) {
				log.debug('protected: redirecting to provider', { to: to.fullPath });
				location.href = url;
				return false;
			}

			log.warn('protected: authorize did not return url; sending to /start', {
				to: to.fullPath,
			});

			return { path: '/start', replace: true };
		}

		// 4) guest-only protection (now we know we’re authed)
		if (isGuestOnly) {
			const qRedirect = typeof to.query.redirect === 'string' ? to.query.redirect : null;

			log.debug('guest-only: enforcing while authed', {
				to: to.fullPath,
				qRedirect,
			});

			if (qRedirect) return { path: qRedirect, replace: true };
			if (to.path === '/') return { path: '/home', replace: true };
		}

		// 5) game route protection - must have active game or be in transition
		if (requiresGame) {
			const hasGame = gameStore.currentGameId || gameStore.transitionPending;
			if (!hasGame) {
				log.info('game-route: no active game; redirecting to home', {
					to: to.fullPath,
					currentGameId: gameStore.currentGameId,
					transitionPending: gameStore.transitionPending,
				});
				return { path: '/', replace: true };
			}
		}

		return true;
	});
});
