import { EventBus } from 'quasar';
import { boot } from 'quasar/wrappers';
import { type Events, registerEvents } from 'src/lib/events';

import 'src/lib/lobby/events';

const bus = new EventBus<Events>();

export default boot(({ app }) => {
	// for Composition API
	app.provide('bus', bus);

	registerEvents(bus);
});

export { bus };
