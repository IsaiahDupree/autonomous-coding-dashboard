/**
 * PERF-002: Query Optimizer
 *
 * Analyzes database queries, suggests index improvements,
 * detects slow queries, and provides optimization recommendations.
 */

import { QueryAnalysis } from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface QueryProfile {
  query: string;
  executionCount: number;
  totalDurationMs: number;
  avgDurationMs: number;
  maxDurationMs: number;
  minDurationMs: number;
  lastExecutedAt: Date;
}

export interface IndexSuggestion {
  table: string;
  columns: string[];
  type: 'btree' | 'hash' | 'gin' | 'gist';
  reason: string;
  estimatedImprovement: string;
}

export interface QueryOptimizerOptions {
  slowQueryThresholdMs?: number;
  maxProfiledQueries?: number;
}

// ── QueryOptimizer ───────────────────────────────────────────────────────────

export class QueryOptimizer {
  private slowQueryThresholdMs: number;
  private maxProfiledQueries: number;
  private profiles: Map<string, QueryProfile> = new Map();
  private slowQueryLog: { query: string; durationMs: number; timestamp: Date }[] = [];

  constructor(options: QueryOptimizerOptions = {}) {
    this.slowQueryThresholdMs = options.slowQueryThresholdMs ?? 500;
    this.maxProfiledQueries = options.maxProfiledQueries ?? 1000;
  }

  /**
   * Analyze a query and return optimization suggestions.
   */
  analyze(query: string): QueryAnalysis {
    const normalized = this.normalizeQuery(query);
    const estimatedCostMs = this.estimateCost(normalized);
    const suggestedIndexes = this.suggestIndexes(normalized);
    const isSlowQuery = estimatedCostMs > this.slowQueryThresholdMs;
    const optimizedQuery = this.optimizeQuery(normalized);

    return {
      query: normalized,
      estimatedCostMs,
      suggestedIndexes,
      isSlowQuery,
      optimizedQuery: optimizedQuery !== normalized ? optimizedQuery : undefined,
    };
  }

  /**
   * Record a query execution for profiling.
   */
  recordExecution(query: string, durationMs: number): void {
    const normalized = this.normalizeQuery(query);
    const existing = this.profiles.get(normalized);

    if (existing) {
      existing.executionCount++;
      existing.totalDurationMs += durationMs;
      existing.avgDurationMs = existing.totalDurationMs / existing.executionCount;
      existing.maxDurationMs = Math.max(existing.maxDurationMs, durationMs);
      existing.minDurationMs = Math.min(existing.minDurationMs, durationMs);
      existing.lastExecutedAt = new Date();
    } else {
      // Evict oldest if at capacity
      if (this.profiles.size >= this.maxProfiledQueries) {
        const oldestKey = this.profiles.keys().next().value;
        if (oldestKey !== undefined) {
          this.profiles.delete(oldestKey);
        }
      }

      this.profiles.set(normalized, {
        query: normalized,
        executionCount: 1,
        totalDurationMs: durationMs,
        avgDurationMs: durationMs,
        maxDurationMs: durationMs,
        minDurationMs: durationMs,
        lastExecutedAt: new Date(),
      });
    }

    // Log slow queries
    if (durationMs > this.slowQueryThresholdMs) {
      this.slowQueryLog.push({
        query: normalized,
        durationMs,
        timestamp: new Date(),
      });

      // Keep only last 500 slow queries
      if (this.slowQueryLog.length > 500) {
        this.slowQueryLog.splice(0, this.slowQueryLog.length - 500);
      }
    }
  }

  /**
   * Get the top N slowest queries by average duration.
   */
  getSlowQueries(limit = 10): QueryProfile[] {
    return Array.from(this.profiles.values())
      .sort((a, b) => b.avgDurationMs - a.avgDurationMs)
      .slice(0, limit);
  }

  /**
   * Get the most frequently executed queries.
   */
  getFrequentQueries(limit = 10): QueryProfile[] {
    return Array.from(this.profiles.values())
      .sort((a, b) => b.executionCount - a.executionCount)
      .slice(0, limit);
  }

  /**
   * Get the slow query log.
   */
  getSlowQueryLog(): { query: string; durationMs: number; timestamp: Date }[] {
    return [...this.slowQueryLog];
  }

