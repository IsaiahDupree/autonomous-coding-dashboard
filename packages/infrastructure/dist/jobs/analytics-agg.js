"use strict";
/**
 * JOB-006: Analytics Aggregation Job
 *
 * Periodic job that rolls up raw analytics events into
 * hourly/daily/weekly aggregations for dashboard consumption.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsAggregationJob = void 0;
const scheduler_1 = require("./scheduler");
// ── Default In-Memory Data Source ────────────────────────────────────────────
class InMemoryAnalyticsDataSource {
    constructor() {
        this.records = [];
        this.aggregations = [];
    }
    async query(_params) {
        return this.records;
    }
    async writeAggregation(params) {
        this.aggregations.push(...params.data);
        return params.data.length;
    }
    async purgeOldData(_olderThanDays) {
        const before = this.records.length;
        this.records = [];
        return before;
    }
}
// ── Analytics Aggregation Job ────────────────────────────────────────────────
class AnalyticsAggregationJob {
    constructor(configs, dataSource, scheduler) {
        this.results = [];
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
        this.scheduler = scheduler ?? new scheduler_1.JobScheduler();
    }
    /**
     * Register aggregation jobs with the scheduler.
     */
    register() {
        for (const config of this.configs) {
            const cronExpr = this.periodToCron(config.period);
            this.scheduler.schedule(`analytics-agg-${config.period}`, cronExpr, async () => { await this.runAggregation(config); });
        }
    }
    /**
     * Run a single aggregation manually.
     */
    async runAggregation(config) {
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
        const result = {
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
    getResults() {
        return [...this.results];
    }
    /**
     * Start the scheduler.
     */
    start() {
        this.register();
        this.scheduler.start();
    }
    /**
     * Stop the scheduler.
     */
    stop() {
        this.scheduler.stop();
    }
    // ── Helpers ──────────────────────────────────────────────────────────────
    periodToCron(period) {
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
    getPeriodBounds(period) {
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
exports.AnalyticsAggregationJob = AnalyticsAggregationJob;
