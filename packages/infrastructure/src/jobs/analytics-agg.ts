/**
 * JOB-006: Analytics Aggregation Job
 *
 * Periodic job that rolls up raw analytics events into
 * hourly/daily/weekly aggregations for dashboard consumption.
 */

import { JobScheduler } from './scheduler';

// ── Types ────────────────────────────────────────────────────────────────────

export type AggregationPeriod = 'hourly' | 'daily' | 'weekly' | 'monthly';

export interface AggregationConfig {
  period: AggregationPeriod;
  metrics: string[];
  dimensions: string[];
  retentionDays: number;
}

export interface AggregationResult {
  period: AggregationPeriod;
  startTime: Date;
  endTime: Date;
  recordsProcessed: number;
  aggregationsWritten: number;
  durationMs: number;
}

export interface AnalyticsDataSource {
  query(params: {
    startTime: Date;
    endTime: Date;
    metrics: string[];
    dimensions: string[];
  }): Promise<Record<string, unknown>[]>;

  writeAggregation(params: {
    period: AggregationPeriod;
    startTime: Date;
    endTime: Date;
    data: Record<string, unknown>[];
  }): Promise<number>;

  purgeOldData(olderThanDays: number): Promise<number>;
}

// ── Default In-Memory Data Source ────────────────────────────────────────────

class InMemoryAnalyticsDataSource implements AnalyticsDataSource {
  private records: Record<string, unknown>[] = [];
  private aggregations: Record<string, unknown>[] = [];

  async query(_params: {
    startTime: Date;
    endTime: Date;
    metrics: string[];
    dimensions: string[];
  }): Promise<Record<string, unknown>[]> {
    return this.records;
  }

  async writeAggregation(params: {
    period: AggregationPeriod;
    startTime: Date;
    endTime: Date;
    data: Record<string, unknown>[];
  }): Promise<number> {
    this.aggregations.push(...params.data);
    return params.data.length;
  }

  async purgeOldData(_olderThanDays: number): Promise<number> {
    const before = this.records.length;
    this.records = [];
    return before;
  }
}

// ── Analytics Aggregation Job ────────────────────────────────────────────────

export class AnalyticsAggregationJob {
  private configs: AggregationConfig[];
  private dataSource: AnalyticsDataSource;
  private scheduler: JobScheduler;
  private results: AggregationResult[] = [];

  constructor(
    configs?: AggregationConfig[],
    dataSource?: AnalyticsDataSource,
    scheduler?: JobScheduler,
  ) {
    this.configs = configs ?? [
      {
        period: 'hourly',
        metrics: ['views', 'clicks', 'conversions', 'spend'],
        dimensions: ['campaign_id', 'platform', 'ad_set_id'],
        retentionDays: 30,
      },
      {
        period: 'daily',
        metrics: ['views', 'clicks', 'conversions', 'spend', 'revenue'],
        dimensions: ['campaign_id', 'platform'],
        retentionDays: 365,
      },
    ];

    this.dataSource = dataSource ?? new InMemoryAnalyticsDataSource();
    this.scheduler = scheduler ?? new JobScheduler();
  }

  /**
   * Register aggregation jobs with the scheduler.
   */
  register(): void {
    for (const config of this.configs) {
      const cronExpr = this.periodToCron(config.period);
      this.scheduler.schedule(
        `analytics-agg-${config.period}`,
        cronExpr,
        async () => { await this.runAggregation(config); },
      );
    }
  }

  /**
   * Run a single aggregation manually.
   */
  async runAggregation(config: AggregationConfig): Promise<AggregationResult> {
    const start = Date.now();
    const { startTime, endTime } = this.getPeriodBounds(config.period);

    // Query raw data
    const records = await this.dataSource.query({
      startTime,
      endTime,
      metrics: config.metrics,
      dimensions: config.dimensions,
    });

    // Write aggregated data
    const written = await this.dataSource.writeAggregation({
      period: config.period,
      startTime,
      endTime,
      data: records,
    });

    // Purge old raw data
    await this.dataSource.purgeOldData(config.retentionDays);

    const result: AggregationResult = {
      period: config.period,
      startTime,
      endTime,
      recordsProcessed: records.length,
      aggregationsWritten: written,
      durationMs: Date.now() - start,
    };

    this.results.push(result);
    return result;
  }

  /**
   * Get results from previous runs.
   */
  getResults(): AggregationResult[] {
    return [...this.results];
  }

  /**
   * Start the scheduler.
   */
  start(): void {
    this.register();
    this.scheduler.start();
  }

  /**
   * Stop the scheduler.
   */
  stop(): void {
    this.scheduler.stop();
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private periodToCron(period: AggregationPeriod): string {
    switch (period) {
      case 'hourly':
        return 'every 1 hour';
      case 'daily':
        return 'every 1 day';
      case 'weekly':
        return 'every 7 days';
      case 'monthly':
        return 'every 30 days';
    }
  }

  private getPeriodBounds(period: AggregationPeriod): { startTime: Date; endTime: Date } {
    const now = new Date();
    const endTime = new Date(now);
    const startTime = new Date(now);

    switch (period) {
      case 'hourly':
        startTime.setHours(startTime.getHours() - 1);
        break;
      case 'daily':
        startTime.setDate(startTime.getDate() - 1);
        break;
      case 'weekly':
        startTime.setDate(startTime.getDate() - 7);
        break;
      case 'monthly':
        startTime.setMonth(startTime.getMonth() - 1);
        break;
    }

    return { startTime, endTime };
  }
}
