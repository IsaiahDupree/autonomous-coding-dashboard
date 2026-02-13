"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditTrail = exports.RequestLogger = void 0;
const crypto = __importStar(require("crypto"));
// ─── Default Sensitive Headers ───────────────────────────────────────────────
const DEFAULT_SENSITIVE_HEADERS = [
    'authorization',
    'cookie',
    'x-api-key',
    'set-cookie',
    'proxy-authorization',
];
// ─── Circular Buffer ─────────────────────────────────────────────────────────
class CircularBuffer {
    constructor(maxSize) {
        this.head = 0;
        this.count = 0;
        this.maxSize = maxSize;
        this.buffer = new Array(maxSize);
    }
    push(item) {
        this.buffer[this.head] = item;
        this.head = (this.head + 1) % this.maxSize;
        if (this.count < this.maxSize) {
            this.count++;
        }
    }
    getAll() {
        const result = [];
        if (this.count === 0)
            return result;
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
    getRecent(limit) {
        const all = this.getAll();
        return all.slice(-limit);
    }
    size() {
        return this.count;
    }
}
// ─── Request Logger ──────────────────────────────────────────────────────────
class RequestLogger {
    constructor(options) {
        this.options = options;
        this.sensitiveHeaders = new Set((options.sensitiveHeaders ?? DEFAULT_SENSITIVE_HEADERS).map((h) => h.toLowerCase()));
        this.buffer = new CircularBuffer(options.maxBufferSize ?? 10000);
    }
    /**
     * Create a RequestLog entry from a request/response pair.
     */
    log(req, res, responseTimeMs, extra) {
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
        const entry = {
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
    getRecentLogs(limit = 100) {
        return this.buffer.getRecent(limit);
    }
    /**
     * Search log entries by various parameters.
     */
    searchLogs(params) {
        const all = this.buffer.getAll();
        return all.filter((log) => {
            if (params.startDate && log.timestamp < params.startDate)
                return false;
            if (params.endDate && log.timestamp > params.endDate)
                return false;
            if (params.apiKeyId && log.apiKeyId !== params.apiKeyId)
                return false;
            if (params.userId && log.userId !== params.userId)
                return false;
            if (params.method && log.method !== params.method)
                return false;
            if (params.path && !log.path.includes(params.path))
                return false;
            if (params.statusCode !== undefined && log.statusCode !== params.statusCode)
                return false;
            return true;
        });
    }
    /**
     * Filter and redact sensitive headers from a request.
     */
    filterHeaders(headers) {
        const filtered = {};
        for (const [key, value] of Object.entries(headers)) {
            if (value === undefined)
                continue;
            const lowerKey = key.toLowerCase();
            if (this.sensitiveHeaders.has(lowerKey)) {
                filtered[key] = '[REDACTED]';
            }
            else {
                filtered[key] = Array.isArray(value) ? value.join(', ') : value;
            }
        }
        return filtered;
    }
    /**
     * Check if a path is in the exclude list.
     */
    isExcluded(path) {
        const excludePaths = this.options.excludePaths ?? [];
        return excludePaths.some((excluded) => path.startsWith(excluded));
    }
    /**
     * Safely get a single header value.
     */
    getHeader(headers, name) {
        const value = headers[name] ?? headers[name.toLowerCase()];
        if (Array.isArray(value))
            return value[0];
        return value;
    }
}
exports.RequestLogger = RequestLogger;
// ─── Audit Trail ─────────────────────────────────────────────────────────────
class AuditTrail {
    constructor(maxSize = 10000) {
        this.entries = new CircularBuffer(maxSize);
    }
    /**
     * Log an audit action.
     */
    logAction(actor, action, resource, details) {
        const entry = {
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
    getAuditTrail(resourceId) {
        return this.entries.getAll().filter((entry) => entry.resource === resourceId);
    }
    /**
     * Get all audit entries.
     */
    getAllEntries() {
        return this.entries.getAll();
    }
    /**
     * Get recent audit entries.
     */
    getRecentEntries(limit = 100) {
        return this.entries.getRecent(limit);
    }
}
exports.AuditTrail = AuditTrail;
//# sourceMappingURL=logger.js.map