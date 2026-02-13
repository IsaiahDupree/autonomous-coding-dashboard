/**
 * @module creative-perf
 * AN-003: Creative Performance Analytics.
 * Engagement metrics, A/B comparison, and performance scoring.
 */
import { CreativeMetrics, ABComparison } from './types';
/** Weights for the performance scoring algorithm. */
export interface PerformanceWeights {
    ctr: number;
    cvr: number;
    roas: number;
    engagementScore: number;
}
/**
 * Creative Performance Tracker.
 * Track creative engagement, compute performance scores, and run A/B comparisons.
 *
 * @example
 * ```ts
 * const tracker = new CreativePerformanceTracker();
 *
 * tracker.recordMetrics({
 *   creativeId: 'creative-1',
 *   impressions: 10000,
 *   clicks: 350,
 *   conversions: 42,
 *   spend: 500,
 *   revenue: 2100,
 * });
 *
 * const scored = tracker.getMetrics('creative-1');
 * console.log(scored?.performanceScore);
 *
 * const comparison = tracker.compareCreatives('creative-1', 'creative-2', 'ctr');
 * ```
 */
export declare class CreativePerformanceTracker {
    private readonly metricsHistory;
    private weights;
    constructor(weights?: Partial<PerformanceWeights>);
    /** Set performance scoring weights. */
    setWeights(weights: Partial<PerformanceWeights>): void;
    /** Record metrics for a creative. Derived metrics (CTR, CVR, ROAS, scores) are auto-calculated. */
    recordMetrics(params: Omit<CreativeMetrics, 'ctr' | 'cvr' | 'roas' | 'engagementScore' | 'performanceScore' | 'timestamp'> & {
        ctr?: number;
        cvr?: number;
        roas?: number;
        engagementScore?: number;
        performanceScore?: number;
        timestamp?: string;
    }): CreativeMetrics;
    /** Get the latest metrics for a creative. */
    getMetrics(creativeId: string): CreativeMetrics | undefined;
    /** Get the full metrics history for a creative. */
    getHistory(creativeId: string): CreativeMetrics[];
    /** Get all tracked creative IDs. */
    getTrackedCreatives(): string[];
    /** Get top-performing creatives sorted by performance score. */
    getTopCreatives(limit?: number): CreativeMetrics[];
    /**
     * Compare two creatives (A/B test analysis).
     * Returns which variant performs better on the specified metric.
     */
    compareCreatives(creativeIdA: string, creativeIdB: string, metric?: keyof Pick<CreativeMetrics, 'ctr' | 'cvr' | 'roas' | 'performanceScore' | 'engagementScore'>): ABComparison;
    /** Clear all recorded metrics. */
    clear(): void;
    private calculateEngagement;
    private calculatePerformanceScore;
}
//# sourceMappingURL=creative-perf.d.ts.map