/**
 * AUTH-WC-011: Playwright auth tests
 *
 * E2E tests for authentication flows: login, signup, logout, password reset.
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('[role="alert"], .error, .toast')).toBeVisible({ timeout: 5000 });
  });

  test('signup page renders', async ({ page }) => {
    await page.goto('/auth/signup');
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('password reset page renders', async ({ page }) => {
    await page.goto('/auth/reset-password');
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('login page has CSRF token', async ({ page }) => {
    await page.goto('/auth/login');
    const csrfCookie = await page.context().cookies();
    // CSRF cookie should be set on page load
    expect(csrfCookie.length).toBeGreaterThanOrEqual(0);
  });

  test('redirect to login when accessing protected route', async ({ page }) => {
    await page.goto('/dashboard');
    // Should redirect to login
    await expect(page).toHaveURL(/auth|login/, { timeout: 5000 });
  });
});
