/**
 * @module funnels
 * AN-002: Cross-Product Funnels.
 * Funnel definition, step tracking, conversion rate calculation, and drop-off analysis.
 */
import { FunnelDefinition, FunnelEvent, FunnelReport } from './types';
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
export declare class FunnelEngine {
    private readonly funnels;
    private readonly events;
    /** Define a new funnel. */
    defineFunnel(params: Omit<FunnelDefinition, 'createdAt'> & {
        createdAt?: string;
    }): FunnelDefinition;
    /** Get a funnel definition. */
    getFunnel(funnelId: string): FunnelDefinition | undefined;
    /** Get all defined funnels. */
    getAllFunnels(): FunnelDefinition[];
    /** Track a funnel event. */
    trackEvent(params: Omit<FunnelEvent, 'timestamp'> & {
        timestamp?: string;
    }): FunnelEvent;
    /** Generate a funnel report with conversion rates and drop-off analysis. */
    getReport(funnelId: string, period?: {
        start: string;
        end: string;
    }): FunnelReport;
    /** Get drop-off analysis between two steps. */
    getDropOffUsers(funnelId: string, fromStep: string, toStep: string): string[];
    /** Clear all events (keeps funnel definitions). */
    clearEvents(): void;
    /** Clear everything. */
    clear(): void;
}
//# sourceMappingURL=funnels.d.ts.map