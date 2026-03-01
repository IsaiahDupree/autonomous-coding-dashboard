/**
 * Analytics Service (CF-WC-126, CF-WC-127, CF-WC-128, CF-WC-129, CF-WC-130, CF-WC-133, CF-WC-134, CF-WC-135)
 *
 * Handles:
 * - Event tracking
 * - User behavior funnels
 * - A/B testing
 * - Data exports
 * - Admin analytics
 * - Search analytics
 * - Error rate monitoring
 * - User feedback collection
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// Types
// ============================================

export interface AnalyticsEvent {
  userId?: string;
  sessionId?: string;
  eventName: string;
  eventCategory: string;
  properties?: Record<string, any>;
  timestamp?: Date;
}

export interface FunnelStep {
  name: string;
  eventName: string;
  order: number;
}

export interface FunnelAnalysis {
  funnel: string;
  totalUsers: number;
  steps: Array<{
    name: string;
    users: number;
    conversionRate: number;
    dropOffRate: number;
  }>;
}

export interface ABTest {
  id: string;
  name: string;
  variants: Array<{
    id: string;
    name: string;
    allocation: number; // 0-1
  }>;
  startDate: Date;
  endDate?: Date;
  status: 'draft' | 'running' | 'completed' | 'paused';
}

export interface ABTestResult {
  testId: string;
  variants: Array<{
    id: string;
    name: string;
    users: number;
    conversions: number;
    conversionRate: number;
    confidence?: number;
  }>;
  winner?: string;
  statisticallySignificant: boolean;
}

export interface UserFeedback {
  userId?: string;
  type: 'bug' | 'feature' | 'improvement' | 'praise';
  message: string;
  url?: string;
  metadata?: Record<string, any>;
}

export interface ExportFormat {
  format: 'json' | 'csv';
  startDate?: Date;
  endDate?: Date;
  filters?: Record<string, any>;
}

// ============================================
// Event Tracking (CF-WC-126)
// ============================================

/**
 * Track an analytics event
 */
export async function trackEvent(event: AnalyticsEvent): Promise<void> {
  const {
    userId,
    sessionId,
    eventName,
    eventCategory,
    properties = {},
    timestamp = new Date(),
  } = event;

  await prisma.cf_analytics_events.create({
    data: {
      userId,
      sessionId,
      eventName,
      eventCategory,
      properties,
      timestamp,
    },
  });

  // Check for error events and update error monitoring
  if (eventCategory === 'error') {
    await updateErrorRate(eventName, properties);
  }

  // Track search queries for search analytics
  if (eventCategory === 'search') {
    await trackSearchQuery(eventName, properties);
  }
}

/**
 * Get events for a user
 */
export async function getUserEvents(
  userId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
    eventCategory?: string;
    limit?: number;
  } = {}
): Promise<AnalyticsEvent[]> {
  const { startDate, endDate, eventCategory, limit = 100 } = options;

  const events = await prisma.cf_analytics_events.findMany({
    where: {
      userId,
      ...(startDate && { timestamp: { gte: startDate } }),
      ...(endDate && { timestamp: { lte: endDate } }),
      ...(eventCategory && { eventCategory }),
    },
    orderBy: { timestamp: 'desc' },
    take: limit,
  });

  return events.map((e) => ({
    userId: e.userId || undefined,
    sessionId: e.sessionId || undefined,
    eventName: e.eventName,
    eventCategory: e.eventCategory,
    properties: e.properties as Record<string, any>,
    timestamp: e.timestamp,
  }));
}

/**
 * Get event counts by category
 */
