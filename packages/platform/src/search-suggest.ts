/**
 * SEARCH-003: Search Suggestions
 *
 * Autocomplete, fuzzy matching, and popular query tracking.
 */

import { levenshteinDistance, tokenize } from './utils';
import { SearchIndexManager } from './search-index';
import {
  SearchSuggestion,
  SuggestionRequest,
  SuggestionRequestSchema,
  PopularQuery,
} from './types';

export class SearchSuggestionEngine {
  private popularQueries: Map<string, PopularQuery> = new Map();
  private recentQueries: Map<string, string[]> = new Map(); // userId -> queries

  constructor(private indexManager: SearchIndexManager) {}

  /**
   * Get search suggestions for a given prefix, combining autocomplete,
   * fuzzy matching, and popular queries.
   */
  suggest(input: SuggestionRequest): SearchSuggestion[] {
    const request = SuggestionRequestSchema.parse(input);
    const index = this.indexManager.getIndex(request.indexId);
    if (!index) {
      throw new Error(`Index "${request.indexId}" not found`);
    }

    const suggestions: SearchSuggestion[] = [];
    const types = request.types ?? ['autocomplete', 'fuzzy', 'popular'];
    const prefix = request.prefix.toLowerCase();
    const limit = request.limit ?? 10;

    // Collect all unique terms from the index
    const allTerms = this.collectIndexTerms(request.indexId);

    if (types.includes('autocomplete')) {
      const autocompleteSuggestions = this.getAutocompleteSuggestions(allTerms, prefix, limit);
      suggestions.push(...autocompleteSuggestions);
    }

    if (types.includes('fuzzy')) {
      const fuzzySuggestions = this.getFuzzySuggestions(
        allTerms,
        prefix,
        request.fuzzyMaxEdits ?? 2,
        limit
      );
      suggestions.push(...fuzzySuggestions);
    }

    if (types.includes('popular')) {
      const popularSuggestions = this.getPopularSuggestions(prefix, limit);
      suggestions.push(...popularSuggestions);
    }

    if (types.includes('recent')) {
      // No user context here, but we can track via recordQuery
    }

    // Deduplicate and sort by score
    const seen = new Set<string>();
    const uniqueSuggestions = suggestions.filter(s => {
      const key = s.text.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    uniqueSuggestions.sort((a, b) => b.score - a.score);
    return uniqueSuggestions.slice(0, limit);
  }

  /**
   * Record a search query for popularity tracking.
   */
  recordQuery(query: string, userId?: string): void {
    const normalized = query.toLowerCase().trim();
    if (normalized.length === 0) return;

    const existing = this.popularQueries.get(normalized);
    if (existing) {
      this.popularQueries.set(normalized, {
        ...existing,
        count: existing.count + 1,
        lastSearchedAt: new Date(),
      });
    } else {
      this.popularQueries.set(normalized, {
        query: normalized,
        count: 1,
        lastSearchedAt: new Date(),
      });
    }

    if (userId) {
      const userRecent = this.recentQueries.get(userId) ?? [];
      userRecent.unshift(normalized);
      // Keep only last 100
      if (userRecent.length > 100) userRecent.length = 100;
      this.recentQueries.set(userId, userRecent);
    }
  }

  /**
   * Get popular queries, optionally filtered by prefix.
   */
  getPopularQueries(limit: number = 10, prefix?: string): PopularQuery[] {
    let queries = Array.from(this.popularQueries.values());
    if (prefix) {
      const lowerPrefix = prefix.toLowerCase();
      queries = queries.filter(q => q.query.startsWith(lowerPrefix));
    }
    return queries
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get recent queries for a specific user.
   */
  getRecentQueries(userId: string, limit: number = 10): string[] {
    const recent = this.recentQueries.get(userId) ?? [];
    return recent.slice(0, limit);
  }

  /**
   * Clear popular query stats.
   */
  clearPopularQueries(): void {
    this.popularQueries.clear();
  }

  /**
   * Collect all unique terms from an index's documents.
   */
  private collectIndexTerms(indexId: string): Set<string> {
    const terms = new Set<string>();
    const docs = this.indexManager.getAllDocuments(indexId);
    const index = this.indexManager.getIndex(indexId);
    if (!index) return terms;

    const searchableFields = index.fields.filter(f => f.searchable);
    const stopWords = new Set(index.settings?.stopWords ?? []);

    for (const doc of docs) {
      for (const field of searchableFields) {
        const value = doc.fields[field.name];
        if (typeof value === 'string') {
          const tokens = tokenize(value);
          for (const token of tokens) {
            if (!stopWords.has(token) && token.length > 1) {
              terms.add(token);
            }
          }
        }
      }
    }

    return terms;
  }

  /**
   * Get autocomplete suggestions based on prefix matching.
   */
  private getAutocompleteSuggestions(
    terms: Set<string>,
    prefix: string,
    limit: number
  ): SearchSuggestion[] {
    const results: SearchSuggestion[] = [];

    for (const term of terms) {
      if (term.startsWith(prefix) && term !== prefix) {
        // Score based on how much of the term the prefix covers
        const score = prefix.length / term.length;
        results.push({
          text: term,
          type: 'autocomplete',
          score: Math.min(score + 0.3, 1), // boost autocomplete
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  /**
   * Get fuzzy matching suggestions using Levenshtein distance.
   */
  private getFuzzySuggestions(
    terms: Set<string>,
    prefix: string,
    maxEdits: number,
    limit: number
  ): SearchSuggestion[] {
    const results: SearchSuggestion[] = [];

    for (const term of terms) {
      if (term === prefix) continue;
      if (term.startsWith(prefix)) continue; // Already covered by autocomplete

      const distance = levenshteinDistance(prefix, term);
      if (distance <= maxEdits && distance > 0) {
        const maxLen = Math.max(prefix.length, term.length);
        const score = 1 - (distance / maxLen);
        results.push({
          text: term,
          type: 'fuzzy',
          score: Math.max(score * 0.8, 0), // slightly lower weight than autocomplete
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  /**
   * Get popular query suggestions matching prefix.
   */
  private getPopularSuggestions(prefix: string, limit: number): SearchSuggestion[] {
    const popular = this.getPopularQueries(limit * 2, prefix);
    const maxCount = popular.length > 0 ? popular[0].count : 1;

    return popular.slice(0, limit).map(pq => ({
      text: pq.query,
      type: 'popular' as const,
      score: (pq.count / maxCount) * 0.7, // capped score for popular
      frequency: pq.count,
    }));
  }
}
