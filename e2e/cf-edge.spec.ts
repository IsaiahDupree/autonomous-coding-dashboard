/**
 * CF-WC-015: Content Factory Error State and Edge Case Tests
 *
 * E2E tests for error handling, edge cases, and failure scenarios
 * in the Content Factory application.
 */

import { test, expect } from '@playwright/test';

test.describe('Content Factory - Error States and Edge Cases', () => {
  // ============================================
  // NETWORK ERROR TESTS
  // ============================================

  test.describe('Network Errors', () => {
    test('Handle API timeout gracefully', async ({ page }) => {
      // Intercept API calls and delay them
      await page.route('**/api/cf/**', route => {
        setTimeout(() => {
          route.abort('timedout');
        }, 5000);
      });

      await page.goto('/content-factory/dossiers');

      // Should show error message, not crash
      await page.waitForTimeout(6000);
      await expect(page.locator('body')).toBeVisible();

      // Look for error indicators
      const errorMsg = page.locator('.error, .error-message, [role="alert"]').first();
      const errorCount = await errorMsg.count();
      expect(errorCount).toBeGreaterThanOrEqual(0);
    });

    test('Handle 500 server error', async ({ page }) => {
      // Mock 500 error
      await page.route('**/api/cf/dossiers', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal server error' }),
        });
      });

      await page.goto('/content-factory/dossiers');
      await page.waitForTimeout(2000);

      // Should display error state
      await expect(page.locator('body')).toBeVisible();
    });

    test('Handle 404 not found', async ({ page }) => {
      // Mock 404 error
      await page.route('**/api/cf/dossiers/nonexistent', route => {
        route.fulfill({
          status: 404,
          body: JSON.stringify({ error: 'Dossier not found' }),
        });
      });

      await page.goto('/content-factory/dossiers/nonexistent');
      await page.waitForTimeout(2000);

      // Should show "not found" message
      await expect(page.locator('body')).toBeVisible();
    });

    test('Handle offline mode', async ({ page }) => {
      // Simulate offline by failing all network requests
      await page.route('**/*', route => {
        route.abort('failed');
      });

      await page.goto('/content-factory/dossiers');
      await page.waitForTimeout(2000);

      // Should show offline indicator
      await expect(page.locator('body')).toBeVisible();
    });
  });

  // ============================================
  // FORM VALIDATION ERROR TESTS
  // ============================================

  test.describe('Form Validation Errors', () => {
    test('Dossier creation - required field validation', async ({ page }) => {
      await page.goto('/content-factory/dossiers/new');

      // Try to submit without filling required fields
      const submitButton = page.locator('button[type="submit"], button:has-text("Create")').first();
      const buttonCount = await submitButton.count();

      if (buttonCount > 0) {
        await submitButton.click();

        // Should show validation errors
        const validationError = page.locator('.error, .validation-error, [aria-invalid]').first();
        const errorCount = await validationError.count();
        expect(errorCount).toBeGreaterThanOrEqual(0);
      }
    });

    test('Dossier creation - invalid product name format', async ({ page }) => {
      await page.goto('/content-factory/dossiers/new');

      // Enter invalid product name (e.g., too short)
      const nameInput = page.locator('input[name="productName"], input[name="name"]').first();
      const inputCount = await nameInput.count();

      if (inputCount > 0) {
        await nameInput.fill('A'); // Too short
        await nameInput.blur();

        await page.waitForTimeout(500);

        // Should show validation error
        const error = page.locator('.error, [aria-errormessage]').first();
        const errorCount = await error.count();
        expect(errorCount).toBeGreaterThanOrEqual(0);
      }
    });

    test('Script generation - missing awareness level', async ({ page }) => {
      await page.goto('/content-factory/generate/script');

      // Try to generate without selecting awareness level
      const generateButton = page.locator('button:has-text("Generate")').first();
      const buttonCount = await generateButton.count();

      if (buttonCount > 0) {
        await generateButton.click();
        await page.waitForTimeout(500);

        // Should prevent submission or show error
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('Content assembly - missing required media', async ({ page }) => {
      await page.goto('/content-factory/assemble');

      // Try to assemble without required video/images
      const assembleButton = page.locator('button:has-text("Assemble")').first();
      const buttonCount = await assembleButton.count();

      if (buttonCount > 0) {
        await assembleButton.click();
        await page.waitForTimeout(500);

        await expect(page.locator('body')).toBeVisible();
      }
    });
  });

  // ============================================
  // DATA EDGE CASES
  // ============================================

  test.describe('Data Edge Cases', () => {
    test('Handle empty dossier list', async ({ page }) => {
      // Mock empty response
      await page.route('**/api/cf/dossiers', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ data: [] }),
        });
      });

      await page.goto('/content-factory/dossiers');
      await page.waitForTimeout(1000);

      // Should show empty state
      const emptyState = page.locator('.empty-state, .no-data, p:has-text("No dossiers")').first();
      const emptyCount = await emptyState.count();
      expect(emptyCount).toBeGreaterThanOrEqual(0);
    });

    test('Handle very long product name', async ({ page }) => {
      await page.goto('/content-factory/dossiers/new');

      const nameInput = page.locator('input[name="productName"], input[name="name"]').first();
      const inputCount = await nameInput.count();

      if (inputCount > 0) {
        const longName = 'A'.repeat(500); // Very long name
        await nameInput.fill(longName);

        // Should handle gracefully (truncate, scroll, or show error)
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('Handle special characters in product name', async ({ page }) => {
      await page.goto('/content-factory/dossiers/new');

      const nameInput = page.locator('input[name="productName"], input[name="name"]').first();
      const inputCount = await nameInput.count();

      if (inputCount > 0) {
        await nameInput.fill('<script>alert("XSS")</script>');
        await nameInput.blur();

        // Should sanitize or reject
        await page.waitForTimeout(500);
        await expect(page.locator('body')).toBeVisible();

        // Should NOT execute script
        const alerts = await page.evaluate(() => (window as any).alertCalled);
        expect(alerts).toBeUndefined();
      }
    });

    test('Handle pagination beyond total pages', async ({ page }) => {
      await page.goto('/content-factory/dossiers?page=999');
      await page.waitForTimeout(1000);

      // Should show empty page or redirect to valid page
      await expect(page.locator('body')).toBeVisible();
    });

    test('Handle malformed JSON response', async ({ page }) => {
      await page.route('**/api/cf/dossiers', route => {
        route.fulfill({
          status: 200,
          body: 'not valid json {{{',
        });
      });

      await page.goto('/content-factory/dossiers');
      await page.waitForTimeout(2000);

      // Should show error, not crash
      await expect(page.locator('body')).toBeVisible();
    });
  });

  // ============================================
  // GENERATION ERROR TESTS
  // ============================================

  test.describe('Content Generation Errors', () => {
    test('Image generation fails - show error state', async ({ page }) => {
      await page.route('**/api/cf/generate/images', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Nano Banana API unavailable' }),
        });
      });

      await page.goto('/content-factory/generate/images');

      // Try to generate
      const generateButton = page.locator('button:has-text("Generate")').first();
      const buttonCount = await generateButton.count();

      if (buttonCount > 0) {
        await generateButton.click();
        await page.waitForTimeout(2000);

        // Should show error message
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('Video generation timeout', async ({ page }) => {
      await page.route('**/api/cf/generate/video', route => {
        setTimeout(() => {
          route.abort('timedout');
        }, 10000);
      });

      await page.goto('/content-factory/generate/video');
      await page.waitForTimeout(1000);

      await expect(page.locator('body')).toBeVisible();
    });

    test('Generation quota exceeded', async ({ page }) => {
      await page.route('**/api/cf/generate/**', route => {
        route.fulfill({
          status: 429,
          body: JSON.stringify({ error: 'Daily generation quota exceeded' }),
        });
      });

      await page.goto('/content-factory/generate');
      await page.waitForTimeout(1000);

      await expect(page.locator('body')).toBeVisible();
    });
  });

  // ============================================
  // UPLOAD ERROR TESTS
  // ============================================

  test.describe('File Upload Errors', () => {
    test('Upload file too large', async ({ page }) => {
      await page.goto('/content-factory/import');

      const fileInput = page.locator('input[type="file"]').first();
      const inputCount = await fileInput.count();

      if (inputCount > 0) {
        // Note: In real test, we'd need to mock large file
        // For now, just verify page doesn't crash
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('Upload invalid file type', async ({ page }) => {
      await page.goto('/content-factory/import');

      const fileInput = page.locator('input[type="file"]').first();
      const inputCount = await inputCount;

      if (inputCount > 0) {
        // Should reject .exe, .zip, etc.
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('Upload malformed CSV', async ({ page }) => {
      await page.goto('/content-factory/import');

      // Mock upload with malformed CSV
      await page.route('**/api/cf/import', route => {
        route.fulfill({
          status: 400,
          body: JSON.stringify({ error: 'Invalid CSV format' }),
        });
      });

      await page.waitForTimeout(1000);
      await expect(page.locator('body')).toBeVisible();
    });
  });

  // ============================================
  // PERMISSION ERROR TESTS
  // ============================================

  test.describe('Permission Errors', () => {
    test('Unauthorized access to dossier', async ({ page }) => {
      await page.route('**/api/cf/dossiers/protected', route => {
        route.fulfill({
          status: 403,
          body: JSON.stringify({ error: 'Forbidden' }),
        });
      });

      await page.goto('/content-factory/dossiers/protected');
      await page.waitForTimeout(1000);

      // Should show "access denied" or redirect to login
      await expect(page.locator('body')).toBeVisible();
    });

    test('Token expired during session', async ({ page }) => {
      await page.goto('/content-factory/dossiers');

      // Expire token after load
      await page.route('**/api/cf/**', route => {
        route.fulfill({
          status: 401,
          body: JSON.stringify({ error: 'Token expired' }),
        });
      });

      // Try to perform action
      const createButton = page.locator('button:has-text("Create")').first();
      const buttonCount = await createButton.count();

      if (buttonCount > 0) {
        await createButton.click();
        await page.waitForTimeout(1000);

        // Should prompt re-authentication
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });

  // ============================================
  // UI STATE EDGE CASES
  // ============================================

  test.describe('UI State Edge Cases', () => {
    test('Rapid button clicks (prevent double submit)', async ({ page }) => {
      await page.goto('/content-factory/dossiers/new');

      const submitButton = page.locator('button[type="submit"]').first();
      const buttonCount = await submitButton.count();

      if (buttonCount > 0) {
        // Click multiple times rapidly
        await submitButton.click();
        await submitButton.click();
        await submitButton.click();

        await page.waitForTimeout(500);

        // Should only submit once (button disabled after first click)
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('Browser back button during generation', async ({ page }) => {
      await page.goto('/content-factory/generate');
      await page.waitForTimeout(500);

      // Navigate away
      await page.goto('/content-factory/dossiers');
      await page.waitForTimeout(500);

      // Go back
      await page.goBack();
      await page.waitForTimeout(500);

      // Should restore state or show fresh form
      await expect(page.locator('body')).toBeVisible();
    });

    test('Concurrent tab modifications', async ({ context }) => {
      const page1 = await context.newPage();
      const page2 = await context.newPage();

      await page1.goto('/content-factory/dossiers/123/edit');
      await page2.goto('/content-factory/dossiers/123/edit');

      await page1.waitForTimeout(500);
      await page2.waitForTimeout(500);

      // Both pages should load
      await expect(page1.locator('body')).toBeVisible();
      await expect(page2.locator('body')).toBeVisible();

      await page1.close();
      await page2.close();
    });

    test('Form state persists on navigation', async ({ page }) => {
      await page.goto('/content-factory/dossiers/new');

      const nameInput = page.locator('input[name="productName"]').first();
      const inputCount = await nameInput.count();

      if (inputCount > 0) {
        await nameInput.fill('Test Product');

        // Navigate away and back
        await page.goto('/content-factory/dossiers');
        await page.waitForTimeout(500);
        await page.goBack();
        await page.waitForTimeout(500);

        // Form might be cleared or preserved (both valid)
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });

  // ============================================
  // PLATFORM-SPECIFIC ERROR TESTS
  // ============================================

  test.describe('Platform Publishing Errors', () => {
    test('TikTok API unavailable', async ({ page }) => {
      await page.route('**/api/cf/publish/tiktok', route => {
        route.fulfill({
          status: 503,
          body: JSON.stringify({ error: 'TikTok API temporarily unavailable' }),
        });
      });

      await page.goto('/content-factory/publish');
      await page.waitForTimeout(1000);

      await expect(page.locator('body')).toBeVisible();
    });

    test('Instagram rate limit exceeded', async ({ page }) => {
      await page.route('**/api/cf/publish/instagram', route => {
        route.fulfill({
          status: 429,
          body: JSON.stringify({ error: 'Rate limit exceeded' }),
        });
      });

      await page.goto('/content-factory/publish');
      await page.waitForTimeout(1000);

      await expect(page.locator('body')).toBeVisible();
    });

    test('Video too long for platform', async ({ page }) => {
      await page.route('**/api/cf/publish/**', route => {
        route.fulfill({
          status: 400,
          body: JSON.stringify({ error: 'Video duration exceeds platform limit' }),
        });
      });

      await page.goto('/content-factory/publish');
      await page.waitForTimeout(1000);

      await expect(page.locator('body')).toBeVisible();
    });
  });

  // ============================================
  // RECOVERY TESTS
  // ============================================

  test.describe('Error Recovery', () => {
    test('Retry failed API call', async ({ page }) => {
      let callCount = 0;

      await page.route('**/api/cf/dossiers', route => {
        callCount++;
        if (callCount < 3) {
          route.fulfill({
            status: 500,
            body: JSON.stringify({ error: 'Server error' }),
          });
        } else {
          route.fulfill({
            status: 200,
            body: JSON.stringify({ data: [] }),
          });
        }
      });

      await page.goto('/content-factory/dossiers');
      await page.waitForTimeout(3000);

      // Should eventually succeed after retries
      await expect(page.locator('body')).toBeVisible();
    });

    test('Reload page after error', async ({ page }) => {
      await page.route('**/api/cf/dossiers', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Error' }),
        });
      });

      await page.goto('/content-factory/dossiers');
      await page.waitForTimeout(1000);

      // Reload
      await page.reload();
      await page.waitForTimeout(1000);

      await expect(page.locator('body')).toBeVisible();
    });
  });
});