export async function getEventCounts(
  startDate: Date,
  endDate: Date
): Promise<Record<string, number>> {
  const events = await prisma.cf_analytics_events.groupBy({
    by: ['eventCategory'],
    where: {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
    _count: {
      id: true,
    },
  });

  return events.reduce((acc, event) => {
    acc[event.eventCategory] = event._count.id;
    return acc;
  }, {} as Record<string, number>);
}

// ============================================
// User Behavior Funnels (CF-WC-127)
// ============================================

/**
 * Analyze a conversion funnel
 */
export async function analyzeFunnel(
  funnelName: string,
  steps: FunnelStep[],
  startDate: Date,
  endDate: Date
): Promise<FunnelAnalysis> {
  const sortedSteps = [...steps].sort((a, b) => a.order - b.order);

  // Get users who completed each step
  const stepResults = [];
  let previousUsers = new Set<string>();

  for (let i = 0; i < sortedSteps.length; i++) {
    const step = sortedSteps[i];

    const events = await prisma.cf_analytics_events.findMany({
      where: {
        eventName: step.eventName,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
        userId: { not: null },
      },
      select: {
        userId: true,
      },
    });

    const usersAtStep = new Set(events.map((e) => e.userId!).filter(Boolean));

    // For first step, all users count
    // For subsequent steps, only users who completed previous step
    const relevantUsers =
      i === 0
        ? usersAtStep
        : new Set([...usersAtStep].filter((u) => previousUsers.has(u)));

    const totalUsers = i === 0 ? usersAtStep.size : previousUsers.size;
    const conversionRate = totalUsers > 0 ? relevantUsers.size / totalUsers : 0;
    const dropOffRate = 1 - conversionRate;

    stepResults.push({
      name: step.name,
      users: relevantUsers.size,
      conversionRate,
      dropOffRate,
    });

    previousUsers = relevantUsers;
  }

  return {
    funnel: funnelName,
    totalUsers: stepResults[0]?.users || 0,
    steps: stepResults,
  };
}

/**
 * Get predefined funnels for Content Factory
 */
export function getContentFactoryFunnels(): Array<{
  name: string;
  steps: FunnelStep[];
}> {
  return [
    {
      name: 'Content Creation Flow',
      steps: [
        { name: 'Create Dossier', eventName: 'dossier_created', order: 1 },
        { name: 'Generate Scripts', eventName: 'scripts_generated', order: 2 },
        { name: 'Generate Images', eventName: 'images_generated', order: 3 },
        { name: 'Assemble Content', eventName: 'content_assembled', order: 4 },
        { name: 'Publish', eventName: 'content_published', order: 5 },
      ],
    },
    {
      name: 'Publishing to Metrics Flow',
      steps: [
        { name: 'Publish', eventName: 'content_published', order: 1 },
        { name: 'Start Promotion', eventName: 'promotion_started', order: 2 },
        { name: 'Metrics Synced', eventName: 'metrics_synced', order: 3 },
        { name: 'Winner Identified', eventName: 'winner_identified', order: 4 },
      ],
    },
  ];
}

// ============================================
// A/B Testing (CF-WC-128)
// ============================================

/**
 * Create A/B test
 */
export async function createABTest(test: Omit<ABTest, 'id'>): Promise<ABTest> {
  const result = await prisma.cf_ab_tests.create({
    data: {
      name: test.name,
      variants: test.variants as any,
      startDate: test.startDate,
      endDate: test.endDate,
      status: test.status,
    },
  });

  return {
    id: result.id,
    name: result.name,
    variants: result.variants as any,
    startDate: result.startDate,
    endDate: result.endDate || undefined,
    status: result.status as ABTest['status'],
  };
}

/**
 * Assign user to A/B test variant
 */
export function assignVariant(userId: string, test: ABTest): string {
  // Deterministic assignment based on user ID hash
  const hash = hashString(userId);
  const normalized = hash / Number.MAX_SAFE_INTEGER;

  let cumulative = 0;
  for (const variant of test.variants) {
    cumulative += variant.allocation;
    if (normalized <= cumulative) {
      return variant.id;
    }
  }

  return test.variants[test.variants.length - 1].id;
}

/**
 * Get A/B test results
 */
export async function getABTestResults(testId: string): Promise<ABTestResult> {
  const test = await prisma.cf_ab_tests.findUnique({
    where: { id: testId },
  });

  if (!test) {
    throw new Error('Test not found');
  }

  const variants = test.variants as ABTest['variants'];
  const results = [];

  for (const variant of variants) {
    // Get users assigned to this variant
    const assignments = await prisma.cf_ab_test_assignments.findMany({
      where: {
        testId,
        variantId: variant.id,
      },
    });

    // Get conversions for these users
    const conversions = await prisma.cf_analytics_events.count({
      where: {
        userId: { in: assignments.map((a) => a.userId) },
        eventName: 'conversion', // Configurable per test
        timestamp: {
          gte: test.startDate,
          ...(test.endDate && { lte: test.endDate }),
        },
      },
    });

    const conversionRate =
      assignments.length > 0 ? conversions / assignments.length : 0;

    results.push({
      id: variant.id,
      name: variant.name,
      users: assignments.length,
      conversions,
      conversionRate,
    });
  }

  // Calculate statistical significance (simple chi-square test)
  const significanceResult = calculateSignificance(results);

  return {
    testId,
    variants: results,
    winner: significanceResult.winner,
    statisticallySignificant: significanceResult.significant,
  };
}

// ============================================
// Data Export (CF-WC-129)
// ============================================

/**
 * Export user data in JSON or CSV format
 */
export async function exportUserData(
  userId: string,
  format: ExportFormat
): Promise<string> {
  const { format: formatType, startDate, endDate, filters = {} } = format;

  // Get all user data
  const events = await getUserEvents(userId, { startDate, endDate });

  const dossiers = await prisma.cf_product_dossiers.findMany({
    where: { userId },
  });

  const publishedContent = await prisma.cf_published_content.findMany({
    where: {
      assembledContent: {
        dossier: {
          userId,
        },
      },
    },
    include: {
      metrics: true,
    },
  });

  const data = {
    userId,
    exportDate: new Date().toISOString(),
    events,
    dossiers,
    publishedContent,
  };

  if (formatType === 'json') {
    return JSON.stringify(data, null, 2);
  } else {
    // Convert to CSV
    return convertToCSV(data);
  }
}

/**
 * Export analytics data for admin
 */
export async function exportAnalyticsData(
  format: ExportFormat
): Promise<string> {
  const { format: formatType, startDate, endDate } = format;

  const events = await prisma.cf_analytics_events.findMany({
    where: {
      ...(startDate && { timestamp: { gte: startDate } }),
      ...(endDate && { timestamp: { lte: endDate } }),
    },
    orderBy: { timestamp: 'desc' },
  });

  if (formatType === 'json') {
    return JSON.stringify(events, null, 2);
  } else {
    return convertEventsToCSV(events);
  }
}

// ============================================
// Admin Analytics (CF-WC-130)
// ============================================

/**
 * Get admin analytics dashboard data
 */
export async function getAdminAnalytics(
  startDate: Date,
  endDate: Date
): Promise<{
  totalUsers: number;
  activeUsers: number;
  totalEvents: number;
  eventsByCategory: Record<string, number>;
  topEvents: Array<{ eventName: string; count: number }>;
  errorRate: number;
  averageSessionDuration: number;
}> {
  // Total unique users
  const totalUsers = await prisma.cf_analytics_events
    .findMany({
      where: {
        timestamp: { gte: startDate, lte: endDate },
        userId: { not: null },
      },
      distinct: ['userId'],
    })
    .then((events) => events.length);

  // Active users (users with events in date range)
  const activeUsers = totalUsers; // Same as total in this case

  // Total events
  const totalEvents = await prisma.cf_analytics_events.count({
    where: {
      timestamp: { gte: startDate, lte: endDate },
    },
  });

  // Events by category
  const eventsByCategory = await getEventCounts(startDate, endDate);

  // Top events
  const topEventsData = await prisma.cf_analytics_events.groupBy({
    by: ['eventName'],
    where: {
      timestamp: { gte: startDate, lte: endDate },
    },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  });

  const topEvents = topEventsData.map((e) => ({
    eventName: e.eventName,
    count: e._count.id,
  }));

  // Error rate
  const errorEvents = eventsByCategory['error'] || 0;
  const errorRate = totalEvents > 0 ? errorEvents / totalEvents : 0;

  // Average session duration (placeholder - requires session tracking)
  const averageSessionDuration = 0; // TODO: Implement session tracking

  return {
    totalUsers,
    activeUsers,
    totalEvents,
    eventsByCategory,
    topEvents,
    errorRate,
    averageSessionDuration,
  };
}

// ============================================
// Search Analytics (CF-WC-133)
// ============================================

/**
 * Track search query
 */
async function trackSearchQuery(
  query: string,
  metadata: Record<string, any>
): Promise<void> {
  await prisma.cf_search_analytics.create({
    data: {
      query,
      resultsCount: metadata.resultsCount || 0,
      clickedResult: metadata.clickedResult || null,
      timestamp: new Date(),
    },
  });
}

/**
 * Get top search queries
 */
export async function getTopSearchQueries(
  startDate: Date,
  endDate: Date,
  limit: number = 10
): Promise<Array<{ query: string; count: number; avgResults: number }>> {
  const searches = await prisma.cf_search_analytics.groupBy({
    by: ['query'],
    where: {
      timestamp: { gte: startDate, lte: endDate },
    },
    _count: { id: true },
    _avg: { resultsCount: true },
    orderBy: { _count: { id: 'desc' } },
    take: limit,
  });

  return searches.map((s) => ({
    query: s.query,
    count: s._count.id,
    avgResults: s._avg.resultsCount || 0,
  }));
}

/**
 * Get zero-result searches (opportunities for improvement)
 */
export async function getZeroResultSearches(
  startDate: Date,
  endDate: Date
): Promise<Array<{ query: string; count: number }>> {
  const searches = await prisma.cf_search_analytics.groupBy({
    by: ['query'],
    where: {
      timestamp: { gte: startDate, lte: endDate },
      resultsCount: 0,
    },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  return searches.map((s) => ({
    query: s.query,
    count: s._count.id,
  }));
}

// ============================================
// Error Rate Monitoring (CF-WC-134)
// ============================================

/**
 * Update error rate tracking
 */
async function updateErrorRate(
  errorType: string,
  details: Record<string, any>
): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.cf_error_tracking.upsert({
    where: {
      date_errorType: {
        date: today,
        errorType,
      },
    },
    update: {
      count: { increment: 1 },
      lastOccurrence: new Date(),
      details: details,
    },
    create: {
      date: today,
      errorType,
      count: 1,
      lastOccurrence: new Date(),
      details,
    },
  });
}

/**
 * Get error rates
 */
export async function getErrorRates(
  startDate: Date,
  endDate: Date
): Promise<
  Array<{
    date: Date;
    errorType: string;
    count: number;
    lastOccurrence: Date;
  }>
> {
  const errors = await prisma.cf_error_tracking.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: [{ date: 'desc' }, { count: 'desc' }],
  });

  return errors;
}

