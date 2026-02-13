/**
 * Cost Tracking (COST-001 to COST-003)
 * - COST-001: Per-service cost tracking (API costs, compute costs, storage costs per service)
 * - COST-002: Cost allocation to products (distribute shared costs across products)
 * - COST-003: Cost alerting (budget thresholds, anomaly detection, notification triggers)
 */
import { CostAlert, CostAllocation, CostCategory, CostEntry } from './types';
export interface CostSummary {
    serviceId: string;
    category: CostCategory;
    totalCents: number;
    entryCount: number;
    periodStart: number;
    periodEnd: number;
}
/**
 * Tracks costs per service, allocates costs to products, and provides
 * alerting on budget thresholds and anomalies.
 */
export declare class CostTrackingService {
    private entries;
    private allocations;
    private alerts;
    /** Registered notification callbacks */
    private notificationHandlers;
    /** Record a cost entry for a service */
    recordCost(input: {
        serviceId: string;
        category: CostCategory;
        amountCents: number;
        description: string;
        metadata?: Record<string, string>;
    }): CostEntry;
    /** Get all cost entries, optionally filtered */
    getCostEntries(filters?: {
        serviceId?: string;
        category?: CostCategory;
        startTime?: number;
        endTime?: number;
    }): CostEntry[];
    /** Get cost summary for a service in a given period */
    getServiceCostSummary(serviceId: string, periodStart: number, periodEnd: number): CostSummary[];
    /** Get total costs per service */
    getTotalCostsByService(periodStart?: number, periodEnd?: number): Array<{
        serviceId: string;
        totalCents: number;
    }>;
    /** Get total costs by category */
    getTotalCostsByCategory(periodStart?: number, periodEnd?: number): Array<{
        category: CostCategory;
        totalCents: number;
    }>;
    /**
     * Allocate a cost entry to one or more products.
     * Percentages must sum to 100 or less.
     */
    allocateCost(costEntryId: string, allocations: Array<{
        productId: string;
        percentage: number;
    }>): CostAllocation[];
    /** Get cost allocations for a product */
    getProductAllocations(productId: string): CostAllocation[];
    /** Get total allocated costs per product */
    getTotalCostsByProduct(periodStart?: number, periodEnd?: number): Array<{
        productId: string;
        totalAllocatedCents: number;
    }>;
    /** Create a cost alert with budget threshold */
    createAlert(input: {
        serviceId?: string;
        category?: CostCategory;
        budgetCents: number;
        thresholdPercent?: number;
        periodStart: number;
        periodEnd: number;
        notificationCallbackId?: string;
    }): CostAlert;
    /** Register a notification handler */
    registerNotificationHandler(handlerId: string, handler: (alert: CostAlert, currentSpendCents: number) => void): void;
    /** Get an alert by ID */
    getAlert(alertId: string): CostAlert | undefined;
    /** Get all alerts */
    getAllAlerts(): CostAlert[];
    /** Delete an alert */
    deleteAlert(alertId: string): boolean;
    /**
     * Check all relevant alerts after a cost is recorded.
     * Triggers notification if spend exceeds threshold.
     */
    private checkAlerts;
    /**
     * Simple anomaly detection: checks if recent spend is significantly
     * higher than the historical average.
     */
    detectAnomalies(serviceId: string, lookbackPeriodMs: number, recentPeriodMs: number, thresholdMultiplier?: number): {
        isAnomaly: boolean;
        recentSpendCents: number;
        averageSpendCents: number;
        multiplier: number;
    };
}
//# sourceMappingURL=cost-tracking.d.ts.map