/**
 * JOB-006: Analytics Aggregation Job
 *
 * Periodic job that rolls up raw analytics events into
 * hourly/daily/weekly aggregations for dashboard consumption.
 */
import { JobScheduler } from './scheduler';
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
export declare class AnalyticsAggregationJob {
    private configs;
    private dataSource;
    private scheduler;
    private results;
    constructor(configs?: AggregationConfig[], dataSource?: AnalyticsDataSource, scheduler?: JobScheduler);
    /**
     * Register aggregation jobs with the scheduler.
     */
    register(): void;
    /**
     * Run a single aggregation manually.
     */
    runAggregation(config: AggregationConfig): Promise<AggregationResult>;
    /**
     * Get results from previous runs.
     */
    getResults(): AggregationResult[];
    /**
     * Start the scheduler.
     */
    start(): void;
    /**
     * Stop the scheduler.
     */
    stop(): void;
    private periodToCron;
    private getPeriodBounds;
}
