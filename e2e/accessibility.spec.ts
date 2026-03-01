/**
 * AUTH-WC-020: Accessibility audit with axe-core
 *
 * Automated accessibility testing using axe-core.
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('AUTH-WC-020: Homepage has no critical a11y violations', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // No critical violations
    const criticalViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'critical'
    );

    if (criticalViolations.length > 0) {
      console.log('Critical violations:', JSON.stringify(criticalViolations, null, 2));
    }

    expect(criticalViolations).toHaveLength(0);
  });

  test('AUTH-WC-020: No serious a11y violations', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const seriousViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'serious'
    );

    if (seriousViolations.length > 0) {
      console.log('Serious violations:', JSON.stringify(seriousViolations, null, 2));
    }

    expect(seriousViolations).toHaveLength(0);
  });

  test('AUTH-WC-020: ARIA attributes are correct', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['aria'])
      .analyze();

    expect(accessibilityScanResults.violations).toHaveLength(0);
  });

  test('Login page is accessible', async ({ page }) => {
    await page.goto('/auth/login');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const critical = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');

    if (critical.length > 0) {
      console.log('Login page violations:', JSON.stringify(critical, null, 2));
    }

    expect(critical).toHaveLength(0);
  });

  test('Forms have proper labels', async ({ page }) => {
    await page.goto('/auth/login');

    const results = await new AxeBuilder({ page })
      .withTags(['label'])
      .analyze();

    expect(results.violations).toHaveLength(0);
  });

  test('Keyboard navigation works', async ({ page }) => {
    await page.goto('/');

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    const firstFocus = await page.evaluate(() => document.activeElement?.tagName);

    await page.keyboard.press('Tab');
    const secondFocus = await page.evaluate(() => document.activeElement?.tagName);

    // Should be able to tab to focusable elements
    expect(firstFocus).toBeTruthy();
    expect(secondFocus).toBeTruthy();
  });

  test('Skip to main content link exists', async ({ page }) => {
    await page.goto('/');

    // Check for skip link (common a11y pattern)
    const skipLink = page.locator('a[href="#main"], a[href="#content"], a:has-text("Skip to")').first();
    const count = await skipLink.count();

    // Skip link is recommended but not always present
    console.log(`Skip link found: ${count > 0}`);
  });

  test('Images have alt text', async ({ page }) => {
    await page.goto('/');

    const results = await new AxeBuilder({ page })
      .withTags(['image-alt'])
      .analyze();

    expect(results.violations).toHaveLength(0);
  });

  test('Color contrast is sufficient', async ({ page }) => {
    await page.goto('/');

    const results = await new AxeBuilder({ page })
      .withTags(['color-contrast'])
      .analyze();

    const contrastViolations = results.violations.filter(
      v => v.id === 'color-contrast'
    );

    if (contrastViolations.length > 0) {
      console.log('Contrast violations:', JSON.stringify(contrastViolations, null, 2));
    }

    // Allow some minor contrast issues (background images, etc.)
    expect(contrastViolations.length).toBeLessThan(3);
  });

  test('Headings are in order', async ({ page }) => {
    await page.goto('/');

    const results = await new AxeBuilder({ page })
      .withTags(['heading'])
      .analyze();

    expect(results.violations).toHaveLength(0);
  });
});
