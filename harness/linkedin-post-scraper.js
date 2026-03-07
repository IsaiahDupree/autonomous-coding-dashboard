#!/usr/bin/env node

/**
 * LinkedIn Post Scraper — Playwright-based post commenter extractor
 * =================================================================
 * PRIMARY: Connects to an already-running Chrome instance via CDP
 *   (Chrome must be launched with --remote-debugging-port=9222)
 *   → run:  harness/start-chrome-debug.sh
 *
 * FALLBACK: If CDP is unavailable, launches Chrome with a persistent profile.
 *
 * Called by linkedin-engagement-daemon.js as a subprocess (stdout = JSON results).
 * Also callable standalone:
 *   node harness/linkedin-post-scraper.js --keyword "AI automation" --max-posts 5 --max-commenters 20
 *
 * Output (stdout): JSON array of { name, profileUrl, headline, postUrl, engagementType }
 * Errors go to stderr so they don't corrupt the JSON stdout.
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { acquireLock, releaseLock } from './chrome-lock.js';

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
const KEYWORD         = getArg('--keyword', 'AI automation');
const MAX_POSTS       = parseInt(getArg('--max-posts', '5'), 10);
const MAX_COMMENTERS  = parseInt(getArg('--max-commenters', '20'), 10);
const INCLUDE_LIKERS  = args.includes('--include-likers');
const MAX_LIKERS      = parseInt(getArg('--max-likers', '50'), 10);

function err(msg) { process.stderr.write(`[post-scraper] ${msg}\n`); }

async function scrapePostCommenters() {
  // Acquire Chrome page lock — wait up to 90s for other scrapers to finish
  const locked = await acquireLock('post-scraper');
  if (!locked) {
    err('Could not acquire Chrome page lock — timed out. Exiting.');
    process.stdout.write(JSON.stringify({ error: 'chrome_lock_timeout' }));
    process.exit(1);
  }

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
  let page = existingPages.find(p => p.url().includes('linkedin.com')) || null;
  if (!page) {
    page = existingPages[0] || await context.newPage();
  }

  // Remove automation fingerprints
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  try {
    // ── 4. Navigate to content search ────────────────────────────────────────────
    const searchUrl = `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(KEYWORD)}&sortBy=date_posted`;
    err(`Navigating to: ${searchUrl}`);

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // ── 5. Check login state ─────────────────────────────────────────────────────
    const loginState = await page.evaluate(() => {
      const path = window.location.pathname;
      if (path.startsWith('/login') || path.startsWith('/checkpoint') || path.startsWith('/signup')) {
        return 'logged_out';
      }
      if (document.querySelector('form[action="/checkpoint/lg/login"]') ||
          document.querySelector('.sign-in-form')) {
        return 'logged_out';
      }
      return 'logged_in';
    });

    err(`Login state: ${loginState}`);

    if (loginState === 'logged_out') {
      err('Not logged in. Start Chrome via harness/start-chrome-debug.sh and log into LinkedIn.');
      process.stdout.write(JSON.stringify({ error: 'not_logged_in' }));
      if (!usingCDP) await context.close();
      process.exit(2);
    }

    // ── 6. Wait for content posts ────────────────────────────────────────────────
    await page.waitForSelector(
      '[data-activity-urn], .feed-shared-update-v2, .occludable-update',
      { timeout: 15000 }
    ).catch(() => err('Post containers not found — extracting what we can'));

    await page.waitForTimeout(2000);

    // Scroll to trigger lazy-loaded posts
    for (let i = 0; i < 4; i++) {
      await page.evaluate(() => window.scrollBy(0, 600));
      await page.waitForTimeout(400);
    }
    await page.waitForTimeout(1000);

    // ── 7. Extract post URLs ─────────────────────────────────────────────────────
    const postUrls = await page.evaluate((maxPosts) => {
      const postLinks = [];
      const cards = document.querySelectorAll('[data-activity-urn], .feed-shared-update-v2');
      cards.forEach(card => {
        if (postLinks.length >= maxPosts) return;
        // Try to get the post permalink
        const link = card.querySelector('a[href*="/posts/"], a[href*="activity-"]');
        if (link) {
          const url = link.href.split('?')[0];
          if (url && !postLinks.includes(url)) postLinks.push(url);
        }
      });
      return postLinks.slice(0, maxPosts);
    }, MAX_POSTS);

    err(`Found ${postUrls.length} post URLs`);

    // ── 8. Visit each post and extract commenters ────────────────────────────────
    const allCommenters = [];
    const seenProfiles = new Set();

    for (const postUrl of postUrls) {
      try {
        err(`Visiting post: ${postUrl}`);
        await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForTimeout(2000);

        // Try to expand comments
        const commentBtn = await page.$('button[aria-label*="comment"], .comments-comment-item');
        if (commentBtn) {
          try { await commentBtn.click(); } catch { /* non-fatal */ }
          await page.waitForTimeout(1500);
        }

        // Wait for comment list
        await page.waitForSelector('.comments-comment-item, [data-view-name="comment"]', { timeout: 8000 }).catch(() => {
          err(`  No comments found on post`);
        });

        // Extract commenters
        const commenters = await page.evaluate((maxCommenters) => {
          const result = [];
          const items = document.querySelectorAll('.comments-comment-item, [data-view-name="comment"]');
          items.forEach(item => {
            if (result.length >= maxCommenters) return;
            const link = item.querySelector('a[href*="/in/"]');
            if (!link) return;
            const profileUrl = link.href.split('?')[0];
            // Name from link text or nearby element
            const nameEl = item.querySelector('.comments-post-meta__name-text, .hoverable-link-text, .comment-item__author-name');
            const name = nameEl?.innerText?.trim() || link.innerText?.trim() || '';
            // Headline
            const headlineEl = item.querySelector('.comments-post-meta__headline, .comment-item__author-description');
            const headline = headlineEl?.innerText?.trim() || '';
            if (name && profileUrl.includes('/in/')) {
              result.push({ name, profileUrl, headline, postUrl: window.location.href, engagementType: 'comment' });
            }
          });
          return result;
        }, MAX_COMMENTERS);

        err(`  Extracted ${commenters.length} commenters`);

        // Deduplicate by profileUrl
        for (const c of commenters) {
          if (!seenProfiles.has(c.profileUrl)) {
            seenProfiles.add(c.profileUrl);
            allCommenters.push(c);
          }
        }

        // ── Extract likers via reactions modal ───────────────────────────────
        if (INCLUDE_LIKERS) {
          try {
            // Click the reactions count button to open the reactions modal
            const reactionsBtn = await page.$(
              'button.social-counts-reactions, .social-counts-reactions__count-value, ' +
              'button[aria-label*="reaction"], .reactions-social-counts, ' +
              'span.social-counts-reactions button'
            );
            if (reactionsBtn) {
              await reactionsBtn.click();
              await page.waitForTimeout(2000);

              // Wait for the modal to appear
              await page.waitForSelector(
                '.artdeco-modal__content, .reactions-modal, .social-proof-fallback-reactions-modal',
                { timeout: 6000 }
              ).catch(() => err('  Reactions modal did not open'));

              // Scroll the modal to load more reactors
              const modal = await page.$('.artdeco-modal__content, .reactions-modal');
              if (modal) {
                for (let s = 0; s < 3; s++) {
                  await modal.evaluate(el => el.scrollBy(0, 400));
                  await page.waitForTimeout(300);
                }
              }

              const likers = await page.evaluate((maxLikers, postUrl) => {
                const results = [];
                const seen = new Set();

                // Modal content — all profile links inside the modal
                const modal = document.querySelector(
                  '.artdeco-modal__content, .reactions-modal, .social-proof-fallback-reactions-modal'
                );
                if (!modal) return results;

                // Each reactor row — look for /in/ links with names
                const rows = modal.querySelectorAll(
                  'li, [class*="reactions-modal-list__item"], [class*="reactor-item"], ' +
                  '.social-proof-fallback-reactions-modal__reacted-users-list-item'
                );

                function extractFromRows(items) {
                  for (const row of items) {
                    if (results.length >= maxLikers) break;
                    const link = row.querySelector('a[href*="/in/"]');
                    if (!link) continue;
                    const profileUrl = link.href.split('?')[0];
                    if (!profileUrl.includes('/in/') || seen.has(profileUrl)) continue;
                    seen.add(profileUrl);

                    const nameEl = row.querySelector(
                      '[class*="name"], span[aria-hidden="true"], .actor-name, strong'
                    );
                    const name = nameEl?.innerText?.trim() || link.innerText?.trim() || '';
                    if (!name || name.length < 2) continue;

                    const headlineEl = row.querySelector(
                      '[class*="subtitle"], [class*="headline"], [class*="description"]'
                    );
                    const headline = headlineEl?.innerText?.trim() || '';
                    results.push({ name, profileUrl, headline, postUrl, engagementType: 'liker' });
                  }
                }

                if (rows.length > 0) {
                  extractFromRows(rows);
                } else {
                  // Fallback: all /in/ links in modal
                  const links = modal.querySelectorAll('a[href*="/in/"]');
                  for (const link of links) {
                    if (results.length >= maxLikers) break;
                    const profileUrl = link.href.split('?')[0];
                    if (!profileUrl.includes('/in/') || seen.has(profileUrl)) continue;
                    seen.add(profileUrl);
                    const name = link.innerText?.trim() || '';
                    if (name.length < 2) continue;
                    const parent = link.closest('li, div');
                    const headlineEl = parent?.querySelector('[class*="subtitle"], [class*="headline"]');
                    results.push({ name, profileUrl, headline: headlineEl?.innerText?.trim() || '', postUrl, engagementType: 'liker' });
                  }
                }

                return results;
              }, MAX_LIKERS, postUrl);

              err(`  Extracted ${likers.length} likers`);
              for (const l of likers) {
                if (!seenProfiles.has(l.profileUrl)) {
                  seenProfiles.add(l.profileUrl);
                  allCommenters.push(l);
                }
              }

              // Close modal (Escape key)
              await page.keyboard.press('Escape');
              await page.waitForTimeout(800);
            } else {
              err('  No reactions button found on this post');
            }
          } catch (likerErr) {
            err(`  Liker extraction error: ${likerErr.message}`);
          }
        }

        // Brief pause between posts
        await page.waitForTimeout(1500);
      } catch (e) {
        err(`  Error on post ${postUrl}: ${e.message}`);
      }
    }

    // ── 9. Output results ────────────────────────────────────────────────────────
    err(`Total unique commenters: ${allCommenters.length}`);
    process.stdout.write(JSON.stringify(allCommenters));

  } finally {
    releaseLock();
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

scrapePostCommenters().catch(e => {
  err(`Fatal: ${e.message}`);
  process.stdout.write(JSON.stringify({ error: e.message }));
  process.exit(1);
});
