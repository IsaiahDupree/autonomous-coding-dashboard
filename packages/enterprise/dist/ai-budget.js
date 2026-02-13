"use strict";
/**
 * Token Budget Management (AI-004)
 * Per-request limits, daily budgets, cost tracking per model.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenBudgetManager = void 0;
const types_1 = require("./types");
let budgetIdCounter = 0;
/**
 * Manages token budgets with per-request limits, daily/monthly caps,
 * and cost tracking per model.
 */
class TokenBudgetManager {
    constructor() {
        this.budgets = new Map();
        /** model -> cost tracking */
        this.modelCosts = new Map();
        /** scope key -> budget IDs */
        this.scopeIndex = new Map();
    }
    /** Create a new token budget */
    createBudget(input) {
        budgetIdCounter++;
        const id = input.id ?? `budget_${budgetIdCounter}`;
        const now = Date.now();
        let periodStart = input.periodStart ?? now;
        let periodEnd;
        if (input.periodEnd) {
            periodEnd = input.periodEnd;
        }
        else {
            switch (input.scope) {
                case 'request':
                    periodEnd = periodStart + 60 * 1000; // 1 minute for request scope
                    break;
                case 'daily':
                    periodEnd = periodStart + 24 * 60 * 60 * 1000;
                    break;
                case 'monthly':
                    periodEnd = periodStart + 30 * 24 * 60 * 60 * 1000;
                    break;
            }
        }
        const budget = types_1.TokenBudgetSchema.parse({
            id,
            scope: input.scope,
            maxTokens: input.maxTokens,
            maxCostCents: input.maxCostCents,
            usedTokens: 0,
            usedCostCents: 0,
            periodStart,
            periodEnd,
        });
        this.budgets.set(id, budget);
        // Index by scope
        const scopeKey = input.scope;
        if (!this.scopeIndex.has(scopeKey)) {
            this.scopeIndex.set(scopeKey, []);
        }
        this.scopeIndex.get(scopeKey).push(id);
        return budget;
    }
    /** Get a budget by ID */
    getBudget(id) {
        return this.budgets.get(id);
    }
    /** Get all budgets */
    getAllBudgets() {
        return Array.from(this.budgets.values());
    }
    /** Get active budgets for a given scope */
    getActiveBudgets(scope) {
        const now = Date.now();
        const ids = this.scopeIndex.get(scope) ?? [];
        return ids
            .map(id => this.budgets.get(id))
            .filter((b) => b !== undefined && b.periodEnd > now);
    }
    /**
     * Check if a request is within budget limits.
     * Checks all active budgets for the relevant scopes.
     */
    checkBudget(estimatedTokens, estimatedCostCents) {
        const now = Date.now();
        // Check daily budgets
        const dailyBudgets = this.getActiveBudgets('daily');
        for (const budget of dailyBudgets) {
            if (now < budget.periodStart || now > budget.periodEnd)
                continue;
            if (budget.usedTokens + estimatedTokens > budget.maxTokens) {
                return {
                    allowed: false,
                    remainingTokens: Math.max(0, budget.maxTokens - budget.usedTokens),
                    remainingCostCents: Math.max(0, budget.maxCostCents - budget.usedCostCents),
                    usedTokens: budget.usedTokens,
                    usedCostCents: budget.usedCostCents,
                    reason: `Daily token budget exceeded (${budget.usedTokens}/${budget.maxTokens} tokens used)`,
                };
            }
            if (budget.usedCostCents + estimatedCostCents > budget.maxCostCents) {
                return {
                    allowed: false,
                    remainingTokens: Math.max(0, budget.maxTokens - budget.usedTokens),
                    remainingCostCents: Math.max(0, budget.maxCostCents - budget.usedCostCents),
                    usedTokens: budget.usedTokens,
                    usedCostCents: budget.usedCostCents,
                    reason: `Daily cost budget exceeded (${budget.usedCostCents}/${budget.maxCostCents} cents used)`,
                };
            }
        }
        // Check monthly budgets
        const monthlyBudgets = this.getActiveBudgets('monthly');
        for (const budget of monthlyBudgets) {
            if (now < budget.periodStart || now > budget.periodEnd)
                continue;
            if (budget.usedTokens + estimatedTokens > budget.maxTokens) {
                return {
                    allowed: false,
                    remainingTokens: Math.max(0, budget.maxTokens - budget.usedTokens),
                    remainingCostCents: Math.max(0, budget.maxCostCents - budget.usedCostCents),
                    usedTokens: budget.usedTokens,
                    usedCostCents: budget.usedCostCents,
                    reason: `Monthly token budget exceeded`,
                };
            }
            if (budget.usedCostCents + estimatedCostCents > budget.maxCostCents) {
                return {
                    allowed: false,
                    remainingTokens: Math.max(0, budget.maxTokens - budget.usedTokens),
                    remainingCostCents: Math.max(0, budget.maxCostCents - budget.usedCostCents),
                    usedTokens: budget.usedTokens,
                    usedCostCents: budget.usedCostCents,
                    reason: `Monthly cost budget exceeded`,
                };
            }
        }
        // Find the most constrained budget for remaining values
        const allActive = [...dailyBudgets, ...monthlyBudgets].filter(b => now >= b.periodStart && now <= b.periodEnd);
        const minRemainingTokens = allActive.length > 0
            ? Math.min(...allActive.map(b => b.maxTokens - b.usedTokens))
            : Infinity;
        const minRemainingCost = allActive.length > 0
            ? Math.min(...allActive.map(b => b.maxCostCents - b.usedCostCents))
            : Infinity;
        return {
            allowed: true,
            remainingTokens: minRemainingTokens === Infinity ? -1 : minRemainingTokens,
            remainingCostCents: minRemainingCost === Infinity ? -1 : minRemainingCost,
            usedTokens: allActive.reduce((sum, b) => sum + b.usedTokens, 0),
            usedCostCents: allActive.reduce((sum, b) => sum + b.usedCostCents, 0),
        };
    }
    /**
     * Record token usage against all active budgets.
     */
    recordUsage(tokens, costCents, model) {
        const now = Date.now();
        // Update all active budgets
        for (const budget of this.budgets.values()) {
            if (now >= budget.periodStart && now <= budget.periodEnd) {
                budget.usedTokens += tokens;
                budget.usedCostCents += costCents;
            }
        }
        // Track per-model costs
        if (!this.modelCosts.has(model)) {
            this.modelCosts.set(model, {
                model,
                totalTokens: 0,
                totalCostCents: 0,
                requestCount: 0,
            });
        }
        const tracker = this.modelCosts.get(model);
        tracker.totalTokens += tokens;
        tracker.totalCostCents += costCents;
        tracker.requestCount++;
    }
    /** Get cost tracking data for a specific model */
    getModelCosts(model) {
        return this.modelCosts.get(model);
    }
    /** Get cost tracking data for all models */
    getAllModelCosts() {
        return Array.from(this.modelCosts.values());
    }
    /** Reset a specific budget's usage counters */
    resetBudget(budgetId) {
        const budget = this.budgets.get(budgetId);
        if (budget) {
            budget.usedTokens = 0;
            budget.usedCostCents = 0;
        }
    }
    /** Delete a budget */
    deleteBudget(budgetId) {
        const budget = this.budgets.get(budgetId);
        if (!budget)
            return false;
        // Remove from scope index
        const scopeIds = this.scopeIndex.get(budget.scope);
        if (scopeIds) {
            const idx = scopeIds.indexOf(budgetId);
            if (idx >= 0)
                scopeIds.splice(idx, 1);
        }
        return this.budgets.delete(budgetId);
    }
}
exports.TokenBudgetManager = TokenBudgetManager;
//# sourceMappingURL=ai-budget.js.map