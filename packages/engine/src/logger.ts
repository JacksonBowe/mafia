type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

const LEVEL_LABELS: Record<LogLevel, string> = {
	debug: 'DEBUG',
	info: 'INFO',
	warn: 'WARN',
	error: 'ERROR',
	critical: 'CRITICAL',
};

const formatValue = (value: unknown) => {
	if (typeof value === 'string') return value;
	try {
		return JSON.stringify(value);
	} catch (err) {
		return String(value);
	}
};

export class EngineLogger {
	private readonly lines: string[] = [];

	get output() {
		return [...this.lines];
	}

	log(level: LogLevel, message: string, meta?: unknown) {
		const suffix = meta === undefined ? '' : ` ${formatValue(meta)}`;
		this.lines.push(`[${LEVEL_LABELS[level]}] ${message}${suffix}`.trim());
	}

	debug(message: string, meta?: unknown) {
		this.log('debug', message, meta);
	}

	info(message: string, meta?: unknown) {
		this.log('info', message, meta);
	}

	warn(message: string, meta?: unknown) {
		this.log('warn', message, meta);
	}

	error(message: string, meta?: unknown) {
		this.log('error', message, meta);
	}

	critical(message: string, meta?: unknown) {
		this.log('critical', message, meta);
	}
}
