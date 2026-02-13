/**
 * @module analytics-dashboard
 * AN-006: Unified Analytics Dashboard Data Provider.
 * Aggregate metrics across products, time-series data, and widget support.
 */

import {
  TimeSeriesPoint,
  TimeSeriesData,
  TimeSeriesDataSchema,
  DashboardWidgetData,
  DashboardWidgetDataSchema,
  AnalyticsDashboardConfig,
  AnalyticsDashboardConfigSchema,
} from './types';

/** A metric data source that provides time-series data. */
export interface MetricDataSource {
  name: string;
  product: string;
  fetch(timeRange: { start: string; end: string }): Promise<TimeSeriesPoint[]> | TimeSeriesPoint[];
}

/** Aggregation function types. */
type AggregationFn = (values: number[]) => number;

const AGGREGATION_FNS: Record<string, AggregationFn> = {
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
export class AnalyticsDashboardProvider {
  private readonly config: AnalyticsDashboardConfig;
  private readonly sources: Map<string, MetricDataSource[]> = new Map();
  private readonly cachedSeries: Map<string, TimeSeriesData> = new Map();
  private readonly widgets: Map<string, () => Promise<DashboardWidgetData> | DashboardWidgetData> = new Map();
  private readonly staticTimeSeries: Map<string, TimeSeriesData> = new Map();

  constructor(config?: Partial<AnalyticsDashboardConfig>) {
    this.config = AnalyticsDashboardConfigSchema.parse(config ?? {});
  }

  /** Register a metric data source. */
  registerMetricSource(source: MetricDataSource): void {
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
  addTimeSeries(data: TimeSeriesData): void {
    const validated = TimeSeriesDataSchema.parse(data);
    const key = `${validated.metric}:${validated.product ?? 'all'}`;
    this.staticTimeSeries.set(key, validated);
  }

  /** Register a widget data provider. */
  registerWidget(
    widgetId: string,
    provider: () => Promise<DashboardWidgetData> | DashboardWidgetData
  ): void {
    this.widgets.set(widgetId, provider);
  }

  /** Get time-series data for a metric, aggregated across all sources. */
  async getTimeSeries(
    metric: string,
    timeRange: { start: string; end: string },
    options?: { product?: string; aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count' }
  ): Promise<TimeSeriesData> {
    const sources = this.sources.get(metric) ?? [];
    const filteredSources = options?.product
      ? sources.filter((s) => s.product === options.product)
      : sources;

    const allPoints: TimeSeriesPoint[] = [];

    for (const source of filteredSources) {
      try {
        const points = await source.fetch(timeRange);
        allPoints.push(...points);
      } catch {
        // Skip failed sources
      }
    }

    // Also include static data
    for (const [, data] of this.staticTimeSeries) {
      if (data.metric === metric) {
        if (options?.product && data.product !== options.product) continue;
        allPoints.push(...data.points);
      }
    }

    // Sort by timestamp
    allPoints.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const aggregation = options?.aggregation ?? 'sum';

    return TimeSeriesDataSchema.parse({
      metric,
      product: options?.product,
      points: allPoints,
      aggregation,
    });
  }

  /** Aggregate time-series data into buckets. */
  async getAggregatedTimeSeries(
    metric: string,
    timeRange: { start: string; end: string },
    bucketMs: number,
    options?: { product?: string; aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count' }
  ): Promise<TimeSeriesData> {
    const raw = await this.getTimeSeries(metric, timeRange, options);
    const aggFn = AGGREGATION_FNS[options?.aggregation ?? 'sum'];

    // Group points into buckets
    const buckets: Map<number, number[]> = new Map();
    const startTime = new Date(timeRange.start).getTime();

    for (const point of raw.points) {
      const pointTime = new Date(point.timestamp).getTime();
      const bucketKey = startTime + Math.floor((pointTime - startTime) / bucketMs) * bucketMs;
      const bucket = buckets.get(bucketKey) ?? [];
      bucket.push(point.value);
      buckets.set(bucketKey, bucket);
    }

    const aggregatedPoints: TimeSeriesPoint[] = [];
    for (const [bucketTime, values] of buckets) {
      aggregatedPoints.push({
        timestamp: new Date(bucketTime).toISOString(),
        value: Math.round(aggFn(values) * 100) / 100,
      });
    }

    aggregatedPoints.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return TimeSeriesDataSchema.parse({
      metric,
      product: options?.product,
      points: aggregatedPoints,
      aggregation: options?.aggregation ?? 'sum',
    });
  }

  /** Get data for all registered widgets. */
  async getWidgetData(): Promise<DashboardWidgetData[]> {
    const results: DashboardWidgetData[] = [];

    for (const [, provider] of this.widgets) {
      try {
        const data = await provider();
        results.push(DashboardWidgetDataSchema.parse(data));
      } catch {
        // Skip failed widgets
      }
    }

    return results;
  }

  /** Get data for a specific widget. */
  async getWidget(widgetId: string): Promise<DashboardWidgetData | null> {
    const provider = this.widgets.get(widgetId);
    if (!provider) return null;

    try {
      const data = await provider();
      return DashboardWidgetDataSchema.parse(data);
    } catch {
      return null;
    }
  }

  /** Get aggregate metric value across all products for a time range. */
  async getAggregateMetric(
    metric: string,
    timeRange: { start: string; end: string },
    aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count' = 'sum'
  ): Promise<number> {
    const series = await this.getTimeSeries(metric, timeRange, { aggregation });
    const values = series.points.map((p) => p.value);
    const aggFn = AGGREGATION_FNS[aggregation];
    return Math.round(aggFn(values) * 100) / 100;
  }

  /** Get all registered products. */
  getProducts(): string[] {
    return [...this.config.products];
  }

  /** Get all registered metrics. */
  getMetrics(): string[] {
    return [...this.config.metrics];
  }

  /** Get the dashboard configuration. */
  getConfig(): AnalyticsDashboardConfig {
    return { ...this.config };
  }

  /** Clear all cached data. */
  clearCache(): void {
    this.cachedSeries.clear();
  }

  /** Clear everything. */
  clear(): void {
    this.sources.clear();
    this.cachedSeries.clear();
    this.widgets.clear();
    this.staticTimeSeries.clear();
    this.config.products.length = 0;
    this.config.metrics.length = 0;
  }
}
