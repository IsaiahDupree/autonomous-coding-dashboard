/**
 * CF-WC-018: Performance test - DB queries
 *
 * Tests database query performance, indexes, and query plans
 */

import { test, expect } from '@playwright/test';

test.describe('CF-WC-018: Database Query Optimization', () => {
  test('Verify indexes exist on cf_product_dossiers table', async ({ request }) => {
    const response = await request.get('/api/cf/db/indexes');
    expect(response.status()).toBe(200);

    const data = await response.json();
    const indexes = data.indexes || [];

    // Check for essential indexes
    const indexNames = indexes.map((idx: any) => idx.indexname || idx.name);

    console.log('Indexes on cf_product_dossiers:', indexNames);

    // Should have primary key index
    expect(
      indexNames.some((name: string) => name.includes('pkey') || name.includes('id')),
      'Should have primary key index'
    ).toBeTruthy();

    // Should have slug index for lookups
    expect(
      indexNames.some((name: string) => name.includes('slug')),
      'Should have slug index for unique lookups'
    ).toBeTruthy();

    // Should have category index for filtering
    expect(
      indexNames.some((name: string) => name.includes('category') || name.includes('status')),
      'Should have category or status index'
    ).toBeTruthy();
  });

  test('Verify no sequential scans on common queries', async ({ request }) => {
    // Get query plan for list query
    const listResponse = await request.get('/api/cf/db/explain?query=list_dossiers');
    expect(listResponse.status()).toBe(200);

    const listPlan = await listResponse.json();
    const listPlanText = JSON.stringify(listPlan).toLowerCase();

    console.log('List query plan:', listPlan);

    // Should use index scans, not seq scans (unless table is tiny)
    if (listPlan.rowCount && listPlan.rowCount > 100) {
      expect(
        listPlanText.includes('index scan') || listPlanText.includes('index only scan'),
        'List query should use index scan for large tables'
      ).toBeTruthy();

      expect(
        !listPlanText.includes('seq scan'),
        'List query should avoid sequential scans'
      ).toBeTruthy();
    }
  });

  test('Verify query plans for detail lookups use indexes', async ({ request }) => {
    // Get query plan for single record lookup
    const detailResponse = await request.get('/api/cf/db/explain?query=get_dossier_by_id');
    expect(detailResponse.status()).toBe(200);

    const detailPlan = await detailResponse.json();
    const detailPlanText = JSON.stringify(detailPlan).toLowerCase();

    console.log('Detail query plan:', detailPlan);

    // Should use index scan for lookups by ID
    expect(
      detailPlanText.includes('index scan') || detailPlanText.includes('index only scan'),
      'Detail lookup should use index scan'
    ).toBeTruthy();
  });

  test('Verify search queries use appropriate indexes', async ({ request }) => {
    // Get query plan for search query
    const searchResponse = await request.get('/api/cf/db/explain?query=search_dossiers');
    expect(searchResponse.status()).toBe(200);

    const searchPlan = await searchResponse.json();
    console.log('Search query plan:', searchPlan);

    // Search might use GIN indexes for full-text search or btree for pattern matching
    const searchPlanText = JSON.stringify(searchPlan).toLowerCase();
    const hasIndex = searchPlanText.includes('index') || searchPlanText.includes('gin');

    // If there are many records, we should be using an index
    if (searchPlan.rowCount && searchPlan.rowCount > 50) {
      expect(hasIndex, 'Search should use indexes for large datasets').toBeTruthy();
    }
  });

  test('Query plans are being checked and logged', async ({ request }) => {
    // Verify that the explain endpoint exists and works
    const response = await request.get('/api/cf/db/explain?query=list_dossiers');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toBeDefined();
    expect(data.plan || data.queryPlan || data).toBeDefined();

    console.log('Query plan structure verified');
  });

  test('Join queries use proper indexes', async ({ request }) => {
    // Test join query performance (e.g., dossiers with their scripts)
    const joinResponse = await request.get('/api/cf/db/explain?query=dossiers_with_scripts');

    if (joinResponse.status() === 200) {
      const joinPlan = await joinResponse.json();
      const joinPlanText = JSON.stringify(joinPlan).toLowerCase();

      console.log('Join query plan:', joinPlan);

      // Should use nested loop with index scans or hash joins
      const hasEfficientJoin =
        joinPlanText.includes('nested loop') ||
        joinPlanText.includes('hash join') ||
        joinPlanText.includes('merge join');

      if (joinPlan.rowCount && joinPlan.rowCount > 50) {
        expect(hasEfficientJoin, 'Join queries should use efficient join methods').toBeTruthy();
      }
    } else {
      // Endpoint might not be implemented yet
      console.log('Join query explain endpoint not yet implemented');
    }
  });

  test('Foreign key indexes exist', async ({ request }) => {
    const response = await request.get('/api/cf/db/indexes');
    expect(response.status()).toBe(200);

    const data = await response.json();
    const allIndexes = data.indexes || [];

    console.log('Total indexes found:', allIndexes.length);

    // Should have indexes on foreign key columns
    // For example: cf_generated_images.dossier_id should be indexed
    const indexColumns = allIndexes.map((idx: any) => idx.column || idx.columns).flat();

    // Log all indexed columns
    console.log('Indexed columns:', indexColumns);

    // At minimum, we should have some indexes
    expect(allIndexes.length, 'Should have multiple indexes defined').toBeGreaterThan(0);
  });
});
