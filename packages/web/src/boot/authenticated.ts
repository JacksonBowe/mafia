import { boot } from 'quasar/wrappers'
import { useAuthStore } from 'src/stores/auth'

export default boot(async ({ router }) => {
	const aStore = useAuthStore();

	router.beforeEach((to, from, next) => {
		console.log(to)
		console.log(from)
		if (from.path === '/') {
			console.log('Attempting to refresh')
			aStore.accessToken;
		}
		if (!(to.meta.requiresAuth===false) && !aStore.isAuthenticated) {
			console.log('Not authenticated')
			console.log(to)
			next('/auth');
		} else {
			next();
		}
	})
})
