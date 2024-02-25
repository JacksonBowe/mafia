import { boot } from 'quasar/wrappers'
import { useAuthStore } from 'src/stores/auth'

export default boot(async ({ router }) => {
	const aStore = useAuthStore();

	router.beforeEach((to, from, next) => {
		if (!(to.meta.requiresAuth===false) && !aStore.isAuthenticated) {
			console.log('Not authenticated')
			console.log(to)
			next('/auth');
		} else {
			next();
		}
	})
})
