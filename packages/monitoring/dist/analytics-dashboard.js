"use strict";
/**
 * @module analytics-dashboard
 * AN-006: Unified Analytics Dashboard Data Provider.
 * Aggregate metrics across products, time-series data, and widget support.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsDashboardProvider = void 0;
const types_1 = require("./types");
const AGGREGATION_FNS = {
    sum: (values) => values.reduce((a, b) => a + b, 0),
    avg: (values) => values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
    min: (values) => values.length > 0 ? Math.min(...values) : 0,
    max: (values) => values.length > 0 ? Math.max(...values) : 0,
    count: (values) => values.length,
};
/**
 * Analytics Dashboard Data Provider.
 * Aggregates metrics from multiple products and provides time-series data for dashboard widgets.
 *
 * @example
 * ```ts
 * const dashboard = new AnalyticsDashboardProvider({
 *   products: ['tiktok', 'meta', 'google'],
 *   refreshIntervalMs: 60000,
 * });
 *
 * dashboard.registerMetricSource({
 *   name: 'impressions',
 *   product: 'tiktok',
 *   fetch: (range) => [...timeSeriesPoints],
 * });
 *
 * const data = await dashboard.getTimeSeries('impressions', {
 *   start: '2024-01-01',
 *   end: '2024-01-31',
 * });
 *
 * const widgets = await dashboard.getWidgetData();
 * ```
 */
class AnalyticsDashboardProvider {
    constructor(config) {
        this.sources = new Map();
        this.cachedSeries = new Map();
        this.widgets = new Map();
        this.staticTimeSeries = new Map();
        this.config = types_1.AnalyticsDashboardConfigSchema.parse(config ?? {});
    }
    /** Register a metric data source. */
    registerMetricSource(source) {
        const key = source.name;
        const existing = this.sources.get(key) ?? [];
        existing.push(source);
        this.sources.set(key, existing);
        if (!this.config.products.includes(source.product)) {
            this.config.products.push(source.product);
        }
        if (!this.config.metrics.includes(source.name)) {
            this.config.metrics.push(source.name);
        }
    }
    /** Add static time-series data directly. */
    addTimeSeries(data) {
        const validated = types_1.TimeSeriesDataSchema.parse(data);
        const key = `${validated.metric}:${validated.product ?? 'all'}`;
        this.staticTimeSeries.set(key, validated);
    }
    /** Register a widget data provider. */
    registerWidget(widgetId, provider) {
        this.widgets.set(widgetId, provider);
    }
    /** Get time-series data for a metric, aggregated across all sources. */
    async getTimeSeries(metric, timeRange, options) {
        const sources = this.sources.get(metric) ?? [];
        const filteredSources = options?.product
            ? sources.filter((s) => s.product === options.product)
            : sources;
        const allPoints = [];
        for (const source of filteredSources) {
            try {
                const points = await source.fetch(timeRange);
                allPoints.push(...points);
            }
            catch {
                // Skip failed sources
            }
        }
        // Also include static data
        for (const [, data] of this.staticTimeSeries) {
            if (data.metric === metric) {
                if (options?.product && data.product !== options.product)
                    continue;
                allPoints.push(...data.points);
            }
        }
        // Sort by timestamp
        allPoints.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        const aggregation = options?.aggregation ?? 'sum';
        return types_1.TimeSeriesDataSchema.parse({
            metric,
            product: options?.product,
            points: allPoints,
            aggregation,
        });
    }
    /** Aggregate time-series data into buckets. */
    async getAggregatedTimeSeries(metric, timeRange, bucketMs, options) {
        const raw = await this.getTimeSeries(metric, timeRange, options);
        const aggFn = AGGREGATION_FNS[options?.aggregation ?? 'sum'];
        // Group points into buckets
        const buckets = new Map();
        const startTime = new Date(timeRange.start).getTime();
        for (const point of raw.points) {
            const pointTime = new Date(point.timestamp).getTime();
            const bucketKey = startTime + Math.floor((pointTime - startTime) / bucketMs) * bucketMs;
            const bucket = buckets.get(bucketKey) ?? [];
            bucket.push(point.value);
            buckets.set(bucketKey, bucket);
        }
        const aggregatedPoints = [];
        for (const [bucketTime, values] of buckets) {
            aggregatedPoints.push({
                timestamp: new Date(bucketTime).toISOString(),
                value: Math.round(aggFn(values) * 100) / 100,
            });
        }
        aggregatedPoints.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        return types_1.TimeSeriesDataSchema.parse({
            metric,
            product: options?.product,
            points: aggregatedPoints,
            aggregation: options?.aggregation ?? 'sum',
        });
    }
    /** Get data for all registered widgets. */
    async getWidgetData() {
        const results = [];
        for (const [, provider] of this.widgets) {
            try {
                const data = await provider();
                results.push(types_1.DashboardWidgetDataSchema.parse(data));
            }
            catch {
                // Skip failed widgets
            }
        }
        return results;
    }
    /** Get data for a specific widget. */
    async getWidget(widgetId) {
        const provider = this.widgets.get(widgetId);
        if (!provider)
            return null;
        try {
            const data = await provider();
            return types_1.DashboardWidgetDataSchema.parse(data);
        }
        catch {
            return null;
        }
    }
    /** Get aggregate metric value across all products for a time range. */
    async getAggregateMetric(metric, timeRange, aggregation = 'sum') {
        const series = await this.getTimeSeries(metric, timeRange, { aggregation });
        const values = series.points.map((p) => p.value);
        const aggFn = AGGREGATION_FNS[aggregation];
        return Math.round(aggFn(values) * 100) / 100;
    }
    /** Get all registered products. */
    getProducts() {
        return [...this.config.products];
    }
    /** Get all registered metrics. */
    getMetrics() {
        return [...this.config.metrics];
    }
    /** Get the dashboard configuration. */
    getConfig() {
        return { ...this.config };
    }
    /** Clear all cached data. */
    clearCache() {
        this.cachedSeries.clear();
    }
    /** Clear everything. */
    clear() {
        this.sources.clear();
        this.cachedSeries.clear();
        this.widgets.clear();
        this.staticTimeSeries.clear();
        this.config.products.length = 0;
        this.config.metrics.length = 0;
    }
}
exports.AnalyticsDashboardProvider = AnalyticsDashboardProvider;
//# sourceMappingURL=analytics-dashboard.js.map