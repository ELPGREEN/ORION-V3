/**
 * Lightweight LogManager stub — console-backed logger.
 */

export class Logger {
  constructor(private name: string) {}
  info(...args: unknown[]) { console.log(`[${this.name}]`, ...args); }
  warn(...args: unknown[]) { console.warn(`[${this.name}]`, ...args); }
  error(...args: unknown[]) { console.error(`[${this.name}]`, ...args); }
  debug(...args: unknown[]) { console.debug(`[${this.name}]`, ...args); }
}

export class LogManager {
  private static _instance: LogManager;
  static getInstance(): LogManager {
    if (!LogManager._instance) LogManager._instance = new LogManager();
    return LogManager._instance;
  }
  createLogger(name: string): Logger {
    return new Logger(name);
  }
}
