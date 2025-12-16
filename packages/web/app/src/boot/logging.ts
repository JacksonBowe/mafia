import { boot } from 'quasar/wrappers';
import { configureLogging } from 'src/lib/log';

export default boot(() => {
    configureLogging();
});