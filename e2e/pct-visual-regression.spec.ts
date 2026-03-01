/**
 * PCT-WC-021: Visual regression tests
 * Screenshot comparison for Dashboard, Lists, Forms, and Settings
 */

import { test, expect } from '@playwright/test';

test.describe('PCT-WC-021: Visual Regression', () => {
  test.describe('Dashboard Screenshots', () => {
    test('should match dashboard baseline screenshot', async ({ page }) => {
      await page.goto('/pct');
      await page.waitForLoadState('networkidle');

      // Wait for any animations to complete
      await page.waitForTimeout(500);

      // Take screenshot and compare
      await expect(page).toHaveScreenshot('pct-dashboard.png', {
        fullPage: true,
        maxDiffPixels: 100, // Allow small differences
      });
    });

    test('should match empty state dashboard', async ({ page }) => {
      // Navigate to empty state (if applicable)
      await page.goto('/pct?empty=true');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('pct-dashboard-empty.png', {
        maxDiffPixels: 100,
      });
    });

    test('should match dashboard with data', async ({ page }) => {
      await page.goto('/pct');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Hide dynamic elements (timestamps, live data)
      await page.evaluate(() => {
        document.querySelectorAll('[data-dynamic], .timestamp, .time').forEach(el => {
          (el as HTMLElement).style.visibility = 'hidden';
        });
      });

      await expect(page).toHaveScreenshot('pct-dashboard-with-data.png', {
        fullPage: true,
        maxDiffPixels: 150,
      });
    });
  });

  test.describe('Lists Screenshots', () => {
    test('should match brands list view', async ({ page }) => {
      await page.goto('/pct');
      await page.waitForLoadState('networkidle');

      // Navigate to brands list
      const brandsLink = page.locator('a:has-text("Brands"), [href*="brands"]').first();

      if (await brandsLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await brandsLink.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        await expect(page).toHaveScreenshot('pct-brands-list.png', {
          maxDiffPixels: 100,
        });
      }
    });

    test('should match products list view', async ({ page }) => {
      await page.goto('/pct');
      await page.waitForLoadState('networkidle');

      const productsLink = page.locator('a:has-text("Products"), [href*="products"]').first();

      if (await productsLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await productsLink.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        await expect(page).toHaveScreenshot('pct-products-list.png', {
          maxDiffPixels: 100,
        });
      }
    });

    test('should match hooks list view', async ({ page }) => {
      await page.goto('/pct');
      await page.waitForLoadState('networkidle');

      const hooksLink = page.locator('a:has-text("Hooks"), [href*="hooks"]').first();

      if (await hooksLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await hooksLink.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        await expect(page).toHaveScreenshot('pct-hooks-list.png', {
          maxDiffPixels: 100,
        });
      }
    });

    test('should match list with pagination', async ({ page }) => {
      await page.goto('/pct');
      await page.waitForLoadState('networkidle');

      // Look for pagination controls
      const pagination = page.locator('[role="navigation"], .pagination').first();

      if (await pagination.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(pagination).toHaveScreenshot('pct-pagination.png', {
          maxDiffPixels: 50,
        });
      }
    });
  });

  test.describe('Forms Screenshots', () => {
    test('should match brand creation form', async ({ page }) => {
      await page.goto('/pct');
      await page.waitForLoadState('networkidle');

      // Click to open brand creation form
      const createButton = page.locator('button:has-text("Create"), button:has-text("New Brand")').first();

      if (await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await createButton.click();
        await page.waitForTimeout(500);

        // Take screenshot of form
        const form = page.locator('form, [role="dialog"]').first();

        if (await form.isVisible()) {
          await expect(form).toHaveScreenshot('pct-brand-form.png', {
            maxDiffPixels: 50,
          });
        }
      }
    });

    test('should match product creation form', async ({ page }) => {
      await page.goto('/pct');
      await page.waitForLoadState('networkidle');

      const createProductButton = page.locator('button:has-text("Product"), button:has-text("New Product")').first();

      if (await createProductButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await createProductButton.click();
        await page.waitForTimeout(500);

        const form = page.locator('form, [role="dialog"]').first();

        if (await form.isVisible()) {
          await expect(form).toHaveScreenshot('pct-product-form.png', {
            maxDiffPixels: 50,
          });
        }
      }
    });

    test('should match form with validation errors', async ({ page }) => {
      await page.goto('/pct');
      await page.waitForLoadState('networkidle');

      const createButton = page.locator('button:has-text("Create")').first();

      if (await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await createButton.click();
        await page.waitForTimeout(300);

        // Submit form without filling required fields
        const submitButton = page.locator('button[type="submit"]:has-text("Save"), button[type="submit"]:has-text("Create")').first();

        if (await submitButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await submitButton.click();
          await page.waitForTimeout(500);

          // Take screenshot showing validation errors
          const form = page.locator('form, [role="dialog"]').first();

          if (await form.isVisible()) {
            await expect(form).toHaveScreenshot('pct-form-errors.png', {
              maxDiffPixels: 100,
            });
          }
        }
      }
    });
  });

  test.describe('Settings Screenshots', () => {
    test('should match settings page', async ({ page }) => {
      await page.goto('/pct/settings');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('pct-settings.png', {
        fullPage: true,
        maxDiffPixels: 100,
      });
    });

    test('should match settings tabs', async ({ page }) => {
      await page.goto('/pct/settings');
      await page.waitForLoadState('networkidle');

      // Look for tabs
      const tabs = page.locator('[role="tablist"], .tabs').first();

      if (await tabs.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(tabs).toHaveScreenshot('pct-settings-tabs.png', {
          maxDiffPixels: 50,
        });
      }
    });

    test('should match different settings sections', async ({ page }) => {
      await page.goto('/pct/settings');
      await page.waitForLoadState('networkidle');

      // Find all tab buttons
      const tabButtons = page.locator('[role="tab"], .tab-button');
      const count = await tabButtons.count();

      for (let i = 0; i < Math.min(count, 4); i++) {
        await tabButtons.nth(i).click();
        await page.waitForTimeout(300);

        const tabText = await tabButtons.nth(i).textContent();
        const filename = `pct-settings-${tabText?.toLowerCase().replace(/\s+/g, '-') || i}.png`;

        await expect(page).toHaveScreenshot(filename, {
          maxDiffPixels: 100,
        });
      }
    });
  });

  test.describe('Responsive Screenshots', () => {
    test('should match mobile dashboard', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/pct');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('pct-dashboard-mobile.png', {
        fullPage: true,
        maxDiffPixels: 150,
      });
    });

    test('should match tablet dashboard', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });

      await page.goto('/pct');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('pct-dashboard-tablet.png', {
        fullPage: true,
        maxDiffPixels: 150,
      });
    });

    test('should match desktop wide dashboard', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });

      await page.goto('/pct');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('pct-dashboard-wide.png', {
        fullPage: true,
        maxDiffPixels: 150,
      });
    });
  });

  test.describe('Component Screenshots', () => {
    test('should match modal dialogs', async ({ page }) => {
      await page.goto('/pct');
      await page.waitForLoadState('networkidle');

      // Open a modal
      const button = page.locator('button').first();

      if (await button.isVisible({ timeout: 2000 }).catch(() => false)) {
        await button.click();
        await page.waitForTimeout(300);

        const modal = page.locator('[role="dialog"], .modal').first();

        if (await modal.isVisible({ timeout: 1000 }).catch(() => false)) {
          await expect(modal).toHaveScreenshot('pct-modal.png', {
            maxDiffPixels: 50,
          });
        }
      }
    });

    test('should match navigation menu', async ({ page }) => {
      await page.goto('/pct');
      await page.waitForLoadState('networkidle');

      const nav = page.locator('nav, [role="navigation"]').first();

      if (await nav.isVisible()) {
        await expect(nav).toHaveScreenshot('pct-navigation.png', {
          maxDiffPixels: 50,
        });
      }
    });

    test('should match card components', async ({ page }) => {
      await page.goto('/pct');
      await page.waitForLoadState('networkidle');

      const card = page.locator('.card, [class*="card"]').first();

      if (await card.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(card).toHaveScreenshot('pct-card.png', {
          maxDiffPixels: 50,
        });
      }
    });
  });

  test.describe('Theme Screenshots', () => {
    test('should match light theme', async ({ page }) => {
      await page.goto('/pct');
      await page.waitForLoadState('networkidle');

      // Ensure light theme is active
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      });

      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot('pct-light-theme.png', {
        fullPage: true,
        maxDiffPixels: 150,
      });
    });

    test('should match dark theme', async ({ page }) => {
      await page.goto('/pct');
      await page.waitForLoadState('networkidle');

      // Enable dark theme
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      });

      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot('pct-dark-theme.png', {
        fullPage: true,
        maxDiffPixels: 150,
      });
    });
  });
});
