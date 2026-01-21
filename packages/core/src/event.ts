import { event } from 'sst/event';
import { ZodValidator } from 'sst/event/validator';
import { useActor } from './actor';

// Backend Events
export const defineEvent = event.builder({
	validator: ZodValidator,
	metadata() {
		return {
			actor: useActor(),
		};
	},
});
