"use strict";
/**
 * Usage Metering (BILL-001)
 * Track API calls, renders, storage per customer with counters.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeteringService = void 0;
const types_1 = require("./types");
/**
 * In-memory usage metering service.
 * Tracks API calls, renders, storage, and other metrics per customer.
 */
class MeteringService {
    constructor(options = {}) {
        /** customerId -> records */
        this.records = new Map();
        /** customerId -> metric -> cumulative counter */
        this.counters = new Map();
        this.idCounter = 0;
        this.maxRecordsPerCustomer = options.maxRecordsPerCustomer ?? 10000;
    }
    /** Record a usage event */
    record(input) {
        if (input.quantity < 0) {
            throw new Error('Usage quantity cannot be negative');
        }
        this.idCounter++;
        const record = types_1.UsageRecordSchema.parse({
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
        const customerRecords = this.records.get(input.customerId);
        customerRecords.push(record);
        // Enforce retention limit
        if (customerRecords.length > this.maxRecordsPerCustomer) {
            customerRecords.splice(0, customerRecords.length - this.maxRecordsPerCustomer);
        }
        // Update counter
        if (!this.counters.has(input.customerId)) {
            this.counters.set(input.customerId, new Map());
        }
        const customerCounters = this.counters.get(input.customerId);
        const current = customerCounters.get(input.metric) ?? 0;
        customerCounters.set(input.metric, current + input.quantity);
        return record;
    }
    /** Increment a metric by 1 (convenience method) */
    increment(customerId, metric, metadata) {
        return this.record({ customerId, metric, quantity: 1, metadata });
    }
    /** Get the cumulative counter for a customer/metric */
    getCounter(customerId, metric) {
        return this.counters.get(customerId)?.get(metric) ?? 0;
    }
    /** Get all counters for a customer */
    getAllCounters(customerId) {
        const customerCounters = this.counters.get(customerId);
        const result = {};
        const allMetrics = [
            'api_calls', 'renders', 'storage_bytes', 'compute_minutes', 'bandwidth_bytes', 'seats',
        ];
        for (const metric of allMetrics) {
            result[metric] = customerCounters?.get(metric) ?? 0;
        }
        return result;
    }
    /** Get usage records for a customer in a time range */
    getRecords(customerId, options) {
        const customerRecords = this.records.get(customerId) ?? [];
        return customerRecords.filter(r => {
            if (options?.metric && r.metric !== options.metric)
                return false;
            if (options?.startTime && r.timestamp < options.startTime)
                return false;
            if (options?.endTime && r.timestamp > options.endTime)
                return false;
            return true;
        });
    }
    /** Get a usage summary for a customer/metric in a time period */
    getSummary(customerId, metric, periodStart, periodEnd) {
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
    resetCounters(customerId) {
        this.counters.delete(customerId);
    }
    /** Reset a specific counter for a customer */
    resetCounter(customerId, metric) {
        this.counters.get(customerId)?.delete(metric);
    }
    /** Get all customer IDs that have usage records */
    getCustomerIds() {
        return Array.from(this.records.keys());
    }
    /** Clear all records and counters for a customer */
    clearCustomerData(customerId) {
        this.records.delete(customerId);
        this.counters.delete(customerId);
    }
}
exports.MeteringService = MeteringService;
//# sourceMappingURL=metering.js.map