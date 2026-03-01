/**
 * PCT Search and Filter Integration Tests
 * Feature: PCT-WC-010 - Integration tests for search, filter, and pagination
 *
 * Tests:
 * - Text search across multiple fields
 * - Filtering by multiple criteria
 * - Pagination with different strategies
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

let testBrand: any;
let testProduct: any;
let testHooks: any[] = [];

describe('PCT Search and Filter Integration', () => {
  beforeEach(async () => {
    // Create test brand and product
    testBrand = await prisma.pctBrand.create({
      data: {
        name: 'Search Test Brand',
        description: 'Brand for search testing',
      },
    });

    testProduct = await prisma.pctProduct.create({
      data: {
        brandId: testBrand.id,
        name: 'Search Test Product',
        description: 'Product for search and filter testing',
      },
    });

    // Create diverse hooks for testing
    const hooksData = [
      {
        productId: testProduct.id,
        text: 'Beautiful radiant skin glow',
        messagingFramework: 'punchy',
        awarenessLevel: 3,
        marketSophistication: 3,
        status: 'approved',
      },
      {
        productId: testProduct.id,
        text: 'Flawless complexion every time',
        messagingFramework: 'bold',
        awarenessLevel: 4,
        marketSophistication: 3,
        status: 'approved',
      },
      {
        productId: testProduct.id,
        text: 'What if makeup could be mistake-proof?',
        messagingFramework: 'question',
        awarenessLevel: 1,
        marketSophistication: 2,
        status: 'pending',
      },
      {
        productId: testProduct.id,
        text: 'Imagine waking up with perfect skin',
        messagingFramework: 'desire',
        awarenessLevel: 2,
        marketSophistication: 2,
        status: 'pending',
      },
      {
        productId: testProduct.id,
        text: 'Struggling with uneven skin tone?',
        messagingFramework: 'problem_agitation',
        awarenessLevel: 2,
        marketSophistication: 3,
        status: 'rejected',
      },
      {
        productId: testProduct.id,
        text: 'Join thousands with flawless skin',
        messagingFramework: 'social_proof',
        awarenessLevel: 5,
        marketSophistication: 4,
        status: 'approved',
      },
      {
        productId: testProduct.id,
        text: 'Radiant glow in minutes',
        messagingFramework: 'punchy',
        awarenessLevel: 3,
        marketSophistication: 3,
        status: 'approved',
      },
      {
        productId: testProduct.id,
        text: 'Transform your complexion naturally',
        messagingFramework: 'desire',
        awarenessLevel: 2,
        marketSophistication: 2,
        status: 'approved',
      },
    ];

    for (const hookData of hooksData) {
      const hook = await prisma.pctHook.create({ data: hookData as any });
      testHooks.push(hook);
    }
  });

  afterEach(async () => {
    // Cleanup
    await prisma.pctHook.deleteMany({ where: { productId: testProduct.id } });
    await prisma.pctProduct.delete({ where: { id: testProduct.id } });
    await prisma.pctBrand.delete({ where: { id: testBrand.id } });
    testHooks = [];
  });

  // ============================================
  // TEXT SEARCH TESTS
  // ============================================

  describe('Text Search', () => {
    it('should search hooks by text content (case-insensitive)', async () => {
      const results = await prisma.pctHook.findMany({
        where: {
          productId: testProduct.id,
          text: { contains: 'glow', mode: 'insensitive' },
        },
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach(hook => {
        expect(hook.text.toLowerCase()).toContain('glow');
      });
    });

    it('should search for partial matches', async () => {
      const results = await prisma.pctHook.findMany({
        where: {
          productId: testProduct.id,
          text: { contains: 'skin', mode: 'insensitive' },
        },
      });

      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty array for non-matching search', async () => {
      const results = await prisma.pctHook.findMany({
        where: {
          productId: testProduct.id,
          text: { contains: 'xyz123notfound', mode: 'insensitive' },
        },
      });

      expect(results).toHaveLength(0);
    });

    it('should search across multiple words', async () => {
      const results = await prisma.pctHook.findMany({
        where: {
          productId: testProduct.id,
          OR: [
            { text: { contains: 'radiant', mode: 'insensitive' } },
            { text: { contains: 'flawless', mode: 'insensitive' } },
          ],
        },
      });

      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle special characters in search', async () => {
      const results = await prisma.pctHook.findMany({
        where: {
          productId: testProduct.id,
          text: { contains: 'mistake-proof', mode: 'insensitive' },
        },
      });

      expect(results.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // FILTERING TESTS
  // ============================================

  describe('Single Filter', () => {
    it('should filter by messaging framework', async () => {
      const results = await prisma.pctHook.findMany({
        where: {
          productId: testProduct.id,
          messagingFramework: 'punchy',
        },
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach(hook => {
        expect(hook.messagingFramework).toBe('punchy');
      });
    });

    it('should filter by awareness level', async () => {
      const results = await prisma.pctHook.findMany({
        where: {
          productId: testProduct.id,
          awarenessLevel: 3,
        },
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach(hook => {
        expect(hook.awarenessLevel).toBe(3);
      });
    });

    it('should filter by market sophistication', async () => {
      const results = await prisma.pctHook.findMany({
        where: {
          productId: testProduct.id,
          marketSophistication: 2,
        },
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach(hook => {
        expect(hook.marketSophistication).toBe(2);
      });
    });

    it('should filter by status', async () => {
      const results = await prisma.pctHook.findMany({
        where: {
          productId: testProduct.id,
          status: 'approved',
        },
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach(hook => {
        expect(hook.status).toBe('approved');
      });
    });
  });

  describe('Multiple Filters (AND)', () => {
    it('should filter by framework AND awareness level', async () => {
      const results = await prisma.pctHook.findMany({
        where: {
          productId: testProduct.id,
          AND: [
            { messagingFramework: 'punchy' },
            { awarenessLevel: 3 },
          ],
        },
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach(hook => {
        expect(hook.messagingFramework).toBe('punchy');
        expect(hook.awarenessLevel).toBe(3);
      });
    });

    it('should filter by status AND sophistication', async () => {
      const results = await prisma.pctHook.findMany({
        where: {
          productId: testProduct.id,
          AND: [
            { status: 'approved' },
            { marketSophistication: 3 },
          ],
        },
      });

      results.forEach(hook => {
        expect(hook.status).toBe('approved');
        expect(hook.marketSophistication).toBe(3);
      });
    });

    it('should filter by three criteria', async () => {
      const results = await prisma.pctHook.findMany({
        where: {
          productId: testProduct.id,
          AND: [
            { messagingFramework: 'desire' },
            { awarenessLevel: 2 },
            { status: 'approved' },
          ],
        },
      });

      results.forEach(hook => {
        expect(hook.messagingFramework).toBe('desire');
        expect(hook.awarenessLevel).toBe(2);
        expect(hook.status).toBe('approved');
      });
    });
  });

  describe('Multiple Filters (OR)', () => {
    it('should filter by framework OR framework', async () => {
      const results = await prisma.pctHook.findMany({
        where: {
          productId: testProduct.id,
          OR: [
            { messagingFramework: 'punchy' },
            { messagingFramework: 'bold' },
          ],
        },
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach(hook => {
        expect(['punchy', 'bold']).toContain(hook.messagingFramework);
      });
    });

    it('should filter by status OR status', async () => {
      const results = await prisma.pctHook.findMany({
        where: {
          productId: testProduct.id,
          OR: [
            { status: 'approved' },
            { status: 'pending' },
          ],
        },
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach(hook => {
        expect(['approved', 'pending']).toContain(hook.status);
      });
    });
  });

  describe('Combined Filters (AND + OR)', () => {
    it('should combine AND and OR filters', async () => {
      const results = await prisma.pctHook.findMany({
        where: {
          productId: testProduct.id,
          AND: [
            { status: 'approved' },
            {
              OR: [
                { messagingFramework: 'punchy' },
                { messagingFramework: 'bold' },
              ],
            },
          ],
        },
      });

      results.forEach(hook => {
        expect(hook.status).toBe('approved');
        expect(['punchy', 'bold']).toContain(hook.messagingFramework);
      });
    });
  });

  describe('Search + Filter', () => {
    it('should combine text search with filters', async () => {
      const results = await prisma.pctHook.findMany({
        where: {
          productId: testProduct.id,
          AND: [
            { text: { contains: 'skin', mode: 'insensitive' } },
            { status: 'approved' },
          ],
        },
      });

      results.forEach(hook => {
        expect(hook.text.toLowerCase()).toContain('skin');
        expect(hook.status).toBe('approved');
      });
    });

    it('should search with multiple filters', async () => {
      const results = await prisma.pctHook.findMany({
        where: {
          productId: testProduct.id,
          AND: [
            { text: { contains: 'glow', mode: 'insensitive' } },
            { messagingFramework: 'punchy' },
            { awarenessLevel: 3 },
          ],
        },
      });

      results.forEach(hook => {
        expect(hook.text.toLowerCase()).toContain('glow');
        expect(hook.messagingFramework).toBe('punchy');
        expect(hook.awarenessLevel).toBe(3);
      });
    });
  });

  // ============================================
  // PAGINATION TESTS
  // ============================================

  describe('Offset Pagination', () => {
    it('should paginate with skip and take', async () => {
      const page1 = await prisma.pctHook.findMany({
        where: { productId: testProduct.id },
        skip: 0,
        take: 3,
        orderBy: { createdAt: 'desc' },
      });

      const page2 = await prisma.pctHook.findMany({
        where: { productId: testProduct.id },
        skip: 3,
        take: 3,
        orderBy: { createdAt: 'desc' },
      });

      expect(page1).toHaveLength(3);
      expect(page2.length).toBeGreaterThan(0);
      expect(page1[0].id).not.toBe(page2[0].id);
    });

    it('should get total count for pagination metadata', async () => {
      const total = await prisma.pctHook.count({
        where: { productId: testProduct.id },
      });

      const pageSize = 3;
      const totalPages = Math.ceil(total / pageSize);

      expect(totalPages).toBeGreaterThan(0);
      expect(total).toBe(testHooks.length);
    });

    it('should handle last page correctly', async () => {
      const total = await prisma.pctHook.count({
        where: { productId: testProduct.id },
      });

      const pageSize = 3;
      const lastPageOffset = Math.floor(total / pageSize) * pageSize;

      const lastPage = await prisma.pctHook.findMany({
        where: { productId: testProduct.id },
        skip: lastPageOffset,
        take: pageSize,
      });

      expect(lastPage.length).toBeLessThanOrEqual(pageSize);
      expect(lastPage.length).toBeGreaterThan(0);
    });
  });

  describe('Cursor Pagination', () => {
    it('should paginate with cursor', async () => {
      const firstBatch = await prisma.pctHook.findMany({
        where: { productId: testProduct.id },
        take: 3,
        orderBy: { createdAt: 'desc' },
      });

      expect(firstBatch).toHaveLength(3);

      const cursor = firstBatch[firstBatch.length - 1].id;
      const secondBatch = await prisma.pctHook.findMany({
        where: { productId: testProduct.id },
        take: 3,
        skip: 1, // Skip the cursor
        cursor: { id: cursor },
        orderBy: { createdAt: 'desc' },
      });

      expect(secondBatch.length).toBeGreaterThan(0);
      expect(secondBatch[0].id).not.toBe(cursor);
    });

    it('should handle end of cursor pagination', async () => {
      const allHooks = await prisma.pctHook.findMany({
        where: { productId: testProduct.id },
        orderBy: { createdAt: 'desc' },
      });

      const lastCursor = allHooks[allHooks.length - 1].id;

      const afterLast = await prisma.pctHook.findMany({
        where: { productId: testProduct.id },
        take: 3,
        skip: 1,
        cursor: { id: lastCursor },
        orderBy: { createdAt: 'desc' },
      });

      expect(afterLast).toHaveLength(0);
    });
  });

  describe('Pagination with Filters', () => {
    it('should paginate filtered results', async () => {
      const filteredCount = await prisma.pctHook.count({
        where: {
          productId: testProduct.id,
          status: 'approved',
        },
      });

      const page1 = await prisma.pctHook.findMany({
        where: {
          productId: testProduct.id,
          status: 'approved',
        },
        skip: 0,
        take: 2,
        orderBy: { createdAt: 'desc' },
      });

      expect(page1.length).toBeLessThanOrEqual(2);
      page1.forEach(hook => {
        expect(hook.status).toBe('approved');
      });
    });

    it('should count filtered results', async () => {
      const approvedCount = await prisma.pctHook.count({
        where: {
          productId: testProduct.id,
          status: 'approved',
        },
      });

      const pendingCount = await prisma.pctHook.count({
        where: {
          productId: testProduct.id,
          status: 'pending',
        },
      });

      const rejectedCount = await prisma.pctHook.count({
        where: {
          productId: testProduct.id,
          status: 'rejected',
        },
      });

      expect(approvedCount + pendingCount + rejectedCount).toBe(testHooks.length);
    });
  });

  // ============================================
  // SORTING TESTS
  // ============================================

  describe('Sorting', () => {
    it('should sort by createdAt descending (newest first)', async () => {
      const results = await prisma.pctHook.findMany({
        where: { productId: testProduct.id },
        orderBy: { createdAt: 'desc' },
      });

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].createdAt >= results[i].createdAt).toBe(true);
      }
    });

    it('should sort by createdAt ascending (oldest first)', async () => {
      const results = await prisma.pctHook.findMany({
        where: { productId: testProduct.id },
        orderBy: { createdAt: 'asc' },
      });

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].createdAt <= results[i].createdAt).toBe(true);
      }
    });

    it('should sort by text alphabetically', async () => {
      const results = await prisma.pctHook.findMany({
        where: { productId: testProduct.id },
        orderBy: { text: 'asc' },
      });

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].text.localeCompare(results[i].text)).toBeLessThanOrEqual(0);
      }
    });

    it('should sort by awareness level', async () => {
      const results = await prisma.pctHook.findMany({
        where: { productId: testProduct.id },
        orderBy: { awarenessLevel: 'asc' },
      });

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].awarenessLevel).toBeLessThanOrEqual(results[i].awarenessLevel);
      }
    });
  });

  // ============================================
  // ADVANCED SEARCH TESTS
  // ============================================

  describe('Advanced Search Scenarios', () => {
    it('should support search with pagination and sorting', async () => {
      const results = await prisma.pctHook.findMany({
        where: {
          productId: testProduct.id,
          text: { contains: 'skin', mode: 'insensitive' },
        },
        skip: 0,
        take: 5,
        orderBy: { createdAt: 'desc' },
      });

      expect(results.length).toBeLessThanOrEqual(5);
    });

    it('should support complex filter combinations', async () => {
      const results = await prisma.pctHook.findMany({
        where: {
          productId: testProduct.id,
          OR: [
            {
              AND: [
                { messagingFramework: 'punchy' },
                { awarenessLevel: 3 },
              ],
            },
            {
              AND: [
                { messagingFramework: 'desire' },
                { awarenessLevel: 2 },
              ],
            },
          ],
        },
      });

      results.forEach(hook => {
        const isPunchy3 = hook.messagingFramework === 'punchy' && hook.awarenessLevel === 3;
        const isDesire2 = hook.messagingFramework === 'desire' && hook.awarenessLevel === 2;
        expect(isPunchy3 || isDesire2).toBe(true);
      });
    });

    it('should handle empty result sets gracefully', async () => {
      const results = await prisma.pctHook.findMany({
        where: {
          productId: testProduct.id,
          AND: [
            { messagingFramework: 'punchy' },
            { awarenessLevel: 5 },
            { marketSophistication: 1 },
          ],
        },
      });

      expect(results).toEqual([]);
    });
  });

  // ============================================
  // FACETED SEARCH TESTS
  // ============================================

  describe('Faceted Search (Aggregations)', () => {
    it('should count hooks by messaging framework', async () => {
      const frameworks = ['punchy', 'bold', 'desire', 'question', 'problem_agitation', 'social_proof'];
      const counts: Record<string, number> = {};

      for (const framework of frameworks) {
        const count = await prisma.pctHook.count({
          where: {
            productId: testProduct.id,
            messagingFramework: framework as any,
          },
        });
        if (count > 0) counts[framework] = count;
      }

      expect(Object.keys(counts).length).toBeGreaterThan(0);
    });

    it('should count hooks by status', async () => {
      const statuses = ['approved', 'pending', 'rejected'];
      const counts: Record<string, number> = {};

      for (const status of statuses) {
        const count = await prisma.pctHook.count({
          where: {
            productId: testProduct.id,
            status: status as any,
          },
        });
        if (count > 0) counts[status] = count;
      }

      const totalCounted = Object.values(counts).reduce((sum, c) => sum + c, 0);
      expect(totalCounted).toBe(testHooks.length);
    });

    it('should count hooks by awareness level', async () => {
      const levels = [1, 2, 3, 4, 5];
      const counts: Record<number, number> = {};

      for (const level of levels) {
        const count = await prisma.pctHook.count({
          where: {
            productId: testProduct.id,
            awarenessLevel: level,
          },
        });
        if (count > 0) counts[level] = count;
      }

      expect(Object.keys(counts).length).toBeGreaterThan(0);
    });
  });
});
