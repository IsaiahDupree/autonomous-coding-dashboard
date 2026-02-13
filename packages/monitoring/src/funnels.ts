/**
 * @module funnels
 * AN-002: Cross-Product Funnels.
 * Funnel definition, step tracking, conversion rate calculation, and drop-off analysis.
 */

import {
  FunnelDefinition,
  FunnelDefinitionSchema,
  FunnelEvent,
  FunnelEventSchema,
  FunnelStepMetrics,
  FunnelReport,
  FunnelStep,
} from './types';

/**
 * Funnel Analytics Engine.
 * Define multi-step funnels, track user progression, and calculate conversion metrics.
 *
 * @example
 * ```ts
 * const engine = new FunnelEngine();
 *
 * engine.defineFunnel({
 *   id: 'signup',
 *   name: 'User Signup',
 *   steps: [
 *     { name: 'visit', order: 1 },
 *     { name: 'register', order: 2 },
 *     { name: 'verify_email', order: 3 },
 *     { name: 'complete_profile', order: 4 },
 *   ],
 * });
 *
 * engine.trackEvent({ funnelId: 'signup', stepName: 'visit', userId: 'u1' });
 * engine.trackEvent({ funnelId: 'signup', stepName: 'register', userId: 'u1' });
 *
 * const report = engine.getReport('signup');
 * console.log(report.overallConversionRate);
 * ```
 */
export class FunnelEngine {
  private readonly funnels: Map<string, FunnelDefinition> = new Map();
  private readonly events: FunnelEvent[] = [];

  /** Define a new funnel. */
  defineFunnel(
    params: Omit<FunnelDefinition, 'createdAt'> & { createdAt?: string }
  ): FunnelDefinition {
    const funnel = FunnelDefinitionSchema.parse({
      createdAt: params.createdAt ?? new Date().toISOString(),
      ...params,
    });

    this.funnels.set(funnel.id, funnel);
    return funnel;
  }

  /** Get a funnel definition. */
  getFunnel(funnelId: string): FunnelDefinition | undefined {
    return this.funnels.get(funnelId);
  }

  /** Get all defined funnels. */
  getAllFunnels(): FunnelDefinition[] {
    return Array.from(this.funnels.values());
  }

  /** Track a funnel event. */
  trackEvent(
    params: Omit<FunnelEvent, 'timestamp'> & { timestamp?: string }
  ): FunnelEvent {
    const event = FunnelEventSchema.parse({
      timestamp: params.timestamp ?? new Date().toISOString(),
      ...params,
    });

    const funnel = this.funnels.get(event.funnelId);
    if (!funnel) {
      throw new Error(`Funnel not found: ${event.funnelId}`);
    }

    const validStepNames = funnel.steps.map((s) => s.name);
    if (!validStepNames.includes(event.stepName)) {
      throw new Error(
        `Invalid step "${event.stepName}" for funnel "${event.funnelId}". Valid steps: ${validStepNames.join(', ')}`
      );
    }

    this.events.push(event);
    return event;
  }

