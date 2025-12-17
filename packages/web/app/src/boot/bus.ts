import { EventBus } from 'quasar';
import { boot } from 'quasar/wrappers';
// import { type Events } from 'src/lib/realtime';




const bus = new EventBus<Events>();

export default boot(({ app }) => {
    // Provide the EventBus globally
    app.provide('bus', bus);
});

export { bus };
