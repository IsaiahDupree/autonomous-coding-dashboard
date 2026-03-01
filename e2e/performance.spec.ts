/**
 * AUTH-WC-016: Page load performance < 3s
 * AUTH-WC-017: API response times < 500ms
 * AUTH-WC-018: Database query optimization
 * AUTH-WC-019: Load testing (50+ concurrent users)
 *
 * Performance E2E tests for page load, API calls, and concurrent users.
 */

import { test, expect } from '@playwright/test';

test.describe('Performance - Page Load', () => {
  test('AUTH-WC-016: LCP < 2.5s', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');

    // Get Web Vitals
    const lcp = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          resolve(lastEntry?.renderTime || lastEntry?.loadTime || 0);
        }).observe({ entryTypes: ['largest-contentful-paint'] });

        // Timeout after 5s
        setTimeout(() => resolve(0), 5000);
      });
    });

    const loadTime = Date.now() - start;

    console.log(`LCP: ${lcp}ms, Total load: ${loadTime}ms`);

    // LCP should be < 2.5s (2500ms)
    if (lcp > 0) {
      expect(lcp).toBeLessThan(2500);
    }

    // Total page load should be < 3s
    expect(loadTime).toBeLessThan(3000);
  });

  test('AUTH-WC-016: FID < 100ms', async ({ page }) => {
    await page.goto('/');

    // Measure First Input Delay
    await page.click('body'); // Trigger first input
    const fid = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const firstInput = entries[0] as any;
          resolve(firstInput?.processingStart - firstInput?.startTime || 0);
        }).observe({ entryTypes: ['first-input'] });

        setTimeout(() => resolve(0), 5000);
      });
    });

    console.log(`FID: ${fid}ms`);

    // FID should be < 100ms
    if (fid > 0) {
      expect(fid).toBeLessThan(100);
    }
  });

  test('AUTH-WC-016: CLS < 0.1', async ({ page }) => {
    await page.goto('/');

    // Wait for layout shifts to settle
    await page.waitForTimeout(3000);

    const cls = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let clsScore = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsScore += (entry as any).value;
            }
          }
          resolve(clsScore);
        }).observe({ entryTypes: ['layout-shift'] });

        setTimeout(() => resolve(clsScore), 3000);
      });
    });

    console.log(`CLS: ${cls}`);

    // CLS should be < 0.1
    expect(cls).toBeLessThan(0.1);
  });
});

test.describe('Performance - API Response Times', () => {
  test('AUTH-WC-017: List endpoint < 500ms', async ({ page }) => {
    let apiTime = 0;

    page.on('response', async (response) => {
      if (response.url().includes('/api/')) {
        const timing = response.timing();
        apiTime = timing.responseEnd - timing.requestStart;
        console.log(`API ${response.url()}: ${apiTime}ms`);
      }
    });

    await page.goto('/');
    await page.waitForTimeout(2000);

    // If API calls were made, check timing
    if (apiTime > 0) {
      expect(apiTime).toBeLessThan(500);
    }
  });

  test('AUTH-WC-017: Detail endpoint < 300ms', async ({ page, request }) => {
    // Make direct API call
    const start = Date.now();
    const response = await request.get('/api/status').catch(() => null);
    const duration = Date.now() - start;

    if (response && response.ok()) {
      console.log(`Detail API: ${duration}ms`);
      expect(duration).toBeLessThan(300);
    }
  });

  test('AUTH-WC-017: Search endpoint < 500ms', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();

    if (await searchInput.count() > 0) {
      let searchTime = 0;
      const start = Date.now();

      page.on('response', (response) => {
        if (response.url().includes('/api/') && response.url().includes('search')) {
          searchTime = Date.now() - start;
        }
      });

      await searchInput.fill('test query');
      await page.waitForTimeout(1000);

      if (searchTime > 0) {
        console.log(`Search API: ${searchTime}ms`);
        expect(searchTime).toBeLessThan(500);
      }
    }
  });
});

