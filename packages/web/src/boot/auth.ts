import { boot } from 'quasar/wrappers'
import { useAuthStore } from 'src/stores/auth'

// "async" is optional;
// more info on params: https://v2.quasar.dev/quasar-cli/boot-files
export default boot(async (/* { app, router, ... } */) => {
	const aStore = useAuthStore();

	if (!aStore.isAuthenticated) {
		console.log('Not authenticated')

	}
})
