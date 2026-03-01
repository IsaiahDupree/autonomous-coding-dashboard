/**
 * PCT-WC-022: API contract tests
 * Response shape validation - shapes match, errors typed, pagination
 */

import { test, expect } from '@playwright/test';
import { z } from 'zod';

// Define expected response schemas using Zod
const BrandSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),
  voice: z.string().optional().nullable(),
  values: z.string().optional().nullable(),
  toneStyle: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  colors: z.array(z.string()).optional().nullable(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const ProductSchema = z.object({
  id: z.string(),
  brandId: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),
  features: z.array(z.string()).optional().nullable(),
  benefits: z.array(z.string()).optional().nullable(),
  targetAudience: z.string().optional().nullable(),
  price: z.number().optional().nullable(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const USPSchema = z.object({
  id: z.string(),
  productId: z.string(),
  text: z.string(),
  category: z.string().optional().nullable(),
  score: z.number().optional().nullable(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const MarketingAngleSchema = z.object({
  id: z.string(),
  uspId: z.string(),
  text: z.string(),
  category: z.string().optional().nullable(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const HookSchema = z.object({
  id: z.string(),
  angleId: z.string(),
  text: z.string(),
  framework: z.string().optional().nullable(),
  awarenessLevel: z.number().optional().nullable(),
  sophisticationLevel: z.number().optional().nullable(),
  approved: z.boolean().optional().nullable(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const ErrorSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  status: z.number().optional(),
  details: z.unknown().optional(),
});

const PaginationSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

const SuccessResponseSchema = z.object({
  data: z.unknown(),
  pagination: PaginationSchema.optional(),
});

const ErrorResponseSchema = z.object({
  error: ErrorSchema,
});

test.describe('PCT-WC-022: API Contracts', () => {
  test.describe('Brand API Contracts', () => {
    test('GET /api/pct/brands should return correct shape', async ({ request }) => {
      const response = await request.get('/api/pct/brands');

      expect(response.ok()).toBeTruthy();

      const body = await response.json();

      // Should have data property
      expect(body).toHaveProperty('data');

      // Validate overall response structure
      const result = SuccessResponseSchema.safeParse(body);
      expect(result.success).toBeTruthy();

      // Validate each brand if data exists
      if (Array.isArray(body.data) && body.data.length > 0) {
        body.data.forEach((brand: unknown) => {
          const brandResult = BrandSchema.safeParse(brand);
          expect(brandResult.success).toBeTruthy();
        });
      }
    });

    test('POST /api/pct/brands should validate request and response', async ({ request }) => {
      const newBrand = {
        name: 'Test Brand API Contract',
        description: 'Testing API contracts',
        voice: 'Professional',
      };

      const response = await request.post('/api/pct/brands', {
        data: newBrand,
      });

      expect([200, 201, 400, 422]).toContain(response.status());

      const body = await response.json();

      if (response.ok()) {
        // Success response
        expect(body).toHaveProperty('data');

        const brandResult = BrandSchema.safeParse(body.data);
        expect(brandResult.success).toBeTruthy();
      } else {
        // Error response
        const errorResult = ErrorResponseSchema.safeParse(body);
        expect(errorResult.success).toBeTruthy();
      }
    });

    test('GET /api/pct/brands/:id should return single brand', async ({ request }) => {
      // First get a brand ID
      const listResponse = await request.get('/api/pct/brands');
      const listBody = await listResponse.json();

      if (Array.isArray(listBody.data) && listBody.data.length > 0) {
        const brandId = listBody.data[0].id;

        const response = await request.get(`/api/pct/brands/${brandId}`);

        if (response.ok()) {
          const body = await response.json();

          expect(body).toHaveProperty('data');

          const brandResult = BrandSchema.safeParse(body.data);
          expect(brandResult.success).toBeTruthy();
        }
      }
    });

    test('PUT /api/pct/brands/:id should validate update', async ({ request }) => {
      const listResponse = await request.get('/api/pct/brands');
      const listBody = await listResponse.json();

      if (Array.isArray(listBody.data) && listBody.data.length > 0) {
        const brandId = listBody.data[0].id;

        const updateData = {
          name: 'Updated Brand Name',
          description: 'Updated description',
        };

        const response = await request.put(`/api/pct/brands/${brandId}`, {
          data: updateData,
        });

        if (response.ok()) {
          const body = await response.json();
          const brandResult = BrandSchema.safeParse(body.data);
          expect(brandResult.success).toBeTruthy();
        } else {
          const body = await response.json();
          const errorResult = ErrorResponseSchema.safeParse(body);
          expect(errorResult.success).toBeTruthy();
        }
      }
    });
  });

  test.describe('Product API Contracts', () => {
    test('GET /api/pct/brands/:brandId/products should return correct shape', async ({ request }) => {
      // Get a brand first
      const brandsResponse = await request.get('/api/pct/brands');
      const brandsBody = await brandsResponse.json();

      if (Array.isArray(brandsBody.data) && brandsBody.data.length > 0) {
        const brandId = brandsBody.data[0].id;

        const response = await request.get(`/api/pct/brands/${brandId}/products`);

        if (response.ok()) {
          const body = await response.json();

          expect(body).toHaveProperty('data');

          if (Array.isArray(body.data) && body.data.length > 0) {
            body.data.forEach((product: unknown) => {
              const productResult = ProductSchema.safeParse(product);
              expect(productResult.success).toBeTruthy();
            });
          }
        }
      }
    });

    test('POST /api/pct/products should validate request and response', async ({ request }) => {
      const brandsResponse = await request.get('/api/pct/brands');
      const brandsBody = await brandsResponse.json();

      if (Array.isArray(brandsBody.data) && brandsBody.data.length > 0) {
        const brandId = brandsBody.data[0].id;

        const newProduct = {
          brandId,
          name: 'Test Product API Contract',
          description: 'Testing API contracts for products',
        };

        const response = await request.post('/api/pct/products', {
          data: newProduct,
        });

        const body = await response.json();

        if (response.ok()) {
          const productResult = ProductSchema.safeParse(body.data);
          expect(productResult.success).toBeTruthy();
        } else {
          const errorResult = ErrorResponseSchema.safeParse(body);
          expect(errorResult.success).toBeTruthy();
        }
      }
    });
  });

  test.describe('Error Response Contracts', () => {
    test('404 responses should have correct error shape', async ({ request }) => {
      const response = await request.get('/api/pct/brands/nonexistent-id-12345');

      expect(response.status()).toBe(404);

      const body = await response.json();

      const errorResult = ErrorResponseSchema.safeParse(body);
      expect(errorResult.success).toBeTruthy();

      expect(body.error).toHaveProperty('message');
      expect(typeof body.error.message).toBe('string');
    });

    test('400 responses should have correct error shape', async ({ request }) => {
      const response = await request.post('/api/pct/brands', {
        data: {
          // Missing required 'name' field
          description: 'No name provided',
        },
      });

      if (response.status() === 400) {
        const body = await response.json();

        const errorResult = ErrorResponseSchema.safeParse(body);
        expect(errorResult.success).toBeTruthy();
      }
    });

    test('500 responses should have correct error shape', async ({ request }) => {
      // Try to cause a server error (this may vary by implementation)
      const response = await request.post('/api/pct/brands', {
        data: {
          name: 'x'.repeat(10000), // Extremely long name
          description: 'Attempting to cause error',
        },
      });

      if (response.status() >= 500) {
        const body = await response.json();

        const errorResult = ErrorResponseSchema.safeParse(body);
        expect(errorResult.success).toBeTruthy();
      }
    });
  });

  test.describe('Pagination Contracts', () => {
    test('should include pagination metadata when applicable', async ({ request }) => {
      const response = await request.get('/api/pct/brands?page=1&pageSize=10');

      if (response.ok()) {
        const body = await response.json();

        // Check if pagination is present
        if (body.pagination) {
          const paginationResult = PaginationSchema.safeParse(body.pagination);
          expect(paginationResult.success).toBeTruthy();

          expect(body.pagination.page).toBeGreaterThanOrEqual(1);
          expect(body.pagination.pageSize).toBeGreaterThan(0);
          expect(body.pagination.total).toBeGreaterThanOrEqual(0);
          expect(body.pagination.totalPages).toBeGreaterThanOrEqual(0);
        }
      }
    });

    test('should respect page and pageSize parameters', async ({ request }) => {
      const pageSize = 5;
      const response = await request.get(`/api/pct/brands?page=1&pageSize=${pageSize}`);

      if (response.ok()) {
        const body = await response.json();

        if (Array.isArray(body.data)) {
          expect(body.data.length).toBeLessThanOrEqual(pageSize);
        }

        if (body.pagination) {
          expect(body.pagination.pageSize).toBe(pageSize);
        }
      }
    });

    test('should handle invalid pagination parameters', async ({ request }) => {
      const response = await request.get('/api/pct/brands?page=-1&pageSize=0');

      // Should either use defaults or return error
      expect([200, 400, 422]).toContain(response.status());

      const body = await response.json();

      if (response.ok()) {
        // Should have used default pagination
        expect(body).toHaveProperty('data');
      } else {
        // Should return error
        const errorResult = ErrorResponseSchema.safeParse(body);
        expect(errorResult.success).toBeTruthy();
      }
    });
  });

  test.describe('Nested Resource Contracts', () => {
    test('should handle nested USPs correctly', async ({ request }) => {
      const productsResponse = await request.get('/api/pct/brands');
      const brandsBody = await productsResponse.json();

      if (Array.isArray(brandsBody.data) && brandsBody.data.length > 0) {
        const brand = brandsBody.data[0];

        if (brand.products && brand.products.length > 0) {
          const productId = brand.products[0].id;

          const uspsResponse = await request.get(`/api/pct/products/${productId}/usps`);

          if (uspsResponse.ok()) {
            const body = await uspsResponse.json();

            if (Array.isArray(body.data) && body.data.length > 0) {
              body.data.forEach((usp: unknown) => {
                const uspResult = USPSchema.safeParse(usp);
                expect(uspResult.success).toBeTruthy();
              });
            }
          }
        }
      }
    });
  });

  test.describe('Response Consistency', () => {
    test('all success responses should have data property', async ({ request }) => {
      const endpoints = [
        '/api/pct/brands',
        '/api/pct/brands?page=1&pageSize=10',
      ];

      for (const endpoint of endpoints) {
        const response = await request.get(endpoint);

        if (response.ok()) {
          const body = await response.json();
          expect(body).toHaveProperty('data');
        }
      }
    });

    test('all error responses should have error property', async ({ request }) => {
      const endpoints = [
        '/api/pct/brands/nonexistent-id',
        '/api/pct/products/nonexistent-id',
      ];

      for (const endpoint of endpoints) {
        const response = await request.get(endpoint);

        if (!response.ok()) {
          const body = await response.json();
          expect(body).toHaveProperty('error');
        }
      }
    });

    test('timestamps should be in ISO 8601 format', async ({ request }) => {
      const response = await request.get('/api/pct/brands');

      if (response.ok()) {
        const body = await response.json();

        if (Array.isArray(body.data) && body.data.length > 0) {
          const item = body.data[0];

          if (item.createdAt) {
            expect(new Date(item.createdAt).toISOString()).toBeTruthy();
          }

          if (item.updatedAt) {
            expect(new Date(item.updatedAt).toISOString()).toBeTruthy();
          }
        }
      }
    });

    test('IDs should be consistent format', async ({ request }) => {
      const response = await request.get('/api/pct/brands');

      if (response.ok()) {
        const body = await response.json();

        if (Array.isArray(body.data) && body.data.length > 0) {
          body.data.forEach((item: any) => {
            expect(typeof item.id).toBe('string');
            expect(item.id.length).toBeGreaterThan(0);
          });
        }
      }
    });
  });

  test.describe('Content-Type Headers', () => {
    test('should return JSON content-type', async ({ request }) => {
      const response = await request.get('/api/pct/brands');

      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('application/json');
    });

    test('should accept JSON content-type for POST', async ({ request }) => {
      const response = await request.post('/api/pct/brands', {
        data: { name: 'Test' },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect([200, 201, 400, 422]).toContain(response.status());
    });
  });
});
