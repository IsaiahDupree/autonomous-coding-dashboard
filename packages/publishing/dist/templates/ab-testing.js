"use strict";
/**
 * TEMPLATE-003: Template A/B Test Service
 *
 * Manages A/B tests between two template variants, tracking
 * impressions, conversions, and computing statistical results.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateABTestService = void 0;
class TemplateABTestService {
    constructor() {
        this.tests = new Map();
        this.impressions = new Map();
        this.conversions = new Map();
        this.nextId = 1;
    }
    /**
     * Creates a new A/B test between two template variants.
     */
    async createTest(input) {
        const testId = `ab-test-${this.nextId++}`;
        const test = {
            testId,
            templateIdA: input.templateIdA,
            templateIdB: input.templateIdB,
            name: input.name,
            trafficSplit: input.trafficSplit ?? 0.5,
            startedAt: new Date().toISOString(),
            isActive: true,
        };
        this.tests.set(testId, test);
        this.impressions.set(testId, { A: 0, B: 0 });
        this.conversions.set(testId, []);
        return test;
    }
    /**
     * Assigns a variant (A or B) to a user based on the configured
     * traffic split. Also records an impression for the assigned variant.
     */
    async assignVariant(testId, userId) {
        const test = this.tests.get(testId);
        if (!test) {
            throw new Error(`A/B test not found: ${testId}`);
        }
        if (!test.isActive) {
            throw new Error(`A/B test is not active: ${testId}`);
        }
        // Deterministic assignment based on user ID hash
        const hash = this.simpleHash(userId + testId);
        const normalized = (hash % 1000) / 1000;
        const variant = normalized < test.trafficSplit ? 'B' : 'A';
        // Record impression
        const imp = this.impressions.get(testId);
        imp[variant]++;
        const templateId = variant === 'A' ? test.templateIdA : test.templateIdB;
        return { variant, templateId };
    }
    /**
     * Records a conversion event for a specific variant and user.
     */
    async recordConversion(testId, variant, userId, value) {
        const test = this.tests.get(testId);
        if (!test) {
            throw new Error(`A/B test not found: ${testId}`);
        }
        const conversion = {
            testId,
            variant,
            userId,
            convertedAt: new Date().toISOString(),
            value,
        };
        const existing = this.conversions.get(testId);
        existing.push(conversion);
    }
    /**
     * Computes the current results of an A/B test, including
     * conversion rates and a simple winner determination.
     */
    async getResults(testId) {
        const test = this.tests.get(testId);
        if (!test) {
            throw new Error(`A/B test not found: ${testId}`);
        }
        const imp = this.impressions.get(testId);
        const convs = this.conversions.get(testId);
        const conversionsA = convs.filter((c) => c.variant === 'A').length;
        const conversionsB = convs.filter((c) => c.variant === 'B').length;
        const rateA = imp.A > 0 ? conversionsA / imp.A : 0;
        const rateB = imp.B > 0 ? conversionsB / imp.B : 0;
        // Simple confidence calculation using pooled proportion z-test approximation
        const totalImpressions = imp.A + imp.B;
        const totalConversions = conversionsA + conversionsB;
        let confidence = 0;
        let winner = 'inconclusive';
        if (totalImpressions > 0 && totalConversions > 0) {
            const pooledRate = totalConversions / totalImpressions;
            const se = Math.sqrt(pooledRate * (1 - pooledRate) * (1 / Math.max(imp.A, 1) + 1 / Math.max(imp.B, 1)));
            if (se > 0) {
                const zScore = Math.abs(rateA - rateB) / se;
                // Approximate confidence from z-score (simplified)
                confidence = Math.min(1 - Math.exp(-0.5 * zScore * zScore), 0.9999);
                if (confidence >= 0.95) {
                    winner = rateA > rateB ? 'A' : 'B';
                }
            }
        }
        return {
            testId,
            variantA: {
                impressions: imp.A,
                conversions: conversionsA,
                conversionRate: rateA,
            },
            variantB: {
                impressions: imp.B,
                conversions: conversionsB,
                conversionRate: rateB,
            },
            winner,
            confidence,
        };
    }
    /**
     * Ends an active A/B test.
     */
    async endTest(testId) {
        const test = this.tests.get(testId);
        if (!test) {
            throw new Error(`A/B test not found: ${testId}`);
        }
        test.isActive = false;
        test.endedAt = new Date().toISOString();
        return test;
    }
    /**
     * Simple hash function for deterministic variant assignment.
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }
}
exports.TemplateABTestService = TemplateABTestService;
//# sourceMappingURL=ab-testing.js.map