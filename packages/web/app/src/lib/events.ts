// type ParserLike<TIn = unknown, TOut = TIn> = {
//     // Zod v3/v4 both have parse()
//     parse: (input: unknown) => TOut;
//     // optional brand fields (ignored)
//     _input?: TIn;
//     _output?: TOut;
// };

// type AnyRealtimeDef = {
//     type: string;
//     schema: ParserLike<any, any>;
// };

// type InputOf<S> =
//     S extends { _input: infer I } ? I :
//     unknown;

// export type EventMapFromDefs<T extends Record<string, AnyRealtimeDef>> = {
//     [K in T[keyof T]["type"]]: (
//         payload: InputOf<Extract<T[keyof T], { type: K }>["schema"]>
//     ) => void;
// };