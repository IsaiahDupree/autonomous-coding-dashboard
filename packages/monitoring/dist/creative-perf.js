"use strict";
/**
 * @module creative-perf
 * AN-003: Creative Performance Analytics.
 * Engagement metrics, A/B comparison, and performance scoring.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreativePerformanceTracker = void 0;
const types_1 = require("./types");
const DEFAULT_WEIGHTS = {
    ctr: 0.25,
    cvr: 0.30,
    roas: 0.30,
    engagementScore: 0.15,
};
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
class CreativePerformanceTracker {
    constructor(weights) {
        this.metricsHistory = new Map();
        this.weights = { ...DEFAULT_WEIGHTS, ...weights };
    }
    /** Set performance scoring weights. */
    setWeights(weights) {
        this.weights = { ...this.weights, ...weights };
    }
    /** Record metrics for a creative. Derived metrics (CTR, CVR, ROAS, scores) are auto-calculated. */
    recordMetrics(params) {
        const ctr = params.ctr ?? (params.impressions > 0 ? params.clicks / params.impressions : 0);
        const cvr = params.cvr ?? (params.clicks > 0 ? params.conversions / params.clicks : 0);
        const roas = params.roas ?? (params.spend > 0 ? params.revenue / params.spend : 0);
        const engagementScore = params.engagementScore ?? this.calculateEngagement(params);
        const performanceScore = params.performanceScore ?? this.calculatePerformanceScore({
            ctr,
            cvr,
            roas,
            engagementScore,
        });
        const metrics = types_1.CreativeMetricsSchema.parse({
            ...params,
            ctr: Math.round(ctr * 10000) / 10000,
            cvr: Math.round(cvr * 10000) / 10000,
            roas: Math.round(roas * 100) / 100,
            engagementScore: Math.round(engagementScore * 100) / 100,
            performanceScore: Math.round(performanceScore * 100) / 100,
            timestamp: params.timestamp ?? new Date().toISOString(),
        });
        const history = this.metricsHistory.get(params.creativeId) ?? [];
        history.push(metrics);
        this.metricsHistory.set(params.creativeId, history);
        return metrics;
    }
    /** Get the latest metrics for a creative. */
    getMetrics(creativeId) {
        const history = this.metricsHistory.get(creativeId);
        if (!history || history.length === 0)
            return undefined;
        return history[history.length - 1];
    }
    /** Get the full metrics history for a creative. */
    getHistory(creativeId) {
        return [...(this.metricsHistory.get(creativeId) ?? [])];
    }
    /** Get all tracked creative IDs. */
    getTrackedCreatives() {
        return Array.from(this.metricsHistory.keys());
    }
    /** Get top-performing creatives sorted by performance score. */
    getTopCreatives(limit = 10) {
        const latest = [];
        for (const history of this.metricsHistory.values()) {
            if (history.length > 0) {
                latest.push(history[history.length - 1]);
            }
        }
        return latest
            .sort((a, b) => b.performanceScore - a.performanceScore)
            .slice(0, limit);
    }
    /**
     * Compare two creatives (A/B test analysis).
     * Returns which variant performs better on the specified metric.
     */
    compareCreatives(creativeIdA, creativeIdB, metric = 'performanceScore') {
        const metricsA = this.getMetrics(creativeIdA);
        const metricsB = this.getMetrics(creativeIdB);
        if (!metricsA || !metricsB) {
            throw new Error(`Metrics not found for ${!metricsA ? creativeIdA : creativeIdB}`);
        }
        const valueA = metricsA[metric];
        const valueB = metricsB[metric];
        // Simple statistical confidence based on sample size
        const sampleSizeA = metricsA.impressions;
        const sampleSizeB = metricsB.impressions;
        const minSample = Math.min(sampleSizeA, sampleSizeB);
        const confidenceLevel = Math.min(0.99, minSample >= 10000 ? 0.95 : minSample >= 1000 ? 0.85 : minSample >= 100 ? 0.70 : 0.50);
        const diff = Math.abs(valueA - valueB);
        const base = Math.max(valueA, valueB) || 1;
        const improvementPercent = (diff / base) * 100;
        let winner;
        if (improvementPercent < 1) {
            winner = 'inconclusive';
        }
        else {
            winner = valueA > valueB ? 'A' : 'B';
        }
        return {
            variantA: { creativeId: creativeIdA, metrics: metricsA },
            variantB: { creativeId: creativeIdB, metrics: metricsB },
            winner,
            confidenceLevel: Math.round(confidenceLevel * 100) / 100,
            improvementPercent: Math.round(improvementPercent * 100) / 100,
            metric,
            timestamp: new Date().toISOString(),
        };
    }
    /** Clear all recorded metrics. */
    clear() {
        this.metricsHistory.clear();
    }
    calculateEngagement(params) {
        if (params.impressions === 0)
            return 0;
        // Engagement combines click and conversion activity relative to impressions
        const clickScore = (params.clicks / params.impressions) * 50;
        const conversionScore = (params.conversions / Math.max(params.clicks, 1)) * 50;
        return Math.min(100, clickScore + conversionScore);
    }
    calculatePerformanceScore(metrics) {
        // Normalize each metric to a 0-100 scale before weighting
        const normalizedCtr = Math.min(100, metrics.ctr * 1000); // 10% CTR = 100
        const normalizedCvr = Math.min(100, metrics.cvr * 500); // 20% CVR = 100
        const normalizedRoas = Math.min(100, metrics.roas * 20); // 5x ROAS = 100
        const normalizedEngagement = metrics.engagementScore;
        return (normalizedCtr * this.weights.ctr +
            normalizedCvr * this.weights.cvr +
            normalizedRoas * this.weights.roas +
            normalizedEngagement * this.weights.engagementScore);
    }
}
exports.CreativePerformanceTracker = CreativePerformanceTracker;
//# sourceMappingURL=creative-perf.js.map