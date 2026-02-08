import { boot } from 'quasar/wrappers';
import { useRealtime } from 'src/lib/realtime';

export default boot(({ router }) => {
	const { startPolling, stopPolling } = useRealtime();

	router.afterEach((to) => {
		if (to.meta.requiresAuth === false) {
			stopPolling();
			return;
		}
		startPolling();
	});
});
