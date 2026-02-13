/**
 * SEARCH-002: Search Query Engine
 *
 * Full-text search with TF-IDF ranking, filters, facets, and highlighting.
 * Operates on in-memory indexed documents from the SearchIndexManager.
 */

import { tokenize, highlightText } from './utils';
import { SearchIndexManager } from './search-index';
import {
  SearchQuery,
  SearchQuerySchema,
  SearchResult,
  SearchHit,
  FacetBucket,
  SearchFilter,
  IndexField,
  IndexedDocument,
} from './types';

export class SearchQueryEngine {
  constructor(private indexManager: SearchIndexManager) {}

  /**
   * Execute a full-text search query with filtering, ranking, faceting, and highlighting.
   */
  search(input: SearchQuery): SearchResult {
    const startTime = Date.now();
    const query = SearchQuerySchema.parse(input);

    const index = this.indexManager.getIndex(query.indexId);
    if (!index) {
      throw new Error(`Index "${query.indexId}" not found`);
    }

    const allDocs = this.indexManager.getAllDocuments(query.indexId);
    const queryTerms = tokenize(query.query);

    // Determine searchable fields with weights
    const searchableFields = index.fields.filter(f => f.searchable);
    const defaultSearchFields = index.settings?.defaultSearchFields;
    const fieldsToSearch = defaultSearchFields
      ? searchableFields.filter(f => defaultSearchFields.includes(f.name))
      : searchableFields;

    // Score and filter documents
    let scoredDocs = allDocs
      .map(doc => this.scoreDocument(doc, queryTerms, fieldsToSearch, index.settings?.synonyms))
      .filter(scored => scored.score > 0);

    // Apply filters
    if (query.filters && query.filters.length > 0) {
      scoredDocs = scoredDocs.filter(scored =>
        query.filters!.every(filter => this.matchesFilter(scored.doc, filter))
      );
    }

    // Sort
    if (query.sort && query.sort.length > 0) {
      scoredDocs.sort((a, b) => {
        for (const sortSpec of query.sort!) {
          const aVal = a.doc.fields[sortSpec.field];
          const bVal = b.doc.fields[sortSpec.field];
          const cmp = this.compareValues(aVal, bVal);
          if (cmp !== 0) {
            return sortSpec.order === 'asc' ? cmp : -cmp;
          }
        }
        return b.score - a.score;
      });
    } else {
      scoredDocs.sort((a, b) => b.score - a.score);
    }

    const totalHits = scoredDocs.length;

    // Compute facets before pagination
    let facets: Record<string, FacetBucket[]> | undefined;
    if (query.facets && query.facets.length > 0) {
      facets = {};
      for (const facetReq of query.facets) {
        facets[facetReq.field] = this.computeFacet(
          scoredDocs.map(s => s.doc),
          facetReq.field,
          facetReq.size ?? 10,
          facetReq.minCount ?? 1
        );
      }
    }

    // Apply pagination
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 20;
    const paginatedDocs = scoredDocs.slice(offset, offset + limit);

    // Build hits with highlighting
    const hits: SearchHit[] = paginatedDocs.map(scored => {
      const hit: SearchHit = {
        id: scored.doc.id,
        score: scored.score,
        fields: scored.doc.fields,
      };

      if (query.highlight) {
        const highlights: Record<string, string[]> = {};
        for (const field of query.highlight.fields) {
          const fieldValue = scored.doc.fields[field];
          if (typeof fieldValue === 'string') {
            const highlighted = highlightText(
              fieldValue,
              queryTerms,
              query.highlight.preTag ?? '<mark>',
              query.highlight.postTag ?? '</mark>'
            );
            if (highlighted !== fieldValue) {
              highlights[field] = [highlighted];
            }
          }
        }
        if (Object.keys(highlights).length > 0) {
          hit.highlights = highlights;
        }
      }

      return hit;
    });

    const took = Date.now() - startTime;

    return {
      hits,
      totalHits,
      facets,
      took,
      query: query.query,
    };
  }

