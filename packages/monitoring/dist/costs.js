"use strict";
/**
 * @module costs
 * MON-005: Cost Monitoring.
 * Track API costs per service/product, budget alerts, and usage reports.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CostMonitor = void 0;
const types_1 = require("./types");
/** Generate a unique ID for cost entries. */
function generateCostId() {
    return `cost_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
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
class CostMonitor {
    constructor(config) {
        this.entries = [];
        this.alerts = [];
        this.alertHandlers = [];
        this.config = types_1.CostConfigSchema.parse(config ?? {});
    }
    /** Register a budget alert handler. */
    onBudgetAlert(handler) {
        this.alertHandlers.push(handler);
    }
    /** Record a cost entry. */
    recordCost(entry) {
        const validated = types_1.CostEntrySchema.parse({
            id: entry.id ?? generateCostId(),
            timestamp: entry.timestamp ?? new Date().toISOString(),
            currency: entry.currency ?? this.config.defaultCurrency,
            ...entry,
        });
        this.entries.push(validated);
        this.checkBudgets(validated.service, validated.product);
        return validated;
    }
    /** Get total spend for a service (and optionally a product) within a time range. */
    getSpend(service, product, since, until) {
        return this.filterEntries(service, product, since, until).reduce((total, e) => total + e.amount, 0);
    }
    /** Get total spend across all services. */
    getTotalSpend(since, until) {
        const sinceTime = since ? new Date(since).getTime() : 0;
        const untilTime = until ? new Date(until).getTime() : Infinity;
        return this.entries
            .filter((e) => {
            const t = new Date(e.timestamp).getTime();
            return t >= sinceTime && t <= untilTime;
        })
            .reduce((total, e) => total + e.amount, 0);
    }
    /** Generate a usage report for a given period. */
    generateReport(startDate, endDate, period) {
        const filtered = this.entries.filter((e) => {
            const t = new Date(e.timestamp).getTime();
            return t >= new Date(startDate).getTime() && t <= new Date(endDate).getTime();
        });
        const byService = {};
        const byProduct = {};
        let totalSpend = 0;
        for (const entry of filtered) {
            totalSpend += entry.amount;
            byService[entry.service] = (byService[entry.service] ?? 0) + entry.amount;
            if (entry.product) {
                byProduct[entry.product] = (byProduct[entry.product] ?? 0) + entry.amount;
            }
        }
        return {
            period: period ?? 'custom',
            startDate,
            endDate,
            totalSpend,
            currency: this.config.defaultCurrency,
            byService,
            byProduct,
            entries: filtered,
        };
    }
    /** Get all budget alerts. */
    getAlerts(since) {
        if (!since)
            return [...this.alerts];
        const sinceTime = new Date(since).getTime();
        return this.alerts.filter((a) => new Date(a.timestamp).getTime() >= sinceTime);
    }
    /** Get all recorded cost entries. */
    getEntries(service, product) {
        if (!service)
            return [...this.entries];
        return this.filterEntries(service, product);
    }
    /** Get spending breakdown by service. */
    getSpendByService(since) {
        const sinceTime = since ? new Date(since).getTime() : 0;
        const result = {};
        for (const entry of this.entries) {
            if (new Date(entry.timestamp).getTime() >= sinceTime) {
                result[entry.service] = (result[entry.service] ?? 0) + entry.amount;
            }
        }
        return result;
    }
    /** Clear all entries and alerts. */
    clear() {
        this.entries.length = 0;
        this.alerts.length = 0;
    }
    filterEntries(service, product, since, until) {
        const sinceTime = since ? new Date(since).getTime() : 0;
        const untilTime = until ? new Date(until).getTime() : Infinity;
        return this.entries.filter((e) => {
            if (e.service !== service)
                return false;
            if (product && e.product !== product)
                return false;
            const t = new Date(e.timestamp).getTime();
            return t >= sinceTime && t <= untilTime;
        });
    }
    checkBudgets(service, product) {
        for (const budget of this.config.budgets) {
            if (budget.service !== service)
                continue;
            if (budget.product && budget.product !== product)
                continue;
            const periodRange = this.getPeriodRange(budget.period);
            const currentSpend = this.getSpend(budget.service, budget.product, periodRange.start, periodRange.end);
            const usagePercent = (currentSpend / budget.limit) * 100;
            if (usagePercent / 100 >= budget.alertThreshold) {
                const alert = {
                    service: budget.service,
                    product: budget.product,
                    currentSpend,
                    budgetLimit: budget.limit,
                    usagePercent,
                    period: budget.period,
                    timestamp: new Date().toISOString(),
                };
                this.alerts.push(alert);
                for (const handler of this.alertHandlers) {
                    try {
                        handler(alert);
                    }
                    catch {
                        // Ignore handler errors
                    }
                }
            }
        }
    }
    getPeriodRange(period) {
        const now = new Date();
        let start;
        switch (period) {
            case 'hourly':
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
                break;
            case 'daily':
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'weekly': {
                const day = now.getDay();
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
                break;
            }
            case 'monthly':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            default:
                start = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        return {
            start: start.toISOString(),
            end: now.toISOString(),
        };
    }
}
exports.CostMonitor = CostMonitor;
//# sourceMappingURL=costs.js.map