  /** Generate a funnel report with conversion rates and drop-off analysis. */
  getReport(
    funnelId: string,
    period?: { start: string; end: string }
  ): FunnelReport {
    const funnel = this.funnels.get(funnelId);
    if (!funnel) {
      throw new Error(`Funnel not found: ${funnelId}`);
    }

    // Filter events
    let events = this.events.filter((e) => e.funnelId === funnelId);
    if (period) {
      const startTime = new Date(period.start).getTime();
      const endTime = new Date(period.end).getTime();
      events = events.filter((e) => {
        const t = new Date(e.timestamp).getTime();
        return t >= startTime && t <= endTime;
      });
    }

    // Sort steps by order
    const sortedSteps = [...funnel.steps].sort((a, b) => a.order - b.order);

    // Build per-step user sets
    const stepUserSets: Map<string, Set<string>> = new Map();
    const stepEventCounts: Map<string, number> = new Map();
    const stepTimestamps: Map<string, Map<string, number>> = new Map(); // step -> userId -> timestamp

    for (const step of sortedSteps) {
      stepUserSets.set(step.name, new Set());
      stepEventCounts.set(step.name, 0);
      stepTimestamps.set(step.name, new Map());
    }

    for (const event of events) {
      const userSet = stepUserSets.get(event.stepName);
      if (userSet) {
        userSet.add(event.userId);
        stepEventCounts.set(
          event.stepName,
          (stepEventCounts.get(event.stepName) ?? 0) + 1
        );

        const tsMap = stepTimestamps.get(event.stepName);
        if (tsMap) {
          const existing = tsMap.get(event.userId);
          const eventTime = new Date(event.timestamp).getTime();
          if (!existing || eventTime < existing) {
            tsMap.set(event.userId, eventTime);
          }
        }
      }
    }

    // Calculate step metrics
    const firstStepUsers = stepUserSets.get(sortedSteps[0]?.name)?.size ?? 0;
    const lastStepUsers = stepUserSets.get(sortedSteps[sortedSteps.length - 1]?.name)?.size ?? 0;

    const stepMetrics: FunnelStepMetrics[] = sortedSteps.map((step, index) => {
      const uniqueUsers = stepUserSets.get(step.name)?.size ?? 0;
      const totalEvents = stepEventCounts.get(step.name) ?? 0;
      const prevUsers = index === 0
        ? uniqueUsers
        : stepUserSets.get(sortedSteps[index - 1].name)?.size ?? 0;

      const conversionRate = prevUsers > 0 ? uniqueUsers / prevUsers : 0;
      const dropOffRate = prevUsers > 0 ? 1 - conversionRate : 0;

      // Calculate avg time from previous step
      let avgTimeFromPreviousMs: number | undefined;
      if (index > 0) {
        const prevStepName = sortedSteps[index - 1].name;
        const prevTsMap = stepTimestamps.get(prevStepName);
        const currentTsMap = stepTimestamps.get(step.name);

        if (prevTsMap && currentTsMap) {
          const deltas: number[] = [];
          for (const [userId, currentTime] of currentTsMap) {
            const prevTime = prevTsMap.get(userId);
            if (prevTime !== undefined && currentTime > prevTime) {
              deltas.push(currentTime - prevTime);
            }
          }
          if (deltas.length > 0) {
            avgTimeFromPreviousMs =
              deltas.reduce((a, b) => a + b, 0) / deltas.length;
          }
        }
      }

      return {
        stepName: step.name,
        uniqueUsers,
        totalEvents,
        conversionRate: Math.round(conversionRate * 10000) / 10000,
        dropOffRate: Math.round(dropOffRate * 10000) / 10000,
        avgTimeFromPreviousMs: avgTimeFromPreviousMs
          ? Math.round(avgTimeFromPreviousMs)
          : undefined,
      };
    });

    const overallConversionRate =
      firstStepUsers > 0 ? lastStepUsers / firstStepUsers : 0;

    const reportPeriod = period ?? {
      start: events.length > 0
        ? events.reduce((min, e) =>
            new Date(e.timestamp).getTime() < new Date(min).getTime()
              ? e.timestamp
              : min,
          events[0].timestamp)
        : new Date().toISOString(),
      end: events.length > 0
        ? events.reduce((max, e) =>
            new Date(e.timestamp).getTime() > new Date(max).getTime()
              ? e.timestamp
              : max,
          events[0].timestamp)
        : new Date().toISOString(),
    };

    return {
      funnelId,
      funnelName: funnel.name,
      period: reportPeriod,
      overallConversionRate: Math.round(overallConversionRate * 10000) / 10000,
      steps: stepMetrics,
      totalEntries: firstStepUsers,
      totalCompletions: lastStepUsers,
    };
  }

  /** Get drop-off analysis between two steps. */
  getDropOffUsers(
    funnelId: string,
    fromStep: string,
    toStep: string
  ): string[] {
    const events = this.events.filter((e) => e.funnelId === funnelId);

    const fromUsers = new Set(
      events.filter((e) => e.stepName === fromStep).map((e) => e.userId)
    );
    const toUsers = new Set(
      events.filter((e) => e.stepName === toStep).map((e) => e.userId)
    );

    return Array.from(fromUsers).filter((u) => !toUsers.has(u));
  }

  /** Clear all events (keeps funnel definitions). */
  clearEvents(): void {
    this.events.length = 0;
  }

  /** Clear everything. */
  clear(): void {
    this.funnels.clear();
    this.events.length = 0;
  }
}
