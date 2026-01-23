import type { z } from 'zod';

export function fn<Arg1 extends z.ZodType, Result>(
	arg1: Arg1,
	cb: (arg1: z.output<Arg1>) => Result,
): ((input: z.input<Arg1>) => Result) & { schema: Arg1 } {
	const result = function (input: z.input<typeof arg1>): Result {
		const parsed = arg1.parse(input);
		return cb(parsed);
	};
	result.schema = arg1;
	return result;
}
