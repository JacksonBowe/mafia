import { bus } from 'src/boot/bus';
import { z } from 'zod';

export type ConnectEvents = {
	['foo']: (properties: z.infer<typeof onFooSchema>) => void;
	['bar']: (properties: object) => void;
};

const onFooSchema = z.object({
	msg: z.string(),
	test: z.string(),
});

bus.on('foo', (props) => {
	const result = onFooSchema.safeParse(props);
	if (!result.success) {
		console.error("Invalid payload for 'foo' event", result.error);
		return;
	}

	const msg = result.data;

	console.log('RAAAAAAA', msg);
});

bus.on('bar', (msg) => console.log(msg));
