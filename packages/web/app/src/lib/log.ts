import log, { type LogLevelDesc, type Logger as LogLevelLogger } from 'loglevel';

type LogContext = Record<string, unknown>;

type AppLogger = {
	error: (msg: string, ctx?: LogContext) => void;
	warn: (msg: string, ctx?: LogContext) => void;
	info: (msg: string, ctx?: LogContext) => void;
	debug: (msg: string, ctx?: LogContext) => void;
	trace: (msg: string, ctx?: LogContext) => void;
	child: (ns: string) => AppLogger;
};

const REDACT_KEYS = new Set(['accessToken', 'refreshToken', 'Authorization']);

function redact(value: unknown): unknown {
	if (!value || typeof value !== 'object') return value;
	if (Array.isArray(value)) return value.map(redact);

	const obj = value as Record<string, unknown>;
	const out: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(obj)) {
		out[k] = REDACT_KEYS.has(k) ? '[REDACTED]' : redact(v);
	}
	return out;
}

function prefix(ns: string, msg: string): string {
	return ns ? `[${ns}] ${msg}` : msg;
}

function wrap(base: LogLevelLogger, ns: string): AppLogger {
	return {
		error: (msg, ctx) => base.error(prefix(ns, msg), ctx ? redact(ctx) : undefined),
		warn: (msg, ctx) => base.warn(prefix(ns, msg), ctx ? redact(ctx) : undefined),
		info: (msg, ctx) => base.info(prefix(ns, msg), ctx ? redact(ctx) : undefined),
		debug: (msg, ctx) => base.debug(prefix(ns, msg), ctx ? redact(ctx) : undefined),
		trace: (msg, ctx) => base.trace(prefix(ns, msg), ctx ? redact(ctx) : undefined),
		child: (next) => wrap(base, ns ? `${ns}:${next}` : next),
	};
}

export function configureLogging(opts?: { level?: LogLevelDesc }) {
	const stage = import.meta.env.VITE_STAGE; // e.g. 'dev' | 'staging' | 'prod'
	const isProdStage = stage === 'prod';

	const level =
		opts?.level ??
		(import.meta.env.VITE_LOG_LEVEL as LogLevelDesc | undefined) ??
		(isProdStage ? 'warn' : 'debug');

	log.setDefaultLevel(level);

	(window as unknown as { __LOG_LEVEL__?: (l: LogLevelDesc) => void }).__LOG_LEVEL__ = (l) => {
		log.setLevel(l);
		log.warn(`[log] level set to ${String(l)} (stage=${String(stage)})`);
	};
}

export const logger: AppLogger = wrap(log, '');
export const getLogger = (ns: string): AppLogger => logger.child(ns);