  /**
   * Get index suggestions based on profiled queries.
   */
  getIndexSuggestions(): IndexSuggestion[] {
    const suggestions: IndexSuggestion[] = [];
    const seen = new Set<string>();

    for (const profile of this.profiles.values()) {
      if (profile.avgDurationMs < this.slowQueryThresholdMs * 0.5) continue;

      const indexes = this.suggestIndexes(profile.query);
      for (const idx of indexes) {
        if (!seen.has(idx)) {
          seen.add(idx);
          suggestions.push(this.buildIndexSuggestion(profile.query, idx));
        }
      }
    }

    return suggestions;
  }

  /**
   * Get all profiled queries.
   */
  getProfiles(): QueryProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * Clear profiling data.
   */
  clear(): void {
    this.profiles.clear();
    this.slowQueryLog = [];
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  private normalizeQuery(query: string): string {
    return query
      .replace(/\s+/g, ' ')
      .replace(/\(\s+/g, '(')
      .replace(/\s+\)/g, ')')
      .trim();
  }

  private estimateCost(query: string): number {
    let cost = 10; // base cost

    const upper = query.toUpperCase();

    // Full table scan indicators
    if (!upper.includes('WHERE') && (upper.includes('SELECT') || upper.includes('DELETE'))) {
      cost += 500;
    }

    // JOIN complexity
    const joinCount = (upper.match(/\bJOIN\b/g) || []).length;
    cost += joinCount * 100;

    // Subquery penalty
    const subqueryCount = (upper.match(/\bSELECT\b/g) || []).length - 1;
    cost += Math.max(0, subqueryCount) * 200;

    // LIKE with leading wildcard
    if (upper.includes("LIKE '%") || upper.includes("LIKE \"%")) {
      cost += 300;
    }

    // ORDER BY without LIMIT
    if (upper.includes('ORDER BY') && !upper.includes('LIMIT')) {
      cost += 150;
    }

    // GROUP BY
    if (upper.includes('GROUP BY')) {
      cost += 100;
    }

    // DISTINCT
    if (upper.includes('DISTINCT')) {
      cost += 80;
    }

    return cost;
  }

  private suggestIndexes(query: string): string[] {
    const suggestions: string[] = [];
    const upper = query.toUpperCase();

    // Extract WHERE clause columns
    const whereMatch = upper.match(/WHERE\s+(.+?)(?:ORDER BY|GROUP BY|LIMIT|$)/);
    if (whereMatch) {
      const whereCols = whereMatch[1].match(/(\w+)\s*[=<>!]/g);
      if (whereCols) {
        for (const col of whereCols) {
          const colName = col.replace(/\s*[=<>!].*/, '').trim().toLowerCase();
          if (colName && !['and', 'or', 'not', 'in', 'is'].includes(colName)) {
            suggestions.push(colName);
          }
        }
      }
    }

    // Extract ORDER BY columns
    const orderMatch = upper.match(/ORDER BY\s+(\w+)/);
    if (orderMatch) {
      suggestions.push(orderMatch[1].toLowerCase());
    }

    return [...new Set(suggestions)];
  }

  private optimizeQuery(query: string): string {
    let optimized = query;

    // Replace SELECT * with explicit columns hint
    if (optimized.toUpperCase().includes('SELECT *')) {
      optimized = optimized.replace(/SELECT \*/i, 'SELECT * /* Consider selecting specific columns */');
    }

    // Suggest LIMIT for unbounded queries
    if (
      !optimized.toUpperCase().includes('LIMIT') &&
      optimized.toUpperCase().includes('SELECT') &&
      !optimized.toUpperCase().includes('COUNT(')
    ) {
      optimized += ' /* Consider adding LIMIT */';
    }

    return optimized;
  }

  private buildIndexSuggestion(query: string, column: string): IndexSuggestion {
    // Try to extract table name
    const tableMatch = query.match(/FROM\s+(\w+)/i);
    const table = tableMatch ? tableMatch[1] : 'unknown';

    return {
      table,
      columns: [column],
      type: 'btree',
      reason: `Column "${column}" is used in WHERE/ORDER BY clause of a slow query`,
      estimatedImprovement: 'Moderate - could reduce query time by 50-90%',
    };
  }
}
