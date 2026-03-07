#!/usr/bin/env node

/**
 * LinkedIn Events Attendee Scraper — Chrome CDP automation
 * =========================================================
 * Searches LinkedIn Events by keyword, then visits each event's
 * attendee list and extracts prospects.
 *
 * Signal quality: VERY HIGH — people who RSVP to AI/Founder events
 * are self-selecting with explicit intent. Expect 4-8% DM reply rate.
 *
 * Usage:
 *   node harness/linkedin-events-scraper.js --keyword "AI automation founders"
 *   node harness/linkedin-events-scraper.js --keyword "SaaS growth" --max-events 5
 *   node harness/linkedin-events-scraper.js --event-url "https://www.linkedin.com/events/12345/about/"
 *   node harness/linkedin-events-scraper.js --dry-run
 *
 * Output: JSON array written to stdout (compatible with linkedin-daemon scoring pipeline)
 * Each item: { name, profileUrl, headline, eventUrl, eventName, engagementType: "event_attendee" }
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_DIR = __dirname;

const CDP_URL     = process.env.CHROME_CDP_URL || 'http://localhost:9333';
const PROFILE_DIR = path.join(__dirname, '.chrome-linkedin-profile');
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const LOG_FILE    = path.join(HARNESS_DIR, 'linkedin-engagement-log.ndjson');

// CLI args
const args = process.argv.slice(2);
function getArg(name, fallback = '') {
  const idx = args.indexOf(name);
  return (idx !== -1 && args[idx + 1] !== undefined) ? args[idx + 1] : fallback;
}
const KEYWORD         = getArg('--keyword', 'AI automation SaaS founders');
const MAX_EVENTS      = parseInt(getArg('--max-events', '3'), 10);
const MAX_ATTENDEES   = parseInt(getArg('--max-attendees', '50'), 10);
const SINGLE_EVENT_URL = getArg('--event-url', '');
const DRY_RUN         = args.includes('--dry-run');

function err(msg) { process.stderr.write(`[events-scraper] ${msg}\n`); }
function appendLog(obj) {
  try { fs.appendFileSync(LOG_FILE, JSON.stringify({ ...obj, ts: new Date().toISOString() }) + '\n'); } catch {}
}

// ── Browser setup (shared pattern with other scrapers) ───────────────────────
async function getPage() {
  let context = null;
  let browserForCDP = null;
  let usingCDP = false;

  try {
    browserForCDP = await chromium.connectOverCDP(CDP_URL, { timeout: 3000 });
    const contexts = browserForCDP.contexts();
    context = contexts[0] || await browserForCDP.newContext();
    usingCDP = true;
    err(`Connected to Chrome via CDP (${CDP_URL})`);
  } catch {
    err(`CDP unavailable — launching Chrome with persistent profile`);
  }

  if (!usingCDP) {
    fs.mkdirSync(PROFILE_DIR, { recursive: true });
    context = await chromium.launchPersistentContext(PROFILE_DIR, {
      headless: false,
      executablePath: CHROME_PATH,
      viewport: { width: 1280, height: 800 },
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled', '--disable-infobars'],
      ignoreDefaultArgs: ['--enable-automation'],
    });
    err('Launched Chrome with persistent profile');
  }

  const pages = context.pages();
  let page = pages.find(p => p.url().includes('linkedin.com')) || pages[0] || await context.newPage();

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  return { page, context, browserForCDP, usingCDP };
}

// ── Check login state ────────────────────────────────────────────────────────
async function checkLogin(page) {
  const state = await page.evaluate(() => {
    const p = window.location.pathname;
    if (p.startsWith('/login') || p.startsWith('/checkpoint') || p.startsWith('/signup')) return 'logged_out';
    if (document.querySelector('form[action="/checkpoint/lg/login"]') || document.querySelector('.sign-in-form')) return 'logged_out';
    return 'logged_in';
  });
  return state;
}

// ── Step 1: Search for events by keyword ────────────────────────────────────
async function findEventUrls(page, keyword, maxEvents) {
  const searchUrl = `https://www.linkedin.com/search/results/events/?keywords=${encodeURIComponent(keyword)}`;
  err(`Searching events: ${searchUrl}`);

  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2500);

  const loginState = await checkLogin(page);
  if (loginState === 'logged_out') {
    err('Not logged in — run start-chrome-debug.sh and log in first');
    return [];
  }

  // Scroll to load more events
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(500);
  }

  const eventUrls = await page.evaluate((max) => {
    const urls = [];
    // Event cards in search results link to /events/{id}/about/
    const links = document.querySelectorAll('a[href*="/events/"]');
    for (const link of links) {
      if (urls.length >= max) break;
      const href = link.href.split('?')[0];
      // Normalize to /about/ URL
      const match = href.match(/\/events\/(\d+)/);
      if (match) {
        const url = `https://www.linkedin.com/events/${match[1]}/about/`;
        if (!urls.includes(url)) urls.push(url);
      }
    }
    return urls;
  }, maxEvents);

  err(`Found ${eventUrls.length} event URLs`);
  return eventUrls;
}

// ── Step 2: Scrape attendees from a single event page ───────────────────────
async function scrapeEventAttendees(page, eventUrl, maxAttendees) {
  err(`Visiting event: ${eventUrl}`);
  await page.goto(eventUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForTimeout(2500);

  // Get event name for logging
  const eventName = await page.evaluate(() => {
    const h1 = document.querySelector('h1.event-info-container__name, h1.t-24, .events-components-about-body h1');
    return h1?.innerText?.trim() || document.title.replace(' | LinkedIn', '');
  });
  err(`  Event: "${eventName}"`);

  // Navigate to attendees tab — LinkedIn Events have an "Attendees" section
  // Try to find and click the attendees button/tab
  const attendeesUrl = eventUrl.replace('/about/', '/attendees/');
  err(`  Navigating to attendees: ${attendeesUrl}`);
  await page.goto(attendeesUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(2000);

  // Scroll to load attendees
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(400);
  }

  // Wait for attendee list to appear
  await page.waitForSelector(
    '[data-view-name="member-details-entity"], .org-top-card, .reusable-search__result-container, a[href*="/in/"]',
    { timeout: 10000 }
  ).catch(() => err('  Attendee list not found — extracting visible links'));

  const attendees = await page.evaluate((max, evtUrl, evtName) => {
    const results = [];
    const seen = new Set();

    // Attendees show as profile cards with /in/ links
    const cards = document.querySelectorAll(
      '.reusable-search__result-container, [data-view-name="member-details-entity"], .entity-result'
    );

    function extractFromCard(card) {
      const link = card.querySelector('a[href*="/in/"]');
      if (!link) return null;
      const profileUrl = link.href.split('?')[0];
      if (!profileUrl.includes('/in/') || seen.has(profileUrl)) return null;
      seen.add(profileUrl);

      const nameEl = card.querySelector(
        '.entity-result__title-text, .actor-name, .org-top-card__name, span[aria-hidden="true"]'
      );
      const name = nameEl?.innerText?.trim() || link.innerText?.trim() || '';
      if (!name) return null;

      const headlineEl = card.querySelector(
        '.entity-result__primary-subtitle, .entity-result__summary, .member-insights__descriptor'
      );
      const headline = headlineEl?.innerText?.trim() || '';

      return { name, profileUrl, headline, eventUrl: evtUrl, eventName: evtName, engagementType: 'event_attendee' };
    }

    // Try structured card extraction first
    for (const card of cards) {
      if (results.length >= max) break;
      const p = extractFromCard(card);
      if (p) results.push(p);
    }

    // Fallback: any /in/ links on the page if card extraction yielded little
    if (results.length < 5) {
      const links = document.querySelectorAll('a[href*="/in/"]');
      for (const link of links) {
        if (results.length >= max) break;
        const profileUrl = link.href.split('?')[0];
        if (!profileUrl.includes('/in/') || seen.has(profileUrl)) continue;
        seen.add(profileUrl);
        const name = link.innerText?.trim() || '';
        if (!name || name.length < 3) continue;
        // Find nearby headline (sibling or parent text)
        const parent = link.closest('li, div[class*="result"], div[class*="card"]');
        const headlineEl = parent?.querySelector('[class*="subtitle"], [class*="headline"], [class*="summary"]');
        const headline = headlineEl?.innerText?.trim() || '';
        results.push({ name, profileUrl, headline, eventUrl: evtUrl, eventName: evtName, engagementType: 'event_attendee' });
      }
    }

    return results;
  }, maxAttendees, eventUrl, eventName);

  err(`  Extracted ${attendees.length} attendees from "${eventName}"`);
  appendLog({ event: eventUrl, eventName, attendees_found: attendees.length });
  return attendees;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (DRY_RUN) {
    err('DRY RUN — printing config, no browser actions');
    process.stdout.write(JSON.stringify({
      dryRun: true,
      keyword: KEYWORD,
      maxEvents: MAX_EVENTS,
      maxAttendees: MAX_ATTENDEES,
      singleEventUrl: SINGLE_EVENT_URL || null,
    }));
    return;
  }

  const { page, context, browserForCDP, usingCDP } = await getPage();

  try {
    let eventUrls = [];
    if (SINGLE_EVENT_URL) {
      eventUrls = [SINGLE_EVENT_URL];
    } else {
      eventUrls = await findEventUrls(page, KEYWORD, MAX_EVENTS);
    }

    if (eventUrls.length === 0) {
      err('No events found');
      process.stdout.write(JSON.stringify([]));
      return;
    }

    const allAttendees = [];
    const seenProfiles = new Set();

    for (const eventUrl of eventUrls) {
      const attendees = await scrapeEventAttendees(page, eventUrl, MAX_ATTENDEES);
      for (const a of attendees) {
        if (!seenProfiles.has(a.profileUrl)) {
          seenProfiles.add(a.profileUrl);
          allAttendees.push(a);
        }
      }
      // Polite pause between events
      await page.waitForTimeout(2000);
    }

    err(`Total unique attendees: ${allAttendees.length}`);
    process.stdout.write(JSON.stringify(allAttendees));

  } finally {
    if (!usingCDP && context) await context.close();
    if (browserForCDP) await browserForCDP.close();
  }
}

main().catch(e => {
  err(`Fatal: ${e.message}`);
  process.stdout.write(JSON.stringify({ error: e.message }));
  process.exit(1);
});
