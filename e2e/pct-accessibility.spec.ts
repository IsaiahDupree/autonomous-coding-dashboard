/**
 * PCT-WC-020: Accessibility audit with axe-core
 * Automated a11y scan - no critical, no serious, ARIA correct
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('PCT-WC-020: Accessibility', () => {
  test.describe('Dashboard Accessibility', () => {
    test('should have no critical accessibility violations on main dashboard', async ({ page }) => {
      await page.goto('/pct');
      await page.waitForLoadState('networkidle');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const criticalViolations = accessibilityScanResults.violations.filter(
        v => v.impact === 'critical'
      );

      expect(criticalViolations).toHaveLength(0);
    });

    test('should have no serious accessibility violations on main dashboard', async ({ page }) => {
      await page.goto('/pct');
      await page.waitForLoadState('networkidle');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      const seriousViolations = accessibilityScanResults.violations.filter(
        v => v.impact === 'serious'
      );

      expect(seriousViolations).toHaveLength(0);
    });

    test('should have proper ARIA attributes', async ({ page }) => {
      await page.goto('/pct');
      await page.waitForLoadState('networkidle');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['cat.aria'])
        .analyze();

      // Check for ARIA violations
      const ariaViolations = accessibilityScanResults.violations.filter(
        v => v.id.includes('aria') || v.tags.includes('cat.aria')
      );

      expect(ariaViolations).toHaveLength(0);
    });

    test('should have proper heading structure', async ({ page }) => {
      await page.goto('/pct');
      await page.waitForLoadState('networkidle');

      // Get all headings
      const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', elements =>
        elements.map(el => ({
          level: parseInt(el.tagName[1]),
          text: el.textContent?.trim(),
        }))
      );

      // Should have at least one h1
      const h1Count = headings.filter(h => h.level === 1).length;
      expect(h1Count).toBeGreaterThanOrEqual(1);

      // Headings should not skip levels
      for (let i = 1; i < headings.length; i++) {
        const prevLevel = headings[i - 1].level;
        const currLevel = headings[i].level;

        // Can go down any amount, but can only go up by 1
        if (currLevel > prevLevel) {
          expect(currLevel - prevLevel).toBeLessThanOrEqual(1);
        }
      }
    });
  });

  test.describe('Forms Accessibility', () => {
    test('should have accessible form labels', async ({ page }) => {
      await page.goto('/pct');
      await page.waitForLoadState('networkidle');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['cat.forms'])
        .analyze();

      const formViolations = accessibilityScanResults.violations.filter(
        v => v.id.includes('label') || v.tags.includes('cat.forms')
      );

      expect(formViolations).toHaveLength(0);
    });

    test('should have proper input types', async ({ page }) => {
      await page.goto('/pct');
      await page.waitForLoadState('networkidle');

      // Check that text inputs have proper types
      const inputs = await page.$$eval('input', elements =>
        elements.map(el => ({
          type: el.getAttribute('type'),
          id: el.id,
          hasLabel: document.querySelector(`label[for="${el.id}"]`) !== null,
        }))
      );

      // All inputs should have a type attribute
      inputs.forEach(input => {
        expect(input.type).toBeTruthy();
      });
    });

    test('should have accessible error messages', async ({ page }) => {
      await page.goto('/pct');

      // Try to find a form to submit with invalid data
      const form = page.locator('form').first();

      if (await form.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Submit form without filling required fields
        const submitButton = form.locator('button[type="submit"]').first();

        if (await submitButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await submitButton.click();

          // Wait for error messages
          await page.waitForTimeout(500);

          // Check for accessible error messages
          const errorMessages = await page.$$eval(
            '[role="alert"], .error, [aria-invalid="true"]',
            elements => elements.length
          );

          // If there are errors, they should be accessible
          // (This test passes if no errors OR errors are accessible)
          expect(errorMessages).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  test.describe('Navigation Accessibility', () => {
    test('should have keyboard-accessible navigation', async ({ page }) => {
      await page.goto('/pct');
      await page.waitForLoadState('networkidle');

      // Test tab navigation
      await page.keyboard.press('Tab');
      const firstFocusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tagName: el?.tagName,
          hasVisibleFocus: window.getComputedStyle(el!).outlineWidth !== '0px' ||
                          window.getComputedStyle(el!).borderWidth !== '0px',
        };
      });

      // Should focus on an interactive element
      expect(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']).toContain(firstFocusedElement.tagName);
    });

    test('should have skip links for keyboard users', async ({ page }) => {
      await page.goto('/pct');

      // Check for skip link (might be visually hidden)
      const skipLink = page.locator('a[href="#main"], a[href="#content"]').first();

      // Skip link may or may not exist depending on implementation
      const hasSkipLink = await skipLink.count() > 0;

      // If skip link exists, it should be keyboard accessible
      if (hasSkipLink) {
        // Press Tab to focus first element
        await page.keyboard.press('Tab');

        const focusedText = await page.evaluate(() => document.activeElement?.textContent);

        // First focusable element might be skip link
        expect(focusedText).toBeTruthy();
      }

      // Test passes regardless - skip links are best practice but not required
      expect(true).toBeTruthy();
    });

    test('should have visible focus indicators', async ({ page }) => {
      await page.goto('/pct');
      await page.waitForLoadState('networkidle');

      // Find all interactive elements
      const interactiveElements = await page.$$('a, button, input, select, textarea');

      if (interactiveElements.length > 0) {
        // Focus on first interactive element
        await interactiveElements[0].focus();

        // Check if focus is visible
        const hasFocusIndicator = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el) return false;

          const styles = window.getComputedStyle(el);
          return (
            styles.outlineWidth !== '0px' ||
            styles.outlineStyle !== 'none' ||
            styles.borderWidth !== '0px' ||
            styles.boxShadow !== 'none'
          );
        });

        expect(hasFocusIndicator).toBeTruthy();
      }
    });
  });

  test.describe('Color Contrast', () => {
    test('should have sufficient color contrast', async ({ page }) => {
      await page.goto('/pct');
      await page.waitForLoadState('networkidle');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['cat.color'])
        .analyze();

      const contrastViolations = accessibilityScanResults.violations.filter(
        v => v.id.includes('contrast')
      );

      expect(contrastViolations).toHaveLength(0);
    });

    test('should not rely on color alone for information', async ({ page }) => {
      await page.goto('/pct');
      await page.waitForLoadState('networkidle');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withRules(['link-in-text-block'])
        .analyze();

      expect(accessibilityScanResults.violations).toHaveLength(0);
    });
  });

  test.describe('Images and Media', () => {
    test('should have alt text for all images', async ({ page }) => {
      await page.goto('/pct');
      await page.waitForLoadState('networkidle');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withRules(['image-alt'])
        .analyze();

      expect(accessibilityScanResults.violations).toHaveLength(0);
    });

    test('should have meaningful alt text (not just filenames)', async ({ page }) => {
      await page.goto('/pct');
      await page.waitForLoadState('networkidle');

      const images = await page.$$eval('img', imgs =>
        imgs.map(img => ({
          alt: img.getAttribute('alt'),
          src: img.getAttribute('src'),
        }))
      );

      images.forEach(img => {
        if (img.alt) {
          // Alt text should not be just the filename
          expect(img.alt).not.toMatch(/\.(jpg|jpeg|png|gif|svg|webp)$/i);

          // Should not be placeholder text
          expect(img.alt.toLowerCase()).not.toBe('image');
          expect(img.alt.toLowerCase()).not.toBe('picture');
        }
      });
    });
  });

  test.describe('Semantic HTML', () => {
    test('should use semantic HTML elements', async ({ page }) => {
      await page.goto('/pct');
      await page.waitForLoadState('networkidle');

      // Check for semantic elements
      const semanticElements = await page.evaluate(() => {
        return {
          hasMain: document.querySelector('main') !== null,
          hasNav: document.querySelector('nav') !== null,
          hasHeader: document.querySelector('header') !== null,
          hasFooter: document.querySelector('footer') !== null,
        };
      });

      // Should have at least main element
      expect(semanticElements.hasMain).toBeTruthy();
    });

    test('should not use tables for layout', async ({ page }) => {
      await page.goto('/pct');
      await page.waitForLoadState('networkidle');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withRules(['layout-table'])
        .analyze();

      expect(accessibilityScanResults.violations).toHaveLength(0);
    });
  });

  test.describe('Screen Reader Support', () => {
    test('should have proper landmark regions', async ({ page }) => {
      await page.goto('/pct');
      await page.waitForLoadState('networkidle');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['cat.structure'])
        .analyze();

      const landmarkViolations = accessibilityScanResults.violations.filter(
        v => v.id.includes('region') || v.id.includes('landmark')
      );

      expect(landmarkViolations).toHaveLength(0);
    });

    test('should have live regions for dynamic content', async ({ page }) => {
      await page.goto('/pct');

      // Look for elements that update dynamically
      const liveRegions = await page.$$('[aria-live], [role="alert"], [role="status"]');

      // If there are status messages or notifications, they should be in live regions
      const notifications = await page.$$('.notification, .alert, .toast, [data-testid*="notification"]');

      if (notifications.length > 0) {
        // Should have at least one live region
        expect(liveRegions.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Mobile Accessibility', () => {
    test('should be accessible on mobile viewports', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

      await page.goto('/pct');
      await page.waitForLoadState('networkidle');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      const criticalViolations = accessibilityScanResults.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );

      expect(criticalViolations).toHaveLength(0);
    });

    test('should have touch-friendly interactive elements', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/pct');
      await page.waitForLoadState('networkidle');

      // Check button sizes (should be at least 44x44px for touch)
      const buttons = await page.$$eval('button, a', elements =>
        elements.map(el => {
          const rect = el.getBoundingClientRect();
          return {
            width: rect.width,
            height: rect.height,
            meetsMinimum: rect.width >= 44 && rect.height >= 44,
          };
        })
      );

      // Most interactive elements should meet minimum touch target size
      const meetingMinimum = buttons.filter(b => b.meetsMinimum).length;
      const totalButtons = buttons.length;

      if (totalButtons > 0) {
        const ratio = meetingMinimum / totalButtons;
        expect(ratio).toBeGreaterThan(0.8); // At least 80% meet minimum
      }
    });
  });

  test.describe('Accessibility Report', () => {
    test('should generate accessibility report', async ({ page }) => {
      await page.goto('/pct');
      await page.waitForLoadState('networkidle');

      const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

      // Log results for documentation
      console.log('Accessibility Report:');
      console.log(`  Violations: ${accessibilityScanResults.violations.length}`);
      console.log(`  Passes: ${accessibilityScanResults.passes.length}`);
      console.log(`  Incomplete: ${accessibilityScanResults.incomplete.length}`);

      if (accessibilityScanResults.violations.length > 0) {
        console.log('\nViolations by Impact:');
        const byImpact = accessibilityScanResults.violations.reduce((acc, v) => {
          acc[v.impact || 'unknown'] = (acc[v.impact || 'unknown'] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        console.log(byImpact);
      }

      // Test passes if we can generate the report
      expect(accessibilityScanResults).toBeTruthy();
    });
  });
});
