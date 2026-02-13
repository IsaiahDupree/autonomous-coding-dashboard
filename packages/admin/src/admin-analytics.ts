/**
 * admin-analytics.ts - ADMIN-006: Admin Analytics Overview
 *
 * System-wide metrics, user growth, revenue trends.
 * Uses an in-memory store for state.
 */

import {
  SystemMetrics,
  SystemMetricsSchema,
  UserGrowthPoint,
  UserGrowthPointSchema,
  RevenueTrendPoint,
  RevenueTrendPointSchema,
  AdminAnalytics,
  AdminAnalyticsSchema,
  TimeRange,
  TimeRangeEnum,
} from './types';

function nowISO(): string {
  return new Date().toISOString();
}

/** In-memory stores */
const metricsSnapshots: SystemMetrics[] = [];
const userGrowthData: UserGrowthPoint[] = [];
const revenueTrendData: RevenueTrendPoint[] = [];
const productMetrics: Map<string, { productId: string; productName: string; activeUsers: number; revenueCents: number }> = new Map();

/**
 * Record a system metrics snapshot.
 */
export function recordMetricsSnapshot(metrics: Omit<SystemMetrics, 'timestamp'>): SystemMetrics {
  const snapshot: SystemMetrics = SystemMetricsSchema.parse({
    ...metrics,
    timestamp: nowISO(),
  });
  metricsSnapshots.push(snapshot);
  return snapshot;
}

/**
 * Get the latest metrics snapshot.
 */
export function getLatestMetrics(): SystemMetrics | undefined {
  return metricsSnapshots.length > 0
    ? metricsSnapshots[metricsSnapshots.length - 1]
    : undefined;
}

/**
 * Record a user growth data point.
 */
export function recordUserGrowth(data: UserGrowthPoint): UserGrowthPoint {
  const point = UserGrowthPointSchema.parse(data);
  userGrowthData.push(point);
  return point;
}

/**
 * Record a revenue trend data point.
 */
export function recordRevenueTrend(data: RevenueTrendPoint): RevenueTrendPoint {
  const point = RevenueTrendPointSchema.parse(data);
  revenueTrendData.push(point);
  return point;
}

/**
 * Update product metrics.
 */
export function updateProductMetrics(
  productId: string,
  productName: string,
  activeUsers: number,
  revenueCents: number
): void {
  productMetrics.set(productId, { productId, productName, activeUsers, revenueCents });
}

/**
 * Get time-filtered data based on range.
 */
function getDateCutoff(timeRange: TimeRange): Date {
  const now = new Date();
  switch (timeRange) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case '1y':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    case 'all':
      return new Date(0);
  }
}

/**
 * Get the full admin analytics overview for a given time range.
 */
export function getAnalyticsOverview(timeRange: TimeRange = '30d'): AdminAnalytics {
  TimeRangeEnum.parse(timeRange);
  const cutoff = getDateCutoff(timeRange);

  const metrics = getLatestMetrics() || {
    totalUsers: 0,
    activeUsers: 0,
    newUsersToday: 0,
    totalOrganizations: 0,
    totalRevenueCents: 0,
    mrrCents: 0,
    arrCents: 0,
    churnRate: 0,
    avgRevenuePerUser: 0,
    timestamp: nowISO(),
  };

  const filteredGrowth = userGrowthData.filter(
    (p) => new Date(p.date) >= cutoff
  );

  const filteredRevenue = revenueTrendData.filter(
    (p) => new Date(p.date) >= cutoff
  );

  const topProducts = Array.from(productMetrics.values())
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .slice(0, 10);

  return AdminAnalyticsSchema.parse({
    metrics,
    userGrowth: filteredGrowth,
    revenueTrends: filteredRevenue,
    topProducts,
    timeRange,
  });
}

/**
 * Get user growth data.
 */
export function getUserGrowthData(timeRange: TimeRange = '30d'): UserGrowthPoint[] {
  const cutoff = getDateCutoff(timeRange);
  return userGrowthData.filter((p) => new Date(p.date) >= cutoff);
}

/**
 * Get revenue trend data.
 */
export function getRevenueTrendData(timeRange: TimeRange = '30d'): RevenueTrendPoint[] {
  const cutoff = getDateCutoff(timeRange);
  return revenueTrendData.filter((p) => new Date(p.date) >= cutoff);
}

/**
 * Get top products by revenue.
 */
export function getTopProductsByRevenue(limit: number = 10): Array<{
  productId: string;
  productName: string;
  activeUsers: number;
  revenueCents: number;
}> {
  return Array.from(productMetrics.values())
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .slice(0, limit);
}

/**
 * Get top products by active users.
 */
export function getTopProductsByUsers(limit: number = 10): Array<{
  productId: string;
  productName: string;
  activeUsers: number;
  revenueCents: number;
}> {
  return Array.from(productMetrics.values())
    .sort((a, b) => b.activeUsers - a.activeUsers)
    .slice(0, limit);
}

/**
 * Calculate growth rate between two periods.
 */
export function calculateGrowthRate(
  metric: 'users' | 'revenue',
  currentPeriodDays: number = 30
): { current: number; previous: number; growthPercent: number } {
  const now = new Date();
  const currentStart = new Date(now.getTime() - currentPeriodDays * 24 * 60 * 60 * 1000);
  const previousStart = new Date(currentStart.getTime() - currentPeriodDays * 24 * 60 * 60 * 1000);

  if (metric === 'users') {
    const currentPeriod = userGrowthData.filter(
      (p) => new Date(p.date) >= currentStart && new Date(p.date) <= now
    );
    const previousPeriod = userGrowthData.filter(
      (p) => new Date(p.date) >= previousStart && new Date(p.date) < currentStart
    );

    const currentNew = currentPeriod.reduce((sum, p) => sum + p.newUsers, 0);
    const previousNew = previousPeriod.reduce((sum, p) => sum + p.newUsers, 0);
    const growthPercent = previousNew > 0 ? ((currentNew - previousNew) / previousNew) * 100 : 0;

    return { current: currentNew, previous: previousNew, growthPercent };
  } else {
    const currentPeriod = revenueTrendData.filter(
      (p) => new Date(p.date) >= currentStart && new Date(p.date) <= now
    );
    const previousPeriod = revenueTrendData.filter(
      (p) => new Date(p.date) >= previousStart && new Date(p.date) < currentStart
    );

    const currentRev = currentPeriod.reduce((sum, p) => sum + p.revenueCents, 0);
    const previousRev = previousPeriod.reduce((sum, p) => sum + p.revenueCents, 0);
    const growthPercent = previousRev > 0 ? ((currentRev - previousRev) / previousRev) * 100 : 0;

    return { current: currentRev, previous: previousRev, growthPercent };
  }
}

/**
 * Clear the in-memory stores (for testing).
 */
export function clearAnalyticsStores(): void {
  metricsSnapshots.length = 0;
  userGrowthData.length = 0;
  revenueTrendData.length = 0;
  productMetrics.clear();
}
