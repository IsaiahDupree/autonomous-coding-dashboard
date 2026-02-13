/**
 * Token Budget Management (AI-004)
 * Per-request limits, daily budgets, cost tracking per model.
 */

import { TokenBudget, TokenBudgetSchema } from './types';

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

let budgetIdCounter = 0;

/**
 * Manages token budgets with per-request limits, daily/monthly caps,
 * and cost tracking per model.
 */
export class TokenBudgetManager {
  private budgets: Map<string, TokenBudget> = new Map();
  /** model -> cost tracking */
  private modelCosts: Map<string, ModelCostTracker> = new Map();
  /** scope key -> budget IDs */
  private scopeIndex: Map<string, string[]> = new Map();

  /** Create a new token budget */
  createBudget(input: CreateBudgetInput): TokenBudget {
    budgetIdCounter++;
    const id = input.id ?? `budget_${budgetIdCounter}`;
    const now = Date.now();

    let periodStart = input.periodStart ?? now;
    let periodEnd: number;

    if (input.periodEnd) {
      periodEnd = input.periodEnd;
    } else {
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

    const budget = TokenBudgetSchema.parse({
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
    this.scopeIndex.get(scopeKey)!.push(id);

    return budget;
  }

  /** Get a budget by ID */
  getBudget(id: string): TokenBudget | undefined {
    return this.budgets.get(id);
  }

  /** Get all budgets */
  getAllBudgets(): TokenBudget[] {
    return Array.from(this.budgets.values());
  }

  /** Get active budgets for a given scope */
  getActiveBudgets(scope: TokenBudget['scope']): TokenBudget[] {
    const now = Date.now();
    const ids = this.scopeIndex.get(scope) ?? [];
    return ids
      .map(id => this.budgets.get(id))
      .filter((b): b is TokenBudget => b !== undefined && b.periodEnd > now);
  }

  /**
   * Check if a request is within budget limits.
   * Checks all active budgets for the relevant scopes.
   */
  checkBudget(estimatedTokens: number, estimatedCostCents: number): BudgetCheckResult {
    const now = Date.now();

    // Check daily budgets
    const dailyBudgets = this.getActiveBudgets('daily');
    for (const budget of dailyBudgets) {
      if (now < budget.periodStart || now > budget.periodEnd) continue;

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
      if (now < budget.periodStart || now > budget.periodEnd) continue;

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
    const allActive = [...dailyBudgets, ...monthlyBudgets].filter(
      b => now >= b.periodStart && now <= b.periodEnd,
    );
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
  recordUsage(tokens: number, costCents: number, model: string): void {
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
    const tracker = this.modelCosts.get(model)!;
    tracker.totalTokens += tokens;
    tracker.totalCostCents += costCents;
    tracker.requestCount++;
  }

  /** Get cost tracking data for a specific model */
  getModelCosts(model: string): ModelCostTracker | undefined {
    return this.modelCosts.get(model);
  }

  /** Get cost tracking data for all models */
  getAllModelCosts(): ModelCostTracker[] {
    return Array.from(this.modelCosts.values());
  }

  /** Reset a specific budget's usage counters */
  resetBudget(budgetId: string): void {
    const budget = this.budgets.get(budgetId);
    if (budget) {
      budget.usedTokens = 0;
      budget.usedCostCents = 0;
    }
  }

  /** Delete a budget */
  deleteBudget(budgetId: string): boolean {
    const budget = this.budgets.get(budgetId);
    if (!budget) return false;

    // Remove from scope index
    const scopeIds = this.scopeIndex.get(budget.scope);
    if (scopeIds) {
      const idx = scopeIds.indexOf(budgetId);
      if (idx >= 0) scopeIds.splice(idx, 1);
    }

    return this.budgets.delete(budgetId);
  }
}