  /**
   * Score a document against query terms using TF-IDF-like scoring.
   */
  private scoreDocument(
    doc: IndexedDocument,
    queryTerms: string[],
    fields: IndexField[],
    synonyms?: Record<string, string[]>
  ): { doc: IndexedDocument; score: number } {
    if (queryTerms.length === 0) {
      return { doc, score: 1 };
    }

    let totalScore = 0;

    // Expand query terms with synonyms
    const expandedTerms = new Set(queryTerms);
    if (synonyms) {
      for (const term of queryTerms) {
        const syns = synonyms[term];
        if (syns) {
          syns.forEach(s => expandedTerms.add(s.toLowerCase()));
        }
      }
    }

    for (const field of fields) {
      const fieldValue = doc.fields[field.name];
      if (typeof fieldValue !== 'string') continue;

      const fieldTokens = tokenize(fieldValue);
      if (fieldTokens.length === 0) continue;

      let fieldScore = 0;
      for (const term of expandedTerms) {
        const tf = fieldTokens.filter(t => t === term).length / fieldTokens.length;
        if (tf > 0) {
          fieldScore += tf;
        }

        // Partial prefix matching bonus
        const prefixMatches = fieldTokens.filter(t => t.startsWith(term) && t !== term).length;
        if (prefixMatches > 0) {
          fieldScore += (prefixMatches / fieldTokens.length) * 0.5;
        }
      }

      totalScore += fieldScore * (field.weight ?? 1);
    }

    return { doc, score: totalScore };
  }

  /**
   * Check if a document matches a search filter.
   */
  private matchesFilter(doc: IndexedDocument, filter: SearchFilter): boolean {
    const fieldValue = doc.fields[filter.field];

    switch (filter.operator) {
      case 'eq':
        return fieldValue === filter.value;
      case 'neq':
        return fieldValue !== filter.value;
      case 'gt':
        return typeof fieldValue === 'number' && typeof filter.value === 'number' && fieldValue > filter.value;
      case 'gte':
        return typeof fieldValue === 'number' && typeof filter.value === 'number' && fieldValue >= filter.value;
      case 'lt':
        return typeof fieldValue === 'number' && typeof filter.value === 'number' && fieldValue < filter.value;
      case 'lte':
        return typeof fieldValue === 'number' && typeof filter.value === 'number' && fieldValue <= filter.value;
      case 'in':
        return Array.isArray(filter.value) && filter.value.includes(fieldValue);
      case 'nin':
        return Array.isArray(filter.value) && !filter.value.includes(fieldValue);
      case 'exists':
        return filter.value ? fieldValue !== undefined && fieldValue !== null : fieldValue === undefined || fieldValue === null;
      case 'range': {
        if (typeof fieldValue !== 'number' || !filter.value || typeof filter.value !== 'object') return false;
        const range = filter.value as { min?: number; max?: number };
        if (range.min !== undefined && fieldValue < range.min) return false;
        if (range.max !== undefined && fieldValue > range.max) return false;
        return true;
      }
      case 'prefix':
        return typeof fieldValue === 'string' && typeof filter.value === 'string' && fieldValue.startsWith(filter.value);
      default:
        return false;
    }
  }

  /**
   * Compute facet buckets for a given field.
   */
  private computeFacet(
    docs: IndexedDocument[],
    field: string,
    size: number,
    minCount: number
  ): FacetBucket[] {
    const counts = new Map<string | number, number>();

    for (const doc of docs) {
      const value = doc.fields[field];
      if (value === undefined || value === null) continue;

      const key = typeof value === 'number' ? value : String(value);
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    return Array.from(counts.entries())
      .filter(([, count]) => count >= minCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, size)
      .map(([value, count]) => ({ value, count }));
  }

  /**
   * Compare two values for sorting.
   */
  private compareValues(a: unknown, b: unknown): number {
    if (a === b) return 0;
    if (a === undefined || a === null) return -1;
    if (b === undefined || b === null) return 1;

    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }
    if (typeof a === 'string' && typeof b === 'string') {
      return a.localeCompare(b);
    }
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() - b.getTime();
    }

    return String(a).localeCompare(String(b));
  }
}
