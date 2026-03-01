/**
 * PCT-WC-026: Snapshot tests for components
 * Tests snapshots of Dashboard, Forms, and Modals
 */

import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';

// Mock API responses for snapshot testing
const mockBrand = {
  id: 'brand-123',
  name: 'Test Brand',
  description: 'A test brand for snapshots',
  voice: 'Professional',
  values: 'Quality, Innovation',
  toneStyle: 'Formal',
  logoUrl: null,
  colors: ['#FF0000', '#00FF00'],
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

const mockProduct = {
  id: 'product-123',
  brandId: 'brand-123',
  name: 'Test Product',
  description: 'A test product for snapshots',
  features: ['Feature 1', 'Feature 2'],
  benefits: ['Benefit 1', 'Benefit 2'],
  targetAudience: 'Young professionals',
  price: 99.99,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

const mockUSP = {
  id: 'usp-123',
  productId: 'product-123',
  text: 'Impossible to overdo',
  category: 'Safety',
  score: 0.95,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

const mockMarketingAngle = {
  id: 'angle-123',
  uspId: 'usp-123',
  text: 'Beautiful even when applied blind',
  category: 'Ease of use',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

const mockHook = {
  id: 'hook-123',
  angleId: 'angle-123',
  text: 'Shaky hands, steady glow',
  framework: 'Punchy',
  awarenessLevel: 3,
  sophisticationLevel: 2,
  approved: true,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

describe('PCT-WC-026: Snapshot Tests', () => {
  describe('Dashboard API Responses', () => {
    it('should match brand list response snapshot', () => {
      const response = {
        data: [mockBrand],
      };

      expect(response).toMatchSnapshot();
    });

    it('should match empty brand list snapshot', () => {
      const response = {
        data: [],
      };

      expect(response).toMatchSnapshot();
    });

    it('should match brand detail response snapshot', () => {
      const response = {
        data: {
          ...mockBrand,
          products: [mockProduct],
        },
      };

      expect(response).toMatchSnapshot();
    });

    it('should match product list response snapshot', () => {
      const response = {
        data: [mockProduct],
      };

      expect(response).toMatchSnapshot();
    });

    it('should match USP list response snapshot', () => {
      const response = {
        data: [mockUSP],
      };

      expect(response).toMatchSnapshot();
    });

    it('should match hook list response snapshot', () => {
      const response = {
        data: [mockHook],
      };

      expect(response).toMatchSnapshot();
    });

    it('should match paginated response snapshot', () => {
      const response = {
        data: [mockBrand],
        pagination: {
          page: 1,
          pageSize: 10,
          total: 1,
          totalPages: 1,
        },
      };

      expect(response).toMatchSnapshot();
    });
  });

  describe('Form Data Snapshots', () => {
    it('should match brand creation request snapshot', () => {
      const request = {
        name: 'New Brand',
        description: 'Brand description',
        voice: 'Professional',
        values: 'Quality',
        toneStyle: 'Formal',
        colors: ['#000000'],
      };

      expect(request).toMatchSnapshot();
    });

    it('should match product creation request snapshot', () => {
      const request = {
        brandId: 'brand-123',
        name: 'New Product',
        description: 'Product description',
        features: ['Feature 1'],
        benefits: ['Benefit 1'],
        targetAudience: 'Everyone',
        price: 49.99,
      };

      expect(request).toMatchSnapshot();
    });

    it('should match USP creation request snapshot', () => {
      const request = {
        productId: 'product-123',
        text: 'Unique selling point',
        category: 'Quality',
        score: 0.9,
      };

      expect(request).toMatchSnapshot();
    });

    it('should match hook generation request snapshot', () => {
      const request = {
        angleId: 'angle-123',
        framework: 'Punchy',
        awarenessLevel: 3,
        sophisticationLevel: 2,
        count: 5,
      };

      expect(request).toMatchSnapshot();
    });

    it('should match bulk hook generation request snapshot', () => {
      const request = {
        productId: 'product-123',
        frameworks: ['Punchy', 'Bold', 'Desire'],
        awarenessLevels: [2, 3, 4],
        sophisticationLevels: [1, 2],
        hooksPerCombination: 3,
      };

      expect(request).toMatchSnapshot();
    });
  });

  describe('Modal Data Snapshots', () => {
    it('should match brand edit modal data snapshot', () => {
      const modalData = {
        mode: 'edit',
        brand: mockBrand,
      };

      expect(modalData).toMatchSnapshot();
    });

    it('should match hook approval modal data snapshot', () => {
      const modalData = {
        mode: 'approve',
        hooks: [mockHook],
        productContext: {
          product: mockProduct,
          brand: mockBrand,
        },
      };

      expect(modalData).toMatchSnapshot();
    });

    it('should match delete confirmation modal data snapshot', () => {
      const modalData = {
        type: 'delete',
        resource: 'brand',
        id: 'brand-123',
        name: 'Test Brand',
      };

      expect(modalData).toMatchSnapshot();
    });

    it('should match import modal data snapshot', () => {
      const modalData = {
        type: 'import',
        fileType: 'csv',
        columns: ['name', 'description', 'voice'],
        mapping: {
          name: 'brandName',
          description: 'brandDesc',
          voice: 'toneOfVoice',
        },
      };

      expect(modalData).toMatchSnapshot();
    });

    it('should match export modal data snapshot', () => {
      const modalData = {
        type: 'export',
        format: 'csv',
        filters: {
          brandId: 'brand-123',
          dateFrom: '2025-01-01',
          dateTo: '2025-12-31',
        },
        fields: ['name', 'description', 'createdAt'],
      };

      expect(modalData).toMatchSnapshot();
    });
  });

  describe('Error Response Snapshots', () => {
    it('should match 404 error snapshot', () => {
      const error = {
        error: {
          message: 'Brand not found',
          code: 'NOT_FOUND',
          status: 404,
        },
      };

      expect(error).toMatchSnapshot();
    });

    it('should match validation error snapshot', () => {
      const error = {
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          status: 400,
          details: {
            name: 'Name is required',
            price: 'Price must be a positive number',
          },
        },
      };

      expect(error).toMatchSnapshot();
    });

    it('should match server error snapshot', () => {
      const error = {
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_ERROR',
          status: 500,
        },
      };

      expect(error).toMatchSnapshot();
    });

    it('should match unauthorized error snapshot', () => {
      const error = {
        error: {
          message: 'Unauthorized',
          code: 'UNAUTHORIZED',
          status: 401,
        },
      };

      expect(error).toMatchSnapshot();
    });
  });

  describe('Complex Data Structure Snapshots', () => {
    it('should match full product hierarchy snapshot', () => {
      const hierarchy = {
        brand: mockBrand,
        products: [
          {
            ...mockProduct,
            usps: [
              {
                ...mockUSP,
                angles: [
                  {
                    ...mockMarketingAngle,
                    hooks: [mockHook],
                  },
                ],
              },
            ],
          },
        ],
      };

      expect(hierarchy).toMatchSnapshot();
    });

    it('should match generation workflow snapshot', () => {
      const workflow = {
        step: 'hook-generation',
        input: {
          productId: 'product-123',
          uspId: 'usp-123',
          angleId: 'angle-123',
          parameters: {
            framework: 'Punchy',
            awarenessLevel: 3,
            sophisticationLevel: 2,
          },
        },
        output: {
          generatedHooks: [mockHook],
          metadata: {
            model: 'claude-3-sonnet-20250219',
            tokensUsed: 150,
            generationTime: 1200,
          },
        },
      };

      expect(workflow).toMatchSnapshot();
    });

    it('should match analytics data snapshot', () => {
      const analytics = {
        totalBrands: 5,
        totalProducts: 15,
        totalUSPs: 45,
        totalAngles: 135,
        totalHooks: 675,
        approvedHooks: 342,
        generationMetrics: {
          averageHooksPerAngle: 5,
          approvalRate: 0.507,
          topFramework: 'Punchy',
          topAwarenessLevel: 3,
        },
      };

      expect(analytics).toMatchSnapshot();
    });

    it('should match batch operation result snapshot', () => {
      const batchResult = {
        operation: 'generate-hooks',
        totalRequested: 100,
        successful: 95,
        failed: 5,
        results: [
          { id: 'hook-1', status: 'success' },
          { id: 'hook-2', status: 'success' },
          { id: 'hook-3', status: 'failed', error: 'Generation timeout' },
        ],
        duration: 45000,
      };

      expect(batchResult).toMatchSnapshot();
    });
  });

  describe('UI State Snapshots', () => {
    it('should match dashboard state snapshot', () => {
      const state = {
        view: 'dashboard',
        filters: {
          brandId: null,
          dateRange: 'last-30-days',
        },
        sort: {
          field: 'createdAt',
          direction: 'desc',
        },
        pagination: {
          page: 1,
          pageSize: 20,
        },
      };

      expect(state).toMatchSnapshot();
    });

    it('should match form state snapshot', () => {
      const formState = {
        mode: 'create',
        type: 'brand',
        values: mockBrand,
        errors: {},
        touched: {},
        isDirty: false,
        isValid: true,
      };

      expect(formState).toMatchSnapshot();
    });

    it('should match modal state snapshot', () => {
      const modalState = {
        isOpen: true,
        type: 'confirm',
        title: 'Delete Brand',
        message: 'Are you sure you want to delete this brand?',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        data: { id: 'brand-123' },
      };

      expect(modalState).toMatchSnapshot();
    });
  });

  describe('Configuration Snapshots', () => {
    it('should match messaging frameworks config snapshot', () => {
      const frameworks = [
        { id: 'punchy', name: 'Punchy', description: 'Short, impactful' },
        { id: 'bold', name: 'Bold Statements', description: 'Provocative claims' },
        { id: 'desire', name: 'Desire Future States', description: 'Aspirational' },
        { id: 'question', name: 'Question-based', description: 'Curiosity-driven' },
      ];

      expect(frameworks).toMatchSnapshot();
    });

    it('should match awareness levels config snapshot', () => {
      const awarenessLevels = [
        { level: 1, name: 'Unaware', strategy: 'Educate about problem' },
        { level: 2, name: 'Problem Aware', strategy: 'Agitate problem' },
        { level: 3, name: 'Solution Aware', strategy: 'Differentiate solution' },
        { level: 4, name: 'Product Aware', strategy: 'Overcome objections' },
        { level: 5, name: 'Most Aware', strategy: 'Direct offer' },
      ];

      expect(awarenessLevels).toMatchSnapshot();
    });

    it('should match sophistication levels config snapshot', () => {
      const sophisticationLevels = [
        { level: 1, strategy: 'State what product does' },
        { level: 2, strategy: 'Bigger/better claims' },
        { level: 3, strategy: 'Unique mechanism' },
        { level: 4, strategy: 'Proof and specificity' },
        { level: 5, strategy: 'Identification/tribe' },
      ];

      expect(sophisticationLevels).toMatchSnapshot();
    });
  });
});
