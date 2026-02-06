const puppeteer = require('puppeteer');

(async () => {
  let passed = 0;
  let failed = 0;
  const results = [];
  
  function assert(condition, message) {
    if (condition) {
      passed++;
      results.push(`  ✓ ${message}`);
    } else {
      failed++;
      results.push(`  ✗ ${message}`);
    }
  }

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    // Navigate to dashboard
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 1000));

    // === AC1: Toggle button in header ===
    console.log('\n=== AC1: Toggle button in header ===');
    
    const toggleBtn = await page.$('#theme-toggle');
    assert(toggleBtn !== null, 'Theme toggle button exists');
    
    // Check it's in the header
    const isInHeader = await page.evaluate(() => {
      const btn = document.getElementById('theme-toggle');
      const header = document.querySelector('header, .header');
      return header && header.contains(btn);
    });
    assert(isInHeader, 'Toggle button is inside the header');
    
    // Check initial state (should be dark by default or last saved)
    const initialEmoji = await page.evaluate(() => document.getElementById('theme-toggle').textContent.trim());
    assert(initialEmoji === '🌙' || initialEmoji === '☀️', `Toggle shows theme icon: "${initialEmoji}"`);

    // === AC2: Persist preference ===
    console.log('\n=== AC2: Persist preference ===');
    
    // Clear localStorage and set to dark
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.removeAttribute('data-theme');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1000));

    // Verify dark theme loaded
    let dataTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    assert(dataTheme === null || dataTheme !== 'light', 'Dark theme loaded from localStorage');
    
    // Click toggle to switch to light
    await page.click('#theme-toggle');
    await new Promise(r => setTimeout(r, 300));
    
    dataTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    assert(dataTheme === 'light', 'Clicking toggle switches to light theme');
    
    // Check localStorage was updated
    const savedTheme = await page.evaluate(() => localStorage.getItem('theme'));
    assert(savedTheme === 'light', `Theme preference saved to localStorage: "${savedTheme}"`);
    
    // Reload and check persistence
    await page.reload({ waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1000));
    
    const afterReloadTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    assert(afterReloadTheme === 'light', 'Light theme persists after page reload');
    
    const afterReloadEmoji = await page.evaluate(() => document.getElementById('theme-toggle').textContent.trim());
    assert(afterReloadEmoji === '☀️', `Toggle shows sun emoji after reload: "${afterReloadEmoji}"`);
    
    // Toggle back to dark
    await page.click('#theme-toggle');
    await new Promise(r => setTimeout(r, 300));
    
    const backToDark = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    assert(backToDark === null || backToDark !== 'light', 'Toggle switches back to dark theme');
    
    const darkSaved = await page.evaluate(() => localStorage.getItem('theme'));
    assert(darkSaved === 'dark', 'Dark preference saved to localStorage');

    // === AC3: All components styled ===
    console.log('\n=== AC3: All components styled ===');
    
    // Switch to light mode for testing
    await page.click('#theme-toggle');
    await new Promise(r => setTimeout(r, 500));
    
    // Check that CSS variables changed for light theme
    const lightBg = await page.evaluate(() => 
      getComputedStyle(document.documentElement).getPropertyValue('--color-bg-primary').trim()
    );
    assert(lightBg === '#f8fafc', `Light theme background color: "${lightBg}"`);
    
    const lightText = await page.evaluate(() => 
      getComputedStyle(document.documentElement).getPropertyValue('--color-text-primary').trim()
    );
    assert(lightText === '#0f172a', `Light theme text color: "${lightText}"`);
    
    // Check body background actually changed
    const bodyBg = await page.evaluate(() => {
      const bg = getComputedStyle(document.body).backgroundColor;
      return bg;
    });
    assert(bodyBg !== 'rgb(10, 14, 26)', `Body background changed from dark: "${bodyBg}"`);
    
    // Check header styling in light mode
    const headerBg = await page.evaluate(() => {
      const header = document.querySelector('header, .header');
      return header ? getComputedStyle(header).backgroundColor : 'none';
    });
    assert(headerBg !== '' && headerBg !== 'none', `Header has background in light mode: "${headerBg}"`);
    
    // Check card styling in light mode
    const cardExists = await page.evaluate(() => {
      const card = document.querySelector('.card');
      if (!card) return 'no-card';
      return getComputedStyle(card).backgroundColor;
    });
    assert(cardExists !== 'no-card', `Cards have background styling in light mode`);
    
    // Check text is visible on light background (dark text on light bg)
    const textColor = await page.evaluate(() => {
      const el = document.querySelector('.card-title, h2, h3');
      if (!el) return 'no-element';
      return getComputedStyle(el).color;
    });
    assert(textColor !== 'no-element', `Text elements have color in light mode: "${textColor}"`);
    
    // Check that border variables updated
    const borderColor = await page.evaluate(() => 
      getComputedStyle(document.documentElement).getPropertyValue('--color-border').trim()
    );
    assert(borderColor.includes('0.2') || borderColor !== 'rgba(148, 163, 184, 0.1)', `Border color updated for light theme`);
    
    // Switch back to dark and verify
    await page.click('#theme-toggle');
    await new Promise(r => setTimeout(r, 500));
    
    const darkBg = await page.evaluate(() => 
      getComputedStyle(document.documentElement).getPropertyValue('--color-bg-primary').trim()
    );
    assert(darkBg === '#0a0e1a', `Dark theme background restored: "${darkBg}"`);

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n========================================');
  console.log('feat-052: Dark Mode Toggle - Test Results');
  console.log('========================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
