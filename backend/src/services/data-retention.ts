/**
 * Data Retention Service (CF-WC-131, CF-WC-132)
 *
 * Handles:
 * - Automated data cleanup based on retention policies
 * - Usage tracking per subscription tier
 * - Feature usage limits enforcement
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// Types
// ============================================

export interface RetentionPolicy {
  dataType: string;
  retentionDays: number;
  enabled: boolean;
}

export interface UsageLimits {
  tier: 'free' | 'pro' | 'enterprise';
  limits: {
    dossiersPerMonth: number;
    imagesPerMonth: number;
    videosPerMonth: number;
    publishedPerMonth: number;
    storageGB: number;
  };
}

export interface UsageStats {
  userId: string;
  tier: string;
  period: string; // YYYY-MM
  usage: {
    dossiers: number;
    images: number;
    videos: number;
    published: number;
    storageGB: number;
  };
  limits: UsageLimits['limits'];
  percentUsed: {
    dossiers: number;
    images: number;
    videos: number;
    published: number;
    storage: number;
  };
}

// ============================================
// Data Retention Policies (CF-WC-131)
// ============================================

/**
 * Default retention policies
 */
export const DEFAULT_RETENTION_POLICIES: RetentionPolicy[] = [
  {
    dataType: 'analytics_events',
    retentionDays: 90, // 3 months
    enabled: true,
  },
  {
    dataType: 'search_analytics',
    retentionDays: 30, // 1 month
    enabled: true,
  },
  {
    dataType: 'error_tracking',
    retentionDays: 60, // 2 months
    enabled: true,
  },
  {
    dataType: 'user_feedback_resolved',
    retentionDays: 180, // 6 months
    enabled: true,
  },
  {
    dataType: 'performance_metrics',
    retentionDays: 365, // 1 year
    enabled: true,
  },
  {
    dataType: 'ab_test_results',
    retentionDays: 180, // 6 months after completion
    enabled: true,
  },
  {
    dataType: 'archived_dossiers',
    retentionDays: 90, // 3 months after archiving
    enabled: false, // Manual cleanup recommended
  },
];

/**
 * Apply retention policies and clean up old data
 */
export async function applyRetentionPolicies(): Promise<{
  cleaned: Record<string, number>;
  errors: string[];
}> {
  const cleaned: Record<string, number> = {};
  const errors: string[] = [];

  for (const policy of DEFAULT_RETENTION_POLICIES) {
    if (!policy.enabled) continue;

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

      let deletedCount = 0;

      switch (policy.dataType) {
        case 'analytics_events':
          deletedCount = await cleanAnalyticsEvents(cutoffDate);
          break;

        case 'search_analytics':
          deletedCount = await cleanSearchAnalytics(cutoffDate);
          break;

        case 'error_tracking':
          deletedCount = await cleanErrorTracking(cutoffDate);
          break;

        case 'user_feedback_resolved':
          deletedCount = await cleanResolvedFeedback(cutoffDate);
          break;

        case 'performance_metrics':
          deletedCount = await cleanPerformanceMetrics(cutoffDate);
          break;

        case 'ab_test_results':
          deletedCount = await cleanCompletedABTests(cutoffDate);
          break;

        case 'archived_dossiers':
          deletedCount = await cleanArchivedDossiers(cutoffDate);
          break;
      }

      cleaned[policy.dataType] = deletedCount;
    } catch (error) {
      errors.push(
        `Failed to clean ${policy.dataType}: ${(error as Error).message}`
      );
    }
  }

  return { cleaned, errors };
}

/**
 * Clean old analytics events
 */
async function cleanAnalyticsEvents(cutoffDate: Date): Promise<number> {
  const result = await prisma.cf_analytics_events.deleteMany({
    where: {
      timestamp: { lt: cutoffDate },
    },
  });
  return result.count;
}

/**
 * Clean old search analytics
 */
async function cleanSearchAnalytics(cutoffDate: Date): Promise<number> {
  const result = await prisma.cf_search_analytics.deleteMany({
    where: {
      timestamp: { lt: cutoffDate },
    },
  });
  return result.count;
}

/**
 * Clean old error tracking
 */
async function cleanErrorTracking(cutoffDate: Date): Promise<number> {
  const result = await prisma.cf_error_tracking.deleteMany({
    where: {
      date: { lt: cutoffDate },
    },
  });
  return result.count;
}

/**
 * Clean resolved feedback
 */
async function cleanResolvedFeedback(cutoffDate: Date): Promise<number> {
  const result = await prisma.cf_user_feedback.deleteMany({
    where: {
      status: 'resolved',
      timestamp: { lt: cutoffDate },
    },
  });
  return result.count;
}

/**
 * Clean old performance metrics
 */
