import { EventBus } from 'quasar';
import { boot } from 'quasar/wrappers';
import { type Events } from 'src/lib/events';

const bus = new EventBus<Events>();

export default boot(({ app }) => {
	// for Composition API
	app.provide('bus', bus);
});

export { bus };
