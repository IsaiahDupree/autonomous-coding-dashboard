/**
 * @module apm
 * MON-002: APM / Performance Monitoring.
 * Request tracing, span tracking, and percentile calculations.
 */

import { Span, SpanStatus, ApmConfig, ApmConfigSchema } from './types';

/** Generate a random hex string for trace/span IDs. */
function generateId(length: number = 16): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/**
 * An active span that can be ended to record its duration.
 */
export class ActiveSpan {
  public readonly traceId: string;
  public readonly spanId: string;
  public readonly parentSpanId?: string;
  public readonly name: string;
  public readonly service: string;
  public readonly startTime: number;
  public attributes: Record<string, unknown>;
  private _status: SpanStatus = 'ok';
  private _endTime?: number;

  constructor(
    traceId: string,
    name: string,
    service: string,
    parentSpanId?: string,
    attributes?: Record<string, unknown>
  ) {
    this.traceId = traceId;
    this.spanId = generateId();
    this.parentSpanId = parentSpanId;
    this.name = name;
    this.service = service;
    this.startTime = Date.now();
    this.attributes = attributes ?? {};
  }

  /** Mark this span as ended and record the duration. */
  end(status?: SpanStatus): Span {
    this._endTime = Date.now();
    if (status) this._status = status;

    return {
      traceId: this.traceId,
      spanId: this.spanId,
      parentSpanId: this.parentSpanId,
      name: this.name,
      service: this.service,
      startTime: this.startTime,
      endTime: this._endTime,
      duration: this._endTime - this.startTime,
      status: this._status,
      attributes: Object.keys(this.attributes).length > 0 ? this.attributes : undefined,
    };
  }

  /** Set the status of this span. */
  setStatus(status: SpanStatus): void {
    this._status = status;
  }

  /** Add an attribute to this span. */
  setAttribute(key: string, value: unknown): void {
    this.attributes[key] = value;
  }

  /** Check if this span has ended. */
  get isEnded(): boolean {
    return this._endTime !== undefined;
  }
}

/**
 * Calculate percentile values from a sorted array of numbers.
 */
export function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Calculate common percentile statistics from duration values.
 */
export function calculatePercentiles(
  durations: number[]
): { p50: number; p75: number; p90: number; p95: number; p99: number; min: number; max: number; avg: number; count: number } {
  if (durations.length === 0) {
    return { p50: 0, p75: 0, p90: 0, p95: 0, p99: 0, min: 0, max: 0, avg: 0, count: 0 };
  }

  const sorted = [...durations].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);

  return {
    p50: calculatePercentile(sorted, 50),
    p75: calculatePercentile(sorted, 75),
    p90: calculatePercentile(sorted, 90),
    p95: calculatePercentile(sorted, 95),
    p99: calculatePercentile(sorted, 99),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: sum / sorted.length,
    count: sorted.length,
  };
}

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
export class ApmMonitor {
  private readonly config: ApmConfig;
  private readonly completedSpans: Span[] = [];
  private readonly activeSpans: Map<string, ActiveSpan> = new Map();

  constructor(config?: Partial<ApmConfig>) {
    this.config = ApmConfigSchema.parse(config ?? { serviceName: 'default' });
  }

  /** Start a new trace (root span). */
  startTrace(
    name: string,
    attributes?: Record<string, unknown>
  ): ActiveSpan {
    const traceId = generateId(32);
    return this.startSpanInternal(traceId, name, undefined, attributes);
  }

  /** Start a child span within an existing trace. */
  startSpan(
    parent: ActiveSpan | Span,
    name: string,
    attributes?: Record<string, unknown>
  ): ActiveSpan {
    const parentSpanId = parent.spanId;
    return this.startSpanInternal(parent.traceId, name, parentSpanId, attributes);
  }

  /** End an active span and record it. */
  endSpan(span: ActiveSpan, status?: SpanStatus): Span {
    const completed = span.end(status);
    this.activeSpans.delete(span.spanId);

    // Apply sampling
    if (Math.random() <= this.config.sampleRate) {
      this.completedSpans.push(completed);

      // Enforce max spans limit with FIFO eviction
      while (this.completedSpans.length > this.config.maxSpans) {
        this.completedSpans.shift();
      }
    }

    return completed;
  }

  /** Get completed spans, optionally filtered. */
  getSpans(filter?: {
    name?: string;
    traceId?: string;
    service?: string;
    status?: SpanStatus;
    since?: number;
  }): Span[] {
    let spans = [...this.completedSpans];

    if (filter) {
      if (filter.name) spans = spans.filter((s) => s.name === filter.name);
      if (filter.traceId) spans = spans.filter((s) => s.traceId === filter.traceId);
      if (filter.service) spans = spans.filter((s) => s.service === filter.service);
      if (filter.status) spans = spans.filter((s) => s.status === filter.status);
      if (filter.since) spans = spans.filter((s) => s.startTime >= filter.since!);
    }

    return spans;
  }

  /** Get performance statistics for a given span name. */
  getStats(name?: string): ReturnType<typeof calculatePercentiles> {
    const spans = name
      ? this.completedSpans.filter((s) => s.name === name)
      : this.completedSpans;
    const durations = spans
      .filter((s) => s.duration !== undefined)
      .map((s) => s.duration as number);
    return calculatePercentiles(durations);
  }

  /** Get error rate for a given span name. */
  getErrorRate(name?: string): number {
    const spans = name
      ? this.completedSpans.filter((s) => s.name === name)
      : this.completedSpans;
    if (spans.length === 0) return 0;
    const errors = spans.filter((s) => s.status === 'error').length;
    return errors / spans.length;
  }

  /** Get the number of currently active spans. */
  getActiveSpanCount(): number {
    return this.activeSpans.size;
  }

  /** Get the total number of completed spans recorded. */
  getCompletedSpanCount(): number {
    return this.completedSpans.length;
  }

  /** Clear all recorded spans. */
  clear(): void {
    this.completedSpans.length = 0;
    this.activeSpans.clear();
  }

  /** Get the service name. */
  getServiceName(): string {
    return this.config.serviceName;
  }

  private startSpanInternal(
    traceId: string,
    name: string,
    parentSpanId?: string,
    attributes?: Record<string, unknown>
  ): ActiveSpan {
    const span = new ActiveSpan(
      traceId,
      name,
      this.config.serviceName,
      parentSpanId,
      attributes
    );
    this.activeSpans.set(span.spanId, span);
    return span;
  }
}
