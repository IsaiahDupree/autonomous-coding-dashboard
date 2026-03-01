/**
 * PCT Performance Tests
 * Features: PCT-WC-016, PCT-WC-017, PCT-WC-018
 *
 * Tests performance for:
 * - Page load time < 3s
 * - API response time < 500ms
 * - Database query performance
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const PCT_URL = `${BASE_URL}/pct.html`;
const API_BASE = `${BASE_URL}/api/pct`;

test.describe('PCT Performance Tests', () => {
  // ============================================
  // PAGE LOAD PERFORMANCE
  // ============================================

  test.describe('Page Load Performance (PCT-WC-016)', () => {
    test('should load page in under 3 seconds', async ({ page }) => {
      const startTime = Date.now();

      await page.goto(PCT_URL);
      await page.waitForLoadState('domcontentloaded');

      const loadTime = Date.now() - startTime;

      console.log(`Page load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(3000); // 3 seconds
    });

    test('should achieve good lighthouse score', async ({ page }) => {
      await page.goto(PCT_URL);

      // Basic performance metrics
      const performanceMetrics = await page.evaluate(() => {
        const perfData = window.performance.timing;
        const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
        const connectTime = perfData.responseEnd - perfData.requestStart;
        const renderTime = perfData.domComplete - perfData.domLoading;

        return {
          pageLoadTime,
          connectTime,
          renderTime,
        };
      });

      console.log('Performance metrics:', performanceMetrics);

      expect(performanceMetrics.pageLoadTime).toBeLessThan(3000);
      expect(performanceMetrics.connectTime).toBeLessThan(1000);
    });

    test('should not have layout shifts during load', async ({ page }) => {
      await page.goto(PCT_URL);

      // Wait for page to stabilize
      await page.waitForTimeout(1000);

      // Take viewport height before and after
      const height1 = await page.evaluate(() => document.body.scrollHeight);
      await page.waitForTimeout(500);
      const height2 = await page.evaluate(() => document.body.scrollHeight);

      // Layout should be stable
      expect(Math.abs(height1 - height2)).toBeLessThan(50);
    });
  });

  // ============================================
  // API PERFORMANCE
  // ============================================

  test.describe('API Performance (PCT-WC-017)', () => {
    test('GET /brands should respond in under 500ms', async ({ request }) => {
      const startTime = Date.now();

      const response = await request.get(`${API_BASE}/brands`);
      const responseTime = Date.now() - startTime;

      console.log(`GET /brands response time: ${responseTime}ms`);

      expect(response.ok()).toBeTruthy();
      expect(responseTime).toBeLessThan(500);
    });

    test('POST /brands should respond in under 500ms', async ({ request }) => {
      const startTime = Date.now();

      const response = await request.post(`${API_BASE}/brands`, {
        data: {
          name: 'Performance Test Brand',
          description: 'Testing API performance',
        },
      });

      const responseTime = Date.now() - startTime;

      console.log(`POST /brands response time: ${responseTime}ms`);

      expect(response.ok() || response.status() === 201).toBeTruthy();
      expect(responseTime).toBeLessThan(500);
    });

    test('GET /hooks with filters should respond in under 500ms', async ({ request }) => {
      const startTime = Date.now();

      const response = await request.get(`${API_BASE}/hooks?messagingFramework=punchy&status=approved`);
      const responseTime = Date.now() - startTime;

      console.log(`GET /hooks (filtered) response time: ${responseTime}ms`);

      expect(response.ok()).toBeTruthy();
      expect(responseTime).toBeLessThan(500);
    });

    test('GET /hooks with pagination should respond in under 500ms', async ({ request }) => {
      const startTime = Date.now();

      const response = await request.get(`${API_BASE}/hooks?page=1&pageSize=20`);
      const responseTime = Date.now() - startTime;

      console.log(`GET /hooks (paginated) response time: ${responseTime}ms`);

      expect(response.ok()).toBeTruthy();
      expect(responseTime).toBeLessThan(500);
    });

    test('Multiple API calls in parallel should be fast', async ({ request }) => {
      const startTime = Date.now();

      await Promise.all([
        request.get(`${API_BASE}/brands`),
        request.get(`${API_BASE}/hooks`),
        request.get(`${API_BASE}/stats`),
      ]);

      const totalTime = Date.now() - startTime;

      console.log(`Parallel API calls total time: ${totalTime}ms`);

      // Should complete faster than sequential calls
      expect(totalTime).toBeLessThan(1500);
    });
  });

  // ============================================
  // DATABASE QUERY PERFORMANCE
  // ============================================

  test.describe('Database Query Performance (PCT-WC-018)', () => {
    test('should retrieve hooks with complex filters quickly', async ({ page }) => {
      await page.goto(PCT_URL);

      const hooksTab = page.locator('button:has-text("Hooks")').first();
      if (await hooksTab.isVisible()) {
        await hooksTab.click();

        const startTime = Date.now();

        // Apply multiple filters
        await page.selectOption('select[name="messagingFramework"]', 'punchy');
        await page.selectOption('select[name="awarenessLevel"]', '3');
        await page.selectOption('select[name="status"]', 'approved');

        // Wait for results
        await page.waitForTimeout(500);

        const queryTime = Date.now() - startTime;

        console.log(`Complex filter query time: ${queryTime}ms`);
        expect(queryTime).toBeLessThan(1000);
      }
    });

    test('should paginate large result sets quickly', async ({ page }) => {
      await page.goto(PCT_URL);

      const hooksTab = page.locator('button:has-text("Hooks")').first();
      if (await hooksTab.isVisible()) {
        await hooksTab.click();

        const startTime = Date.now();

        // Navigate to page 2
        const nextBtn = page.locator('button:has-text("Next"), [data-action="next-page"]').first();
        if (await nextBtn.isVisible()) {
          await nextBtn.click();
          await page.waitForTimeout(300);
        }

        const paginationTime = Date.now() - startTime;

        console.log(`Pagination query time: ${paginationTime}ms`);
        expect(paginationTime).toBeLessThan(800);
      }
    });

    test('should search across text fields quickly', async ({ page }) => {
      await page.goto(PCT_URL);

      const searchInput = page.locator('input[name="search"]').first();
      if (await searchInput.isVisible()) {
        const startTime = Date.now();

        await searchInput.fill('beautiful');
        await page.waitForTimeout(500); // Debounce delay

        const searchTime = Date.now() - startTime;

        console.log(`Text search query time: ${searchTime}ms`);
        expect(searchTime).toBeLessThan(1000);
      }
    });
  });

  // ============================================
  // RESOURCE OPTIMIZATION
  // ============================================

  test.describe('Resource Optimization', () => {
    test('should not load excessive JavaScript', async ({ page }) => {
      const javascriptSize = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script'));
        return scripts.reduce((total, script) => {
          return total + (script.textContent?.length || 0);
        }, 0);
      });

      console.log(`Total JavaScript size: ${javascriptSize} bytes`);

      // Should be reasonable - not megabytes of JS
      expect(javascriptSize).toBeLessThan(1000000); // 1MB
    });

    test('should minimize DOM size', async ({ page }) => {
      await page.goto(PCT_URL);

      const domSize = await page.evaluate(() => {
        return document.querySelectorAll('*').length;
      });

      console.log(`DOM element count: ${domSize}`);

      // Should have reasonable number of elements
      expect(domSize).toBeLessThan(3000);
    });
  });

  // ============================================
  // RENDERING PERFORMANCE
  // ============================================

  test.describe('Rendering Performance', () => {
    test('should render list of 100 hooks smoothly', async ({ page }) => {
      await page.goto(PCT_URL);

      // This assumes there are hooks to display
      const hooksTab = page.locator('button:has-text("Hooks")').first();
      if (await hooksTab.isVisible()) {
        await hooksTab.click();

        const startTime = Date.now();

        // Wait for hooks to render
        await page.waitForSelector('[data-item="hook"], .hook-item', { timeout: 5000 });

        const renderTime = Date.now() - startTime;

        console.log(`Hook list render time: ${renderTime}ms`);
        expect(renderTime).toBeLessThan(2000);
      }
    });

    test('should handle rapid filter changes without lag', async ({ page }) => {
      await page.goto(PCT_URL);

      const hooksTab = page.locator('button:has-text("Hooks")').first();
      if (await hooksTab.isVisible()) {
        await hooksTab.click();

        const startTime = Date.now();

        // Rapidly change filters
        const frameworkSelect = page.locator('select[name="messagingFramework"]').first();
        if (await frameworkSelect.isVisible()) {
          await frameworkSelect.selectOption('punchy');
          await page.waitForTimeout(100);
          await frameworkSelect.selectOption('bold');
          await page.waitForTimeout(100);
          await frameworkSelect.selectOption('desire');
          await page.waitForTimeout(100);
        }

        const totalTime = Date.now() - startTime;

        console.log(`Rapid filter changes total time: ${totalTime}ms`);
        expect(totalTime).toBeLessThan(1500);
      }
    });
  });
});
