/**
 * TEMPLATE-003: Template A/B Test Service
 *
 * Manages A/B tests between two template variants, tracking
 * impressions, conversions, and computing statistical results.
 */
import type { ABTestConfig, ABTestResults } from '../types';
export declare class TemplateABTestService {
    private readonly tests;
    private readonly impressions;
    private readonly conversions;
    private nextId;
    /**
     * Creates a new A/B test between two template variants.
     */
    createTest(input: {
        templateIdA: string;
        templateIdB: string;
        name: string;
        trafficSplit?: number;
    }): Promise<ABTestConfig>;
    /**
     * Assigns a variant (A or B) to a user based on the configured
     * traffic split. Also records an impression for the assigned variant.
     */
    assignVariant(testId: string, userId: string): Promise<{
        variant: 'A' | 'B';
        templateId: string;
    }>;
    /**
     * Records a conversion event for a specific variant and user.
     */
    recordConversion(testId: string, variant: 'A' | 'B', userId: string, value?: number): Promise<void>;
    /**
     * Computes the current results of an A/B test, including
     * conversion rates and a simple winner determination.
     */
    getResults(testId: string): Promise<ABTestResults>;
    /**
     * Ends an active A/B test.
     */
    endTest(testId: string): Promise<ABTestConfig>;
    /**
     * Simple hash function for deterministic variant assignment.
     */
    private simpleHash;
}
//# sourceMappingURL=ab-testing.d.ts.map