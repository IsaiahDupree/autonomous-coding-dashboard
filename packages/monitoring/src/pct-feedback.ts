/**
 * @module pct-feedback
 * AN-004: PCT (Performance-Creative-Targeting) Feedback Loop.
 * Analyzes ad performance data and generates creative optimization suggestions.
 */

import {
  AdPerformanceData,
  AdPerformanceDataSchema,
  OptimizationSuggestion,
  OptimizationSuggestionSchema,
} from './types';

/** Thresholds for triggering optimization suggestions. */
export interface PCTThresholds {
  lowCtr: number;       // Below this CTR -> suggest copy/visual changes
  lowCvr: number;       // Below this CVR -> suggest targeting changes
  lowRoas: number;      // Below this ROAS -> suggest budget changes
  highCtr: number;      // Above this CTR is considered good
  highCvr: number;      // Above this CVR is considered good
  highRoas: number;     // Above this ROAS is considered good
}

const DEFAULT_THRESHOLDS: PCTThresholds = {
  lowCtr: 0.01,   // 1%
  lowCvr: 0.02,   // 2%
  lowRoas: 1.0,   // 1x break-even
  highCtr: 0.03,  // 3%
  highCvr: 0.05,  // 5%
  highRoas: 3.0,  // 3x
};

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
export class PCTFeedbackEngine {
  private readonly thresholds: PCTThresholds;
  private readonly performanceData: AdPerformanceData[] = [];
  private readonly suggestions: OptimizationSuggestion[] = [];

  constructor(thresholds?: Partial<PCTThresholds>) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  /** Analyze ad performance and generate optimization suggestions. */
  analyze(data: AdPerformanceData): OptimizationSuggestion[] {
    const validated = AdPerformanceDataSchema.parse(data);
    this.performanceData.push(validated);

    const newSuggestions: OptimizationSuggestion[] = [];

    // Low CTR analysis -> suggest copy/visual improvements
    if (validated.ctr < this.thresholds.lowCtr) {
      newSuggestions.push(
        this.createSuggestion({
          creativeId: validated.creativeId,
          type: 'copy',
          priority: validated.ctr < this.thresholds.lowCtr / 2 ? 'critical' : 'high',
          title: 'Low CTR - Consider refreshing ad copy',
          description: `CTR is ${(validated.ctr * 100).toFixed(2)}%, well below the ${(this.thresholds.lowCtr * 100).toFixed(1)}% threshold. Consider testing new headlines, calls-to-action, or value propositions.`,
          expectedImprovement: this.estimateImprovement(validated.ctr, this.thresholds.highCtr),
          basedOn: `Ad ${validated.adId} performance over ${validated.period.start} to ${validated.period.end}`,
        }),
        this.createSuggestion({
          creativeId: validated.creativeId,
          type: 'visual',
          priority: 'medium',
          title: 'Low CTR - Consider updating visuals',
          description: `With a CTR of ${(validated.ctr * 100).toFixed(2)}%, the creative may not be capturing attention. Test new images, videos, or visual layouts.`,
          expectedImprovement: this.estimateImprovement(validated.ctr, this.thresholds.highCtr),
          basedOn: `Ad ${validated.adId} performance data`,
        })
      );
    }

    // Low CVR analysis -> suggest targeting adjustments
    if (validated.cvr < this.thresholds.lowCvr) {
      newSuggestions.push(
        this.createSuggestion({
          creativeId: validated.creativeId,
          type: 'targeting',
          priority: validated.cvr < this.thresholds.lowCvr / 2 ? 'critical' : 'high',
          title: 'Low CVR - Refine audience targeting',
          description: `CVR is ${(validated.cvr * 100).toFixed(2)}%, below the ${(this.thresholds.lowCvr * 100).toFixed(1)}% threshold. The traffic quality may be low. Consider narrowing the audience or testing different demographics.`,
          expectedImprovement: this.estimateImprovement(validated.cvr, this.thresholds.highCvr),
          basedOn: `Conversion data for ad ${validated.adId}`,
        })
      );
    }

    // Low ROAS analysis -> suggest budget reallocation
    if (validated.roas < this.thresholds.lowRoas) {
      newSuggestions.push(
        this.createSuggestion({
          creativeId: validated.creativeId,
          type: 'budget',
          priority: validated.roas < this.thresholds.lowRoas / 2 ? 'critical' : 'high',
          title: 'Negative ROAS - Review budget allocation',
          description: `ROAS is ${validated.roas.toFixed(2)}x, below break-even (${this.thresholds.lowRoas}x). Consider pausing this creative, reducing spend, or reallocating budget to higher-performing creatives.`,
          expectedImprovement: undefined,
          basedOn: `Revenue vs spend analysis for ad ${validated.adId}`,
        })
      );
    }

    // High impressions but low engagement -> suggest schedule optimization
    if (validated.impressions > 10000 && validated.ctr < this.thresholds.lowCtr) {
      newSuggestions.push(
        this.createSuggestion({
          creativeId: validated.creativeId,
          type: 'schedule',
          priority: 'medium',
          title: 'High impressions, low engagement - Optimize delivery schedule',
          description: `With ${validated.impressions.toLocaleString()} impressions but only ${(validated.ctr * 100).toFixed(2)}% CTR, consider optimizing ad delivery times or dayparting to reach the audience when they are more likely to engage.`,
          expectedImprovement: 15,
          basedOn: `Impression volume and engagement analysis for ad ${validated.adId}`,
        })
      );
    }

    this.suggestions.push(...newSuggestions);
    return newSuggestions;
  }

  /** Get all suggestions, optionally filtered. */
  getSuggestions(filter?: {
    creativeId?: string;
    type?: OptimizationSuggestion['type'];
    priority?: OptimizationSuggestion['priority'];
    status?: OptimizationSuggestion['status'];
  }): OptimizationSuggestion[] {
    let results = [...this.suggestions];

    if (filter) {
      if (filter.creativeId) results = results.filter((s) => s.creativeId === filter.creativeId);
      if (filter.type) results = results.filter((s) => s.type === filter.type);
      if (filter.priority) results = results.filter((s) => s.priority === filter.priority);
      if (filter.status) results = results.filter((s) => s.status === filter.status);
    }

    return results;
  }

  /** Update the status of a suggestion (apply or dismiss). */
  updateSuggestionStatus(
    suggestionId: string,
    status: 'applied' | 'dismissed'
  ): boolean {
    const suggestion = this.suggestions.find((s) => s.id === suggestionId);
    if (!suggestion) return false;
    suggestion.status = status;
    return true;
  }

  /** Get all recorded performance data. */
  getPerformanceData(creativeId?: string): AdPerformanceData[] {
    if (!creativeId) return [...this.performanceData];
    return this.performanceData.filter((d) => d.creativeId === creativeId);
  }

  /** Get the current thresholds. */
  getThresholds(): PCTThresholds {
    return { ...this.thresholds };
  }

  /** Clear all data. */
  clear(): void {
    this.performanceData.length = 0;
    this.suggestions.length = 0;
  }

  private createSuggestion(
    params: Omit<OptimizationSuggestion, 'id' | 'createdAt' | 'status'>
  ): OptimizationSuggestion {
    return OptimizationSuggestionSchema.parse({
      id: `sug_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      status: 'pending',
      ...params,
    });
  }

  private estimateImprovement(current: number, target: number): number {
    if (current === 0) return 100;
    return Math.round(((target - current) / current) * 100);
  }
}
