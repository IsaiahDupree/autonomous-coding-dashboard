/**
 * AUTH-WC-021: Visual regression tests
 *
 * Screenshot comparison tests to detect unintended UI changes.
 */

import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('Dashboard - full page screenshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Take screenshot and compare
    await expect(page).toHaveScreenshot('dashboard-full.png', {
      fullPage: true,
      maxDiffPixels: 100, // Allow small differences
    });
  });

  test('Dashboard - above fold', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('dashboard-above-fold.png', {
      fullPage: false,
      maxDiffPixels: 50,
    });
  });

  test('Login page', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('login-page.png', {
      fullPage: true,
      maxDiffPixels: 50,
    });
  });

  test('Signup page', async ({ page }) => {
    await page.goto('/auth/signup');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('signup-page.png', {
      fullPage: true,
      maxDiffPixels: 50,
    });
  });

  test('Settings page', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('settings-page.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('Form - empty state', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    const form = page.locator('form').first();
    if (await form.count() > 0) {
      await expect(form).toHaveScreenshot('form-empty.png', {
        maxDiffPixels: 30,
      });
    }
  });

  test('Form - filled state', async ({ page }) => {
    await page.goto('/auth/login');

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');

    const form = page.locator('form').first();
    if (await form.count() > 0) {
      await expect(form).toHaveScreenshot('form-filled.png', {
        maxDiffPixels: 30,
      });
    }
  });

  test('Mobile viewport - dashboard', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('mobile-dashboard.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('Tablet viewport - dashboard', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('tablet-dashboard.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('Dark mode - if supported', async ({ page }) => {
    await page.goto('/');

    // Try to enable dark mode
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('dark-mode.png', {
      fullPage: false,
      maxDiffPixels: 200,
    });
  });

  test('Navigation - component screenshot', async ({ page }) => {
    await page.goto('/');

    const nav = page.locator('nav, [role="navigation"]').first();
    if (await nav.count() > 0) {
      await expect(nav).toHaveScreenshot('navigation.png', {
        maxDiffPixels: 50,
      });
    }
  });

  test('Footer - component screenshot', async ({ page }) => {
    await page.goto('/');

    const footer = page.locator('footer, [role="contentinfo"]').first();
    if (await footer.count() > 0) {
      await expect(footer).toHaveScreenshot('footer.png', {
        maxDiffPixels: 50,
      });
    }
  });

  test('Modal - if exists', async ({ page }) => {
    await page.goto('/');

    // Try to trigger a modal (look for button with "modal" text)
    const modalTrigger = page.locator('button:has-text(/modal|dialog|popup/i)').first();

    if (await modalTrigger.count() > 0) {
      await modalTrigger.click();
      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"], .modal').first();
      if (await modal.isVisible()) {
        await expect(modal).toHaveScreenshot('modal.png', {
          maxDiffPixels: 50,
        });
      }
    }
  });

  test('Loading state', async ({ page }) => {
    // Slow down network to capture loading state
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 100);
    });

    const loadPromise = page.goto('/');

    // Try to capture loading state
    await page.waitForTimeout(200);

    // Check for loading indicator
    const loader = page.locator('.loading, .spinner, [aria-busy="true"]').first();
    if (await loader.isVisible()) {
      await expect(loader).toHaveScreenshot('loading-state.png', {
        maxDiffPixels: 30,
      });
    }

    await loadPromise;
  });
});
