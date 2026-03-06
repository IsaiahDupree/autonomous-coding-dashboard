#!/usr/bin/env node

/**
 * LinkedIn Chrome Search — Playwright-based prospect finder
 * ==========================================================
 * PRIMARY: Connects to an already-running Chrome instance via CDP
 *   (Chrome must be launched with --remote-debugging-port=9222)
 *   → run:  harness/start-chrome-debug.sh
 *
 * FALLBACK: If CDP is unavailable, launches Chrome with a persistent profile.
 *
 * Called by linkedin-daemon.js as a subprocess (stdout = JSON results).
 * Also callable standalone:
 *   node harness/linkedin-chrome-search.js --keywords "AI SaaS founder" --title "CEO OR Founder"
 *
 * Output (stdout): JSON array of { name, profileUrl, headline, location, connectionDegree }
 * Errors go to stderr so they don't corrupt the JSON stdout.
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CDP_URL      = process.env.CHROME_CDP_URL || 'http://localhost:9333';
const PROFILE_DIR  = path.join(__dirname, '.chrome-linkedin-profile');
const CHROME_PATH  = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// CLI args
const args = process.argv.slice(2);
function getArg(name, fallback = '') {
  const idx = args.indexOf(name);
  return (idx !== -1 && args[idx + 1] !== undefined) ? args[idx + 1] : fallback;
}
const KEYWORDS    = getArg('--keywords', 'AI automation SaaS founder');
const TITLE       = getArg('--title', 'CEO OR Founder OR CTO');
const DEGREE      = getArg('--degree', '2nd');
const MAX_RESULTS = parseInt(getArg('--max', '15'), 10);

function err(msg) { process.stderr.write(`[chrome-search] ${msg}\n`); }

async function searchLinkedIn() {
  let context = null;
  let browserForCDP = null;
  let usingCDP = false;

  // ── 1. Try to connect to already-running Chrome via CDP ──────────────────────
  try {
    browserForCDP = await chromium.connectOverCDP(CDP_URL, { timeout: 3000 });
    const contexts = browserForCDP.contexts();
    context = contexts[0] || await browserForCDP.newContext();
    usingCDP = true;
    err(`Connected to running Chrome via CDP (${CDP_URL})`);
  } catch {
    err(`CDP not available at ${CDP_URL} — falling back to persistent profile`);
  }

  // ── 2. Fallback: launch Chrome with persistent profile ───────────────────────
  if (!usingCDP) {
    fs.mkdirSync(PROFILE_DIR, { recursive: true });
    context = await chromium.launchPersistentContext(PROFILE_DIR, {
      headless: false,
      executablePath: CHROME_PATH,
      viewport: { width: 1280, height: 800 },
      args: [
        '--no-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
      ],
      ignoreDefaultArgs: ['--enable-automation'],
    });
    err('Launched Chrome with persistent profile');
  }

  // ── 3. Get a page to work with ───────────────────────────────────────────────
  const existingPages = context.pages();
  // Prefer a LinkedIn tab if one's open; otherwise open a new tab
  let page = existingPages.find(p => p.url().includes('linkedin.com')) || null;
  if (!page) {
    page = existingPages[0] || await context.newPage();
  }

  // Remove automation fingerprints
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  try {
    // Build search URL
    const params = new URLSearchParams();
    params.set('keywords', KEYWORDS);
    params.set('origin', 'FACETED_SEARCH');
    if (TITLE) params.set('titleFreeText', TITLE);
    if (DEGREE === '2nd') params.set('network', JSON.stringify(['S']));
    else if (DEGREE === '1st') params.set('network', JSON.stringify(['F']));

    const searchUrl = `https://www.linkedin.com/search/results/people/?${params}`;
    err(`Navigating to: ${searchUrl}`);

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Check login status — path-based check is most reliable (LinkedIn changes DOM constantly)
    const loginState = await page.evaluate(() => {
      const path = window.location.pathname;
      if (path.startsWith('/login') || path.startsWith('/checkpoint') || path.startsWith('/signup')) {
        return 'logged_out';
      }
      if (document.querySelector('form[action="/checkpoint/lg/login"]') ||
          document.querySelector('.sign-in-form')) {
        return 'logged_out';
      }
      // Logged in: on a LinkedIn page that's not auth
      return 'logged_in';
    });

    err(`Login state: ${loginState}`);

    if (loginState === 'logged_out') {
      err('Not logged in. Start Chrome via harness/start-chrome-debug.sh and log into LinkedIn.');
      process.stdout.write(JSON.stringify({ error: 'not_logged_in' }));
      if (!usingCDP) await context.close();
      process.exit(2);
    }

    // Wait for people-search-result cards (LinkedIn's current data-view-name)
    await page.waitForSelector(
      '[data-view-name="people-search-result"], .reusable-search__result-container, .entity-result',
      { timeout: 15000 }
    ).catch(() => err('Results container not found — extracting what we can'));

    await page.waitForTimeout(2000);

    // Scroll to trigger lazy-loaded cards
    for (let i = 0; i < 4; i++) {
      await page.evaluate(() => window.scrollBy(0, 600));
      await page.waitForTimeout(400);
    }
    await page.waitForTimeout(1000);

    // Extract results — selector-agnostic approach using data-view-name + DOM position
    const results = await page.evaluate((maxResults) => {
      const items = [];

      // LinkedIn 2024+: data-view-name="people-search-result"
      // Older: .reusable-search__result-container, .entity-result
      const cards = document.querySelectorAll(
        '[data-view-name="people-search-result"], .reusable-search__result-container, .entity-result'
      );

      cards.forEach(card => {
        if (items.length >= maxResults) return;

        // Profile URL
        const link = card.querySelector('a[href*="/in/"]');
        if (!link) return;
        const profileUrl = link.href.split('?')[0];
        if (!profileUrl.includes('/in/')) return;

        // Name — new LinkedIn uses data-view-name="search-result-lockup-title"
        let name = '';
        const titleEl = card.querySelector('[data-view-name="search-result-lockup-title"]');
        if (titleEl) {
          name = titleEl.innerText?.trim() || '';
        } else {
          // Older LinkedIn fallback
          for (const sel of [
            '.entity-result__title-text a span[aria-hidden="true"]',
            '.entity-result__title-text span[aria-hidden="true"]',
            'span[aria-hidden="true"]',
          ]) {
            const el = card.querySelector(sel);
            if (el?.innerText?.trim().length > 1) { name = el.innerText.trim(); break; }
          }
        }
        name = name.replace(/\s*[•·]\s*(1st|2nd|3rd\+?)\s*$/, '').trim();
        if (!name || name.length < 2) return;

        // Headline + Location — new LinkedIn uses <p> tags (no stable class names)
        // Skip <p> tags that contain the profile link (name row)
        // First non-name <p> = headline, second = location
        const pTags = Array.from(card.querySelectorAll('p')).filter(p => {
          const t = p.innerText?.trim();
          return t && !p.querySelector('a[href*="/in/"]');
        });
        const headline = (pTags[0]?.innerText?.trim() || '').substring(0, 150);
        const location  = (pTags[1]?.innerText?.trim() || '').substring(0, 80);

        // Old LinkedIn fallback for headline
        let headlineFinal = headline;
        if (!headlineFinal) {
          for (const sel of ['.entity-result__primary-subtitle', '.entity-result__summary']) {
            const el = card.querySelector(sel);
            if (el?.innerText?.trim()) { headlineFinal = el.innerText.trim().substring(0, 150); break; }
          }
        }

        // Connection degree
        const cardText = card.innerText || '';
        let connectionDegree = '';
        if (/\b1st\b/.test(cardText)) connectionDegree = '1st';
        else if (/\b2nd\b/.test(cardText)) connectionDegree = '2nd';
        else if (/\b3rd\b/.test(cardText)) connectionDegree = '3rd';

        items.push({ name, profileUrl, headline: headlineFinal, location, connectionDegree, mutualConnections: 0 });
      });

      return items;
    }, MAX_RESULTS);

    err(`Found ${results.length} results`);
    process.stdout.write(JSON.stringify(results));

  } finally {
    // Never close a Chrome we connected to via CDP — it's the user's running browser
    if (!usingCDP && context) {
      await context.close();
    }
    if (browserForCDP) {
      // Disconnect from CDP (does NOT close Chrome)
      await browserForCDP.close();
    }
  }
}

searchLinkedIn().catch(e => {
  err(`Fatal: ${e.message}`);
  process.stdout.write(JSON.stringify({ error: e.message }));
  process.exit(1);
});
