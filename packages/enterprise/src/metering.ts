/**
 * Usage Metering (BILL-001)
 * Track API calls, renders, storage per customer with counters.
 */

import { UsageMetric, UsageRecord, UsageRecordSchema } from './types';

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
export class MeteringService {
  /** customerId -> records */
  private records: Map<string, UsageRecord[]> = new Map();
  /** customerId -> metric -> cumulative counter */
  private counters: Map<string, Map<UsageMetric, number>> = new Map();
  private idCounter = 0;
  private maxRecordsPerCustomer: number;

  constructor(options: MeteringOptions = {}) {
    this.maxRecordsPerCustomer = options.maxRecordsPerCustomer ?? 10000;
  }

  /** Record a usage event */
  record(input: {
    customerId: string;
    metric: UsageMetric;
    quantity: number;
    metadata?: Record<string, string>;
  }): UsageRecord {
    if (input.quantity < 0) {
      throw new Error('Usage quantity cannot be negative');
    }

    this.idCounter++;
    const record = UsageRecordSchema.parse({
      id: `usage_${this.idCounter}`,
      customerId: input.customerId,
      metric: input.metric,
      quantity: input.quantity,
      timestamp: Date.now(),
      metadata: input.metadata ?? {},
    });

    // Store the record
    if (!this.records.has(input.customerId)) {
      this.records.set(input.customerId, []);
    }
    const customerRecords = this.records.get(input.customerId)!;
    customerRecords.push(record);

    // Enforce retention limit
    if (customerRecords.length > this.maxRecordsPerCustomer) {
      customerRecords.splice(0, customerRecords.length - this.maxRecordsPerCustomer);
    }

    // Update counter
    if (!this.counters.has(input.customerId)) {
      this.counters.set(input.customerId, new Map());
    }
    const customerCounters = this.counters.get(input.customerId)!;
    const current = customerCounters.get(input.metric) ?? 0;
    customerCounters.set(input.metric, current + input.quantity);

    return record;
  }

  /** Increment a metric by 1 (convenience method) */
  increment(customerId: string, metric: UsageMetric, metadata?: Record<string, string>): UsageRecord {
    return this.record({ customerId, metric, quantity: 1, metadata });
  }

  /** Get the cumulative counter for a customer/metric */
  getCounter(customerId: string, metric: UsageMetric): number {
    return this.counters.get(customerId)?.get(metric) ?? 0;
  }

  /** Get all counters for a customer */
  getAllCounters(customerId: string): Record<UsageMetric, number> {
    const customerCounters = this.counters.get(customerId);
    const result = {} as Record<UsageMetric, number>;
    const allMetrics: UsageMetric[] = [
      'api_calls', 'renders', 'storage_bytes', 'compute_minutes', 'bandwidth_bytes', 'seats',
    ];

    for (const metric of allMetrics) {
      result[metric] = customerCounters?.get(metric) ?? 0;
    }
    return result;
  }

  /** Get usage records for a customer in a time range */
  getRecords(
    customerId: string,
    options?: {
      metric?: UsageMetric;
      startTime?: number;
      endTime?: number;
    },
  ): UsageRecord[] {
    const customerRecords = this.records.get(customerId) ?? [];
    return customerRecords.filter(r => {
      if (options?.metric && r.metric !== options.metric) return false;
      if (options?.startTime && r.timestamp < options.startTime) return false;
      if (options?.endTime && r.timestamp > options.endTime) return false;
      return true;
    });
  }

  /** Get a usage summary for a customer/metric in a time period */
  getSummary(
    customerId: string,
    metric: UsageMetric,
    periodStart: number,
    periodEnd: number,
  ): UsageSummary {
    const records = this.getRecords(customerId, {
      metric,
      startTime: periodStart,
      endTime: periodEnd,
    });

    return {
      customerId,
      metric,
      totalQuantity: records.reduce((sum, r) => sum + r.quantity, 0),
      recordCount: records.length,
      periodStart,
      periodEnd,
    };
  }

  /** Reset counters for a customer (e.g. at billing cycle reset) */
  resetCounters(customerId: string): void {
    this.counters.delete(customerId);
  }

  /** Reset a specific counter for a customer */
  resetCounter(customerId: string, metric: UsageMetric): void {
    this.counters.get(customerId)?.delete(metric);
  }

  /** Get all customer IDs that have usage records */
  getCustomerIds(): string[] {
    return Array.from(this.records.keys());
  }

  /** Clear all records and counters for a customer */
  clearCustomerData(customerId: string): void {
    this.records.delete(customerId);
    this.counters.delete(customerId);
  }
}
