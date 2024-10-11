import { boot } from 'quasar/wrappers';
import { VueQueryPlugin } from '@tanstack/vue-query';

export default boot(async ({ app }) => {
	app.use(VueQueryPlugin);
});
