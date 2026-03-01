/**
 * Content Factory Search/Filter Integration Tests
 * Feature: CF-WC-010 - Integration tests for search/filter
 *
 * Tests:
 * - Text search
 * - Filters (awareness level, status, platform)
 * - Pagination
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ============================================
// MOCK DATA STRUCTURES
// ============================================

interface AssembledContent {
  id: string;
  dossierId: string;
  title: string;
  description: string;
  awarenessLevel: number;
  status: 'draft' | 'published' | 'archived';
  platform: 'tiktok' | 'instagram' | 'facebook';
  createdAt: Date;
  views?: number;
  likes?: number;
}

interface SearchFilters {
  search?: string;
  awarenessLevel?: number;
  status?: string;
  platform?: string;
  minViews?: number;
  dateFrom?: Date;
  dateTo?: Date;
}

interface PaginationParams {
  page: number;
  pageSize: number;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================
// SEARCH/FILTER SERVICE MOCK
// ============================================

class SearchFilterService {
  private content: AssembledContent[];

  constructor(content: AssembledContent[]) {
    this.content = content;
  }

  // Text Search
  search(query: string, fields: string[] = ['title', 'description']): AssembledContent[] {
    if (!query || query.trim() === '') {
      return this.content;
    }

    const lowerQuery = query.toLowerCase();
    return this.content.filter(item => {
      return fields.some(field => {
        const value = (item as any)[field];
        return value && value.toLowerCase().includes(lowerQuery);
      });
    });
  }

  // Filter by awareness level
  filterByAwarenessLevel(level: number): AssembledContent[] {
    return this.content.filter(item => item.awarenessLevel === level);
  }

  // Filter by status
  filterByStatus(status: string): AssembledContent[] {
    return this.content.filter(item => item.status === status);
  }

  // Filter by platform
  filterByPlatform(platform: string): AssembledContent[] {
    return this.content.filter(item => item.platform === platform);
  }

  // Filter by performance metrics
  filterByMinViews(minViews: number): AssembledContent[] {
    return this.content.filter(item => (item.views || 0) >= minViews);
  }

  // Filter by date range
  filterByDateRange(from: Date, to: Date): AssembledContent[] {
    return this.content.filter(item => {
      const createdAt = item.createdAt;
      return createdAt >= from && createdAt <= to;
    });
  }

  // Combined filters
  applyFilters(filters: SearchFilters): AssembledContent[] {
    let results = [...this.content];

    if (filters.search) {
      const lowerQuery = filters.search.toLowerCase();
      results = results.filter(item =>
        item.title.toLowerCase().includes(lowerQuery) ||
        item.description.toLowerCase().includes(lowerQuery)
      );
    }

    if (filters.awarenessLevel !== undefined) {
      results = results.filter(item => item.awarenessLevel === filters.awarenessLevel);
    }

    if (filters.status) {
      results = results.filter(item => item.status === filters.status);
    }

    if (filters.platform) {
      results = results.filter(item => item.platform === filters.platform);
    }

    if (filters.minViews !== undefined) {
      results = results.filter(item => (item.views || 0) >= filters.minViews);
    }

    if (filters.dateFrom) {
      results = results.filter(item => item.createdAt >= filters.dateFrom!);
    }

    if (filters.dateTo) {
      results = results.filter(item => item.createdAt <= filters.dateTo!);
    }

    return results;
  }

  // Pagination
  paginate(
    items: AssembledContent[],
    params: PaginationParams
  ): PaginatedResult<AssembledContent> {
    const { page, pageSize } = params;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = items.slice(startIndex, endIndex);

    return {
      data: paginatedData,
      total: items.length,
      page,
      pageSize,
      totalPages: Math.ceil(items.length / pageSize),
    };
  }

  // Search + Filter + Paginate (full integration)
  searchFilterPaginate(
    filters: SearchFilters,
    pagination: PaginationParams
  ): PaginatedResult<AssembledContent> {
    const filtered = this.applyFilters(filters);
    return this.paginate(filtered, pagination);
  }

  // Sorting
  sort(
    items: AssembledContent[],
    field: keyof AssembledContent,
    order: 'asc' | 'desc' = 'asc'
  ): AssembledContent[] {
    return [...items].sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];

      if (aVal === undefined || bVal === undefined) return 0;

      if (order === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });
  }

  // Faceted search (count by category)
  facet(field: keyof AssembledContent): Record<string, number> {
    const facets: Record<string, number> = {};

    this.content.forEach(item => {
      const value = String(item[field]);
      facets[value] = (facets[value] || 0) + 1;
    });

    return facets;
  }
}

// ============================================
// TESTS
// ============================================

describe('CF Search/Filter Integration', () => {
  let service: SearchFilterService;
  let sampleContent: AssembledContent[];

  beforeEach(() => {
    sampleContent = [
      {
        id: 'c1',
        dossierId: 'd1',
        title: 'Before/After Skincare Routine',
        description: 'Amazing transformation with Product X',
        awarenessLevel: 3,
        status: 'published',
        platform: 'tiktok',
        createdAt: new Date('2024-01-15'),
        views: 1000,
        likes: 100,
      },
      {
        id: 'c2',
        dossierId: 'd1',
        title: 'POV: You discover Product X',
        description: 'Relatable meme about skincare struggles',
        awarenessLevel: 1,
        status: 'published',
        platform: 'instagram',
        createdAt: new Date('2024-01-20'),
        views: 5000,
        likes: 500,
      },
      {
        id: 'c3',
        dossierId: 'd2',
        title: 'Product X Review - Honest Pros & Cons',
        description: 'Full review of Product X features',
        awarenessLevel: 4,
        status: 'published',
        platform: 'tiktok',
        createdAt: new Date('2024-02-01'),
        views: 2000,
        likes: 150,
      },
      {
        id: 'c4',
        dossierId: 'd2',
        title: 'Limited Time Offer on Product X',
        description: 'Urgency-driven content with CTA',
        awarenessLevel: 5,
        status: 'draft',
        platform: 'facebook',
        createdAt: new Date('2024-02-10'),
      },
      {
        id: 'c5',
        dossierId: 'd3',
        title: 'How I solved my skin problems',
        description: 'Problem-aware content about skincare',
        awarenessLevel: 2,
        status: 'published',
        platform: 'instagram',
        createdAt: new Date('2024-02-15'),
        views: 3000,
        likes: 200,
      },
      {
        id: 'c6',
        dossierId: 'd3',
        title: 'Product Y vs Product X',
        description: 'Comparison of different solutions',
        awarenessLevel: 3,
        status: 'archived',
        platform: 'tiktok',
        createdAt: new Date('2024-03-01'),
        views: 500,
        likes: 30,
      },
    ];

    service = new SearchFilterService(sampleContent);
  });

  // ============================================
  // TEXT SEARCH TESTS
  // ============================================

  describe('Text Search', () => {
    it('should search by title', () => {
      const results = service.search('Product X');

      expect(results.length).toBeGreaterThan(0);
      results.forEach(item => {
        const hasInTitle = item.title.toLowerCase().includes('product x');
        const hasInDescription = item.description.toLowerCase().includes('product x');
        expect(hasInTitle || hasInDescription).toBe(true);
      });
    });

    it('should search by description', () => {
      const results = service.search('transformation');

      expect(results).toHaveLength(1);
      expect(results[0].description).toContain('transformation');
    });

    it('should search case-insensitively', () => {
      const results = service.search('PRODUCT X');

      expect(results.length).toBeGreaterThan(0);
    });

    it('should search across multiple fields', () => {
      const results = service.search('skincare');

      expect(results.length).toBe(3); // c1 (title), c2 (description), c5 (description)
    });

    it('should return all content when search query is empty', () => {
      const results = service.search('');

      expect(results).toHaveLength(sampleContent.length);
    });

    it('should return empty array when no matches found', () => {
      const results = service.search('nonexistent keyword');

      expect(results).toHaveLength(0);
    });
  });

  // ============================================
  // FILTER TESTS
  // ============================================

  describe('Filters', () => {
    it('should filter by awareness level', () => {
      const results = service.filterByAwarenessLevel(3);

      expect(results).toHaveLength(2);
      results.forEach(item => {
        expect(item.awarenessLevel).toBe(3);
      });
    });

    it('should filter by status', () => {
      const results = service.filterByStatus('published');

      expect(results).toHaveLength(4);
      results.forEach(item => {
        expect(item.status).toBe('published');
      });
    });

    it('should filter by platform', () => {
      const results = service.filterByPlatform('tiktok');

      expect(results).toHaveLength(3);
      results.forEach(item => {
        expect(item.platform).toBe('tiktok');
      });
    });

    it('should filter by minimum views', () => {
      const results = service.filterByMinViews(2000);

      expect(results).toHaveLength(3);
      results.forEach(item => {
        expect(item.views || 0).toBeGreaterThanOrEqual(2000);
      });
    });

    it('should filter by date range', () => {
      const from = new Date('2024-02-01');
      const to = new Date('2024-02-28');

      const results = service.filterByDateRange(from, to);

      expect(results).toHaveLength(3);
      results.forEach(item => {
        expect(item.createdAt >= from).toBe(true);
        expect(item.createdAt <= to).toBe(true);
      });
    });

    it('should apply multiple filters', () => {
      const filters: SearchFilters = {
        platform: 'tiktok',
        status: 'published',
        awarenessLevel: 3,
      };

      const results = service.applyFilters(filters);

      expect(results).toHaveLength(1);
      expect(results[0].platform).toBe('tiktok');
      expect(results[0].status).toBe('published');
      expect(results[0].awarenessLevel).toBe(3);
    });

    it('should combine search and filters', () => {
      const filters: SearchFilters = {
        search: 'Product X',
        status: 'published',
      };

      const results = service.applyFilters(filters);

      expect(results.length).toBeGreaterThan(0);
      results.forEach(item => {
        expect(item.status).toBe('published');
        expect(
          item.title.toLowerCase().includes('product x') ||
          item.description.toLowerCase().includes('product x')
        ).toBe(true);
      });
    });
  });

  // ============================================
  // PAGINATION TESTS
  // ============================================

  describe('Pagination', () => {
    it('should paginate results', () => {
      const result = service.paginate(sampleContent, { page: 1, pageSize: 3 });

      expect(result.data).toHaveLength(3);
      expect(result.total).toBe(6);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(3);
      expect(result.totalPages).toBe(2);
    });

    it('should return correct page 2', () => {
      const result = service.paginate(sampleContent, { page: 2, pageSize: 3 });

      expect(result.data).toHaveLength(3);
      expect(result.page).toBe(2);
      expect(result.data[0].id).toBe('c4');
    });

    it('should handle last page with fewer items', () => {
      const result = service.paginate(sampleContent, { page: 2, pageSize: 4 });

      expect(result.data).toHaveLength(2);
      expect(result.totalPages).toBe(2);
    });

    it('should return empty array for out-of-range page', () => {
      const result = service.paginate(sampleContent, { page: 10, pageSize: 3 });

      expect(result.data).toHaveLength(0);
      expect(result.page).toBe(10);
    });

    it('should calculate total pages correctly', () => {
      const result1 = service.paginate(sampleContent, { page: 1, pageSize: 2 });
      expect(result1.totalPages).toBe(3);

      const result2 = service.paginate(sampleContent, { page: 1, pageSize: 10 });
      expect(result2.totalPages).toBe(1);
    });
  });

  // ============================================
  // INTEGRATED SEARCH + FILTER + PAGINATE
  // ============================================

  describe('Search + Filter + Paginate', () => {
    it('should combine search, filter, and pagination', () => {
      const filters: SearchFilters = {
        status: 'published',
        platform: 'tiktok',
      };
      const pagination: PaginationParams = {
        page: 1,
        pageSize: 2,
      };

      const result = service.searchFilterPaginate(filters, pagination);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      result.data.forEach(item => {
        expect(item.status).toBe('published');
        expect(item.platform).toBe('tiktok');
      });
    });

    it('should paginate filtered results correctly', () => {
      const filters: SearchFilters = {
        status: 'published',
      };
      const pagination: PaginationParams = {
        page: 2,
        pageSize: 2,
      };

      const result = service.searchFilterPaginate(filters, pagination);

      expect(result.data).toHaveLength(2);
      expect(result.page).toBe(2);
      expect(result.totalPages).toBe(2);
    });

    it('should handle search + filter + pagination', () => {
      const filters: SearchFilters = {
        search: 'Product',
        status: 'published',
      };
      const pagination: PaginationParams = {
        page: 1,
        pageSize: 10,
      };

      const result = service.searchFilterPaginate(filters, pagination);

      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach(item => {
        expect(item.status).toBe('published');
      });
    });
  });

  // ============================================
  // SORTING TESTS
  // ============================================

  describe('Sorting', () => {
    it('should sort by views ascending', () => {
      const results = service.sort(
        sampleContent.filter(c => c.views),
        'views',
        'asc'
      );

      expect(results[0].views).toBe(500);
      expect(results[results.length - 1].views).toBe(5000);
    });

    it('should sort by views descending', () => {
      const results = service.sort(
        sampleContent.filter(c => c.views),
        'views',
        'desc'
      );

      expect(results[0].views).toBe(5000);
      expect(results[results.length - 1].views).toBe(500);
    });

    it('should sort by createdAt', () => {
      const results = service.sort(sampleContent, 'createdAt', 'asc');

      expect(results[0].createdAt.getTime()).toBeLessThan(
        results[results.length - 1].createdAt.getTime()
      );
    });

    it('should sort by title alphabetically', () => {
      const results = service.sort(sampleContent, 'title', 'asc');

      expect(results[0].title.toLowerCase() <= results[1].title.toLowerCase()).toBe(true);
    });
  });

  // ============================================
  // FACETED SEARCH TESTS
  // ============================================

  describe('Faceted Search', () => {
    it('should count by platform', () => {
      const facets = service.facet('platform');

      expect(facets['tiktok']).toBe(3);
      expect(facets['instagram']).toBe(2);
      expect(facets['facebook']).toBe(1);
    });

    it('should count by status', () => {
      const facets = service.facet('status');

      expect(facets['published']).toBe(4);
      expect(facets['draft']).toBe(1);
      expect(facets['archived']).toBe(1);
    });

    it('should count by awareness level', () => {
      const facets = service.facet('awarenessLevel');

      expect(facets['1']).toBe(1);
      expect(facets['2']).toBe(1);
      expect(facets['3']).toBe(2);
      expect(facets['4']).toBe(1);
      expect(facets['5']).toBe(1);
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================

  describe('Edge Cases', () => {
    it('should handle empty dataset', () => {
      const emptyService = new SearchFilterService([]);
      const results = emptyService.search('anything');

      expect(results).toHaveLength(0);
    });

    it('should handle pagination with empty results', () => {
      const emptyService = new SearchFilterService([]);
      const result = emptyService.paginate([], { page: 1, pageSize: 10 });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should handle filters with no matches', () => {
      const filters: SearchFilters = {
        awarenessLevel: 99,
      };

      const results = service.applyFilters(filters);
      expect(results).toHaveLength(0);
    });

    it('should handle special characters in search', () => {
      const results = service.search('Product X - Review');
      // Should not crash, even if no exact match
      expect(Array.isArray(results)).toBe(true);
    });
  });
});
