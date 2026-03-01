/**
 * CF-WC-020: Accessibility audit with axe-core
 *
 * Tests accessibility compliance using axe-core for Content Factory pages
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('CF-WC-020: Accessibility Audit', () => {
  test('Creative Testing dashboard has no critical accessibility violations', async ({ page }) => {
    await page.goto('/creative-testing');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const critical = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical'
    );
    const serious = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'serious'
    );

    console.log('\nAccessibility Scan Results - Dashboard:');
    console.log(`  Critical violations: ${critical.length}`);
    console.log(`  Serious violations: ${serious.length}`);
    console.log(`  Total violations: ${accessibilityScanResults.violations.length}`);

    if (critical.length > 0) {
      console.log('\nCritical violations:');
      critical.forEach((v) => {
        console.log(`  - ${v.id}: ${v.description}`);
        console.log(`    Impact: ${v.impact}`);
        console.log(`    Nodes: ${v.nodes.length}`);
      });
    }

    if (serious.length > 0) {
      console.log('\nSerious violations:');
      serious.forEach((v) => {
        console.log(`  - ${v.id}: ${v.description}`);
      });
    }

    // CF-WC-020 Acceptance Criteria
    expect(critical.length, 'No critical accessibility violations').toBe(0);
    expect(serious.length, 'No serious accessibility violations').toBe(0);
  });

  test('Product dossiers form has correct ARIA attributes', async ({ page }) => {
    await page.goto('/creative-testing');

    // Look for form elements
    const forms = await page.locator('form').count();

    if (forms > 0) {
      const accessibilityScanResults = await new AxeBuilder({ page })
        .include('form')
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      const ariaViolations = accessibilityScanResults.violations.filter(
        (v) =>
          v.id.includes('aria') ||
          v.id.includes('label') ||
          v.id.includes('form')
      );

      console.log('\nForm ARIA violations:', ariaViolations.length);

      ariaViolations.forEach((v) => {
        console.log(`  - ${v.id}: ${v.description}`);
      });

      // CF-WC-020 Criteria: ARIA correct
      expect(
        ariaViolations.filter((v) => v.impact === 'critical' || v.impact === 'serious').length,
        'Forms should have correct ARIA attributes'
      ).toBe(0);
    } else {
      console.log('No forms found on page');
    }
  });

  test('Scripts page has keyboard navigation support', async ({ page }) => {
    await page.goto('/creative-testing/scripts');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const keyboardViolations = accessibilityScanResults.violations.filter(
      (v) =>
        v.id.includes('keyboard') ||
        v.id.includes('focus') ||
        v.id.includes('tabindex')
    );

    console.log('\nKeyboard navigation violations:', keyboardViolations.length);

    expect(
      keyboardViolations.filter((v) => v.impact === 'critical' || v.impact === 'serious').length,
      'Page should be keyboard navigable'
    ).toBe(0);
  });

  test('Analytics page has sufficient color contrast', async ({ page }) => {
    await page.goto('/creative-testing/analytics');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .analyze();

    const contrastViolations = accessibilityScanResults.violations.filter(
      (v) => v.id.includes('color-contrast')
    );

    console.log('\nColor contrast violations:', contrastViolations.length);

    contrastViolations.forEach((v) => {
      console.log(`  - ${v.id}: ${v.description}`);
      v.nodes.forEach((node) => {
        console.log(`    Element: ${node.html.substring(0, 80)}...`);
      });
    });

    expect(
      contrastViolations.filter((v) => v.impact === 'critical' || v.impact === 'serious').length,
      'Text should have sufficient color contrast'
    ).toBe(0);
  });

  test('Settings page has proper heading hierarchy', async ({ page }) => {
    await page.goto('/creative-testing/settings');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a'])
      .analyze();

    const headingViolations = accessibilityScanResults.violations.filter(
      (v) => v.id.includes('heading') || v.id.includes('h1') || v.id.includes('h2')
    );

    console.log('\nHeading hierarchy violations:', headingViolations.length);

    expect(
      headingViolations.filter((v) => v.impact === 'critical' || v.impact === 'serious').length,
      'Page should have proper heading hierarchy'
    ).toBe(0);
  });

  test('Images have alt text', async ({ page }) => {
    await page.goto('/creative-testing');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a'])
      .analyze();

    const imageViolations = accessibilityScanResults.violations.filter(
      (v) => v.id.includes('image-alt') || v.id.includes('alt')
    );

    console.log('\nImage alt text violations:', imageViolations.length);

    imageViolations.forEach((v) => {
      console.log(`  - ${v.id}: ${v.description}`);
    });

    expect(
      imageViolations.filter((v) => v.impact === 'critical' || v.impact === 'serious').length,
      'Images should have alt text'
    ).toBe(0);
  });

  test('Links have accessible names', async ({ page }) => {
    await page.goto('/creative-testing');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a'])
      .analyze();

    const linkViolations = accessibilityScanResults.violations.filter(
      (v) => v.id.includes('link-name') || v.id.includes('link')
    );

    console.log('\nLink accessibility violations:', linkViolations.length);

    expect(
      linkViolations.filter((v) => v.impact === 'critical' || v.impact === 'serious').length,
      'Links should have accessible names'
    ).toBe(0);
  });

  test('No duplicate IDs on page', async ({ page }) => {
    await page.goto('/creative-testing');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    const duplicateIdViolations = accessibilityScanResults.violations.filter(
      (v) => v.id === 'duplicate-id' || v.id === 'duplicate-id-active'
    );

    console.log('\nDuplicate ID violations:', duplicateIdViolations.length);

    expect(duplicateIdViolations.length, 'No duplicate IDs on page').toBe(0);
  });

  test('Buttons have accessible labels', async ({ page }) => {
    await page.goto('/creative-testing');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a'])
      .analyze();

    const buttonViolations = accessibilityScanResults.violations.filter(
      (v) => v.id.includes('button-name') || v.id.includes('button')
    );

    console.log('\nButton accessibility violations:', buttonViolations.length);

    expect(
      buttonViolations.filter((v) => v.impact === 'critical' || v.impact === 'serious').length,
      'Buttons should have accessible labels'
    ).toBe(0);
  });

  test('Full accessibility report for all pages', async ({ page }) => {
    const pages = [
      '/creative-testing',
      '/creative-testing/scripts',
      '/creative-testing/analytics',
      '/creative-testing/settings',
    ];

    const results = [];

    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');

      const scanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const critical = scanResults.violations.filter((v) => v.impact === 'critical');
      const serious = scanResults.violations.filter((v) => v.impact === 'serious');

      results.push({
        page: pagePath,
        critical: critical.length,
        serious: serious.length,
        total: scanResults.violations.length,
      });
    }

    console.log('\n=== Full Accessibility Report ===');
    results.forEach((r) => {
      console.log(`\n${r.page}:`);
      console.log(`  Critical: ${r.critical}`);
      console.log(`  Serious: ${r.serious}`);
      console.log(`  Total violations: ${r.total}`);
    });

    const totalCritical = results.reduce((sum, r) => sum + r.critical, 0);
    const totalSerious = results.reduce((sum, r) => sum + r.serious, 0);

    expect(totalCritical, 'No critical violations across all pages').toBe(0);
    expect(totalSerious, 'No serious violations across all pages').toBe(0);
  });
});