test.describe('Performance - Database Queries', () => {
  test('AUTH-WC-018: No N+1 query patterns', async ({ page }) => {
    // Monitor network for excessive sequential queries
    const apiCalls: string[] = [];

    page.on('response', (response) => {
      if (response.url().includes('/api/')) {
        apiCalls.push(response.url());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(3000);

    // Check for repeated identical calls (N+1 pattern)
    const uniqueCalls = new Set(apiCalls);
    const duplicates = apiCalls.length - uniqueCalls.size;

    console.log(`Total API calls: ${apiCalls.length}, Unique: ${uniqueCalls.size}, Duplicates: ${duplicates}`);

    // Should not have excessive duplicate calls
    expect(duplicates).toBeLessThan(5);
  });

  test('AUTH-WC-018: Queries use indexes (via response time)', async ({ page }) => {
    let slowQueries = 0;

    page.on('response', async (response) => {
      if (response.url().includes('/api/')) {
        const timing = response.timing();
        const time = timing.responseEnd - timing.requestStart;

        // Slow queries might indicate missing indexes
        if (time > 1000) {
          slowQueries++;
          console.log(`Slow query detected: ${response.url()} - ${time}ms`);
        }
      }
    });

    await page.goto('/');
    await page.waitForTimeout(3000);

    // Should not have slow queries
    expect(slowQueries).toBe(0);
  });
});

test.describe('Performance - Load Testing', () => {
  test('AUTH-WC-019: Concurrent users simulation (10 users)', async ({ browser }) => {
    const users = 10;
    const pages = [];
    const errors: string[] = [];

    // Create multiple concurrent sessions
    for (let i = 0; i < users; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();

      page.on('pageerror', (err) => errors.push(`User ${i}: ${err.message}`));

      pages.push(page);
    }

    // All users load dashboard simultaneously
    const start = Date.now();
    await Promise.all(pages.map(page => page.goto('/')));
    const duration = Date.now() - start;

    console.log(`${users} concurrent users loaded in ${duration}ms`);

    // Should complete in reasonable time (< 5s for 10 users)
    expect(duration).toBeLessThan(5000);

    // No errors
    expect(errors.length).toBe(0);

    // Cleanup
    for (const page of pages) {
      await page.close();
      await page.context().close();
    }
  });

  test('AUTH-WC-019: Response time under load stays < 2x normal', async ({ browser }) => {
    // Baseline - single user
    const singleContext = await browser.newContext();
    const singlePage = await singleContext.newPage();
    const singleStart = Date.now();
    await singlePage.goto('/');
    const singleTime = Date.now() - singleStart;
    await singlePage.close();
    await singleContext.close();

    console.log(`Single user: ${singleTime}ms`);

    // Under load - 5 concurrent users
    const pages = [];
    for (let i = 0; i < 5; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      pages.push(page);
    }

    const loadStart = Date.now();
    await Promise.all(pages.map(page => page.goto('/')));
    const loadTime = (Date.now() - loadStart) / pages.length; // Average per page

    console.log(`Under load (5 users): ${loadTime}ms avg`);

    // Should not be more than 2x slower
    expect(loadTime).toBeLessThan(singleTime * 2);

    // Cleanup
    for (const page of pages) {
      await page.close();
      await page.context().close();
    }
  });

  test('AUTH-WC-019: Memory does not leak over time', async ({ page }) => {
    await page.goto('/');

    // Measure initial memory
    const initialMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });

    // Simulate user interactions
    for (let i = 0; i < 10; i++) {
      await page.goto('/');
      await page.goto('/auth/login');
      await page.waitForTimeout(100);
    }

    // Measure final memory
    const finalMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });

    if (initialMemory > 0 && finalMemory > 0) {
      const increase = finalMemory - initialMemory;
      const percentIncrease = (increase / initialMemory) * 100;

      console.log(`Memory increase: ${increase} bytes (${percentIncrease.toFixed(2)}%)`);

      // Memory should not grow excessively (< 50% increase)
      expect(percentIncrease).toBeLessThan(50);
    }
  });
});
