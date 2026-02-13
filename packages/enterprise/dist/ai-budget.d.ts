/**
 * Token Budget Management (AI-004)
 * Per-request limits, daily budgets, cost tracking per model.
 */
import { TokenBudget } from './types';
export interface CreateBudgetInput {
    id?: string;
    scope: TokenBudget['scope'];
    maxTokens: number;
    maxCostCents: number;
    periodStart?: number;
    periodEnd?: number;
}
export interface BudgetCheckResult {
    allowed: boolean;
    remainingTokens: number;
    remainingCostCents: number;
    usedTokens: number;
    usedCostCents: number;
    reason?: string;
}
export interface ModelCostTracker {
    model: string;
    totalTokens: number;
    totalCostCents: number;
    requestCount: number;
}
/**
 * Manages token budgets with per-request limits, daily/monthly caps,
 * and cost tracking per model.
 */
export declare class TokenBudgetManager {
    private budgets;
    /** model -> cost tracking */
    private modelCosts;
    /** scope key -> budget IDs */
    private scopeIndex;
    /** Create a new token budget */
    createBudget(input: CreateBudgetInput): TokenBudget;
    /** Get a budget by ID */
    getBudget(id: string): TokenBudget | undefined;
    /** Get all budgets */
    getAllBudgets(): TokenBudget[];
    /** Get active budgets for a given scope */
    getActiveBudgets(scope: TokenBudget['scope']): TokenBudget[];
    /**
     * Check if a request is within budget limits.
     * Checks all active budgets for the relevant scopes.
     */
    checkBudget(estimatedTokens: number, estimatedCostCents: number): BudgetCheckResult;
    /**
     * Record token usage against all active budgets.
     */
    recordUsage(tokens: number, costCents: number, model: string): void;
    /** Get cost tracking data for a specific model */
    getModelCosts(model: string): ModelCostTracker | undefined;
    /** Get cost tracking data for all models */
    getAllModelCosts(): ModelCostTracker[];
    /** Reset a specific budget's usage counters */
    resetBudget(budgetId: string): void;
    /** Delete a budget */
    deleteBudget(budgetId: string): boolean;
}
//# sourceMappingURL=ai-budget.d.ts.map