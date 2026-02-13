"use strict";
/**
 * @module logging
 * MON-001: Structured logging with Winston/Pino-style interface.
 * Supports log levels, child loggers, JSON formatting, and pluggable transports.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.MemoryTransport = exports.ConsoleTransport = void 0;
exports.createLogger = createLogger;
const types_1 = require("./types");
/** Console transport that writes JSON or pretty-printed output to stdout/stderr. */
class ConsoleTransport {
    constructor(pretty = false) {
        this.pretty = pretty;
    }
    write(entry) {
        const output = this.pretty ? this.formatPretty(entry) : JSON.stringify(entry);
        const stream = types_1.LOG_LEVEL_PRIORITY[entry.level] >= types_1.LOG_LEVEL_PRIORITY.error
            ? process.stderr
            : process.stdout;
        stream.write(output + '\n');
    }
    formatPretty(entry) {
        const ts = entry.timestamp;
        const level = entry.level.toUpperCase().padEnd(5);
        const logger = entry.logger ? `[${entry.logger}] ` : '';
        const ctx = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
        const err = entry.error ? `\n  Error: ${entry.error.message}${entry.error.stack ? '\n  ' + entry.error.stack : ''}` : '';
        return `${ts} ${level} ${logger}${entry.message}${ctx}${err}`;
    }
}
exports.ConsoleTransport = ConsoleTransport;
/** In-memory transport that buffers entries for testing/inspection. */
class MemoryTransport {
    constructor() {
        this.entries = [];
    }
    write(entry) {
        this.entries.push(entry);
    }
    clear() {
        this.entries.length = 0;
    }
    getEntries(level) {
        if (!level)
            return [...this.entries];
        const minPriority = types_1.LOG_LEVEL_PRIORITY[level];
        return this.entries.filter((e) => types_1.LOG_LEVEL_PRIORITY[e.level] >= minPriority);
    }
}
exports.MemoryTransport = MemoryTransport;
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
class Logger {
    constructor(config, transports) {
        this.config = types_1.LoggerConfigSchema.parse(config ?? {});
        this.transports = transports ?? [
            new ConsoleTransport(this.config.pretty),
        ];
    }
    /** Create a child logger that inherits configuration and appends context. */
    child(context, name) {
        const mergedContext = { ...this.config.context, ...context };
        const childConfig = {
            ...this.config,
            name: name ?? this.config.name,
            context: mergedContext,
        };
        return new Logger(childConfig, this.transports);
    }
    trace(message, context) {
        this.log('trace', message, context);
    }
    debug(message, context) {
        this.log('debug', message, context);
    }
    info(message, context) {
        this.log('info', message, context);
    }
    warn(message, context) {
        this.log('warn', message, context);
    }
    error(message, errorOrContext, context) {
        if (errorOrContext instanceof Error) {
            this.log('error', message, context, errorOrContext);
        }
        else {
            this.log('error', message, errorOrContext);
        }
    }
    fatal(message, errorOrContext, context) {
        if (errorOrContext instanceof Error) {
            this.log('fatal', message, context, errorOrContext);
        }
        else {
            this.log('fatal', message, errorOrContext);
        }
    }
    /** Check if a given level is enabled for this logger. */
    isLevelEnabled(level) {
        return types_1.LOG_LEVEL_PRIORITY[level] >= types_1.LOG_LEVEL_PRIORITY[this.config.level];
    }
    /** Get the current log level. */
    getLevel() {
        return this.config.level;
    }
    /** Get the logger name. */
    getName() {
        return this.config.name;
    }
    log(level, message, context, error) {
        if (!this.isLevelEnabled(level))
            return;
        const entry = {
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
            }
            catch {
                // Silently ignore transport errors to avoid recursive logging
            }
        }
    }
}
exports.Logger = Logger;
/** Create a default logger instance. */
function createLogger(config, transports) {
    return new Logger(config, transports);
}
//# sourceMappingURL=logging.js.map