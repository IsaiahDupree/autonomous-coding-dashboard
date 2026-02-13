/**
 * Usage Metering (BILL-001)
 * Track API calls, renders, storage per customer with counters.
 */
import { UsageMetric, UsageRecord } from './types';
export interface UsageSummary {
    customerId: string;
    metric: UsageMetric;
    totalQuantity: number;
    recordCount: number;
    periodStart: number;
    periodEnd: number;
}
export interface MeteringOptions {
    /** Maximum number of records to retain in memory per customer. Default: 10000 */
    maxRecordsPerCustomer?: number;
}
/**
 * In-memory usage metering service.
 * Tracks API calls, renders, storage, and other metrics per customer.
 */
export declare class MeteringService {
    /** customerId -> records */
    private records;
    /** customerId -> metric -> cumulative counter */
    private counters;
    private idCounter;
    private maxRecordsPerCustomer;
    constructor(options?: MeteringOptions);
    /** Record a usage event */
    record(input: {
        customerId: string;
        metric: UsageMetric;
        quantity: number;
        metadata?: Record<string, string>;
    }): UsageRecord;
    /** Increment a metric by 1 (convenience method) */
    increment(customerId: string, metric: UsageMetric, metadata?: Record<string, string>): UsageRecord;
    /** Get the cumulative counter for a customer/metric */
    getCounter(customerId: string, metric: UsageMetric): number;
    /** Get all counters for a customer */
    getAllCounters(customerId: string): Record<UsageMetric, number>;
    /** Get usage records for a customer in a time range */
    getRecords(customerId: string, options?: {
        metric?: UsageMetric;
        startTime?: number;
        endTime?: number;
    }): UsageRecord[];
    /** Get a usage summary for a customer/metric in a time period */
    getSummary(customerId: string, metric: UsageMetric, periodStart: number, periodEnd: number): UsageSummary;
    /** Reset counters for a customer (e.g. at billing cycle reset) */
    resetCounters(customerId: string): void;
    /** Reset a specific counter for a customer */
    resetCounter(customerId: string, metric: UsageMetric): void;
    /** Get all customer IDs that have usage records */
    getCustomerIds(): string[];
    /** Clear all records and counters for a customer */
    clearCustomerData(customerId: string): void;
}
//# sourceMappingURL=metering.d.ts.map