/**
 * Get error spike alerts (errors > 2x average)
 */
export async function getErrorSpikes(days: number = 7): Promise<
  Array<{
    errorType: string;
    currentCount: number;
    averageCount: number;
    spikeMultiplier: number;
  }>
> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const errors = await prisma.cf_error_tracking.groupBy({
    by: ['errorType'],
    where: {
      date: { gte: startDate, lte: endDate },
    },
    _sum: { count: true },
    _avg: { count: true },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const spikes = [];

  for (const error of errors) {
    const todayCount = await prisma.cf_error_tracking.findUnique({
      where: {
        date_errorType: {
          date: today,
          errorType: error.errorType,
        },
      },
    });

    if (todayCount && error._avg.count) {
      const spikeMultiplier = todayCount.count / error._avg.count;
      if (spikeMultiplier > 2) {
        spikes.push({
          errorType: error.errorType,
          currentCount: todayCount.count,
          averageCount: error._avg.count,
          spikeMultiplier,
        });
      }
    }
  }

  return spikes;
}

// ============================================
// User Feedback (CF-WC-135)
// ============================================

/**
 * Submit user feedback
 */
export async function submitFeedback(
  feedback: UserFeedback
): Promise<{ id: string }> {
  const result = await prisma.cf_user_feedback.create({
    data: {
      userId: feedback.userId,
      type: feedback.type,
      message: feedback.message,
      url: feedback.url,
      metadata: feedback.metadata || {},
      timestamp: new Date(),
      status: 'new',
    },
  });

  return { id: result.id };
}

/**
 * Get feedback for admin review
 */
export async function getFeedback(options: {
  type?: UserFeedback['type'];
  status?: 'new' | 'reviewing' | 'resolved';
  limit?: number;
}): Promise<UserFeedback[]> {
  const { type, status = 'new', limit = 50 } = options;

  const feedback = await prisma.cf_user_feedback.findMany({
    where: {
      ...(type && { type }),
      status,
    },
    orderBy: { timestamp: 'desc' },
    take: limit,
  });

  return feedback.map((f) => ({
    userId: f.userId || undefined,
    type: f.type as UserFeedback['type'],
    message: f.message,
    url: f.url || undefined,
    metadata: f.metadata as Record<string, any>,
  }));
}

/**
 * Update feedback status
 */
export async function updateFeedbackStatus(
  feedbackId: string,
  status: 'new' | 'reviewing' | 'resolved'
): Promise<void> {
  await prisma.cf_user_feedback.update({
    where: { id: feedbackId },
    data: { status },
  });
}

// ============================================
// Helper Functions
// ============================================

/**
 * Simple string hash function
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Calculate statistical significance for A/B test
 */
function calculateSignificance(
  variants: Array<{
    users: number;
    conversions: number;
    conversionRate: number;
  }>
): { significant: boolean; winner?: string } {
  if (variants.length !== 2) {
    return { significant: false };
  }

  const [control, variant] = variants;

  // Need minimum sample size
  if (control.users < 100 || variant.users < 100) {
    return { significant: false };
  }

  // Chi-square test (simplified)
  const p1 = control.conversionRate;
  const p2 = variant.conversionRate;
  const n1 = control.users;
  const n2 = variant.users;

  const pooled = (control.conversions + variant.conversions) / (n1 + n2);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2));
  const z = Math.abs(p1 - p2) / se;

  // Z-score > 1.96 corresponds to 95% confidence
  const significant = z > 1.96;

  return {
    significant,
    winner: significant ? (p2 > p1 ? variant.id : control.id) : undefined,
  };
}

/**
 * Convert data to CSV format
 */
function convertToCSV(data: any): string {
  // Flatten events
  const rows = [
    ['Type', 'ID', 'Name', 'Date', 'Value'].join(','),
    ...data.events.map((e: any) =>
      [
        'Event',
        e.sessionId || '',
        e.eventName,
        e.timestamp,
        JSON.stringify(e.properties),
      ].join(',')
    ),
  ];

  return rows.join('\n');
}

/**
 * Convert events to CSV format
 */
function convertEventsToCSV(events: any[]): string {
  const headers = ['Timestamp', 'User ID', 'Event Name', 'Category', 'Properties'];
  const rows = [
    headers.join(','),
    ...events.map((e) =>
      [
        e.timestamp,
        e.userId || '',
        e.eventName,
        e.eventCategory,
        JSON.stringify(e.properties),
      ]
        .map((v) => `"${v}"`)
        .join(',')
    ),
  ];

  return rows.join('\n');
}