async function cleanPerformanceMetrics(cutoffDate: Date): Promise<number> {
  const result = await prisma.cf_performance_metrics.deleteMany({
    where: {
      date: { lt: cutoffDate },
    },
  });
  return result.count;
}

/**
 * Clean completed A/B tests
 */
async function cleanCompletedABTests(cutoffDate: Date): Promise<number> {
  const tests = await prisma.cf_ab_tests.deleteMany({
    where: {
      status: 'completed',
      endDate: { lt: cutoffDate },
    },
  });
  return tests.count;
}

/**
 * Clean archived dossiers
 */
async function cleanArchivedDossiers(cutoffDate: Date): Promise<number> {
  const dossiers = await prisma.cf_product_dossiers.deleteMany({
    where: {
      status: 'archived',
      updatedAt: { lt: cutoffDate },
    },
  });
  return dossiers.count;
}

/**
 * Get retention policy status
 */
export async function getRetentionStatus(): Promise<{
  policies: RetentionPolicy[];
  estimatedDeletions: Record<string, number>;
}> {
  const estimatedDeletions: Record<string, number> = {};

  for (const policy of DEFAULT_RETENTION_POLICIES) {
    if (!policy.enabled) continue;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

    let count = 0;

    switch (policy.dataType) {
      case 'analytics_events':
        count = await prisma.cf_analytics_events.count({
          where: { timestamp: { lt: cutoffDate } },
        });
        break;

      case 'search_analytics':
        count = await prisma.cf_search_analytics.count({
          where: { timestamp: { lt: cutoffDate } },
        });
        break;

      case 'error_tracking':
        count = await prisma.cf_error_tracking.count({
          where: { date: { lt: cutoffDate } },
        });
        break;

      case 'performance_metrics':
        count = await prisma.cf_performance_metrics.count({
          where: { date: { lt: cutoffDate } },
        });
        break;
    }

    estimatedDeletions[policy.dataType] = count;
  }

  return {
    policies: DEFAULT_RETENTION_POLICIES,
    estimatedDeletions,
  };
}

// ============================================
// Usage Tracking Per Tier (CF-WC-132)
// ============================================

/**
 * Usage limits by subscription tier
 */
export const USAGE_LIMITS: Record<string, UsageLimits['limits']> = {
  free: {
    dossiersPerMonth: 5,
    imagesPerMonth: 50,
    videosPerMonth: 10,
    publishedPerMonth: 20,
    storageGB: 1,
  },
  pro: {
    dossiersPerMonth: 50,
    imagesPerMonth: 500,
    videosPerMonth: 100,
    publishedPerMonth: 200,
    storageGB: 10,
  },
  enterprise: {
    dossiersPerMonth: -1, // Unlimited
    imagesPerMonth: -1,
    videosPerMonth: -1,
    publishedPerMonth: -1,
    storageGB: 100,
  },
};

/**
 * Track feature usage
 */
export async function trackUsage(
  userId: string,
  featureName: string,
  tier: string
): Promise<{ allowed: boolean; limitHit: boolean; usage: number; limit: number }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Update or create usage record
  const usage = await prisma.cf_usage_tracking.upsert({
    where: {
      userId_featureName_date: {
        userId,
        featureName,
        date: today,
      },
    },
    update: {
      usageCount: { increment: 1 },
    },
    create: {
      userId,
      featureName,
      date: today,
      usageCount: 1,
      tier,
    },
  });

  // Get monthly usage
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthlyUsage = await prisma.cf_usage_tracking.aggregate({
    where: {
      userId,
      featureName,
      date: { gte: firstDayOfMonth },
    },
    _sum: {
      usageCount: true,
    },
  });

  const currentUsage = monthlyUsage._sum.usageCount || 0;

  // Check limits
  const limits = USAGE_LIMITS[tier] || USAGE_LIMITS.free;
  const limit = getFeatureLimit(featureName, limits);

  const allowed = limit === -1 || currentUsage <= limit;
  const limitHit = !allowed;

  // Update limit_hit flag if needed
  if (limitHit && !usage.limitHit) {
    await prisma.cf_usage_tracking.update({
      where: { id: usage.id },
      data: { limitHit: true },
    });
  }

  return {
    allowed,
    limitHit,
    usage: currentUsage,
    limit,
  };
}

/**
 * Get feature limit for specific feature name
 */
function getFeatureLimit(
  featureName: string,
  limits: UsageLimits['limits']
): number {
  const mapping: Record<string, keyof UsageLimits['limits']> = {
    dossier_created: 'dossiersPerMonth',
    image_generated: 'imagesPerMonth',
    video_generated: 'videosPerMonth',
    content_published: 'publishedPerMonth',
  };

  const limitKey = mapping[featureName];
  return limitKey ? limits[limitKey] : -1;
}

/**
 * Get usage statistics for user
 */
