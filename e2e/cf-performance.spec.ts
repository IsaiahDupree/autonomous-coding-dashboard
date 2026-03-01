/**
 * CF-WC-016: Performance test - page load < 3s
 * CF-WC-017: Performance test - API < 500ms
 *
 * Tests Core Web Vitals and API performance for Content Factory pages
 */

import { test, expect, type Page } from '@playwright/test';

/**
 * Helper to measure Core Web Vitals
 */
async function measureWebVitals(page: Page) {
  // Inject web-vitals measuring script
  const vitals = await page.evaluate(() => {
    return new Promise((resolve) => {
      const metrics = {
        LCP: 0,
        FID: 0,
        CLS: 0,
        FCP: 0,
        TTFB: 0,
      };

      // Largest Contentful Paint
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        metrics.LCP = lastEntry.renderTime || lastEntry.loadTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });

      // Cumulative Layout Shift
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            metrics.CLS += (entry as any).value;
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });

      // First Contentful Paint
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        metrics.TTFB = navigation.responseStart - navigation.requestStart;
      }

      const paintEntries = performance.getEntriesByType('paint');
      const fcpEntry = paintEntries.find((entry) => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        metrics.FCP = fcpEntry.startTime;
      }

      // Wait for LCP to settle (typically happens within 3s)
      setTimeout(() => resolve(metrics), 3000);
    });
  });

  return vitals;
}

test.describe('CF-WC-016: Page Load Performance', () => {
  test('Creative Testing dashboard loads within 3 seconds with good Web Vitals', async ({ page }) => {
    const startTime = Date.now();

    // Navigate to Content Factory / Creative Testing page
    await page.goto('/creative-testing');

    // Wait for the page to be loaded
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Measure Web Vitals
    const vitals = await measureWebVitals(page) as any;

    console.log('Page Load Metrics:');
    console.log(`  Total Load Time: ${loadTime}ms`);
    console.log(`  LCP: ${vitals.LCP.toFixed(2)}ms`);
    console.log(`  FCP: ${vitals.FCP.toFixed(2)}ms`);
    console.log(`  CLS: ${vitals.CLS.toFixed(4)}`);
    console.log(`  TTFB: ${vitals.TTFB.toFixed(2)}ms`);

    // CF-WC-016 Acceptance Criteria
    expect(vitals.LCP, 'LCP should be < 2500ms').toBeLessThan(2500);
    expect(vitals.CLS, 'CLS should be < 0.1').toBeLessThan(0.1);
    expect(loadTime, 'Total page load should be < 3000ms').toBeLessThan(3000);
  });

  test('Product dossiers list page loads with good performance', async ({ page }) => {
    await page.goto('/creative-testing');

    const vitals = await measureWebVitals(page) as any;

    expect(vitals.LCP).toBeLessThan(2500);
    expect(vitals.CLS).toBeLessThan(0.1);

    // Verify content is visible
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('Scripts generation page loads with good performance', async ({ page }) => {
    await page.goto('/creative-testing/scripts');

    const vitals = await measureWebVitals(page) as any;

    expect(vitals.LCP).toBeLessThan(2500);
    expect(vitals.CLS).toBeLessThan(0.1);
  });

  test('Analytics page loads with good performance', async ({ page }) => {
    await page.goto('/creative-testing/analytics');

    const vitals = await measureWebVitals(page) as any;

    expect(vitals.LCP).toBeLessThan(2500);
    expect(vitals.CLS).toBeLessThan(0.1);
  });
});

test.describe('CF-WC-017: API Response Times', () => {
  test('GET /api/cf/dossiers responds in < 500ms', async ({ request }) => {
    const startTime = Date.now();
    const response = await request.get('/api/cf/dossiers');
    const responseTime = Date.now() - startTime;

    console.log(`GET /api/cf/dossiers: ${responseTime}ms`);

    expect(response.status()).toBe(200);
    expect(responseTime, 'List endpoint should respond in < 500ms').toBeLessThan(500);
  });

  test('GET /api/cf/dossiers/:id responds in < 300ms', async ({ request }) => {
    // First, get a list to find an ID
    const listResponse = await request.get('/api/cf/dossiers?limit=1');
    const listData = await listResponse.json();

    if (listData.dossiers && listData.dossiers.length > 0) {
      const dossierId = listData.dossiers[0].id;

      const startTime = Date.now();
      const response = await request.get(`/api/cf/dossiers/${dossierId}`);
      const responseTime = Date.now() - startTime;

      console.log(`GET /api/cf/dossiers/:id: ${responseTime}ms`);

      expect(response.status()).toBe(200);
      expect(responseTime, 'Detail endpoint should respond in < 300ms').toBeLessThan(300);
    } else {
      test.skip();
    }
  });

  test('GET /api/cf/dossiers with search responds in < 500ms', async ({ request }) => {
    const startTime = Date.now();
    const response = await request.get('/api/cf/dossiers?search=test');
    const responseTime = Date.now() - startTime;

    console.log(`GET /api/cf/dossiers?search=test: ${responseTime}ms`);

    expect(response.status()).toBe(200);
    expect(responseTime, 'Search endpoint should respond in < 500ms').toBeLessThan(500);
  });

  test('GET /api/cf/scripts responds in < 500ms', async ({ request }) => {
    const startTime = Date.now();
    const response = await request.get('/api/cf/scripts');
    const responseTime = Date.now() - startTime;

    console.log(`GET /api/cf/scripts: ${responseTime}ms`);

    expect(response.status()).toBe(200);
    expect(responseTime).toBeLessThan(500);
  });

  test('GET /api/cf/images responds in < 500ms', async ({ request }) => {
    const startTime = Date.now();
    const response = await request.get('/api/cf/images');
    const responseTime = Date.now() - startTime;

    console.log(`GET /api/cf/images: ${responseTime}ms`);

    expect(response.status()).toBe(200);
    expect(responseTime).toBeLessThan(500);
  });

  test('GET /api/cf/videos responds in < 500ms', async ({ request }) => {
    const startTime = Date.now();
    const response = await request.get('/api/cf/videos');
    const responseTime = Date.now() - startTime;

    console.log(`GET /api/cf/videos: ${responseTime}ms`);

    expect(response.status()).toBe(200);
    expect(responseTime).toBeLessThan(500);
  });

  test('GET /api/cf/published responds in < 500ms', async ({ request }) => {
    const startTime = Date.now();
    const response = await request.get('/api/cf/published');
    const responseTime = Date.now() - startTime;

    console.log(`GET /api/cf/published: ${responseTime}ms`);

    expect(response.status()).toBe(200);
    expect(responseTime).toBeLessThan(500);
  });
});
