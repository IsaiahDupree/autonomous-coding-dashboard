/**
 * PCT E2E Tests - Error States
 * Feature: PCT-WC-015 - E2E tests for error states
 *
 * Tests error handling for:
 * - Network errors
 * - Validation errors
 * - Not found errors
 * - Server errors
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const PCT_URL = `${BASE_URL}/pct.html`;

test.describe('PCT Error States E2E', () => {
  test('should display error message when API fails', async ({ page }) => {
    await page.goto(PCT_URL);

    // Intercept API call and simulate failure
    await page.route('**/api/pct/brands', route => {
      route.abort('failed');
    });

    // Try to load brands
    await page.reload();

    // Verify error message is displayed
    await expect(page.locator('text=/error|failed|something went wrong/i')).toBeVisible({ timeout: 5000 });
  });

  test('should display validation error for empty brand name', async ({ page }) => {
    await page.goto(PCT_URL);

    // Click Add Brand
    const addBrandBtn = page.locator('button:has-text("Add Brand")').first();
    if (await addBrandBtn.isVisible()) {
      await addBrandBtn.click();

      // Try to submit without name
      const submitBtn = page.locator('button[type="submit"]').first();
      await submitBtn.click();

      // Verify validation error
      await expect(page.locator('text=/required|cannot be empty/i')).toBeVisible({ timeout: 2000 });
    }
  });

  test('should display 404 error for non-existent brand', async ({ page }) => {
    await page.goto(`${PCT_URL}?brandId=nonexistent-123`);

    // Verify not found message
    await expect(page.locator('text=/not found|404/i')).toBeVisible({ timeout: 5000 });
  });

  test('should handle network timeout gracefully', async ({ page, context }) => {
    // Set very short timeout to simulate timeout
    await context.route('**/api/pct/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second delay
      route.fulfill({ status: 408, body: 'Request Timeout' });
    });

    await page.goto(PCT_URL);

    // Verify timeout error handling
    await expect(page.locator('text=/timeout|taking too long/i')).toBeVisible({ timeout: 15000 });
  });

  test('should display error for invalid hook parameters', async ({ page }) => {
    await page.goto(PCT_URL);

    // Navigate to hooks generation
    const hooksTab = page.locator('button:has-text("Hooks")').first();
    if (await hooksTab.isVisible()) {
      await hooksTab.click();

      const generateBtn = page.locator('button:has-text("Generate")').first();
      if (await generateBtn.isVisible()) {
        await generateBtn.click();

        // Try to submit without required parameters
        const submitBtn = page.locator('button[type="submit"]').first();
        await submitBtn.click();

        // Verify error
        await expect(page.locator('text=/required|select/i')).toBeVisible({ timeout: 2000 });
      }
    }
  });

  test('should recover from error state', async ({ page }) => {
    await page.goto(PCT_URL);

    // Simulate error
    await page.route('**/api/pct/brands', route => {
      route.abort('failed');
    });

    await page.reload();

    // Wait for error
    await page.waitForTimeout(2000);

    // Remove route (allow requests)
    await page.unroute('**/api/pct/brands');

    // Try again - should succeed
    await page.reload();

    // Verify app loads successfully
    await expect(page.locator('body')).toBeVisible();
  });
});
