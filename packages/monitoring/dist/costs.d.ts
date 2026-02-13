/**
 * @module costs
 * MON-005: Cost Monitoring.
 * Track API costs per service/product, budget alerts, and usage reports.
 */
import { CostEntry, BudgetAlert, CostConfig, UsageReport } from './types';
/** Callback invoked when a budget alert is triggered. */
export type BudgetAlertHandler = (alert: BudgetAlert) => void;
/**
 * Cost Monitor.
 * Tracks spending across services and products with budget alerting.
 *
 * @example
 * ```ts
 * const costs = new CostMonitor({
 *   budgets: [
 *     { service: 'openai', limit: 1000, period: 'monthly', alertThreshold: 0.8 }
 *   ],
 * });
 *
 * costs.onBudgetAlert((alert) => {
 *   console.warn(`Budget warning: ${alert.service} at ${alert.usagePercent}%`);
 * });
 *
 * costs.recordCost({ service: 'openai', amount: 15.50 });
 * ```
 */
export declare class CostMonitor {
    private readonly config;
    private readonly entries;
    private readonly alerts;
    private readonly alertHandlers;
    constructor(config?: Partial<CostConfig>);
    /** Register a budget alert handler. */
    onBudgetAlert(handler: BudgetAlertHandler): void;
    /** Record a cost entry. */
    recordCost(entry: Omit<CostEntry, 'id' | 'timestamp' | 'currency'> & {
        id?: string;
        timestamp?: string;
        currency?: string;
    }): CostEntry;
    /** Get total spend for a service (and optionally a product) within a time range. */
    getSpend(service: string, product?: string, since?: string, until?: string): number;
    /** Get total spend across all services. */
    getTotalSpend(since?: string, until?: string): number;
    /** Generate a usage report for a given period. */
    generateReport(startDate: string, endDate: string, period?: string): UsageReport;
    /** Get all budget alerts. */
    getAlerts(since?: string): BudgetAlert[];
    /** Get all recorded cost entries. */
    getEntries(service?: string, product?: string): CostEntry[];
    /** Get spending breakdown by service. */
    getSpendByService(since?: string): Record<string, number>;
    /** Clear all entries and alerts. */
    clear(): void;
    private filterEntries;
    private checkBudgets;
    private getPeriodRange;
}
//# sourceMappingURL=costs.d.ts.map