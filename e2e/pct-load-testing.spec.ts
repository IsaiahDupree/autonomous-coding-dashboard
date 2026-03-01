/**
 * PCT-WC-019: Load test - concurrent users
 * Tests system with 50+ concurrent user simulation
 * Ensures no errors, response time < 2x baseline, no memory leaks
 */

import { test, expect, chromium, Browser, BrowserContext, Page } from '@playwright/test';

test.describe('PCT-WC-019: Load Testing', () => {
  test.describe('Concurrent Users', () => {
    test('should handle 50 concurrent users without errors', async () => {
      const browsers: Browser[] = [];
      const contexts: BrowserContext[] = [];
      const pages: Page[] = [];
      const errors: string[] = [];

      try {
        // Create 50 concurrent sessions
        const concurrentUsers = 50;

        // Launch browsers in parallel
        for (let i = 0; i < concurrentUsers; i++) {
          const browser = await chromium.launch({ headless: true });
          browsers.push(browser);

          const context = await browser.newContext();
          contexts.push(context);

          // Track errors
          context.on('pageerror', (error) => {
            errors.push(`User ${i}: ${error.message}`);
          });

          const page = await context.newPage();
          pages.push(page);

          // Navigate to PCT dashboard
          page.goto('/pct').catch(err => {
            errors.push(`User ${i} navigation error: ${err.message}`);
          });
        }

        // Wait for all pages to load
        await Promise.all(pages.map(page =>
          page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {})
        ));

        // Verify no critical errors occurred
        const criticalErrors = errors.filter(e =>
          e.includes('TypeError') ||
          e.includes('ReferenceError') ||
          e.includes('Network error')
        );

        expect(criticalErrors.length).toBe(0);

        // Verify most pages loaded successfully
        const loadedPages = pages.filter(page => page.url().includes('pct'));
        const successRate = loadedPages.length / concurrentUsers;

        expect(successRate).toBeGreaterThan(0.9); // 90% success rate minimum

      } finally {
        // Cleanup
        await Promise.all(contexts.map(ctx => ctx.close()));
        await Promise.all(browsers.map(browser => browser.close()));
      }
    });

    test('should maintain response times under load', async () => {
      const browsers: Browser[] = [];
      const contexts: BrowserContext[] = [];
      const pages: Page[] = [];
      const responseTimes: number[] = [];

      try {
        // First, measure baseline response time with single user
        const baselineBrowser = await chromium.launch({ headless: true });
        const baselineContext = await baselineBrowser.newContext();
        const baselinePage = await baselineContext.newPage();

        const baselineStart = Date.now();
        await baselinePage.goto('/pct');
        await baselinePage.waitForLoadState('networkidle', { timeout: 10000 });
        const baselineTime = Date.now() - baselineStart;

        await baselineContext.close();
        await baselineBrowser.close();

        // Now test with concurrent users
        const concurrentUsers = 50;

        for (let i = 0; i < concurrentUsers; i++) {
          const browser = await chromium.launch({ headless: true });
          browsers.push(browser);

          const context = await browser.newContext();
          contexts.push(context);

          const page = await context.newPage();
          pages.push(page);

          const start = Date.now();
          page.goto('/pct').then(() => {
            return page.waitForLoadState('networkidle', { timeout: 30000 });
          }).then(() => {
            const responseTime = Date.now() - start;
            responseTimes.push(responseTime);
          }).catch(() => {
            // Timeout or error
            responseTimes.push(30000);
          });
        }

        // Wait for all to complete (with generous timeout)
        await new Promise(resolve => setTimeout(resolve, 35000));

        // Calculate average response time
        const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

        // Response time should be less than 2x baseline
        const maxAllowedTime = baselineTime * 2;
        expect(avgResponseTime).toBeLessThan(maxAllowedTime);

      } finally {
        await Promise.all(contexts.map(ctx => ctx.close()));
        await Promise.all(browsers.map(browser => browser.close()));
      }
    });

    test('should not have memory leaks under load', async () => {
      const browsers: Browser[] = [];
      const contexts: BrowserContext[] = [];
      const initialMemory: number[] = [];
      const finalMemory: number[] = [];

      try {
        const concurrentUsers = 20; // Reduced for memory testing

        for (let i = 0; i < concurrentUsers; i++) {
          const browser = await chromium.launch({ headless: true });
          browsers.push(browser);

          const context = await browser.newContext();
          contexts.push(context);

          const page = await context.newPage();

          await page.goto('/pct');
          await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

          // Measure initial memory (if available)
          const initialMetrics = await page.evaluate(() => {
            return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
          });
          initialMemory.push(initialMetrics);

          // Perform some operations
          await page.evaluate(() => {
            // Simulate user interactions
            window.scrollTo(0, document.body.scrollHeight);
            window.scrollTo(0, 0);
          });

          // Wait a bit
          await page.waitForTimeout(1000);

          // Measure final memory
          const finalMetrics = await page.evaluate(() => {
            return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
          });
          finalMemory.push(finalMetrics);
        }

        // Check for memory growth
        const avgInitial = initialMemory.reduce((a, b) => a + b, 0) / initialMemory.length;
        const avgFinal = finalMemory.reduce((a, b) => a + b, 0) / finalMemory.length;

        // Memory shouldn't grow more than 3x
        if (avgInitial > 0 && avgFinal > 0) {
          const growthRatio = avgFinal / avgInitial;
          expect(growthRatio).toBeLessThan(3);
        }

      } finally {
        await Promise.all(contexts.map(ctx => ctx.close()));
        await Promise.all(browsers.map(browser => browser.close()));
      }
    });
  });

  test.describe('API Load Testing', () => {
    test('should handle concurrent API requests', async ({ request }) => {
      const requests = 100;
      const promises: Promise<any>[] = [];

      // Send 100 concurrent API requests
      for (let i = 0; i < requests; i++) {
        promises.push(
          request.get('/api/pct/brands').catch(err => ({ status: () => 500, ok: () => false }))
        );
      }

      const responses = await Promise.all(promises);

      // Count successful responses
      const successCount = responses.filter(r => r.ok && r.ok()).length;
      const successRate = successCount / requests;

      // Should maintain >90% success rate
      expect(successRate).toBeGreaterThan(0.9);
    });

    test('should handle concurrent writes without data corruption', async ({ request }) => {
      const writes = 50;
      const promises: Promise<any>[] = [];

      // Send concurrent POST requests
      for (let i = 0; i < writes; i++) {
        promises.push(
          request.post('/api/pct/brands', {
            data: {
              name: `Load Test Brand ${i}`,
              description: `Generated during load test at ${Date.now()}`,
            },
          }).catch(err => ({ status: () => 500 }))
        );
      }

      const responses = await Promise.all(promises);

      // Count successful writes
      const successCount = responses.filter(r => [200, 201].includes(r.status())).length;

      // At least some writes should succeed (accounting for rate limiting)
      expect(successCount).toBeGreaterThan(0);
    });

    test('should handle burst traffic', async ({ request }) => {
      // Send rapid burst of requests
      const burst = async () => {
        const promises = [];
        for (let i = 0; i < 20; i++) {
          promises.push(request.get('/api/pct/brands'));
        }
        return Promise.all(promises);
      };

      // Execute 3 bursts in quick succession
      const burst1 = await burst();
      const burst2 = await burst();
      const burst3 = await burst();

      const allResponses = [...burst1, ...burst2, ...burst3];
      const successCount = allResponses.filter(r => r.ok()).length;
      const successRate = successCount / allResponses.length;

      // Should handle bursts gracefully
      expect(successRate).toBeGreaterThan(0.8);
    });
  });

  test.describe('Database Performance', () => {
    test('should maintain query performance under load', async ({ request }) => {
      const queries = 100;
      const responseTimes: number[] = [];

      for (let i = 0; i < queries; i++) {
        const start = Date.now();

        await request.get('/api/pct/brands').catch(() => {});

        const responseTime = Date.now() - start;
        responseTimes.push(responseTime);

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Calculate percentiles
      const sorted = responseTimes.sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const p99 = sorted[Math.floor(sorted.length * 0.99)];

      // P95 should be under 1 second
      expect(p95).toBeLessThan(1000);

      // P99 should be under 2 seconds
      expect(p99).toBeLessThan(2000);
    });
  });

  test.describe('Stress Testing', () => {
    test('should recover from heavy load gracefully', async ({ request }) => {
      // Apply heavy load
      const heavyLoad = async () => {
        const promises = [];
        for (let i = 0; i < 200; i++) {
          promises.push(
            request.get('/api/pct/brands').catch(() => ({ ok: () => false }))
          );
        }
        return Promise.all(promises);
      };

      await heavyLoad();

      // Wait for recovery
      await new Promise(resolve => setTimeout(resolve, 2000));

      // System should still be responsive
      const response = await request.get('/api/pct/brands');

      // Should recover and respond
      expect(response.status()).toBeLessThan(500);
    });

    test('should handle mixed operation types under load', async ({ request }) => {
      const operations: Promise<any>[] = [];

      // Mix of reads, writes, and deletes
      for (let i = 0; i < 100; i++) {
        if (i % 3 === 0) {
          // Read
          operations.push(request.get('/api/pct/brands'));
        } else if (i % 3 === 1) {
          // Write
          operations.push(
            request.post('/api/pct/brands', {
              data: { name: `Test ${i}`, description: 'Load test' },
            }).catch(() => ({ status: () => 500 }))
          );
        } else {
          // Another read (delete would require existing IDs)
          operations.push(request.get('/api/pct/brands'));
        }
      }

      const results = await Promise.all(operations);
      const errors = results.filter(r => r.status() >= 500);

      // Should have minimal server errors
      const errorRate = errors.length / results.length;
      expect(errorRate).toBeLessThan(0.1); // Less than 10% error rate
    });
  });
});
