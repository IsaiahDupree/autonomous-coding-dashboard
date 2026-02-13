/**
 * @module logging
 * MON-001: Structured logging with Winston/Pino-style interface.
 * Supports log levels, child loggers, JSON formatting, and pluggable transports.
 */
import { LogLevel, LogEntry, LoggerConfig } from './types';
/** A transport receives formatted log entries. */
export interface LogTransport {
    write(entry: LogEntry): void;
}
/** Console transport that writes JSON or pretty-printed output to stdout/stderr. */
export declare class ConsoleTransport implements LogTransport {
    private readonly pretty;
    constructor(pretty?: boolean);
    write(entry: LogEntry): void;
    private formatPretty;
}
/** In-memory transport that buffers entries for testing/inspection. */
export declare class MemoryTransport implements LogTransport {
    readonly entries: LogEntry[];
    write(entry: LogEntry): void;
    clear(): void;
    getEntries(level?: LogLevel): LogEntry[];
}
/**
 * Logger class with structured output, child logger support, and pluggable transports.
 *
 * @example
 * ```ts
 * const logger = new Logger({ name: 'api', level: 'info' });
 * logger.info('Server started', { port: 3000 });
 *
 * const child = logger.child({ requestId: 'abc-123' });
 * child.warn('Slow query', { durationMs: 1500 });
 * ```
 */
export declare class Logger {
    private readonly config;
    private readonly transports;
    constructor(config?: Partial<LoggerConfig>, transports?: LogTransport[]);
    /** Create a child logger that inherits configuration and appends context. */
    child(context: Record<string, unknown>, name?: string): Logger;
    trace(message: string, context?: Record<string, unknown>): void;
    debug(message: string, context?: Record<string, unknown>): void;
    info(message: string, context?: Record<string, unknown>): void;
    warn(message: string, context?: Record<string, unknown>): void;
    error(message: string, errorOrContext?: Error | Record<string, unknown>, context?: Record<string, unknown>): void;
    fatal(message: string, errorOrContext?: Error | Record<string, unknown>, context?: Record<string, unknown>): void;
    /** Check if a given level is enabled for this logger. */
    isLevelEnabled(level: LogLevel): boolean;
    /** Get the current log level. */
    getLevel(): LogLevel;
    /** Get the logger name. */
    getName(): string;
    private log;
}
/** Create a default logger instance. */
export declare function createLogger(config?: Partial<LoggerConfig>, transports?: LogTransport[]): Logger;
//# sourceMappingURL=logging.d.ts.map