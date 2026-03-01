/**
 * CF-WC-021: Visual regression tests
 *
 * Screenshot comparison for Content Factory UI components
 */

import { test, expect } from '@playwright/test';

test.describe('CF-WC-021: Visual Regression Tests', () => {
  test('Dashboard page visual snapshot', async ({ page }) => {
    await page.goto('/creative-testing');
    await page.waitForLoadState('networkidle');

    // Wait for any animations to complete
    await page.waitForTimeout(500);

    // Take snapshot of the entire page
    await expect(page).toHaveScreenshot('cf-dashboard.png', {
      fullPage: true,
      maxDiffPixels: 100, // Allow small differences
    });

    console.log('Dashboard visual snapshot captured');
  });

  test('Product dossiers list visual snapshot', async ({ page }) => {
    await page.goto('/creative-testing');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Focus on the main content area
    const mainContent = page.locator('main, [role="main"], .main-content').first();

    if (await mainContent.count() > 0) {
      await expect(mainContent).toHaveScreenshot('cf-dossiers-list.png', {
        maxDiffPixels: 50,
      });
    } else {
      await expect(page).toHaveScreenshot('cf-dossiers-list.png', {
        maxDiffPixels: 50,
      });
    }

    console.log('Dossiers list visual snapshot captured');
  });

  test('Scripts generation page visual snapshot', async ({ page }) => {
    await page.goto('/creative-testing/scripts');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('cf-scripts-page.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });

    console.log('Scripts page visual snapshot captured');
  });

  test('Analytics page visual snapshot', async ({ page }) => {
    await page.goto('/creative-testing/analytics');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('cf-analytics-page.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });

    console.log('Analytics page visual snapshot captured');
  });

  test('Settings page visual snapshot', async ({ page }) => {
    await page.goto('/creative-testing/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('cf-settings-page.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });

    console.log('Settings page visual snapshot captured');
  });

  test('Form elements visual snapshot', async ({ page }) => {
    await page.goto('/creative-testing');
    await page.waitForLoadState('networkidle');

    // Look for forms or buttons to trigger a create/edit modal
    const createButton = page.locator('button:has-text("Create"), button:has-text("New"), button:has-text("Add")').first();

    if (await createButton.count() > 0) {
      await createButton.click();
      await page.waitForTimeout(300);

      // Snapshot the form/modal
      const modal = page.locator('[role="dialog"], .modal, form').first();
      if (await modal.count() > 0) {
        await expect(modal).toHaveScreenshot('cf-form-modal.png', {
          maxDiffPixels: 50,
        });
        console.log('Form modal visual snapshot captured');
      }
    } else {
      console.log('No create button found, skipping form snapshot');
    }
  });

  test('Mobile viewport visual snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
    await page.goto('/creative-testing');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('cf-dashboard-mobile.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });

    console.log('Mobile viewport visual snapshot captured');
  });

  test('Tablet viewport visual snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad size
    await page.goto('/creative-testing');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('cf-dashboard-tablet.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });

    console.log('Tablet viewport visual snapshot captured');
  });

  test('Dark mode visual snapshot (if supported)', async ({ page }) => {
    await page.goto('/creative-testing');
    await page.waitForLoadState('networkidle');

    // Try to enable dark mode
    const darkModeToggle = page.locator('[aria-label*="dark" i], [aria-label*="theme" i], button:has-text("Dark")').first();

    if (await darkModeToggle.count() > 0) {
      await darkModeToggle.click();
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot('cf-dashboard-dark.png', {
        fullPage: true,
        maxDiffPixels: 150,
      });

      console.log('Dark mode visual snapshot captured');
    } else {
      // Force dark mode via system preference
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot('cf-dashboard-dark.png', {
        fullPage: true,
        maxDiffPixels: 150,
      });

      console.log('Dark mode (system) visual snapshot captured');
    }
  });

  test('Empty state visual snapshot', async ({ page }) => {
    // Navigate to a page that might show empty state
    await page.goto('/creative-testing?filter=empty-test-filter-xyz');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const emptyState = page.locator('[role="status"], .empty-state, .no-results').first();

    if (await emptyState.count() > 0) {
      await expect(emptyState).toHaveScreenshot('cf-empty-state.png', {
        maxDiffPixels: 50,
      });
      console.log('Empty state visual snapshot captured');
    } else {
      console.log('No empty state found');
    }
  });

  test('Loading state visual snapshot', async ({ page }) => {
    // Intercept network to simulate loading
    await page.route('**/api/cf/**', async (route) => {
      await page.waitForTimeout(2000); // Delay response
      await route.continue();
    });

    const pageLoad = page.goto('/creative-testing');

    // Try to capture loading state before it finishes
    await page.waitForTimeout(500);

    const loadingIndicator = page.locator('[aria-busy="true"], .loading, .spinner, [role="progressbar"]').first();

    if (await loadingIndicator.count() > 0) {
      await expect(loadingIndicator).toHaveScreenshot('cf-loading-state.png', {
        maxDiffPixels: 50,
      });
      console.log('Loading state visual snapshot captured');
    } else {
      console.log('Loading state not captured (too fast)');
    }

    await pageLoad;
  });
});
