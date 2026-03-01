/**
 * CF-WC-026: Snapshot tests for components
 *
 * Snapshot critical UI components to detect unintended changes
 */

import { test, expect } from '@playwright/test';

test.describe('CF-WC-026: Component Snapshot Tests', () => {
  test('Dashboard layout snapshot', async ({ page }) => {
    await page.goto('/creative-testing');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Get the main layout structure
    const layout = page.locator('body').first();
    const layoutHTML = await layout.innerHTML();

    // Create a normalized snapshot (strip dynamic content)
    const normalized = layoutHTML
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, 'TIMESTAMP') // Dates
      .replace(/id="[^"]+"/g, 'id="ID"') // Dynamic IDs
      .replace(/data-id="[^"]+"/g, 'data-id="ID"'); // Data IDs

    expect(normalized).toMatchSnapshot('dashboard-layout.html');

    console.log('✓ Dashboard layout snapshot created/validated');
  });

  test('Navigation component snapshot', async ({ page }) => {
    await page.goto('/creative-testing');
    await page.waitForLoadState('networkidle');

    // Find navigation element
    const nav = page.locator('nav, [role="navigation"]').first();

    if (await nav.count() > 0) {
      const navHTML = await nav.innerHTML();

      expect(navHTML).toMatchSnapshot('navigation.html');

      console.log('✓ Navigation snapshot created/validated');
    } else {
      console.log('⚠ No navigation element found');
    }
  });

  test('Dossier card component snapshot', async ({ page }) => {
    await page.goto('/creative-testing');
    await page.waitForLoadState('networkidle');

    // Find a dossier card
    const card = page.locator('[data-testid*="dossier"], .dossier-card, article').first();

    if (await card.count() > 0) {
      let cardHTML = await card.innerHTML();

      // Normalize dynamic content
      cardHTML = cardHTML
        .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, 'TIMESTAMP')
        .replace(/id="[^"]+"/g, 'id="ID"');

      expect(cardHTML).toMatchSnapshot('dossier-card.html');

      console.log('✓ Dossier card snapshot created/validated');
    } else {
      console.log('⚠ No dossier card found');
    }
  });

  test('Form component snapshot', async ({ page }) => {
    await page.goto('/creative-testing');
    await page.waitForLoadState('networkidle');

    // Try to open a form (create button)
    const createButton = page.locator('button:has-text("Create"), button:has-text("New"), button:has-text("Add")').first();

    if (await createButton.count() > 0) {
      await createButton.click();
      await page.waitForTimeout(300);

      const form = page.locator('form, [role="dialog"] form').first();

      if (await form.count() > 0) {
        let formHTML = await form.innerHTML();

        // Normalize
        formHTML = formHTML
          .replace(/id="[^"]+"/g, 'id="ID"')
          .replace(/for="[^"]+"/g, 'for="ID"');

        expect(formHTML).toMatchSnapshot('dossier-form.html');

        console.log('✓ Form snapshot created/validated');
      }
    } else {
      console.log('⚠ No create button found');
    }
  });

  test('Script card component snapshot', async ({ page }) => {
    await page.goto('/creative-testing/scripts');
    await page.waitForLoadState('networkidle');

    const scriptCard = page.locator('[data-testid*="script"], .script-card, article').first();

    if (await scriptCard.count() > 0) {
      let cardHTML = await scriptCard.innerHTML();

      cardHTML = cardHTML
        .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, 'TIMESTAMP')
        .replace(/id="[^"]+"/g, 'id="ID"');

      expect(cardHTML).toMatchSnapshot('script-card.html');

      console.log('✓ Script card snapshot created/validated');
    } else {
      console.log('⚠ No script card found');
    }
  });

  test('Analytics chart component snapshot', async ({ page }) => {
    await page.goto('/creative-testing/analytics');
    await page.waitForLoadState('networkidle');

    // Look for chart/graph elements
    const chart = page.locator('[data-testid*="chart"], .chart, canvas, svg').first();

    if (await chart.count() > 0) {
      const chartParent = page.locator('[data-testid*="chart"]').first();

      if (await chartParent.count() > 0) {
        let chartHTML = await chartParent.innerHTML();

        // Normalize dynamic values
        chartHTML = chartHTML
          .replace(/\d+\.\d+/g, '0.0') // Decimal numbers
          .replace(/\d{4}-\d{2}-\d{2}/g, 'DATE'); // Dates

        expect(chartHTML).toMatchSnapshot('analytics-chart.html');

        console.log('✓ Analytics chart snapshot created/validated');
      }
    } else {
      console.log('⚠ No chart found');
    }
  });

  test('Settings panel snapshot', async ({ page }) => {
    await page.goto('/creative-testing/settings');
    await page.waitForLoadState('networkidle');

    const settingsPanel = page.locator('main, [role="main"], .settings').first();

    if (await settingsPanel.count() > 0) {
      let panelHTML = await settingsPanel.innerHTML();

      panelHTML = panelHTML.replace(/id="[^"]+"/g, 'id="ID"');

      expect(panelHTML).toMatchSnapshot('settings-panel.html');

      console.log('✓ Settings panel snapshot created/validated');
    } else {
      console.log('⚠ No settings panel found');
    }
  });

  test('Empty state component snapshot', async ({ page }) => {
    await page.goto('/creative-testing?filter=nonexistent-filter-xyz-123');
    await page.waitForLoadState('networkidle');

    const emptyState = page.locator('[data-testid*="empty"], .empty-state, .no-results').first();

    if (await emptyState.count() > 0) {
      const emptyHTML = await emptyState.innerHTML();

      expect(emptyHTML).toMatchSnapshot('empty-state.html');

      console.log('✓ Empty state snapshot created/validated');
    } else {
      console.log('⚠ No empty state found (might have data)');
    }
  });

  test('Button component variants snapshot', async ({ page }) => {
    await page.goto('/creative-testing');
    await page.waitForLoadState('networkidle');

    // Collect all unique button variants
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    if (buttonCount > 0) {
      const buttonVariants = [];

      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        const buttonHTML = await button.innerHTML();
        const classList = await button.getAttribute('class');

        buttonVariants.push({
          html: buttonHTML,
          class: classList,
        });
      }

      expect(buttonVariants).toMatchSnapshot('button-variants.json');

      console.log(`✓ Button variants snapshot created/validated (${buttonVariants.length} buttons)`);
    }
  });

  test('Header component snapshot', async ({ page }) => {
    await page.goto('/creative-testing');
    await page.waitForLoadState('networkidle');

    const header = page.locator('header, [role="banner"]').first();

    if (await header.count() > 0) {
      let headerHTML = await header.innerHTML();

      headerHTML = headerHTML.replace(/id="[^"]+"/g, 'id="ID"');

      expect(headerHTML).toMatchSnapshot('header.html');

      console.log('✓ Header snapshot created/validated');
    } else {
      console.log('⚠ No header found');
    }
  });

  test('Footer component snapshot', async ({ page }) => {
    await page.goto('/creative-testing');
    await page.waitForLoadState('networkidle');

    const footer = page.locator('footer, [role="contentinfo"]').first();

    if (await footer.count() > 0) {
      let footerHTML = await footer.innerHTML();

      footerHTML = footerHTML.replace(/id="[^"]+"/g, 'id="ID"');

      expect(footerHTML).toMatchSnapshot('footer.html');

      console.log('✓ Footer snapshot created/validated');
    } else {
      console.log('⚠ No footer found');
    }
  });

  test('Modal component snapshot', async ({ page }) => {
    await page.goto('/creative-testing');
    await page.waitForLoadState('networkidle');

    // Try to trigger a modal
    const trigger = page.locator('button').first();

    if (await trigger.count() > 0) {
      await trigger.click();
      await page.waitForTimeout(300);

      const modal = page.locator('[role="dialog"], .modal').first();

      if (await modal.count() > 0 && (await modal.isVisible())) {
        let modalHTML = await modal.innerHTML();

        modalHTML = modalHTML.replace(/id="[^"]+"/g, 'id="ID"');

        expect(modalHTML).toMatchSnapshot('modal.html');

        console.log('✓ Modal snapshot created/validated');
      } else {
        console.log('⚠ No modal appeared');
      }
    }
  });

  test('Tabs component snapshot', async ({ page }) => {
    await page.goto('/creative-testing');
    await page.waitForLoadState('networkidle');

    const tabs = page.locator('[role="tablist"], .tabs').first();

    if (await tabs.count() > 0) {
      let tabsHTML = await tabs.innerHTML();

      tabsHTML = tabsHTML.replace(/id="[^"]+"/g, 'id="ID"');

      expect(tabsHTML).toMatchSnapshot('tabs.html');

      console.log('✓ Tabs snapshot created/validated');
    } else {
      console.log('⚠ No tabs found');
    }
  });
});
