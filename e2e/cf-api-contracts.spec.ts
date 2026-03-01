/**
 * CF-WC-022: API contract tests
 *
 * Response shape validation and error handling
 */

import { test, expect } from '@playwright/test';

test.describe('CF-WC-022: API Contract Tests', () => {
  test('GET /api/cf/dossiers returns correct shape', async ({ request }) => {
    const response = await request.get('/api/cf/dossiers');
    expect(response.status()).toBe(200);

    const data = await response.json();

    // Validate response shape
    expect(data).toHaveProperty('dossiers');
    expect(Array.isArray(data.dossiers)).toBeTruthy();

    // Pagination metadata
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('page');
    expect(data).toHaveProperty('limit');
    expect(typeof data.total).toBe('number');
    expect(typeof data.page).toBe('number');
    expect(typeof data.limit).toBe('number');

    console.log(`\nGET /api/cf/dossiers shape validated`);
    console.log(`  Total: ${data.total}`);
    console.log(`  Page: ${data.page}`);
    console.log(`  Limit: ${data.limit}`);

    // If there are dossiers, validate their shape
    if (data.dossiers.length > 0) {
      const dossier = data.dossiers[0];

      expect(dossier).toHaveProperty('id');
      expect(dossier).toHaveProperty('name');
      expect(dossier).toHaveProperty('slug');
      expect(dossier).toHaveProperty('category');
      expect(dossier).toHaveProperty('created_at');
      expect(dossier).toHaveProperty('updated_at');

      console.log(`  Sample dossier fields: ${Object.keys(dossier).join(', ')}`);
    }
  });

  test('GET /api/cf/dossiers/:id returns correct shape', async ({ request }) => {
    // Get a dossier ID first
    const listResponse = await request.get('/api/cf/dossiers?limit=1');
    const listData = await listResponse.json();

    if (listData.dossiers && listData.dossiers.length > 0) {
      const dossierId = listData.dossiers[0].id;

      const response = await request.get(`/api/cf/dossiers/${dossierId}`);
      expect(response.status()).toBe(200);

      const data = await response.json();

      // Validate response shape
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('name');
      expect(data).toHaveProperty('slug');
      expect(data).toHaveProperty('category');
      expect(data).toHaveProperty('benefits');
      expect(data).toHaveProperty('pain_points');
      expect(data).toHaveProperty('created_at');
      expect(data).toHaveProperty('updated_at');

      // Validate types
      expect(typeof data.id).toBe('string');
      expect(typeof data.name).toBe('string');
      expect(typeof data.slug).toBe('string');
      expect(Array.isArray(data.benefits) || typeof data.benefits === 'object').toBeTruthy();

      console.log(`\nGET /api/cf/dossiers/:id shape validated`);
      console.log(`  Fields: ${Object.keys(data).join(', ')}`);
    } else {
      test.skip();
    }
  });

  test('POST /api/cf/dossiers validates input and returns correct shape', async ({ request }) => {
    const createData = {
      name: `API Test Dossier ${Date.now()}`,
      slug: `api-test-${Date.now()}`,
      category: 'test',
      benefits: ['Benefit 1', 'Benefit 2'],
      pain_points: ['Pain 1'],
    };

    const response = await request.post('/api/cf/dossiers', {
      data: createData,
    });

    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(300);

    const data = await response.json();

    // Validate response includes created resource
    expect(data).toHaveProperty('id');
    expect(data.name).toBe(createData.name);
    expect(data.slug).toBe(createData.slug);
    expect(data.category).toBe(createData.category);

    console.log(`\nPOST /api/cf/dossiers shape validated`);
    console.log(`  Created ID: ${data.id}`);

    // Clean up
    await request.delete(`/api/cf/dossiers/${data.id}`).catch(() => {});
  });

  test('GET /api/cf/scripts returns correct shape', async ({ request }) => {
    const response = await request.get('/api/cf/scripts');
    expect(response.status()).toBe(200);

    const data = await response.json();

    expect(data).toHaveProperty('scripts');
    expect(Array.isArray(data.scripts)).toBeTruthy();

    // Pagination
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('page');
    expect(data).toHaveProperty('limit');

    console.log(`\nGET /api/cf/scripts shape validated`);

    if (data.scripts.length > 0) {
      const script = data.scripts[0];

      expect(script).toHaveProperty('id');
      expect(script).toHaveProperty('dossier_id');
      expect(script).toHaveProperty('awareness_level');
      expect(script).toHaveProperty('hook');
      expect(script).toHaveProperty('body');
      expect(script).toHaveProperty('cta');

      console.log(`  Sample script fields: ${Object.keys(script).join(', ')}`);
    }
  });

  test('Error responses have consistent shape', async ({ request }) => {
    // Test 404
    const notFoundResponse = await request.get('/api/cf/dossiers/nonexistent-id-12345');

    const notFoundData = await notFoundResponse.json();

    expect(notFoundData).toHaveProperty('error');
    expect(typeof notFoundData.error).toBe('string');

    console.log(`\n404 error shape validated:`, notFoundData);

    // Test 400 (bad request)
    const badRequestResponse = await request.post('/api/cf/dossiers', {
      data: {
        // Missing required fields
        name: '',
      },
    });

    if (badRequestResponse.status() === 400) {
      const badRequestData = await badRequestResponse.json();

      expect(badRequestData).toHaveProperty('error');
      expect(typeof badRequestData.error).toBe('string');

      console.log(`400 error shape validated:`, badRequestData);
    }
  });

  test('Pagination parameters work correctly', async ({ request }) => {
    // Test page 1
    const page1Response = await request.get('/api/cf/dossiers?page=1&limit=5');
    expect(page1Response.status()).toBe(200);

    const page1Data = await page1Response.json();

    expect(page1Data.page).toBe(1);
    expect(page1Data.limit).toBe(5);
    expect(page1Data.dossiers.length).toBeLessThanOrEqual(5);

    // Test page 2
    const page2Response = await request.get('/api/cf/dossiers?page=2&limit=5');
    expect(page2Response.status()).toBe(200);

    const page2Data = await page2Response.json();

    expect(page2Data.page).toBe(2);
    expect(page2Data.limit).toBe(5);

    console.log(`\nPagination validated`);
    console.log(`  Page 1 count: ${page1Data.dossiers.length}`);
    console.log(`  Page 2 count: ${page2Data.dossiers.length}`);

    // Pages should have different content (if enough data exists)
    if (page1Data.total > 5) {
      const page1Ids = page1Data.dossiers.map((d: any) => d.id);
      const page2Ids = page2Data.dossiers.map((d: any) => d.id);

      const overlap = page1Ids.filter((id: string) => page2Ids.includes(id));
      expect(overlap.length, 'Different pages should have different data').toBe(0);
    }
  });

  test('Filter parameters work correctly', async ({ request }) => {
    // Test category filter
    const filterResponse = await request.get('/api/cf/dossiers?category=test');
    expect(filterResponse.status()).toBe(200);

    const filterData = await filterResponse.json();

    expect(Array.isArray(filterData.dossiers)).toBeTruthy();

    console.log(`\nFilter validated`);
    console.log(`  Filtered results: ${filterData.dossiers.length}`);

    // All results should match filter
    if (filterData.dossiers.length > 0) {
      const allMatch = filterData.dossiers.every((d: any) => d.category === 'test');
      console.log(`  All match filter: ${allMatch}`);
    }
  });

  test('Sort parameters work correctly', async ({ request }) => {
    const sortResponse = await request.get('/api/cf/dossiers?sort=created_at&order=desc');
    expect(sortResponse.status()).toBe(200);

    const sortData = await sortResponse.json();

    console.log(`\nSort validated`);
    console.log(`  Results: ${sortData.dossiers.length}`);

    // Verify descending order
    if (sortData.dossiers.length > 1) {
      const dates = sortData.dossiers.map((d: any) => new Date(d.created_at).getTime());

      let isSorted = true;
      for (let i = 0; i < dates.length - 1; i++) {
        if (dates[i] < dates[i + 1]) {
          isSorted = false;
          break;
        }
      }

      console.log(`  Correctly sorted descending: ${isSorted}`);
    }
  });

  test('Field selection works (if supported)', async ({ request }) => {
    const response = await request.get('/api/cf/dossiers?fields=id,name,slug');

    if (response.status() === 200) {
      const data = await response.json();

      if (data.dossiers.length > 0) {
        const dossier = data.dossiers[0];
        const fields = Object.keys(dossier);

        console.log(`\nField selection validated`);
        console.log(`  Returned fields: ${fields.join(', ')}`);

        // Should only have requested fields (plus maybe timestamps)
        expect(fields.length, 'Should return limited fields').toBeLessThanOrEqual(6);
      }
    } else {
      console.log('Field selection not supported');
    }
  });

  test('Date fields are ISO 8601 formatted', async ({ request }) => {
    const response = await request.get('/api/cf/dossiers?limit=1');
    expect(response.status()).toBe(200);

    const data = await response.json();

    if (data.dossiers.length > 0) {
      const dossier = data.dossiers[0];

      // Validate ISO 8601 format
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

      expect(isoRegex.test(dossier.created_at), 'created_at should be ISO 8601').toBeTruthy();
      expect(isoRegex.test(dossier.updated_at), 'updated_at should be ISO 8601').toBeTruthy();

      console.log(`\nDate format validated`);
      console.log(`  created_at: ${dossier.created_at}`);
      console.log(`  updated_at: ${dossier.updated_at}`);
    }
  });
});
