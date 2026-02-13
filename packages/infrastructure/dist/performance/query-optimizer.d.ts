/**
 * PERF-002: Query Optimizer
 *
 * Analyzes database queries, suggests index improvements,
 * detects slow queries, and provides optimization recommendations.
 */
import { QueryAnalysis } from '../types';
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
export declare class QueryOptimizer {
    private slowQueryThresholdMs;
    private maxProfiledQueries;
    private profiles;
    private slowQueryLog;
    constructor(options?: QueryOptimizerOptions);
    /**
     * Analyze a query and return optimization suggestions.
     */
    analyze(query: string): QueryAnalysis;
    /**
     * Record a query execution for profiling.
     */
    recordExecution(query: string, durationMs: number): void;
    /**
     * Get the top N slowest queries by average duration.
     */
    getSlowQueries(limit?: number): QueryProfile[];
    /**
     * Get the most frequently executed queries.
     */
    getFrequentQueries(limit?: number): QueryProfile[];
    /**
     * Get the slow query log.
     */
    getSlowQueryLog(): {
        query: string;
        durationMs: number;
        timestamp: Date;
    }[];
    /**
     * Get index suggestions based on profiled queries.
     */
    getIndexSuggestions(): IndexSuggestion[];
    /**
     * Get all profiled queries.
     */
    getProfiles(): QueryProfile[];
    /**
     * Clear profiling data.
     */
    clear(): void;
    private normalizeQuery;
    private estimateCost;
    private suggestIndexes;
    private optimizeQuery;
    private buildIndexSuggestion;
}
