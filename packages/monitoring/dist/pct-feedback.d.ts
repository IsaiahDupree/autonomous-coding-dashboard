/**
 * @module pct-feedback
 * AN-004: PCT (Performance-Creative-Targeting) Feedback Loop.
 * Analyzes ad performance data and generates creative optimization suggestions.
 */
import { AdPerformanceData, OptimizationSuggestion } from './types';
/** Thresholds for triggering optimization suggestions. */
export interface PCTThresholds {
    lowCtr: number;
    lowCvr: number;
    lowRoas: number;
    highCtr: number;
    highCvr: number;
    highRoas: number;
}
/**
 * PCT Feedback Loop Engine.
 * Ingests ad performance data and generates actionable creative optimization suggestions.
 *
 * @example
 * ```ts
 * const pct = new PCTFeedbackEngine();
 *
 * const suggestions = pct.analyze({
 *   adId: 'ad-1',
 *   creativeId: 'cr-1',
 *   campaignId: 'camp-1',
 *   impressions: 50000,
 *   clicks: 200,
 *   conversions: 5,
 *   spend: 500,
 *   ctr: 0.004,
 *   cvr: 0.025,
 *   roas: 0.5,
 *   period: { start: '2024-01-01', end: '2024-01-07' },
 * });
 *
 * for (const suggestion of suggestions) {
 *   console.log(`[${suggestion.priority}] ${suggestion.title}: ${suggestion.description}`);
 * }
 * ```
 */
export declare class PCTFeedbackEngine {
    private readonly thresholds;
    private readonly performanceData;
    private readonly suggestions;
    constructor(thresholds?: Partial<PCTThresholds>);
    /** Analyze ad performance and generate optimization suggestions. */
    analyze(data: AdPerformanceData): OptimizationSuggestion[];
    /** Get all suggestions, optionally filtered. */
    getSuggestions(filter?: {
        creativeId?: string;
        type?: OptimizationSuggestion['type'];
        priority?: OptimizationSuggestion['priority'];
        status?: OptimizationSuggestion['status'];
    }): OptimizationSuggestion[];
    /** Update the status of a suggestion (apply or dismiss). */
    updateSuggestionStatus(suggestionId: string, status: 'applied' | 'dismissed'): boolean;
    /** Get all recorded performance data. */
    getPerformanceData(creativeId?: string): AdPerformanceData[];
    /** Get the current thresholds. */
    getThresholds(): PCTThresholds;
    /** Clear all data. */
    clear(): void;
    private createSuggestion;
    private estimateImprovement;
}
//# sourceMappingURL=pct-feedback.d.ts.map