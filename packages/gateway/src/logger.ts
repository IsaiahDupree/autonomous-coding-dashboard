import * as crypto from 'crypto';
import { RequestLog, AuditAction } from './types';

// ─── Request Logger Options ──────────────────────────────────────────────────

export interface RequestLoggerOptions {
  enabled: boolean;
  includeHeaders?: boolean;
  excludePaths?: string[];
  sensitiveHeaders?: string[];
  onLog?: (log: RequestLog) => void;
  maxBufferSize?: number;
}

// ─── Minimal Request/Response Interfaces ─────────────────────────────────────

export interface LoggableRequest {
  method: string;
  url?: string;
  path?: string;
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string };
}

export interface LoggableResponse {
  statusCode: number;
  getHeader?(name: string): string | number | string[] | undefined;
}

// ─── Default Sensitive Headers ───────────────────────────────────────────────

const DEFAULT_SENSITIVE_HEADERS = [
  'authorization',
  'cookie',
  'x-api-key',
  'set-cookie',
  'proxy-authorization',
];

// ─── Circular Buffer ─────────────────────────────────────────────────────────

class CircularBuffer<T> {
  private buffer: (T | undefined)[];
  private head: number = 0;
  private count: number = 0;
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
    this.buffer = new Array(maxSize);
  }

  push(item: T): void {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.maxSize;
    if (this.count < this.maxSize) {
      this.count++;
    }
  }

  getAll(): T[] {
    const result: T[] = [];
    if (this.count === 0) return result;

    const start = this.count < this.maxSize ? 0 : this.head;
    for (let i = 0; i < this.count; i++) {
      const idx = (start + i) % this.maxSize;
      const item = this.buffer[idx];
      if (item !== undefined) {
        result.push(item);
      }
    }
    return result;
  }

  getRecent(limit: number): T[] {
    const all = this.getAll();
    return all.slice(-limit);
  }

  size(): number {
    return this.count;
  }
}

// ─── Request Logger ──────────────────────────────────────────────────────────

export class RequestLogger {
  private readonly options: RequestLoggerOptions;
  private readonly sensitiveHeaders: Set<string>;
  private readonly buffer: CircularBuffer<RequestLog>;

  constructor(options: RequestLoggerOptions) {
    this.options = options;
    this.sensitiveHeaders = new Set(
      (options.sensitiveHeaders ?? DEFAULT_SENSITIVE_HEADERS).map((h) => h.toLowerCase())
    );
    this.buffer = new CircularBuffer<RequestLog>(options.maxBufferSize ?? 10_000);
  }

  /**
   * Create a RequestLog entry from a request/response pair.
   */
  log(
    req: LoggableRequest,
    res: LoggableResponse,
    responseTimeMs: number,
    extra?: {
      apiKeyId?: string;
      userId?: string;
      orgId?: string;
      product?: string;
    }
  ): RequestLog | null {
    if (!this.options.enabled) {
      return null;
    }

    const path = req.path ?? req.url ?? '/';

    // Check if path is excluded
    if (this.isExcluded(path)) {
      return null;
    }

    const requestHeaders = this.options.includeHeaders
      ? this.filterHeaders(req.headers)
      : {};

    const contentLength = res.getHeader?.('content-length');
    const responseSize = contentLength ? Number(contentLength) : 0;

    const entry: RequestLog = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      method: req.method,
      path,
      statusCode: res.statusCode,
      responseTimeMs,
      apiKeyId: extra?.apiKeyId,
      userId: extra?.userId,
      orgId: extra?.orgId,
      product: extra?.product,
      ip: req.ip ?? req.socket?.remoteAddress ?? 'unknown',
      userAgent: this.getHeader(req.headers, 'user-agent') ?? 'unknown',
      requestHeaders,
      responseSize,
      error: res.statusCode >= 400 ? `HTTP ${res.statusCode}` : undefined,
    };

    this.buffer.push(entry);

    if (this.options.onLog) {
      this.options.onLog(entry);
    }

    return entry;
  }

  /**
   * Get the most recent N log entries.
   */
  getRecentLogs(limit: number = 100): RequestLog[] {
    return this.buffer.getRecent(limit);
  }

  /**
   * Search log entries by various parameters.
   */
  searchLogs(params: {
    startDate?: Date;
    endDate?: Date;
    apiKeyId?: string;
    userId?: string;
    method?: string;
    path?: string;
    statusCode?: number;
  }): RequestLog[] {
    const all = this.buffer.getAll();
    return all.filter((log) => {
      if (params.startDate && log.timestamp < params.startDate) return false;
      if (params.endDate && log.timestamp > params.endDate) return false;
      if (params.apiKeyId && log.apiKeyId !== params.apiKeyId) return false;
      if (params.userId && log.userId !== params.userId) return false;
      if (params.method && log.method !== params.method) return false;
      if (params.path && !log.path.includes(params.path)) return false;
      if (params.statusCode !== undefined && log.statusCode !== params.statusCode) return false;
      return true;
    });
  }

  /**
   * Filter and redact sensitive headers from a request.
   */
  private filterHeaders(
    headers: Record<string, string | string[] | undefined>
  ): Record<string, string> {
    const filtered: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      if (value === undefined) continue;
      const lowerKey = key.toLowerCase();
      if (this.sensitiveHeaders.has(lowerKey)) {
        filtered[key] = '[REDACTED]';
      } else {
        filtered[key] = Array.isArray(value) ? value.join(', ') : value;
      }
    }
    return filtered;
  }

  /**
   * Check if a path is in the exclude list.
   */
  private isExcluded(path: string): boolean {
    const excludePaths = this.options.excludePaths ?? [];
    return excludePaths.some((excluded) => path.startsWith(excluded));
  }

  /**
   * Safely get a single header value.
   */
  private getHeader(
    headers: Record<string, string | string[] | undefined>,
    name: string
  ): string | undefined {
    const value = headers[name] ?? headers[name.toLowerCase()];
    if (Array.isArray(value)) return value[0];
    return value;
  }
}

// ─── Audit Trail ─────────────────────────────────────────────────────────────

export class AuditTrail {
  private readonly entries: CircularBuffer<AuditAction>;

  constructor(maxSize: number = 10_000) {
    this.entries = new CircularBuffer<AuditAction>(maxSize);
  }

  /**
   * Log an audit action.
   */
  logAction(
    actor: string,
    action: string,
    resource: string,
    details?: Record<string, unknown>
  ): AuditAction {
    const entry: AuditAction = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      actor,
      action,
      resource,
      details,
    };
    this.entries.push(entry);
    return entry;
  }

  /**
   * Get the audit trail for a specific resource.
   */
  getAuditTrail(resourceId: string): AuditAction[] {
    return this.entries.getAll().filter((entry) => entry.resource === resourceId);
  }

  /**
   * Get all audit entries.
   */
  getAllEntries(): AuditAction[] {
    return this.entries.getAll();
  }

  /**
   * Get recent audit entries.
   */
  getRecentEntries(limit: number = 100): AuditAction[] {
    return this.entries.getRecent(limit);
  }
}
