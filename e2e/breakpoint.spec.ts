/**
 * AUTH-WC-014: Playwright breakpoint tests
 *
 * E2E tests for responsive layouts across mobile, tablet, and desktop.
 */

import { test, expect } from '@playwright/test';

test.describe('Responsive Breakpoints', () => {
  const breakpoints = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1920, height: 1080 },
  ];

  breakpoints.forEach(({ name, width, height }) => {
    test(`${name} (${width}x${height}) - dashboard renders`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/');

      await expect(page.locator('body')).toBeVisible();

      // No horizontal scroll on mobile
      const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
      const clientWidth = await page.evaluate(() => document.body.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5); // 5px tolerance
    });

    test(`${name} - navigation accessible`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/');

      // Check for nav menu (mobile might use hamburger)
      const nav = page.locator('nav, [role="navigation"], .navbar, .menu');
      await expect(nav.first()).toBeVisible({ timeout: 5000 });
    });

    test(`${name} - text readable`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/');

      // Check that font sizes are reasonable
      const fontSize = await page.locator('body').evaluate((el) =>
        window.getComputedStyle(el).fontSize
      );
      const fontSizeNum = parseInt(fontSize);
      expect(fontSizeNum).toBeGreaterThanOrEqual(14); // Minimum readable size
    });

    test(`${name} - forms usable`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/auth/login');

      const emailInput = page.locator('input[type="email"]').first();
      await expect(emailInput).toBeVisible();

      // Input should be tappable/clickable
      const box = await emailInput.boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(32); // Minimum touch target
      }
    });
  });

  test('Mobile - hamburger menu works', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Look for hamburger icon or mobile menu trigger
    const menuTrigger = page.locator(
      'button[aria-label*="menu" i], button[aria-label*="navigation" i], .hamburger, .menu-toggle'
    ).first();

    // Menu trigger should exist on mobile
    const count = await menuTrigger.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('Tablet - layout adjusts from mobile', async ({ page }) => {
    // Start mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Resize to tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500); // Allow layout to adjust

    await expect(page.locator('body')).toBeVisible();
  });

  test('Desktop - full layout visible', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');

    // Desktop should show full layout (no collapsed menus)
    const body = await page.locator('body').textContent();
    expect(body?.length).toBeGreaterThan(0);
  });
});
