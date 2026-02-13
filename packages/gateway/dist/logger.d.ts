import { RequestLog, AuditAction } from './types';
export interface RequestLoggerOptions {
    enabled: boolean;
    includeHeaders?: boolean;
    excludePaths?: string[];
    sensitiveHeaders?: string[];
    onLog?: (log: RequestLog) => void;
    maxBufferSize?: number;
}
export interface LoggableRequest {
    method: string;
    url?: string;
    path?: string;
    headers: Record<string, string | string[] | undefined>;
    ip?: string;
    socket?: {
        remoteAddress?: string;
    };
}
export interface LoggableResponse {
    statusCode: number;
    getHeader?(name: string): string | number | string[] | undefined;
}
export declare class RequestLogger {
    private readonly options;
    private readonly sensitiveHeaders;
    private readonly buffer;
    constructor(options: RequestLoggerOptions);
    /**
     * Create a RequestLog entry from a request/response pair.
     */
    log(req: LoggableRequest, res: LoggableResponse, responseTimeMs: number, extra?: {
        apiKeyId?: string;
        userId?: string;
        orgId?: string;
        product?: string;
    }): RequestLog | null;
    /**
     * Get the most recent N log entries.
     */
    getRecentLogs(limit?: number): RequestLog[];
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
    }): RequestLog[];
    /**
     * Filter and redact sensitive headers from a request.
     */
    private filterHeaders;
    /**
     * Check if a path is in the exclude list.
     */
    private isExcluded;
    /**
     * Safely get a single header value.
     */
    private getHeader;
}
export declare class AuditTrail {
    private readonly entries;
    constructor(maxSize?: number);
    /**
     * Log an audit action.
     */
    logAction(actor: string, action: string, resource: string, details?: Record<string, unknown>): AuditAction;
    /**
     * Get the audit trail for a specific resource.
     */
    getAuditTrail(resourceId: string): AuditAction[];
    /**
     * Get all audit entries.
     */
    getAllEntries(): AuditAction[];
    /**
     * Get recent audit entries.
     */
    getRecentEntries(limit?: number): AuditAction[];
}
//# sourceMappingURL=logger.d.ts.map