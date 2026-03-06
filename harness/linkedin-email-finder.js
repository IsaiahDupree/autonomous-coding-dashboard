#!/usr/bin/env node

/**
 * LinkedIn Email Finder — Playwright CDP-based email extractor
 * =============================================================
 * PRIMARY: Connects to an already-running Chrome instance via CDP
 *   (Chrome must be launched with --remote-debugging-port=9222)
 *   -> run:  harness/start-chrome-debug.sh
 *
 * FALLBACK: If CDP is unavailable, launches Chrome with a persistent profile.
 *
 * Extracts email addresses from LinkedIn contact info (1st-degree connections only).
 *
 * Usage:
 *   node harness/linkedin-email-finder.js --profile-url "https://linkedin.com/in/someone"
 *   node harness/linkedin-email-finder.js --from-queue
 *
 * Output (stdout): JSON with results
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
const PROFILE_URL = getArg('--profile-url', '');
const FROM_QUEUE  = args.includes('--from-queue');

function err(msg) { process.stderr.write(`[email-finder] ${msg}\n`); }

// ── Find email from a LinkedIn profile ──────────────────────────────────────
async function findEmail(page, profileUrl) {
  err(`Navigating to profile: ${profileUrl}`);
  await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForTimeout(2000);

  // Check login
  const currentPath = await page.evaluate(() => window.location.pathname);
  if (currentPath.startsWith('/login') || currentPath.startsWith('/checkpoint')) {
    return { email: null, error: 'not_logged_in' };
  }

  // Find contact info button (only visible for 1st-degree connections)
  const contactInfoLink = await page.$('a[href*="contact-info"]');
  if (!contactInfoLink) {
    return { email: null, error: 'not_first_degree' };
  }

  await contactInfoLink.click();
  await page.waitForTimeout(1500);

  // Wait for modal
  await page.waitForSelector('.artdeco-modal, .pv-contact-info', { timeout: 5000 }).catch(() => {});

  // Extract email
  const email = await page.evaluate(() => {
    const mailLink = document.querySelector('a[href^="mailto:"]');
    if (mailLink) return mailLink.href.replace('mailto:', '').trim();
    return null;
  });

  // Close modal
  await page.evaluate(() => {
    const dismiss = document.querySelector('button[aria-label*="Dismiss"], .artdeco-modal__dismiss, button[aria-label*="Close"]');
    if (dismiss) dismiss.click();
  });

  if (email) return { email, confidence: 1.0, source: 'linkedin_contact_info' };
  return { email: null, error: 'no_email_visible' };
}

// ── Main ────────────────────────────────────────────────────────────────────
async function run() {
  if (!PROFILE_URL && !FROM_QUEUE) {
    err('Usage: --profile-url <url> OR --from-queue');
    process.stdout.write(JSON.stringify({ error: 'missing_args' }));
    process.exit(1);
  }

  let context = null;
  let browserForCDP = null;
  let usingCDP = false;

  // ── 1. Try to connect to already-running Chrome via CDP ───────────────────
  try {
    browserForCDP = await chromium.connectOverCDP(CDP_URL, { timeout: 3000 });
    const contexts = browserForCDP.contexts();
    context = contexts[0] || await browserForCDP.newContext();
    usingCDP = true;
    err(`Connected to running Chrome via CDP (${CDP_URL})`);
  } catch {
    err(`CDP not available at ${CDP_URL} — falling back to persistent profile`);
  }

  // ── 2. Fallback: launch Chrome with persistent profile ────────────────────
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

  // ── 3. Get a page to work with ────────────────────────────────────────────
  const existingPages = context.pages();
  let page = existingPages.find(p => p.url().includes('linkedin.com')) || null;
  if (!page) {
    page = existingPages[0] || await context.newPage();
  }

  // Remove automation fingerprints
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  try {
    if (FROM_QUEUE) {
      // Read harness/linkedin-dm-queue.json
      const queuePath = path.join(__dirname, 'linkedin-dm-queue.json');
      let queue = [];
      try { queue = JSON.parse(fs.readFileSync(queuePath, 'utf-8')); } catch {}

      const firstDegree = queue.filter(item =>
        item.prospect?.connectionDegree === '1st' && item.status === 'pending_approval'
      );
      err(`Processing ${firstDegree.length} 1st-degree connections from queue`);

      const results = [];
      for (const item of firstDegree) {
        const profileUrl = item.prospect?.profileUrl;
        if (!profileUrl) continue;

        try {
          const result = await findEmail(page, profileUrl);
          results.push({ id: item.id, name: item.prospect?.name, profileUrl, ...result });
          err(`  ${item.prospect?.name}: ${result.email || result.error}`);
        } catch (e) {
          results.push({ id: item.id, name: item.prospect?.name, profileUrl, email: null, error: e.message });
          err(`  ${item.prospect?.name}: error — ${e.message}`);
        }

        // Rate limit pause between profiles
        await new Promise(r => setTimeout(r, 2000));
      }

      process.stdout.write(JSON.stringify({ processed: results.length, results }));
    } else {
      // Single profile
      const result = await findEmail(page, PROFILE_URL);
      process.stdout.write(JSON.stringify(result));
    }
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

run().catch(e => {
  err(`Fatal: ${e.message}`);
  process.stdout.write(JSON.stringify({ error: e.message }));
  process.exit(1);
});
