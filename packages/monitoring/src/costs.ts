/**
 * @module costs
 * MON-005: Cost Monitoring.
 * Track API costs per service/product, budget alerts, and usage reports.
 */

import {
  CostEntry,
  CostEntrySchema,
  BudgetAlert,
  CostConfig,
  CostConfigSchema,
  UsageReport,
} from './types';

/** Callback invoked when a budget alert is triggered. */
export type BudgetAlertHandler = (alert: BudgetAlert) => void;

/** Generate a unique ID for cost entries. */
function generateCostId(): string {
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
export class CostMonitor {
  private readonly config: CostConfig;
  private readonly entries: CostEntry[] = [];
  private readonly alerts: BudgetAlert[] = [];
  private readonly alertHandlers: BudgetAlertHandler[] = [];

  constructor(config?: Partial<CostConfig>) {
    this.config = CostConfigSchema.parse(config ?? {});
  }

  /** Register a budget alert handler. */
  onBudgetAlert(handler: BudgetAlertHandler): void {
    this.alertHandlers.push(handler);
  }

  /** Record a cost entry. */
  recordCost(
    entry: Omit<CostEntry, 'id' | 'timestamp' | 'currency'> & {
      id?: string;
      timestamp?: string;
      currency?: string;
    }
  ): CostEntry {
    const validated = CostEntrySchema.parse({
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
  getSpend(
    service: string,
    product?: string,
    since?: string,
    until?: string
  ): number {
    return this.filterEntries(service, product, since, until).reduce(
      (total, e) => total + e.amount,
      0
    );
  }

  /** Get total spend across all services. */
  getTotalSpend(since?: string, until?: string): number {
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
  generateReport(startDate: string, endDate: string, period?: string): UsageReport {
    const filtered = this.entries.filter((e) => {
      const t = new Date(e.timestamp).getTime();
      return t >= new Date(startDate).getTime() && t <= new Date(endDate).getTime();
    });

    const byService: Record<string, number> = {};
    const byProduct: Record<string, number> = {};
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
  getAlerts(since?: string): BudgetAlert[] {
    if (!since) return [...this.alerts];
    const sinceTime = new Date(since).getTime();
    return this.alerts.filter(
      (a) => new Date(a.timestamp).getTime() >= sinceTime
    );
  }

  /** Get all recorded cost entries. */
  getEntries(service?: string, product?: string): CostEntry[] {
    if (!service) return [...this.entries];
    return this.filterEntries(service, product);
  }

  /** Get spending breakdown by service. */
  getSpendByService(since?: string): Record<string, number> {
    const sinceTime = since ? new Date(since).getTime() : 0;
    const result: Record<string, number> = {};

    for (const entry of this.entries) {
      if (new Date(entry.timestamp).getTime() >= sinceTime) {
        result[entry.service] = (result[entry.service] ?? 0) + entry.amount;
      }
    }

    return result;
  }

  /** Clear all entries and alerts. */
  clear(): void {
    this.entries.length = 0;
    this.alerts.length = 0;
  }

  private filterEntries(
    service: string,
    product?: string,
    since?: string,
    until?: string
  ): CostEntry[] {
    const sinceTime = since ? new Date(since).getTime() : 0;
    const untilTime = until ? new Date(until).getTime() : Infinity;

    return this.entries.filter((e) => {
      if (e.service !== service) return false;
      if (product && e.product !== product) return false;
      const t = new Date(e.timestamp).getTime();
      return t >= sinceTime && t <= untilTime;
    });
  }

  private checkBudgets(service: string, product?: string): void {
    for (const budget of this.config.budgets) {
      if (budget.service !== service) continue;
      if (budget.product && budget.product !== product) continue;

      const periodRange = this.getPeriodRange(budget.period);
      const currentSpend = this.getSpend(
        budget.service,
        budget.product,
        periodRange.start,
        periodRange.end
      );

      const usagePercent = (currentSpend / budget.limit) * 100;

      if (usagePercent / 100 >= budget.alertThreshold) {
        const alert: BudgetAlert = {
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
          } catch {
            // Ignore handler errors
          }
        }
      }
    }
  }

  private getPeriodRange(period: string): { start: string; end: string } {
    const now = new Date();
    let start: Date;

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
