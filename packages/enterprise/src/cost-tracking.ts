/**
 * Cost Tracking (COST-001 to COST-003)
 * - COST-001: Per-service cost tracking (API costs, compute costs, storage costs per service)
 * - COST-002: Cost allocation to products (distribute shared costs across products)
 * - COST-003: Cost alerting (budget thresholds, anomaly detection, notification triggers)
 */

import {
  CostAlert,
  CostAlertSchema,
  CostAllocation,
  CostCategory,
  CostEntry,
  CostEntrySchema,
} from './types';

// ─── COST-001: Per-Service Cost Tracking ─────────────────────────────────────

export interface CostSummary {
  serviceId: string;
  category: CostCategory;
  totalCents: number;
  entryCount: number;
  periodStart: number;
  periodEnd: number;
}

let costEntryIdCounter = 0;
let allocationIdCounter = 0;
let alertIdCounter = 0;

/**
 * Tracks costs per service, allocates costs to products, and provides
 * alerting on budget thresholds and anomalies.
 */
export class CostTrackingService {
  private entries: CostEntry[] = [];
  private allocations: CostAllocation[] = [];
  private alerts: Map<string, CostAlert> = new Map();
  /** Registered notification callbacks */
  private notificationHandlers: Map<string, (alert: CostAlert, currentSpendCents: number) => void> = new Map();

  // ─── COST-001: Record & Query Costs ────────────────────────────────────────

  /** Record a cost entry for a service */
  recordCost(input: {
    serviceId: string;
    category: CostCategory;
    amountCents: number;
    description: string;
    metadata?: Record<string, string>;
  }): CostEntry {
    costEntryIdCounter++;
    const entry = CostEntrySchema.parse({
      id: `cost_${costEntryIdCounter}`,
      serviceId: input.serviceId,
      category: input.category,
      amountCents: input.amountCents,
      description: input.description,
      timestamp: Date.now(),
      metadata: input.metadata ?? {},
    });

    this.entries.push(entry);

    // Check alerts after recording
    this.checkAlerts(input.serviceId, input.category);

    return entry;
  }

  /** Get all cost entries, optionally filtered */
  getCostEntries(filters?: {
    serviceId?: string;
    category?: CostCategory;
    startTime?: number;
    endTime?: number;
  }): CostEntry[] {
    return this.entries.filter(entry => {
      if (filters?.serviceId && entry.serviceId !== filters.serviceId) return false;
      if (filters?.category && entry.category !== filters.category) return false;
      if (filters?.startTime && entry.timestamp < filters.startTime) return false;
      if (filters?.endTime && entry.timestamp > filters.endTime) return false;
      return true;
    });
  }

  /** Get cost summary for a service in a given period */
  getServiceCostSummary(
    serviceId: string,
    periodStart: number,
    periodEnd: number,
  ): CostSummary[] {
    const entries = this.getCostEntries({ serviceId, startTime: periodStart, endTime: periodEnd });

    // Group by category
    const byCategory = new Map<CostCategory, CostEntry[]>();
    for (const entry of entries) {
      if (!byCategory.has(entry.category)) {
        byCategory.set(entry.category, []);
      }
      byCategory.get(entry.category)!.push(entry);
    }

    return Array.from(byCategory.entries()).map(([category, catEntries]) => ({
      serviceId,
      category,
      totalCents: catEntries.reduce((sum, e) => sum + e.amountCents, 0),
      entryCount: catEntries.length,
      periodStart,
      periodEnd,
    }));
  }

  /** Get total costs per service */
  getTotalCostsByService(
    periodStart?: number,
    periodEnd?: number,
  ): Array<{ serviceId: string; totalCents: number }> {
    const entries = this.getCostEntries({ startTime: periodStart, endTime: periodEnd });
    const byService = new Map<string, number>();

    for (const entry of entries) {
      const current = byService.get(entry.serviceId) ?? 0;
      byService.set(entry.serviceId, current + entry.amountCents);
    }

    return Array.from(byService.entries())
      .map(([serviceId, totalCents]) => ({ serviceId, totalCents }))
      .sort((a, b) => b.totalCents - a.totalCents);
  }

  /** Get total costs by category */
  getTotalCostsByCategory(
    periodStart?: number,
    periodEnd?: number,
  ): Array<{ category: CostCategory; totalCents: number }> {
    const entries = this.getCostEntries({ startTime: periodStart, endTime: periodEnd });
    const byCategory = new Map<CostCategory, number>();

    for (const entry of entries) {
      const current = byCategory.get(entry.category) ?? 0;
      byCategory.set(entry.category, current + entry.amountCents);
    }

    return Array.from(byCategory.entries())
      .map(([category, totalCents]) => ({ category, totalCents }))
      .sort((a, b) => b.totalCents - a.totalCents);
  }

  // ─── COST-002: Cost Allocation to Products ─────────────────────────────────

  /**
   * Allocate a cost entry to one or more products.
   * Percentages must sum to 100 or less.
   */
  allocateCost(
    costEntryId: string,
    allocations: Array<{ productId: string; percentage: number }>,
  ): CostAllocation[] {
    const entry = this.entries.find(e => e.id === costEntryId);
    if (!entry) {
      throw new Error(`Cost entry "${costEntryId}" not found`);
    }

    const totalPercentage = allocations.reduce((sum, a) => sum + a.percentage, 0);
    if (totalPercentage > 100) {
      throw new Error(`Total allocation percentage (${totalPercentage}%) exceeds 100%`);
    }

    const results: CostAllocation[] = [];
    for (const alloc of allocations) {
      allocationIdCounter++;
      const allocation: CostAllocation = {
        id: `alloc_${allocationIdCounter}`,
        costEntryId,
        productId: alloc.productId,
        allocationPercentage: alloc.percentage,
        allocatedAmountCents: Math.round(entry.amountCents * (alloc.percentage / 100)),
        timestamp: Date.now(),
      };
      this.allocations.push(allocation);
      results.push(allocation);
    }

    return results;
  }