export async function getUserUsageStats(
  userId: string,
  tier: string
): Promise<UsageStats> {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Get monthly usage for all features
  const dossierUsage = await getMonthlyUsage(userId, 'dossier_created', firstDayOfMonth);
  const imageUsage = await getMonthlyUsage(userId, 'image_generated', firstDayOfMonth);
  const videoUsage = await getMonthlyUsage(userId, 'video_generated', firstDayOfMonth);
  const publishedUsage = await getMonthlyUsage(userId, 'content_published', firstDayOfMonth);

  // Calculate storage usage (placeholder - would need actual file sizes)
  const storageGB = 0; // TODO: Calculate from actual file sizes

  const limits = USAGE_LIMITS[tier] || USAGE_LIMITS.free;

  return {
    userId,
    tier,
    period,
    usage: {
      dossiers: dossierUsage,
      images: imageUsage,
      videos: videoUsage,
      published: publishedUsage,
      storageGB,
    },
    limits,
    percentUsed: {
      dossiers: calculatePercentUsed(dossierUsage, limits.dossiersPerMonth),
      images: calculatePercentUsed(imageUsage, limits.imagesPerMonth),
      videos: calculatePercentUsed(videoUsage, limits.videosPerMonth),
      published: calculatePercentUsed(publishedUsage, limits.publishedPerMonth),
      storage: calculatePercentUsed(storageGB, limits.storageGB),
    },
  };
}

/**
 * Get monthly usage for a feature
 */
async function getMonthlyUsage(
  userId: string,
  featureName: string,
  startDate: Date
): Promise<number> {
  const result = await prisma.cf_usage_tracking.aggregate({
    where: {
      userId,
      featureName,
      date: { gte: startDate },
    },
    _sum: {
      usageCount: true,
    },
  });

  return result._sum.usageCount || 0;
}

/**
 * Calculate percent used
 */
function calculatePercentUsed(usage: number, limit: number): number {
  if (limit === -1) return 0; // Unlimited
  if (limit === 0) return 100;
  return Math.min(100, (usage / limit) * 100);
}

/**
 * Check if user can perform action
 */
export async function canPerformAction(
  userId: string,
  featureName: string,
  tier: string
): Promise<{ allowed: boolean; reason?: string; limit?: number; usage?: number }> {
  const result = await trackUsage(userId, featureName, tier);

  if (!result.allowed) {
    return {
      allowed: false,
      reason: `Monthly limit reached. Used ${result.usage} of ${result.limit}.`,
      limit: result.limit,
      usage: result.usage,
    };
  }

  return { allowed: true };
}

/**
 * Reset monthly usage (run on first day of month via cron)
 */
export async function resetMonthlyUsage(): Promise<void> {
  // Delete usage records older than 3 months
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  await prisma.cf_usage_tracking.deleteMany({
    where: {
      date: { lt: threeMonthsAgo },
    },
  });
}

/**
 * Get usage report for admin
 */
export async function getUsageReport(
  startDate: Date,
  endDate: Date
): Promise<{
  totalUsers: number;
  byTier: Record<string, { users: number; totalUsage: number }>;
  topFeatures: Array<{ feature: string; usage: number }>;
  limitHits: number;
}> {
  const usage = await prisma.cf_usage_tracking.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  // Count unique users
  const uniqueUsers = new Set(usage.map((u) => u.userId));
  const totalUsers = uniqueUsers.size;

  // Group by tier
  const byTier: Record<string, { users: number; totalUsage: number }> = {};
  usage.forEach((u) => {
    const tier = u.tier || 'free';
    if (!byTier[tier]) {
      byTier[tier] = { users: 0, totalUsage: 0 };
    }
    byTier[tier].totalUsage += u.usageCount;
  });

  // Count users per tier
  const usersByTier = await prisma.cf_usage_tracking.groupBy({
    by: ['tier', 'userId'],
    where: {
      date: { gte: startDate, lte: endDate },
    },
  });

  usersByTier.forEach((u) => {
    const tier = u.tier || 'free';
    if (!byTier[tier]) {
      byTier[tier] = { users: 0, totalUsage: 0 };
    }
    byTier[tier].users++;
  });

  // Top features
  const featureUsage = await prisma.cf_usage_tracking.groupBy({
    by: ['featureName'],
    where: {
      date: { gte: startDate, lte: endDate },
    },
    _sum: {
      usageCount: true,
    },
    orderBy: {
      _sum: {
        usageCount: 'desc',
      },
    },
    take: 10,
  });

  const topFeatures = featureUsage.map((f) => ({
    feature: f.featureName,
    usage: f._sum.usageCount || 0,
  }));

  // Count limit hits
  const limitHits = await prisma.cf_usage_tracking.count({
    where: {
      date: { gte: startDate, lte: endDate },
      limitHit: true,
    },
  });

  return {
    totalUsers,
    byTier,
    topFeatures,
    limitHits,
  };
}
