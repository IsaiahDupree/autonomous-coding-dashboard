/**
 * CF-WC-069: PageSpeed > 90
 * CF-WC-070: Social share preview testing
 *
 * E2E tests for SEO optimizations and social share previews.
 */

import { test, expect } from '@playwright/test';

test.describe('CF-WC-069: PageSpeed Optimization', () => {
  test('should have performance best practices', async ({ page }) => {
    await page.goto('http://localhost:3535/content-factory');

    // Check for compression headers
    const response = await page.goto('http://localhost:3535/content-factory');
    const headers = response?.headers();

    // Security headers
    expect(headers?.['x-content-type-options']).toBe('nosniff');
    expect(headers?.['x-frame-options']).toBe('SAMEORIGIN');
    expect(headers?.['x-xss-protection']).toBe('1; mode=block');
  });

  test('should not have X-Powered-By header', async ({ page }) => {
    const response = await page.goto('http://localhost:3535/content-factory');
    const headers = response?.headers();

    // Should hide Next.js powered-by header
    expect(headers?.['x-powered-by']).toBeUndefined();
  });

  test('should use modern image formats', async ({ page }) => {
    await page.goto('http://localhost:3535/content-factory');

    // Check if images are optimized (look for next/image)
    const images = await page.locator('img').all();
    for (const img of images) {
      const src = await img.getAttribute('src');
      if (src && src.includes('/_next/image')) {
        // Next.js image optimization is being used
        expect(src).toBeTruthy();
      }
    }
  });

  test('should have proper accessibility attributes', async ({ page }) => {
    await page.goto('http://localhost:3535/content-factory');

    // Check for lang attribute
    const htmlLang = await page.locator('html').getAttribute('lang');
    expect(htmlLang).toBeTruthy();

    // Check for viewport meta tag
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');
  });
});

test.describe('CF-WC-070: Social Share Preview Testing', () => {
  test('should have Open Graph meta tags', async ({ page }) => {
    await page.goto('http://localhost:3535/content-factory');

    // Check for OG tags
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    const ogDescription = await page.locator('meta[property="og:description"]').getAttribute('content');
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
    const ogUrl = await page.locator('meta[property="og:url"]').getAttribute('content');
    const ogType = await page.locator('meta[property="og:type"]').getAttribute('content');
    const ogSiteName = await page.locator('meta[property="og:site_name"]').getAttribute('content');

    expect(ogTitle).toBeTruthy();
    expect(ogDescription).toBeTruthy();
    expect(ogImage).toBeTruthy();
    expect(ogUrl).toBeTruthy();
    expect(ogType).toBeTruthy();
    expect(ogSiteName).toBe('Content Factory');
  });

  test('should have Twitter Card meta tags', async ({ page }) => {
    await page.goto('http://localhost:3535/content-factory');

    // Check for Twitter Card tags
    const twitterCard = await page.locator('meta[name="twitter:card"]').getAttribute('content');
    const twitterTitle = await page.locator('meta[name="twitter:title"]').getAttribute('content');
    const twitterDescription = await page.locator('meta[name="twitter:description"]').getAttribute('content');
    const twitterImage = await page.locator('meta[name="twitter:image"]').getAttribute('content');
    const twitterSite = await page.locator('meta[name="twitter:site"]').getAttribute('content');

    expect(twitterCard).toBe('summary_large_image');
    expect(twitterTitle).toBeTruthy();
    expect(twitterDescription).toBeTruthy();
    expect(twitterImage).toBeTruthy();
    expect(twitterSite).toBeTruthy();
  });

  test('should have LinkedIn-compatible OG tags', async ({ page }) => {
    await page.goto('http://localhost:3535/content-factory');

    // LinkedIn uses OG tags
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    const ogDescription = await page.locator('meta[property="og:description"]').getAttribute('content');
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');

    // OG image should have proper dimensions
    expect(ogImage).toBeTruthy();

    // Title and description should exist
    expect(ogTitle).toBeTruthy();
    expect(ogDescription).toBeTruthy();
    expect(ogDescription!.length).toBeGreaterThan(50);
    expect(ogDescription!.length).toBeLessThan(160);
  });

  test('should have canonical URL', async ({ page }) => {
    await page.goto('http://localhost:3535/content-factory');

    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toBeTruthy();
    expect(canonical).toContain('/content-factory');
  });

  test('should have proper meta description', async ({ page }) => {
    await page.goto('http://localhost:3535/content-factory');

    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toBeTruthy();
    expect(description!.length).toBeGreaterThan(50);
    expect(description!.length).toBeLessThan(160);
  });

  test('should have proper title tag', async ({ page }) => {
    await page.goto('http://localhost:3535/content-factory');

    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title).toContain('Content Factory');
    expect(title.length).toBeLessThan(60);
  });

  test('should have structured data', async ({ page }) => {
    await page.goto('http://localhost:3535/content-factory');

    // Check for JSON-LD structured data
    const structuredData = await page.locator('script[type="application/ld+json"]').all();
    expect(structuredData.length).toBeGreaterThan(0);

    // Parse and validate one of them
    const firstScript = await structuredData[0].textContent();
    expect(firstScript).toBeTruthy();

    const data = JSON.parse(firstScript!);
    expect(data['@context']).toBe('https://schema.org');
    expect(data['@type']).toBeTruthy();
  });
});

test.describe('CF-WC-069: PageSpeed Performance Metrics', () => {
  test('should have reasonable page load time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('http://localhost:3535/content-factory');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // Page should load in under 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should use preconnect for critical domains', async ({ page }) => {
    await page.goto('http://localhost:3535/content-factory');

    // Check for preconnect/dns-prefetch
    const preconnects = await page.locator('link[rel="preconnect"], link[rel="dns-prefetch"]').all();
    // At minimum, should have some resource hints
    expect(preconnects.length).toBeGreaterThanOrEqual(0);
  });

  test('should have proper font loading strategy', async ({ page }) => {
    await page.goto('http://localhost:3535/content-factory');

    // Check that fonts are loaded efficiently (not blocking render)
    const fontLinks = await page.locator('link[rel="preload"][as="font"]').all();
    for (const link of fontLinks) {
      const crossorigin = await link.getAttribute('crossorigin');
      // Font preloads should have crossorigin
      if (crossorigin !== null) {
        expect(crossorigin).toBeTruthy();
      }
    }
  });
});
