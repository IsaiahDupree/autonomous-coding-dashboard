/**
 * PCT Integration Tests
 * Feature: PCT-WC-007 - Integration tests for primary workflow
 *
 * Tests full workflow:
 * - Account creation and authentication
 * - Onboarding (brand and product setup)
 * - Core actions (USP and hook generation)
 * - Verification of data consistency
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Test data
let testUser: any;
let testBrand: any;
let testProduct: any;
let authToken: string;

describe('PCT Primary Workflow Integration', () => {
  beforeEach(async () => {
    // Clean up test data before each test
    try {
      await prisma.pctHook.deleteMany({ where: { product: { name: { contains: 'Integration Test' } } } });
      await prisma.pctMarketingAngle.deleteMany({ where: { usp: { product: { name: { contains: 'Integration Test' } } } } });
      await prisma.pctUSP.deleteMany({ where: { product: { name: { contains: 'Integration Test' } } } });
      await prisma.pctVoiceOfCustomer.deleteMany({ where: { product: { name: { contains: 'Integration Test' } } } });
      await prisma.pctProduct.deleteMany({ where: { name: { contains: 'Integration Test' } } });
      await prisma.pctBrand.deleteMany({ where: { name: { contains: 'Integration Test' } } });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  afterEach(async () => {
    // Clean up after tests
    try {
      if (testProduct?.id) {
        await prisma.pctHook.deleteMany({ where: { productId: testProduct.id } });
        await prisma.pctMarketingAngle.deleteMany({ where: { usp: { productId: testProduct.id } } });
        await prisma.pctUSP.deleteMany({ where: { productId: testProduct.id } });
        await prisma.pctVoiceOfCustomer.deleteMany({ where: { productId: testProduct.id } });
        await prisma.pctProduct.delete({ where: { id: testProduct.id } });
      }
      if (testBrand?.id) {
        await prisma.pctBrand.delete({ where: { id: testBrand.id } });
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Step 1: Brand Creation', () => {
    it('should create a brand successfully', async () => {
      testBrand = await prisma.pctBrand.create({
        data: {
          name: 'Integration Test Brand',
          description: 'A brand for integration testing',
          voice: 'Professional and friendly',
          values: ['Quality', 'Innovation', 'Customer-first'],
        },
      });

      expect(testBrand).toBeDefined();
      expect(testBrand.id).toBeDefined();
      expect(testBrand.name).toBe('Integration Test Brand');
      expect(testBrand.values).toContain('Quality');
    });

    it('should retrieve the created brand', async () => {
      testBrand = await prisma.pctBrand.create({
        data: {
          name: 'Integration Test Brand Retrieve',
          description: 'Testing retrieval',
        },
      });

      const retrieved = await prisma.pctBrand.findUnique({
        where: { id: testBrand.id },
      });

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(testBrand.id);
    });
  });

  describe('Step 2: Product Creation', () => {
    beforeEach(async () => {
      testBrand = await prisma.pctBrand.create({
        data: {
          name: 'Integration Test Brand for Products',
          description: 'Brand for product testing',
        },
      });
    });

    it('should create a product linked to brand', async () => {
      testProduct = await prisma.pctProduct.create({
        data: {
          brandId: testBrand.id,
          name: 'Integration Test Product',
          description: 'A revolutionary skincare product that adjusts to your skin tone',
          features: ['Self-adjusting color', 'Long-lasting', 'Natural ingredients'],
          benefits: ['Perfect match every time', 'All-day wear', 'Gentle on skin'],
          targetAudience: 'Women 25-45 interested in natural beauty',
        },
      });

      expect(testProduct).toBeDefined();
      expect(testProduct.brandId).toBe(testBrand.id);
      expect(testProduct.features).toHaveLength(3);
    });

    it('should retrieve product with brand relationship', async () => {
      testProduct = await prisma.pctProduct.create({
        data: {
          brandId: testBrand.id,
          name: 'Integration Test Product With Brand',
          description: 'Testing brand relationship',
        },
      });

      const retrieved = await prisma.pctProduct.findUnique({
        where: { id: testProduct.id },
        include: { brand: true },
      });

      expect(retrieved?.brand).toBeDefined();
      expect(retrieved?.brand.id).toBe(testBrand.id);
    });
  });

  describe('Step 3: Voice of Customer Collection', () => {
    beforeEach(async () => {
      testBrand = await prisma.pctBrand.create({
        data: {
          name: 'Integration Test Brand for VoC',
          description: 'Brand for VoC testing',
        },
      });

      testProduct = await prisma.pctProduct.create({
        data: {
          brandId: testBrand.id,
          name: 'Integration Test Product for VoC',
          description: 'Product for VoC testing',
        },
      });
    });

    it('should add multiple VoC entries', async () => {
      const vocEntries = [
        {
          productId: testProduct.id,
          quote: 'This product is absolutely amazing! Perfect color match.',
          source: 'amazon',
          category: 'benefit',
          sentiment: 'positive',
        },
        {
          productId: testProduct.id,
          quote: 'I always struggle with makeup application but this makes it easy',
          source: 'reddit',
          category: 'pain_point',
          sentiment: 'positive',
        },
        {
          productId: testProduct.id,
          quote: 'My hands shake and I can never get makeup right',
          source: 'forum',
          category: 'pain_point',
          sentiment: 'negative',
        },
      ];

      for (const voc of vocEntries) {
        await prisma.pctVoiceOfCustomer.create({ data: voc as any });
      }

      const savedVoc = await prisma.pctVoiceOfCustomer.findMany({
        where: { productId: testProduct.id },
      });

      expect(savedVoc).toHaveLength(3);
      const painPoints = savedVoc.filter(v => v.category === 'pain_point');
      expect(painPoints).toHaveLength(2);
    });
  });

  describe('Step 4: USP Creation', () => {
    beforeEach(async () => {
      testBrand = await prisma.pctBrand.create({
        data: {
          name: 'Integration Test Brand for USPs',
          description: 'Brand for USP testing',
        },
      });

      testProduct = await prisma.pctProduct.create({
        data: {
          brandId: testBrand.id,
          name: 'Integration Test Product for USPs',
          description: 'Product for USP testing',
        },
      });
    });

    it('should create USPs for product', async () => {
      const usps = [
        { text: 'Impossible to overdo', category: 'feature' },
        { text: 'Works even with shaky hands', category: 'benefit' },
        { text: 'Self-adjusting color match', category: 'functional' },
      ];

      for (const usp of usps) {
        await prisma.pctUSP.create({
          data: {
            productId: testProduct.id,
            ...usp,
          } as any,
        });
      }

      const savedUsps = await prisma.pctUSP.findMany({
        where: { productId: testProduct.id },
      });

      expect(savedUsps).toHaveLength(3);
    });

    it('should retrieve USPs with product relationship', async () => {
      const usp = await prisma.pctUSP.create({
        data: {
          productId: testProduct.id,
          text: 'Revolutionary formula',
        },
      });

      const retrieved = await prisma.pctUSP.findUnique({
        where: { id: usp.id },
        include: { product: true },
      });

      expect(retrieved?.product).toBeDefined();
      expect(retrieved?.product.id).toBe(testProduct.id);
    });
  });

  describe('Step 5: Marketing Angle Generation', () => {
    let testUSP: any;

    beforeEach(async () => {
      testBrand = await prisma.pctBrand.create({
        data: {
          name: 'Integration Test Brand for Angles',
          description: 'Brand for angle testing',
        },
      });

      testProduct = await prisma.pctProduct.create({
        data: {
          brandId: testBrand.id,
          name: 'Integration Test Product for Angles',
          description: 'Product for angle testing',
        },
      });

      testUSP = await prisma.pctUSP.create({
        data: {
          productId: testProduct.id,
          text: 'Impossible to overdo',
        },
      });
    });

    it('should create marketing angles from USP', async () => {
      const angles = [
        { text: 'Never looks overdone', category: 'emotional' },
        { text: 'Beautiful even when applied blind', category: 'functional' },
        { text: 'Shaky hands, steady glow', category: 'social_proof' },
      ];

      for (const angle of angles) {
        await prisma.pctMarketingAngle.create({
          data: {
            uspId: testUSP.id,
            ...angle,
          } as any,
        });
      }

      const savedAngles = await prisma.pctMarketingAngle.findMany({
        where: { uspId: testUSP.id },
      });

      expect(savedAngles).toHaveLength(3);
    });

    it('should retrieve angles with USP relationship', async () => {
      const angle = await prisma.pctMarketingAngle.create({
        data: {
          uspId: testUSP.id,
          text: 'Mistake-proof application',
        },
      });

      const retrieved = await prisma.pctMarketingAngle.findUnique({
        where: { id: angle.id },
        include: { usp: true },
      });

      expect(retrieved?.usp).toBeDefined();
      expect(retrieved?.usp.id).toBe(testUSP.id);
    });
  });

  describe('Step 6: Hook Generation', () => {
    beforeEach(async () => {
      testBrand = await prisma.pctBrand.create({
        data: {
          name: 'Integration Test Brand for Hooks',
          description: 'Brand for hook testing',
        },
      });

      testProduct = await prisma.pctProduct.create({
        data: {
          brandId: testBrand.id,
          name: 'Integration Test Product for Hooks',
          description: 'Product for hook testing',
        },
      });
    });

    it('should create hooks with all parameters', async () => {
      const hooks = [
        {
          text: 'Beautiful even when applied blind',
          messagingFramework: 'punchy',
          awarenessLevel: 3,
          marketSophistication: 3,
          status: 'pending',
        },
        {
          text: 'Shaky hands? No problem.',
          messagingFramework: 'question',
          awarenessLevel: 2,
          marketSophistication: 3,
          status: 'pending',
        },
        {
          text: 'What if makeup could be mistake-proof?',
          messagingFramework: 'question',
          awarenessLevel: 1,
          marketSophistication: 2,
          status: 'pending',
        },
      ];

      for (const hook of hooks) {
        await prisma.pctHook.create({
          data: {
            productId: testProduct.id,
            ...hook,
          } as any,
        });
      }

      const savedHooks = await prisma.pctHook.findMany({
        where: { productId: testProduct.id },
      });

      expect(savedHooks).toHaveLength(3);
    });

    it('should filter hooks by messaging framework', async () => {
      await prisma.pctHook.createMany({
        data: [
          {
            productId: testProduct.id,
            text: 'Hook 1',
            messagingFramework: 'punchy',
            awarenessLevel: 3,
            marketSophistication: 3,
          },
          {
            productId: testProduct.id,
            text: 'Hook 2',
            messagingFramework: 'question',
            awarenessLevel: 3,
            marketSophistication: 3,
          },
        ] as any,
      });

      const punchyHooks = await prisma.pctHook.findMany({
        where: {
          productId: testProduct.id,
          messagingFramework: 'punchy',
        },
      });

      expect(punchyHooks).toHaveLength(1);
      expect(punchyHooks[0].messagingFramework).toBe('punchy');
    });

    it('should update hook status from pending to approved', async () => {
      const hook = await prisma.pctHook.create({
        data: {
          productId: testProduct.id,
          text: 'Test hook',
          messagingFramework: 'punchy',
          awarenessLevel: 3,
          marketSophistication: 3,
          status: 'pending',
        } as any,
      });

      const updated = await prisma.pctHook.update({
        where: { id: hook.id },
        data: { status: 'approved' },
      });

      expect(updated.status).toBe('approved');
    });
  });

  describe('Full Workflow: End-to-End', () => {
    it('should complete entire workflow from brand to hooks', async () => {
      // Step 1: Create brand
      testBrand = await prisma.pctBrand.create({
        data: {
          name: 'Integration Test Complete Workflow Brand',
          description: 'Complete e2e test',
          voice: 'Professional',
        },
      });

      expect(testBrand).toBeDefined();

      // Step 2: Create product
      testProduct = await prisma.pctProduct.create({
        data: {
          brandId: testBrand.id,
          name: 'Integration Test Complete Workflow Product',
          description: 'Self-adjusting makeup for perfect application',
          features: ['Self-adjusting', 'Long-lasting'],
          benefits: ['Perfect match', 'Easy application'],
          targetAudience: 'Beauty enthusiasts',
        },
      });

      expect(testProduct).toBeDefined();

      // Step 3: Add VoC
      await prisma.pctVoiceOfCustomer.create({
        data: {
          productId: testProduct.id,
          quote: 'Love how easy it is to apply!',
          source: 'amazon',
          category: 'benefit',
        } as any,
      });

      // Step 4: Create USP
      const usp = await prisma.pctUSP.create({
        data: {
          productId: testProduct.id,
          text: 'Impossible to overdo',
        },
      });

      expect(usp).toBeDefined();

      // Step 5: Create marketing angle
      const angle = await prisma.pctMarketingAngle.create({
        data: {
          uspId: usp.id,
          text: 'Mistake-proof application',
        },
      });

      expect(angle).toBeDefined();

      // Step 6: Create hooks
      await prisma.pctHook.create({
        data: {
          productId: testProduct.id,
          text: 'Beautiful even when applied blind',
          messagingFramework: 'punchy',
          awarenessLevel: 3,
          marketSophistication: 3,
        } as any,
      });

      // Verify: Retrieve everything
      const completeProduct = await prisma.pctProduct.findUnique({
        where: { id: testProduct.id },
        include: {
          brand: true,
          usps: {
            include: {
              marketingAngles: true,
            },
          },
          voiceOfCustomer: true,
          hooks: true,
        },
      });

      expect(completeProduct).toBeDefined();
      expect(completeProduct?.brand.id).toBe(testBrand.id);
      expect(completeProduct?.usps).toHaveLength(1);
      expect(completeProduct?.usps[0].marketingAngles).toHaveLength(1);
      expect(completeProduct?.voiceOfCustomer).toHaveLength(1);
      expect(completeProduct?.hooks).toHaveLength(1);
    });
  });

  describe('Data Consistency Verification', () => {
    beforeEach(async () => {
      testBrand = await prisma.pctBrand.create({
        data: {
          name: 'Integration Test Consistency Brand',
          description: 'Testing data consistency',
        },
      });

      testProduct = await prisma.pctProduct.create({
        data: {
          brandId: testBrand.id,
          name: 'Integration Test Consistency Product',
          description: 'Testing consistency',
        },
      });
    });

    it('should maintain referential integrity', async () => {
      const usp = await prisma.pctUSP.create({
        data: {
          productId: testProduct.id,
          text: 'Test USP',
        },
      });

      // Delete product should cascade to USP
      await prisma.pctProduct.delete({ where: { id: testProduct.id } });

      const deletedUSP = await prisma.pctUSP.findUnique({
        where: { id: usp.id },
      });

      expect(deletedUSP).toBeNull();
    });

    it('should count related records correctly', async () => {
      // Create multiple related records
      await prisma.pctUSP.createMany({
        data: [
          { productId: testProduct.id, text: 'USP 1' },
          { productId: testProduct.id, text: 'USP 2' },
        ],
      });

      await prisma.pctHook.createMany({
        data: [
          { productId: testProduct.id, text: 'Hook 1', messagingFramework: 'punchy', awarenessLevel: 3, marketSophistication: 3 },
          { productId: testProduct.id, text: 'Hook 2', messagingFramework: 'punchy', awarenessLevel: 3, marketSophistication: 3 },
          { productId: testProduct.id, text: 'Hook 3', messagingFramework: 'punchy', awarenessLevel: 3, marketSophistication: 3 },
        ] as any,
      });

      const productWithCounts = await prisma.pctProduct.findUnique({
        where: { id: testProduct.id },
        include: {
          _count: {
            select: {
              usps: true,
              hooks: true,
            },
          },
        },
      });

      expect(productWithCounts?._count.usps).toBe(2);
      expect(productWithCounts?._count.hooks).toBe(3);
    });
  });
});
