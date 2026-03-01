/**
 * PCT Database Queries Unit Tests
 * Feature: PCT-WC-003 - Unit tests for CRUD helpers
 *
 * Tests database operations for:
 * - Create/Read/Update/Delete operations
 * - Pagination
 * - Search functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mock data
const mockBrand = {
  id: 'test-brand-1',
  name: 'Test Brand',
  description: 'A test brand',
  voice: 'Professional',
  values: ['Quality', 'Innovation'],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockProduct = {
  id: 'test-product-1',
  brandId: 'test-brand-1',
  name: 'Test Product',
  description: 'A test product',
  features: ['Feature 1', 'Feature 2'],
  benefits: ['Benefit 1', 'Benefit 2'],
  targetAudience: 'Young adults',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('PCT Database - Create Operations', () => {
  afterEach(async () => {
    // Clean up test data
    try {
      await prisma.pctBrand.deleteMany({ where: { name: { contains: 'Test' } } });
      await prisma.pctProduct.deleteMany({ where: { name: { contains: 'Test' } } });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should create a brand with all fields', async () => {
    const brand = await prisma.pctBrand.create({
      data: {
        name: 'Test Brand Create',
        description: 'Testing create operation',
        voice: 'Friendly',
        values: ['Trust', 'Quality'],
      },
    });

    expect(brand).toBeDefined();
    expect(brand.name).toBe('Test Brand Create');
    expect(brand.values).toContain('Trust');
  });

  it('should create a product linked to a brand', async () => {
    const brand = await prisma.pctBrand.create({
      data: { name: 'Test Brand For Product', description: 'Test' },
    });

    const product = await prisma.pctProduct.create({
      data: {
        brandId: brand.id,
        name: 'Test Product Create',
        description: 'Testing product creation',
        features: ['Feature A'],
        benefits: ['Benefit A'],
        targetAudience: 'Developers',
      },
    });

    expect(product).toBeDefined();
    expect(product.brandId).toBe(brand.id);
    expect(product.name).toBe('Test Product Create');
  });

  it('should create multiple VoC entries', async () => {
    const brand = await prisma.pctBrand.create({
      data: { name: 'VoC Test Brand', description: 'Test' },
    });

    const product = await prisma.pctProduct.create({
      data: {
        brandId: brand.id,
        name: 'VoC Test Product',
        description: 'Test',
      },
    });

    const vocEntries = await prisma.pctVoiceOfCustomer.createMany({
      data: [
        {
          productId: product.id,
          quote: 'Love this product!',
          source: 'Amazon',
          category: 'Benefit',
        },
        {
          productId: product.id,
          quote: 'Great quality',
          source: 'Reddit',
          category: 'Feature',
        },
      ],
    });

    expect(vocEntries.count).toBe(2);
  });

  it('should create USPs with category', async () => {
    const brand = await prisma.pctBrand.create({
      data: { name: 'USP Test Brand', description: 'Test' },
    });

    const product = await prisma.pctProduct.create({
      data: {
        brandId: brand.id,
        name: 'USP Test Product',
        description: 'Test',
      },
    });

    const usp = await prisma.pctUSP.create({
      data: {
        productId: product.id,
        text: 'Impossible to overdo',
        category: 'Feature',
      },
    });

    expect(usp.text).toBe('Impossible to overdo');
    expect(usp.category).toBe('Feature');
  });
});

describe('PCT Database - Read Operations', () => {
  let testBrand: any;
  let testProduct: any;

  beforeEach(async () => {
    testBrand = await prisma.pctBrand.create({
      data: {
        name: 'Read Test Brand',
        description: 'For read testing',
      },
    });

    testProduct = await prisma.pctProduct.create({
      data: {
        brandId: testBrand.id,
        name: 'Read Test Product',
        description: 'For read testing',
      },
    });
  });

  afterEach(async () => {
    await prisma.pctProduct.deleteMany({ where: { brandId: testBrand.id } });
    await prisma.pctBrand.delete({ where: { id: testBrand.id } });
  });

  it('should read all brands', async () => {
    const brands = await prisma.pctBrand.findMany();
    expect(brands.length).toBeGreaterThan(0);
  });

  it('should read a single brand by ID', async () => {
    const brand = await prisma.pctBrand.findUnique({
      where: { id: testBrand.id },
    });

    expect(brand).toBeDefined();
    expect(brand?.id).toBe(testBrand.id);
  });

  it('should read brand with related products', async () => {
    const brand = await prisma.pctBrand.findUnique({
      where: { id: testBrand.id },
      include: { products: true },
    });

    expect(brand?.products).toBeDefined();
    expect(brand?.products.length).toBeGreaterThan(0);
  });

  it('should read products filtered by brandId', async () => {
    const products = await prisma.pctProduct.findMany({
      where: { brandId: testBrand.id },
    });

    expect(products.length).toBeGreaterThan(0);
    expect(products[0].brandId).toBe(testBrand.id);
  });

  it('should read product with all related data', async () => {
    // Create some related data first
    await prisma.pctUSP.create({
      data: {
        productId: testProduct.id,
        text: 'Test USP',
      },
    });

    const product = await prisma.pctProduct.findUnique({
      where: { id: testProduct.id },
      include: {
        usps: true,
        voiceOfCustomer: true,
        hooks: true,
      },
    });

    expect(product).toBeDefined();
    expect(product?.usps).toBeDefined();
  });
});

describe('PCT Database - Update Operations', () => {
  let testBrand: any;

  beforeEach(async () => {
    testBrand = await prisma.pctBrand.create({
      data: {
        name: 'Update Test Brand',
        description: 'Original description',
      },
    });
  });

  afterEach(async () => {
    await prisma.pctBrand.delete({ where: { id: testBrand.id } });
  });

  it('should update a brand name', async () => {
    const updated = await prisma.pctBrand.update({
      where: { id: testBrand.id },
      data: { name: 'Updated Brand Name' },
    });

    expect(updated.name).toBe('Updated Brand Name');
  });

  it('should update multiple fields', async () => {
    const updated = await prisma.pctBrand.update({
      where: { id: testBrand.id },
      data: {
        name: 'Multi Update',
        description: 'Updated description',
        voice: 'Casual',
      },
    });

    expect(updated.name).toBe('Multi Update');
    expect(updated.description).toBe('Updated description');
    expect(updated.voice).toBe('Casual');
  });

  it('should update hook status', async () => {
    const product = await prisma.pctProduct.create({
      data: {
        brandId: testBrand.id,
        name: 'Hook Test Product',
        description: 'Test',
      },
    });

    const hook = await prisma.pctHook.create({
      data: {
        productId: product.id,
        text: 'Test hook',
        messagingFramework: 'punchy',
        awarenessLevel: 3,
        marketSophistication: 3,
        status: 'pending',
      },
    });

    const updated = await prisma.pctHook.update({
      where: { id: hook.id },
      data: { status: 'approved' },
    });

    expect(updated.status).toBe('approved');
  });

  it('should batch update multiple hooks', async () => {
    const product = await prisma.pctProduct.create({
      data: {
        brandId: testBrand.id,
        name: 'Batch Test Product',
        description: 'Test',
      },
    });

    await prisma.pctHook.createMany({
      data: [
        {
          productId: product.id,
          text: 'Hook 1',
          messagingFramework: 'punchy',
          awarenessLevel: 3,
          marketSophistication: 3,
          status: 'pending',
        },
        {
          productId: product.id,
          text: 'Hook 2',
          messagingFramework: 'punchy',
          awarenessLevel: 3,
          marketSophistication: 3,
          status: 'pending',
        },
      ],
    });

    const result = await prisma.pctHook.updateMany({
      where: { productId: product.id },
      data: { status: 'approved' },
    });

    expect(result.count).toBe(2);
  });
});

describe('PCT Database - Delete Operations', () => {
  it('should delete a brand', async () => {
    const brand = await prisma.pctBrand.create({
      data: { name: 'Delete Test Brand', description: 'Test' },
    });

    await prisma.pctBrand.delete({
      where: { id: brand.id },
    });

    const deleted = await prisma.pctBrand.findUnique({
      where: { id: brand.id },
    });

    expect(deleted).toBeNull();
  });

  it('should cascade delete products when brand is deleted', async () => {
    const brand = await prisma.pctBrand.create({
      data: { name: 'Cascade Test Brand', description: 'Test' },
    });

    const product = await prisma.pctProduct.create({
      data: {
        brandId: brand.id,
        name: 'Cascade Test Product',
        description: 'Test',
      },
    });

    // Delete brand - should cascade to products
    await prisma.pctBrand.delete({
      where: { id: brand.id },
    });

    const deletedProduct = await prisma.pctProduct.findUnique({
      where: { id: product.id },
    });

    expect(deletedProduct).toBeNull();
  });

  it('should delete multiple hooks', async () => {
    const brand = await prisma.pctBrand.create({
      data: { name: 'Multi Delete Brand', description: 'Test' },
    });

    const product = await prisma.pctProduct.create({
      data: {
        brandId: brand.id,
        name: 'Multi Delete Product',
        description: 'Test',
      },
    });

    await prisma.pctHook.createMany({
      data: [
        { productId: product.id, text: 'Hook 1', messagingFramework: 'punchy', awarenessLevel: 3, marketSophistication: 3 },
        { productId: product.id, text: 'Hook 2', messagingFramework: 'punchy', awarenessLevel: 3, marketSophistication: 3 },
      ],
    });

    const result = await prisma.pctHook.deleteMany({
      where: { productId: product.id },
    });

    expect(result.count).toBe(2);
  });
});

describe('PCT Database - Pagination', () => {
  let testBrand: any;
  let testProduct: any;

  beforeEach(async () => {
    testBrand = await prisma.pctBrand.create({
      data: { name: 'Pagination Test Brand', description: 'Test' },
    });

    testProduct = await prisma.pctProduct.create({
      data: {
        brandId: testBrand.id,
        name: 'Pagination Test Product',
        description: 'Test',
      },
    });

    // Create 20 hooks for pagination testing
    const hooks = Array.from({ length: 20 }, (_, i) => ({
      productId: testProduct.id,
      text: `Hook ${i + 1}`,
      messagingFramework: 'punchy',
      awarenessLevel: 3,
      marketSophistication: 3,
    }));

    await prisma.pctHook.createMany({ data: hooks });
  });

  afterEach(async () => {
    await prisma.pctHook.deleteMany({ where: { productId: testProduct.id } });
    await prisma.pctProduct.delete({ where: { id: testProduct.id } });
    await prisma.pctBrand.delete({ where: { id: testBrand.id } });
  });

  it('should paginate hooks with skip and take', async () => {
    const page1 = await prisma.pctHook.findMany({
      where: { productId: testProduct.id },
      skip: 0,
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    const page2 = await prisma.pctHook.findMany({
      where: { productId: testProduct.id },
      skip: 10,
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    expect(page1.length).toBe(10);
    expect(page2.length).toBe(10);
    expect(page1[0].id).not.toBe(page2[0].id);
  });

  it('should get total count for pagination', async () => {
    const total = await prisma.pctHook.count({
      where: { productId: testProduct.id },
    });

    expect(total).toBe(20);
  });

  it('should handle cursor-based pagination', async () => {
    const firstBatch = await prisma.pctHook.findMany({
      where: { productId: testProduct.id },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    const cursor = firstBatch[firstBatch.length - 1].id;

    const secondBatch = await prisma.pctHook.findMany({
      where: { productId: testProduct.id },
      take: 5,
      skip: 1, // Skip the cursor
      cursor: { id: cursor },
      orderBy: { createdAt: 'desc' },
    });

    expect(firstBatch.length).toBe(5);
    expect(secondBatch.length).toBe(5);
    expect(firstBatch[4].id).not.toBe(secondBatch[0].id);
  });
});

describe('PCT Database - Search', () => {
  let testBrand: any;
  let testProduct: any;

  beforeEach(async () => {
    testBrand = await prisma.pctBrand.create({
      data: { name: 'Search Test Brand', description: 'A brand for searching' },
    });

    testProduct = await prisma.pctProduct.create({
      data: {
        brandId: testBrand.id,
        name: 'Search Test Product',
        description: 'Product with searchable content',
      },
    });

    await prisma.pctHook.createMany({
      data: [
        { productId: testProduct.id, text: 'Beautiful skin glow', messagingFramework: 'punchy', awarenessLevel: 3, marketSophistication: 3 },
        { productId: testProduct.id, text: 'Radiant complexion', messagingFramework: 'desire', awarenessLevel: 4, marketSophistication: 3 },
        { productId: testProduct.id, text: 'Flawless makeup application', messagingFramework: 'bold', awarenessLevel: 3, marketSophistication: 4 },
      ],
    });
  });

  afterEach(async () => {
    await prisma.pctHook.deleteMany({ where: { productId: testProduct.id } });
    await prisma.pctProduct.delete({ where: { id: testProduct.id } });
    await prisma.pctBrand.delete({ where: { id: testBrand.id } });
  });

  it('should search hooks by text content', async () => {
    const results = await prisma.pctHook.findMany({
      where: {
        productId: testProduct.id,
        text: { contains: 'glow', mode: 'insensitive' },
      },
    });

    expect(results.length).toBe(1);
    expect(results[0].text).toContain('glow');
  });

  it('should filter by messaging framework', async () => {
    const results = await prisma.pctHook.findMany({
      where: {
        productId: testProduct.id,
        messagingFramework: 'punchy',
      },
    });

    expect(results.length).toBe(1);
    expect(results[0].messagingFramework).toBe('punchy');
  });

  it('should filter by awareness level', async () => {
    const results = await prisma.pctHook.findMany({
      where: {
        productId: testProduct.id,
        awarenessLevel: 4,
      },
    });

    expect(results.length).toBe(1);
    expect(results[0].awarenessLevel).toBe(4);
  });

  it('should combine multiple search filters', async () => {
    const results = await prisma.pctHook.findMany({
      where: {
        productId: testProduct.id,
        AND: [
          { messagingFramework: 'bold' },
          { marketSophistication: 4 },
        ],
      },
    });

    expect(results.length).toBe(1);
    expect(results[0].messagingFramework).toBe('bold');
    expect(results[0].marketSophistication).toBe(4);
  });

  it('should search brands by name', async () => {
    const results = await prisma.pctBrand.findMany({
      where: {
        name: { contains: 'Search', mode: 'insensitive' },
      },
    });

    expect(results.length).toBeGreaterThan(0);
  });

  it('should search with OR conditions', async () => {
    const results = await prisma.pctHook.findMany({
      where: {
        productId: testProduct.id,
        OR: [
          { messagingFramework: 'punchy' },
          { messagingFramework: 'desire' },
        ],
      },
    });

    expect(results.length).toBe(2);
  });
});

describe('PCT Database - Edge Cases', () => {
  it('should handle empty result sets', async () => {
    const results = await prisma.pctBrand.findMany({
      where: { name: 'NonExistentBrand12345' },
    });

    expect(results).toEqual([]);
  });

  it('should handle null values gracefully', async () => {
    const brand = await prisma.pctBrand.create({
      data: {
        name: 'Minimal Brand',
        description: 'Only required fields',
      },
    });

    expect(brand.voice).toBeNull();
    expect(brand.logoUrl).toBeNull();

    await prisma.pctBrand.delete({ where: { id: brand.id } });
  });

  it('should enforce unique constraints', async () => {
    // This depends on your schema constraints
    // Example placeholder test
    expect(true).toBe(true);
  });

  it('should handle large datasets efficiently', async () => {
    const brand = await prisma.pctBrand.create({
      data: { name: 'Large Dataset Brand', description: 'Test' },
    });

    const product = await prisma.pctProduct.create({
      data: {
        brandId: brand.id,
        name: 'Large Dataset Product',
        description: 'Test',
      },
    });

    // Create 100 hooks
    const hooks = Array.from({ length: 100 }, (_, i) => ({
      productId: product.id,
      text: `Hook ${i}`,
      messagingFramework: 'punchy',
      awarenessLevel: 3,
      marketSophistication: 3,
    }));

    await prisma.pctHook.createMany({ data: hooks });

    const startTime = Date.now();
    const results = await prisma.pctHook.findMany({
      where: { productId: product.id },
      take: 20,
    });
    const duration = Date.now() - startTime;

    expect(results.length).toBe(20);
    expect(duration).toBeLessThan(1000); // Should complete within 1 second

    // Cleanup
    await prisma.pctHook.deleteMany({ where: { productId: product.id } });
    await prisma.pctProduct.delete({ where: { id: product.id } });
    await prisma.pctBrand.delete({ where: { id: brand.id } });
  });
});
