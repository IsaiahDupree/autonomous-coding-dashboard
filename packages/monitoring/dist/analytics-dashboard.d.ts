/**
 * @module analytics-dashboard
 * AN-006: Unified Analytics Dashboard Data Provider.
 * Aggregate metrics across products, time-series data, and widget support.
 */
import { TimeSeriesPoint, TimeSeriesData, DashboardWidgetData, AnalyticsDashboardConfig } from './types';
/** A metric data source that provides time-series data. */
export interface MetricDataSource {
    name: string;
    product: string;
    fetch(timeRange: {
        start: string;
        end: string;
    }): Promise<TimeSeriesPoint[]> | TimeSeriesPoint[];
}
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
export declare class AnalyticsDashboardProvider {
    private readonly config;
    private readonly sources;
    private readonly cachedSeries;
    private readonly widgets;
    private readonly staticTimeSeries;
    constructor(config?: Partial<AnalyticsDashboardConfig>);
    /** Register a metric data source. */
    registerMetricSource(source: MetricDataSource): void;
    /** Add static time-series data directly. */
    addTimeSeries(data: TimeSeriesData): void;
    /** Register a widget data provider. */
    registerWidget(widgetId: string, provider: () => Promise<DashboardWidgetData> | DashboardWidgetData): void;
    /** Get time-series data for a metric, aggregated across all sources. */
    getTimeSeries(metric: string, timeRange: {
        start: string;
        end: string;
    }, options?: {
        product?: string;
        aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count';
    }): Promise<TimeSeriesData>;
    /** Aggregate time-series data into buckets. */
    getAggregatedTimeSeries(metric: string, timeRange: {
        start: string;
        end: string;
    }, bucketMs: number, options?: {
        product?: string;
        aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count';
    }): Promise<TimeSeriesData>;
    /** Get data for all registered widgets. */
    getWidgetData(): Promise<DashboardWidgetData[]>;
    /** Get data for a specific widget. */
    getWidget(widgetId: string): Promise<DashboardWidgetData | null>;
    /** Get aggregate metric value across all products for a time range. */
    getAggregateMetric(metric: string, timeRange: {
        start: string;
        end: string;
    }, aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count'): Promise<number>;
    /** Get all registered products. */
    getProducts(): string[];
    /** Get all registered metrics. */
    getMetrics(): string[];
    /** Get the dashboard configuration. */
    getConfig(): AnalyticsDashboardConfig;
    /** Clear all cached data. */
    clearCache(): void;
    /** Clear everything. */
    clear(): void;
}
//# sourceMappingURL=analytics-dashboard.d.ts.map