/**
 * @module apm
 * MON-002: APM / Performance Monitoring.
 * Request tracing, span tracking, and percentile calculations.
 */
import { Span, SpanStatus, ApmConfig } from './types';
/**
 * An active span that can be ended to record its duration.
 */
export declare class ActiveSpan {
    readonly traceId: string;
    readonly spanId: string;
    readonly parentSpanId?: string;
    readonly name: string;
    readonly service: string;
    readonly startTime: number;
    attributes: Record<string, unknown>;
    private _status;
    private _endTime?;
    constructor(traceId: string, name: string, service: string, parentSpanId?: string, attributes?: Record<string, unknown>);
    /** Mark this span as ended and record the duration. */
    end(status?: SpanStatus): Span;
    /** Set the status of this span. */
    setStatus(status: SpanStatus): void;
    /** Add an attribute to this span. */
    setAttribute(key: string, value: unknown): void;
    /** Check if this span has ended. */
    get isEnded(): boolean;
}
/**
 * Calculate percentile values from a sorted array of numbers.
 */
export declare function calculatePercentile(values: number[], percentile: number): number;
/**
 * Calculate common percentile statistics from duration values.
 */
export declare function calculatePercentiles(durations: number[]): {
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
    avg: number;
    count: number;
};
/**
 * APM Monitor for request tracing and performance metrics.
 *
 * @example
 * ```ts
 * const apm = new ApmMonitor({ serviceName: 'api' });
 * const span = apm.startTrace('GET /users');
 * // ... do work ...
 * apm.endSpan(span);
 *
 * const stats = apm.getStats('GET /users');
 * console.log(stats.p95);
 * ```
 */
export declare class ApmMonitor {
    private readonly config;
    private readonly completedSpans;
    private readonly activeSpans;
    constructor(config?: Partial<ApmConfig>);
    /** Start a new trace (root span). */
    startTrace(name: string, attributes?: Record<string, unknown>): ActiveSpan;
    /** Start a child span within an existing trace. */
    startSpan(parent: ActiveSpan | Span, name: string, attributes?: Record<string, unknown>): ActiveSpan;
    /** End an active span and record it. */
    endSpan(span: ActiveSpan, status?: SpanStatus): Span;
    /** Get completed spans, optionally filtered. */
    getSpans(filter?: {
        name?: string;
        traceId?: string;
        service?: string;
        status?: SpanStatus;
        since?: number;
    }): Span[];
    /** Get performance statistics for a given span name. */
    getStats(name?: string): ReturnType<typeof calculatePercentiles>;
    /** Get error rate for a given span name. */
    getErrorRate(name?: string): number;
    /** Get the number of currently active spans. */
    getActiveSpanCount(): number;
    /** Get the total number of completed spans recorded. */
    getCompletedSpanCount(): number;
    /** Clear all recorded spans. */
    clear(): void;
    /** Get the service name. */
    getServiceName(): string;
    private startSpanInternal;
}
//# sourceMappingURL=apm.d.ts.map