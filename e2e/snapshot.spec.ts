/**
 * AUTH-WC-026: Snapshot tests for components
 *
 * Component snapshot tests for dashboard, forms, and modals.
 */

import { test, expect } from '@playwright/test';

test.describe('Component Snapshots', () => {
  test('Dashboard layout snapshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const html = await page.content();

    // Snapshot the dashboard structure
    expect(html).toMatchSnapshot('dashboard.html');
  });

  test('Form structure snapshot', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    const form = page.locator('form').first();
    if (await form.count() > 0) {
      const formHTML = await form.innerHTML();
      expect(formHTML).toMatchSnapshot('login-form.html');
    }
  });

  test('Navigation structure snapshot', async ({ page }) => {
    await page.goto('/');

    const nav = page.locator('nav, [role="navigation"]').first();
    if (await nav.count() > 0) {
      const navHTML = await nav.innerHTML();
      expect(navHTML).toMatchSnapshot('navigation.html');
    }
  });

  test('Settings form snapshot', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const form = page.locator('form').first();
    if (await form.count() > 0) {
      const formHTML = await form.innerHTML();
      expect(formHTML).toMatchSnapshot('settings-form.html');
    }
  });

  test('Modal structure snapshot', async ({ page }) => {
    await page.goto('/');

    // Try to find and trigger a modal
    const modalTrigger = page.locator('button:has-text(/modal|dialog|open/i)').first();

    if (await modalTrigger.count() > 0) {
      await modalTrigger.click();
      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"], .modal').first();
      if (await modal.isVisible()) {
        const modalHTML = await modal.innerHTML();
        expect(modalHTML).toMatchSnapshot('modal.html');
      }
    }
  });

  test('Data table snapshot', async ({ page }) => {
    await page.goto('/');

    const table = page.locator('table, [role="table"]').first();
    if (await table.count() > 0) {
      const tableHTML = await table.innerHTML();
      expect(tableHTML).toMatchSnapshot('table.html');
    }
  });

  test('Card component snapshot', async ({ page }) => {
    await page.goto('/');

    const card = page.locator('.card, [role="article"]').first();
    if (await card.count() > 0) {
      const cardHTML = await card.innerHTML();
      expect(cardHTML).toMatchSnapshot('card.html');
    }
  });

  test('Button styles snapshot', async ({ page }) => {
    await page.goto('/auth/login');

    const button = page.locator('button').first();
    if (await button.count() > 0) {
      const styles = await button.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          color: computed.color,
          backgroundColor: computed.backgroundColor,
          padding: computed.padding,
          borderRadius: computed.borderRadius,
          fontSize: computed.fontSize,
        };
      });

      expect(styles).toMatchSnapshot('button-styles.json');
    }
  });

  test('Typography snapshot', async ({ page }) => {
    await page.goto('/');

    const headings = await page.locator('h1, h2, h3').evaluateAll((elements) => {
      return elements.map(el => {
        const computed = window.getComputedStyle(el);
        return {
          tag: el.tagName,
          fontSize: computed.fontSize,
          fontWeight: computed.fontWeight,
          lineHeight: computed.lineHeight,
        };
      });
    });

    expect(headings).toMatchSnapshot('typography.json');
  });

  test('Color palette snapshot', async ({ page }) => {
    await page.goto('/');

    const colors = await page.evaluate(() => {
      const computedStyles = window.getComputedStyle(document.body);
      return {
        background: computedStyles.backgroundColor,
        color: computedStyles.color,
      };
    });

    expect(colors).toMatchSnapshot('colors.json');
  });
});
