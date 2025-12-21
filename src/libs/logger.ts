class Logger {
	error(...args: unknown[]): void {
		console.error(...args);
	}

	warn(...args: unknown[]): void {
		console.warn(...args);
	}

	info(...args: unknown[]): void {
		// eslint-disable-next-line no-console
		console.info(...args);
	}

	debug(...args: unknown[]): void {
		// eslint-disable-next-line no-console
		console.debug(...args);
	}
}

export const logger = new Logger();
