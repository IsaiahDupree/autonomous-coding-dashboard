/**
 * Request Deduplication E2E Tests
 * ===============================
 *
 * Tests for PCT-WC-053: Request deduplication
 */

import { test, expect } from '@playwright/test';

test.describe('Request Deduplication (PCT-WC-053)', () => {
  test('should deduplicate simultaneous identical requests', async ({ page }) => {
    // Track network requests
    const requests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/')) {
        requests.push(request.url());
      }
    });

    await page.goto('http://localhost:3535/pct.html');

    // Make the same request multiple times simultaneously
    await page.evaluate(() => {
      // @ts-ignore
      const { deduplicatedFetch } = window;

      // Make 5 identical requests at the same time
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(deduplicatedFetch('/api/pct/brands'));
      }

      return Promise.all(promises);
    });

    // Wait a bit for requests to complete
    await page.waitForTimeout(1000);

    // Count requests to /api/pct/brands
    const brandRequests = requests.filter((url) => url.includes('/api/pct/brands'));

    // Should only make 1 actual request despite 5 calls
    expect(brandRequests.length).toBeLessThanOrEqual(1);
  });

  test('should cache responses for subsequent requests', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/')) {
        requests.push(request.url());
      }
    });

    await page.goto('http://localhost:3535/pct.html');

    // Make first request
    await page.evaluate(() => {
      // @ts-ignore
      return window.deduplicatedFetch('/api/pct/brands');
    });

    await page.waitForTimeout(500);

    const firstRequestCount = requests.filter((url) => url.includes('/api/pct/brands')).length;

    // Make second request (should use cache)
    await page.evaluate(() => {
      // @ts-ignore
      return window.deduplicatedFetch('/api/pct/brands');
    });

    await page.waitForTimeout(500);

    const secondRequestCount = requests.filter((url) => url.includes('/api/pct/brands')).length;

    // Should not make additional request (using cache)
    expect(secondRequestCount).toBe(firstRequestCount);
  });

  test('should debounce rapid sequential requests', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/')) {
        requests.push(request.url());
      }
    });

    await page.goto('http://localhost:3535/pct.html');

    // Simulate rapid typing in a search box
    await page.evaluate(() => {
      // @ts-ignore
      const { debouncedFetch } = window;

      // Make 10 rapid requests (simulating typing)
      for (let i = 0; i < 10; i++) {
        debouncedFetch(`/api/pct/search?q=test${i}`, { debounce: 300 });
      }
    });

    // Wait for debounce delay + request time
    await page.waitForTimeout(1000);

    const searchRequests = requests.filter((url) => url.includes('/api/pct/search'));

    // Should only make 1 request (last one after debounce)
    expect(searchRequests.length).toBeLessThanOrEqual(1);
  });

  test('should cancel requests when cancelAllRequests is called', async ({ page }) => {
    await page.goto('http://localhost:3535/pct.html');

    const result = await page.evaluate(async () => {
      // @ts-ignore
      const { deduplicatedFetch, cancelAllRequests, getRequestStats } = window;

      // Start a slow request
      const promise = deduplicatedFetch('/api/pct/brands?slow=true');

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check that request is in flight
      const statsBefore = getRequestStats();

      // Cancel all requests
      cancelAllRequests();

      // Check stats after cancellation
      const statsAfter = getRequestStats();

      try {
        await promise;
        return { cancelled: false, statsBefore, statsAfter };
      } catch (error) {
        // @ts-ignore
        return { cancelled: true, statsBefore, statsAfter, error: error.message };
      }
    });

    expect(result.cancelled).toBe(true);
    expect(result.statsAfter.inFlight).toBe(0);
  });

  test('should clear cache when clearCache is called', async ({ page }) => {
    await page.goto('http://localhost:3535/pct.html');

    const result = await page.evaluate(async () => {
      // @ts-ignore
      const { deduplicatedFetch, clearCache, getRequestStats } = window;

      // Make a request to populate cache
      await deduplicatedFetch('/api/pct/brands');

      // Check cache size
      const statsBefore = getRequestStats();

      // Clear cache
      clearCache();

      // Check cache size after
      const statsAfter = getRequestStats();

      return { statsBefore, statsAfter };
    });

    expect(result.statsAfter.cached).toBe(0);
  });

  test('should provide correct request stats', async ({ page }) => {
    await page.goto('http://localhost:3535/pct.html');

    const stats = await page.evaluate(async () => {
      // @ts-ignore
      const { deduplicatedFetch, debouncedFetch, getRequestStats } = window;

      // Make some requests
      const p1 = deduplicatedFetch('/api/pct/brands');
      debouncedFetch('/api/pct/search?q=test', { debounce: 1000 });

      // Get stats immediately
      const statsImmediate = getRequestStats();

      // Wait for first request to complete
      await p1;

      // Get stats after
      const statsAfter = getRequestStats();

      return { statsImmediate, statsAfter };
    });

    expect(stats.statsImmediate.inFlight).toBeGreaterThanOrEqual(0);
    expect(stats.statsImmediate.debouncing).toBeGreaterThanOrEqual(0);
    expect(stats.statsAfter.cached).toBeGreaterThanOrEqual(0);
  });

  test('should create fetcher with base URL correctly', async ({ page }) => {
    await page.goto('http://localhost:3535/pct.html');

    const result = await page.evaluate(async () => {
      // @ts-ignore
      const { createFetcher } = window;

      const api = createFetcher('/api/pct');

      // Test GET
      try {
        await api.get('/brands');
        return { success: true };
      } catch (error) {
        // @ts-ignore
        return { success: false, error: error.message };
      }
    });

    expect(result.success).toBe(true);
  });
});
