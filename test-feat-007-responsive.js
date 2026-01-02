/**
 * Test feat-007: Dashboard has responsive layout
 *
 * Acceptance Criteria:
 * 1. Layout adjusts for mobile screens
 * 2. All content is accessible on small screens
 * 3. No horizontal scrolling on mobile
 */

const puppeteer = require('puppeteer');

const TEST_URL = 'http://localhost:3000';

// Mobile viewport configurations
const VIEWPORTS = {
  mobile: { width: 375, height: 667, deviceScaleFactor: 2 }, // iPhone SE
  tablet: { width: 768, height: 1024, deviceScaleFactor: 2 }, // iPad
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1 } // Desktop
};

async function testResponsiveLayout() {
  console.log('🧪 Testing feat-007: Dashboard has responsive layout\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    let allTestsPassed = true;

    // Test each viewport
    for (const [name, viewport] of Object.entries(VIEWPORTS)) {
      console.log(`\n📱 Testing ${name} viewport (${viewport.width}x${viewport.height})`);

      // Set viewport
      await page.setViewport(viewport);

      // Navigate to dashboard
      await page.goto(TEST_URL, { waitUntil: 'networkidle2', timeout: 10000 });

      // Wait for page to load
      await page.waitForSelector('.header', { timeout: 5000 });

      // Test 1: Check for horizontal scrolling
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      if (hasHorizontalScroll) {
        console.log(`  ❌ FAIL: Horizontal scrolling detected on ${name}`);
        allTestsPassed = false;
      } else {
        console.log(`  ✅ PASS: No horizontal scrolling on ${name}`);
      }

      // Test 2: Check if all major sections are visible/accessible
      const sections = [
        '.header',
        '.stats-grid',
        '#harness-control-panel',
        '#features-table',
        '#activity-timeline'
      ];

      let allSectionsAccessible = true;
      for (const selector of sections) {
        const isVisible = await page.evaluate((sel) => {
          const elem = document.querySelector(sel);
          if (!elem) return false;
          const rect = elem.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        }, selector);

        if (!isVisible) {
          console.log(`  ❌ FAIL: Section "${selector}" not accessible on ${name}`);
          allSectionsAccessible = false;
          allTestsPassed = false;
        }
      }

      if (allSectionsAccessible) {
        console.log(`  ✅ PASS: All content sections accessible on ${name}`);
      }

      // Test 3: Verify grid layout changes responsively
      if (name === 'mobile') {
        const gridColumns = await page.evaluate(() => {
          const grid = document.querySelector('.grid-2');
          if (!grid) return null;
          const styles = window.getComputedStyle(grid);
          return styles.gridTemplateColumns;
        });

        // On mobile, grid should be single column (not multiple fr units)
        const isSingleColumn = gridColumns && !gridColumns.includes(' ');

        if (isSingleColumn) {
          console.log(`  ✅ PASS: Grid layout adjusted to single column on mobile`);
        } else {
          console.log(`  ❌ FAIL: Grid layout not properly adjusted on mobile (got: ${gridColumns})`);
          allTestsPassed = false;
        }
      }

      // Take screenshot for manual verification
      await page.screenshot({
        path: `/tmp/dashboard-${name}.png`,
        fullPage: true
      });
      console.log(`  📸 Screenshot saved to /tmp/dashboard-${name}.png`);
    }

    console.log('\n' + '='.repeat(60));
    if (allTestsPassed) {
      console.log('✅ ALL TESTS PASSED - feat-007 acceptance criteria met');
      console.log('='.repeat(60));
      process.exit(0);
    } else {
      console.log('❌ SOME TESTS FAILED - feat-007 needs fixes');
      console.log('='.repeat(60));
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Run tests
testResponsiveLayout().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