  /** Get cost allocations for a product */
  getProductAllocations(productId: string): CostAllocation[] {
    return this.allocations.filter(a => a.productId === productId);
  }

  /** Get total allocated costs per product */
  getTotalCostsByProduct(
    periodStart?: number,
    periodEnd?: number,
  ): Array<{ productId: string; totalAllocatedCents: number }> {
    let allocations = this.allocations;
    if (periodStart || periodEnd) {
      allocations = allocations.filter(a => {
        if (periodStart && a.timestamp < periodStart) return false;
        if (periodEnd && a.timestamp > periodEnd) return false;
        return true;
      });
    }

    const byProduct = new Map<string, number>();
    for (const alloc of allocations) {
      const current = byProduct.get(alloc.productId) ?? 0;
      byProduct.set(alloc.productId, current + alloc.allocatedAmountCents);
    }

    return Array.from(byProduct.entries())
      .map(([productId, totalAllocatedCents]) => ({ productId, totalAllocatedCents }))
      .sort((a, b) => b.totalAllocatedCents - a.totalAllocatedCents);
  }

  // ─── COST-003: Cost Alerting ───────────────────────────────────────────────

  /** Create a cost alert with budget threshold */
  createAlert(input: {
    serviceId?: string;
    category?: CostCategory;
    budgetCents: number;
    thresholdPercent?: number;
    periodStart: number;
    periodEnd: number;
    notificationCallbackId?: string;
  }): CostAlert {
    alertIdCounter++;
    const alert = CostAlertSchema.parse({
      id: `alert_${alertIdCounter}`,
      serviceId: input.serviceId,
      category: input.category,
      budgetCents: input.budgetCents,
      thresholdPercent: input.thresholdPercent ?? 80,
      currentSpendCents: 0,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      triggered: false,
      notificationCallback: input.notificationCallbackId,
    });

    this.alerts.set(alert.id, alert);
    return alert;
  }

  /** Register a notification handler */
  registerNotificationHandler(
    handlerId: string,
    handler: (alert: CostAlert, currentSpendCents: number) => void,
  ): void {
    this.notificationHandlers.set(handlerId, handler);
  }

  /** Get an alert by ID */
  getAlert(alertId: string): CostAlert | undefined {
    return this.alerts.get(alertId);
  }

  /** Get all alerts */
  getAllAlerts(): CostAlert[] {
    return Array.from(this.alerts.values());
  }

  /** Delete an alert */
  deleteAlert(alertId: string): boolean {
    return this.alerts.delete(alertId);
  }

  /**
   * Check all relevant alerts after a cost is recorded.
   * Triggers notification if spend exceeds threshold.
   */
  private checkAlerts(serviceId: string, category: CostCategory): void {
    const now = Date.now();

    for (const alert of this.alerts.values()) {
      // Skip if not in alert period
      if (now < alert.periodStart || now > alert.periodEnd) continue;

      // Skip if alert doesn't match the service/category
      if (alert.serviceId && alert.serviceId !== serviceId) continue;
      if (alert.category && alert.category !== category) continue;

      // Calculate current spend for this alert
      const entries = this.getCostEntries({
        serviceId: alert.serviceId ?? undefined,
        category: alert.category ?? undefined,
        startTime: alert.periodStart,
        endTime: alert.periodEnd,
      });

      const currentSpend = entries.reduce((sum, e) => sum + e.amountCents, 0);
      alert.currentSpendCents = currentSpend;

      // Check if threshold is exceeded
      const thresholdAmount = Math.round(alert.budgetCents * (alert.thresholdPercent / 100));
      if (currentSpend >= thresholdAmount && !alert.triggered) {
        alert.triggered = true;
        alert.triggeredAt = now;

        // Fire notification
        if (alert.notificationCallback) {
          const handler = this.notificationHandlers.get(alert.notificationCallback);
          if (handler) {
            handler(alert, currentSpend);
          }
        }
      }
    }
  }

  /**
   * Simple anomaly detection: checks if recent spend is significantly
   * higher than the historical average.
   */
  detectAnomalies(
    serviceId: string,
    lookbackPeriodMs: number,
    recentPeriodMs: number,
    thresholdMultiplier = 2,
  ): {
    isAnomaly: boolean;
    recentSpendCents: number;
    averageSpendCents: number;
    multiplier: number;
  } {
    const now = Date.now();

    // Historical average
    const historicalEntries = this.getCostEntries({
      serviceId,
      startTime: now - lookbackPeriodMs,
      endTime: now - recentPeriodMs,
    });
    const historicalTotal = historicalEntries.reduce((sum, e) => sum + e.amountCents, 0);
    const historicalPeriods = Math.max(1, (lookbackPeriodMs - recentPeriodMs) / recentPeriodMs);
    const averageSpendCents = Math.round(historicalTotal / historicalPeriods);

    // Recent spend
    const recentEntries = this.getCostEntries({
      serviceId,
      startTime: now - recentPeriodMs,
      endTime: now,
    });
    const recentSpendCents = recentEntries.reduce((sum, e) => sum + e.amountCents, 0);

    const multiplier = averageSpendCents > 0 ? recentSpendCents / averageSpendCents : 0;

    return {
      isAnomaly: multiplier > thresholdMultiplier,
      recentSpendCents,
      averageSpendCents,
      multiplier: Math.round(multiplier * 100) / 100,
    };
  }
}
