import { boot } from 'quasar/wrappers';
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';

export default boot(({ app }) => {
	// Initialize QueryClient
	const queryClient = new QueryClient();

	// Provide the QueryClient globally through VueQueryPlugin
	app.use(VueQueryPlugin, { queryClient });

	app.provide('queryClient', queryClient);
});
