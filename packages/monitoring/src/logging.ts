/**
 * @module logging
 * MON-001: Structured logging with Winston/Pino-style interface.
 * Supports log levels, child loggers, JSON formatting, and pluggable transports.
 */

import {
  LogLevel,
  LogEntry,
  LoggerConfig,
  LoggerConfigSchema,
  LOG_LEVEL_PRIORITY,
} from './types';

/** A transport receives formatted log entries. */
export interface LogTransport {
  write(entry: LogEntry): void;
}

/** Console transport that writes JSON or pretty-printed output to stdout/stderr. */
export class ConsoleTransport implements LogTransport {
  constructor(private readonly pretty: boolean = false) {}

  write(entry: LogEntry): void {
    const output = this.pretty ? this.formatPretty(entry) : JSON.stringify(entry);
    const stream =
      LOG_LEVEL_PRIORITY[entry.level] >= LOG_LEVEL_PRIORITY.error
        ? process.stderr
        : process.stdout;
    stream.write(output + '\n');
  }

  private formatPretty(entry: LogEntry): string {
    const ts = entry.timestamp;
    const level = entry.level.toUpperCase().padEnd(5);
    const logger = entry.logger ? `[${entry.logger}] ` : '';
    const ctx = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    const err = entry.error ? `\n  Error: ${entry.error.message}${entry.error.stack ? '\n  ' + entry.error.stack : ''}` : '';
    return `${ts} ${level} ${logger}${entry.message}${ctx}${err}`;
  }
}

/** In-memory transport that buffers entries for testing/inspection. */
export class MemoryTransport implements LogTransport {
  public readonly entries: LogEntry[] = [];

  write(entry: LogEntry): void {
    this.entries.push(entry);
  }

  clear(): void {
    this.entries.length = 0;
  }

  getEntries(level?: LogLevel): LogEntry[] {
    if (!level) return [...this.entries];
    const minPriority = LOG_LEVEL_PRIORITY[level];
    return this.entries.filter((e) => LOG_LEVEL_PRIORITY[e.level] >= minPriority);
  }
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
export class Logger {
  private readonly config: LoggerConfig;
  private readonly transports: LogTransport[];

  constructor(config?: Partial<LoggerConfig>, transports?: LogTransport[]) {
    this.config = LoggerConfigSchema.parse(config ?? {});
    this.transports = transports ?? [
      new ConsoleTransport(this.config.pretty),
    ];
  }

  /** Create a child logger that inherits configuration and appends context. */
  child(context: Record<string, unknown>, name?: string): Logger {
    const mergedContext = { ...this.config.context, ...context };
    const childConfig: Partial<LoggerConfig> = {
      ...this.config,
      name: name ?? this.config.name,
      context: mergedContext,
    };
    return new Logger(childConfig, this.transports);
  }

  trace(message: string, context?: Record<string, unknown>): void {
    this.log('trace', message, context);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  error(message: string, errorOrContext?: Error | Record<string, unknown>, context?: Record<string, unknown>): void {
    if (errorOrContext instanceof Error) {
      this.log('error', message, context, errorOrContext);
    } else {
      this.log('error', message, errorOrContext);
    }
  }

  fatal(message: string, errorOrContext?: Error | Record<string, unknown>, context?: Record<string, unknown>): void {
    if (errorOrContext instanceof Error) {
      this.log('fatal', message, context, errorOrContext);
    } else {
      this.log('fatal', message, errorOrContext);
    }
  }

  /** Check if a given level is enabled for this logger. */
  isLevelEnabled(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.config.level];
  }

  /** Get the current log level. */
  getLevel(): LogLevel {
    return this.config.level;
  }

  /** Get the logger name. */
  getName(): string {
    return this.config.name;
  }

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): void {
    if (!this.isLevelEnabled(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      logger: this.config.name,
      context: context || this.config.context
        ? { ...this.config.context, ...context }
        : undefined,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    for (const transport of this.transports) {
      try {
        transport.write(entry);
      } catch {
        // Silently ignore transport errors to avoid recursive logging
      }
    }
  }
}

/** Create a default logger instance. */
export function createLogger(config?: Partial<LoggerConfig>, transports?: LogTransport[]): Logger {
  return new Logger(config, transports);
}
