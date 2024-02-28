import { boot } from 'quasar/wrappers'
import { Notify } from 'quasar'
import { useAuthStore } from 'src/stores/auth'
import { refreshSession } from 'src/lib/api/auth';

export default boot(async ({ router }) => {
	const aStore = useAuthStore();

	router.beforeEach(async (to, from, next) => {

		if (from.path === '/' && to.path !== '/auth' && aStore.refreshToken) {
			console.log('Attempting to refresh')
			try {
				const tokens = await refreshSession(aStore.refreshToken);
				aStore.authenticate(tokens);
				next()
			} catch (refreshError) {
				console.error('Error refreshing session:', refreshError);
				Notify.create({
					message: 'Error refreshing session. Please log in again.',
					color: 'negative',
					timeout: 2000
				});
				next('/auth');
			}
		}
		if (!(to.meta.requiresAuth===false) && !aStore.isAuthenticated) {
			console.log('Not authenticated')
			next('/auth');
		} else {
			next();
		}
	})
})
