#!/usr/bin/env node
/**
 * linkedin-chrome-feed-test.js — Test Chrome CDP for hashtag feed + post commenter scraping
 *
 * Uses the already-running Chrome at port 9333 (must be logged into LinkedIn).
 * Tests what Chrome can scrape that Safari can't:
 *   1. Hashtag feed posts + creators
 *   2. Post commenter extraction
 *   3. Optional: add discovered prospects to linkedin-dm-queue.json
 *
 * Usage:
 *   node harness/linkedin-chrome-feed-test.js --tag aiautomation
 *   node harness/linkedin-chrome-feed-test.js --tag saas --add-to-queue
 *   node harness/linkedin-chrome-feed-test.js --post-url https://www.linkedin.com/posts/... --commenters
 *   node harness/linkedin-chrome-feed-test.js --tag aiautomation --then-commenters
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CDP_URL    = process.env.CHROME_CDP_URL || 'http://localhost:9333';
const QUEUE_FILE = path.join(__dirname, 'linkedin-dm-queue.json');

const args      = process.argv.slice(2);
const getArg    = (f, d = '') => { const i = args.indexOf(f); return i !== -1 && args[i+1] ? args[i+1] : d; };
const hasFlag   = (f) => args.includes(f);

const TAG           = getArg('--tag', 'aiautomation');
const POST_URL      = getArg('--post-url', '');
const LIMIT         = parseInt(getArg('--limit', '20'), 10);
const ADD_QUEUE     = hasFlag('--add-to-queue');
const THEN_COMMENTS = hasFlag('--then-commenters'); // after hashtag, scrape top post commenters too
const COMMENTS_ONLY = hasFlag('--commenters') && !!POST_URL;
const WAIT_MS       = parseInt(getArg('--wait', '8000'), 10); // ms to wait for feed content

const log = (m) => console.error(`[chrome-feed] ${m}`);

// ── ICP scorer ────────────────────────────────────────────────────────────────
const ICP_TITLES    = ['founder','ceo','cto','co-founder','owner','president','head of','vp','director','growth','solopreneur','entrepreneur','creator','consultant','agency'];
const TECH_KEYWORDS = ['saas','ai','automation','software','tech','startup','digital','marketing','no-code','nocode','crm','analytics'];

function scoreProspect(p) {
  const h = (p.headline || '').toLowerCase();
  let score = 30;
  if (ICP_TITLES.some(t => h.includes(t)))    score += 30;
  if (TECH_KEYWORDS.some(k => h.includes(k))) score += 20;
  if (h.includes('founder') || h.includes('ceo')) score += 10;
  if (p.reactions > 50 || p.comments > 20)    score += 10;
  return Math.min(score, 100);
}

// ── Queue helper ──────────────────────────────────────────────────────────────
function addToQueue(prospects, source) {
  let queue = [];
  try { queue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8')); } catch {}
  const existingUrls = new Set(queue.map(x => x.prospect?.profileUrl));
  let added = 0;
  for (const p of prospects) {
    if (!p.profileUrl || existingUrls.has(p.profileUrl)) continue;
    const score = scoreProspect(p);
    if (score < 40) continue;
    queue.push({
      id: `li-chrome-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      queued_at: new Date().toISOString(),
      status: 'pending_approval',
      source: `chrome:${source}`,
      priority_score: score,
      prospect: { name: p.name, profileUrl: p.profileUrl, headline: p.headline || '', connectionDegree: 'unknown' },
    });
    existingUrls.add(p.profileUrl);
    added++;
  }
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
  return added;
}

// ── Pretty table ──────────────────────────────────────────────────────────────
function printTable(rows, cols) {
  if (!rows.length) { console.log('  (no results)'); return; }
  const widths = cols.map(c => Math.max(c.label.length, ...rows.map(r => String(r[c.key] ?? '').length)));
  console.log('\n' + cols.map((c,i) => c.label.padEnd(widths[i])).join(' | '));
  console.log(widths.map(w => '-'.repeat(w+2)).join('+'));
  for (const r of rows) {
    console.log(cols.map((c,i) => String(r[c.key]??'').substring(0,widths[i]).padEnd(widths[i])).join(' | '));
  }
  console.log(`\n${rows.length} results\n`);
}

// ── Chrome connection ─────────────────────────────────────────────────────────
async function connectChrome() {
  let browser, context;
  try {
    browser = await chromium.connectOverCDP(CDP_URL, { timeout: 5000 });
    const contexts = browser.contexts();
    context = contexts[0] || await browser.newContext();
    log(`Connected to Chrome CDP at ${CDP_URL}`);
  } catch (e) {
    console.error(`Cannot connect to Chrome at ${CDP_URL}: ${e.message}`);
    console.error('Run: bash harness/start-chrome-debug.sh start');
    process.exit(1);
  }
  return { browser, context };
}

async function getLinkedInPage(context) {
  const pages = context.pages();
  // Prefer existing LinkedIn tab
  let page = pages.find(p => p.url().includes('linkedin.com') && !p.url().includes('login')) || null;
  if (!page) {
    page = pages[0] || await context.newPage();
    // If on login page, tell user to log in
    if (page.url().includes('login') || !page.url().includes('linkedin.com')) {
      log(`Current page: ${page.url()}`);
      log('Navigating to LinkedIn feed to check login state...');
      await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(3000);
    }
  }
  // Check if logged in
  const url = page.url();
  if (url.includes('/login') || url.includes('/checkpoint') || url.includes('/authwall')) {
    console.error('\nChrome is not logged into LinkedIn.');
    console.error('Please log in manually in the Chrome window that is open on your screen,');
    console.error('then re-run this script.\n');
    process.exit(1);
  }
  log(`Using page: ${url.substring(0, 80)}`);
  return page;
}

// ── Hashtag feed scraper ──────────────────────────────────────────────────────
async function scrapeHashtagFeed(page, tag, waitMs) {
  const url = `https://www.linkedin.com/feed/hashtag/${tag}/`;
  log(`Navigating to hashtag feed: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

  log(`Waiting ${waitMs}ms for feed content to render...`);
  await page.waitForTimeout(waitMs);

  // Try scrolling to trigger lazy-loaded content
  await page.evaluate(() => window.scrollBy(0, 600));
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollBy(0, 600));
  await page.waitForTimeout(2000);

  const bodyText = await page.evaluate(() => document.body.innerText.trim());
  log(`Page rendered: ${bodyText.length} chars of text`);

  if (bodyText.length < 100) {
    log('WARNING: Page body has very little text — LinkedIn may be blocking this view');
  }

  // Extract posts — LinkedIn uses obfuscated class names; navigate structurally via /in/ links
  const creators = await page.evaluate(() => {
    const results = [];
    const seenContainers = new Set();
    const seenProfiles = new Set();

    const authorLinks = Array.from(document.querySelectorAll('a[href*="linkedin.com/in/"]'));

    for (const a of authorLinks) {
      // Only use links with actual name text (not "Feed post" / empty)
      const rawText = a.innerText.trim();
      if (!rawText || rawText === 'Feed post' || rawText.length < 2) continue;

      const profileUrl = a.href.split('?')[0];
      if (!profileUrl.match(/\/in\/[^/]+\/?$/) || seenProfiles.has(profileUrl)) continue;
      seenProfiles.add(profileUrl);

      // Clean name: strip badge words and degree markers
      const name = rawText
        .split('\n')[0]
        .replace(/\s*(Premium|Verified|Profile|3rd\+|2nd|1st|\u2022.*)/gi, '')
        .trim();

      // Walk up 4 levels to get the full post card container
      let card = a;
      for (let i = 0; i < 4; i++) card = card.parentElement || card;
      if (seenContainers.has(card)) continue;
      seenContainers.add(card);

      const text = card.innerText.trim();
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 1);

      // Headline: first line after name that looks like a job title
      const nameIdx = lines.findIndex(l => l.includes(name.split(' ')[0]));
      const headline = lines.slice(nameIdx + 1)
        .find(l => l.length > 5 && l.length < 120
          && !/^(Follow|Connect|Message|3rd|2nd|1st|\d|\u2022)/.test(l)
          && !l.includes(name)) || '';

      // Post text: longest paragraph
      const postText = lines.filter(l => l.length > 80).join(' ').substring(0, 300);

      // Engagement counts
      const reactionMatch = text.match(/(\d[\d,]*)\s*reaction/i);
      const reactions = reactionMatch ? parseInt(reactionMatch[1].replace(',','')) : 0;
      const commentMatch = text.match(/(\d[\d,]*)\s*comment/i);
      const comments = commentMatch ? parseInt(commentMatch[1].replace(',','')) : 0;

      // Post URL: find any feed/update link in the card
      const postLink = card.querySelector('a[href*="/feed/update/"], a[href*="/posts/"]');
      const postUrl = postLink ? postLink.href.split('?')[0] : '';

      if (name.length > 1) {
        results.push({ name, profileUrl, headline, text: postText, reactions, comments, postUrl });
      }
    }
    return results;
  });

  log(`Extracted ${creators.length} unique creators from feed`);
  return { posts: creators, creators, tag };
}

// ── Post commenter scraper ────────────────────────────────────────────────────
async function scrapePostCommenters(page, postUrl, limit) {
  log(`Navigating to post: ${postUrl}`);

  // LinkedIn post pages can be at /posts/ or /feed/update/urn:li:activity:...
  await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(5000);

  // Scroll to trigger comment loading
  await page.evaluate(() => window.scrollBy(0, 1200));
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.scrollBy(0, 800));
  await page.waitForTimeout(2000);

  // Try clicking "Load more comments" if present
  try {
    const loadMore = await page.$('button[aria-label*="Load more comments" i]');
    if (loadMore) { await loadMore.click(); await page.waitForTimeout(2000); }
  } catch {}

  const bodyText = await page.evaluate(() => document.body.innerText.trim());
  log(`Post page: ${bodyText.length} chars`);

  if (bodyText.length < 100) {
    return { commenters: [], error: 'Page did not render — LinkedIn blocking' };
  }

  const commenters = await page.evaluate((lim) => {
    const results = [];
    const seen = new Set();

    // LinkedIn uses .comments-comment-meta__actor as the parent of commenter /in/ links
    // This is a stable semantic class name (not obfuscated)
    const actorEls = document.querySelectorAll('.comments-comment-meta__actor a[href*="/in/"]');

    for (const a of actorEls) {
      if (results.length >= lim) break;
      const profileUrl = a.href.split('?')[0].replace(/\?.*/, '');
      if (!profileUrl.match(/\/in\/[^/]+/) || seen.has(profileUrl)) continue;

      const rawName = a.innerText.trim().split('\n')[0]
        .replace(/\s*(Premium|Verified|Profile|3rd\+|2nd|1st)/gi, '').trim();
      if (!rawName || rawName.length < 2) continue;

      // Walk up to the comment item container to get headline + comment text
      let card = a;
      for (let i = 0; i < 6; i++) {
        if (!card) break;
        if (card.className && (card.className.includes('comments-comment-item') || card.tagName === 'ARTICLE')) break;
        card = card.parentElement;
      }

      const cardText = card?.innerText?.trim() || '';
      const lines = cardText.split('\n').map(l => l.trim()).filter(l => l.length > 1);
      const nameIdx = lines.findIndex(l => l.includes(rawName.split(' ')[0]));
      const headline = lines.slice(nameIdx + 1)
        .find(l => l.length > 5 && l.length < 120
          && !/^(Follow|Connect|1st|2nd|3rd|\d|\u2022|Like|Reply)/.test(l)
          && !l.includes(rawName)) || '';

      const commentText = lines.filter(l => l.length > 20 && !l.includes(rawName) && !l.includes(headline))
        .join(' ').substring(0, 150);

      const likeEl = card?.querySelector('[class*="reactions-count"], [class*="reaction-count"]');
      const likes = parseInt(likeEl?.innerText?.replace(/[^0-9]/g,'') || '0') || 0;

      seen.add(profileUrl);
      results.push({ name: rawName, profileUrl, headline, comment: commentText, likes });
    }
    return results;
  }, limit);

  log(`Extracted ${commenters.length} commenters`);
  return { commenters, postUrl };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const { browser, context } = await connectChrome();
  const page = await getLinkedInPage(context);

  // Anti-detection
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  try {
    if (COMMENTS_ONLY) {
      // ── Mode: scrape commenters from a specific post URL ────────────────────
      const result = await scrapePostCommenters(page, POST_URL, LIMIT);

      if (result.error) {
        console.log(`\nERROR: ${result.error}`);
      } else {
        console.log(`\n=== COMMENTERS (${result.commenters.length}) — ${POST_URL.substring(0, 70)} ===`);
        printTable(
          result.commenters.map(c => ({
            name: c.name?.substring(0, 25),
            headline: c.headline?.substring(0, 45),
            score: scoreProspect(c),
            likes: c.likes,
            comment: c.comment?.substring(0, 50),
          })),
          [
            { key: 'name',    label: 'Commenter' },
            { key: 'headline',label: 'Headline' },
            { key: 'score',   label: 'ICP' },
            { key: 'likes',   label: 'Likes' },
            { key: 'comment', label: 'Comment Preview' },
          ]
        );
        if (ADD_QUEUE) {
          const added = addToQueue(result.commenters, `commenters:${POST_URL}`);
          console.log(`Added ${added} commenters to linkedin-dm-queue.json`);
        }
      }

    } else {
      // ── Mode: hashtag feed ──────────────────────────────────────────────────
      const feedData = await scrapeHashtagFeed(page, TAG, WAIT_MS);

      console.log(`\n=== HASHTAG FEED — #${TAG} ===`);
      console.log(`Posts found: ${feedData.posts.length} | Unique creators: ${feedData.creators.length}`);

      if (feedData.creators.length === 0) {
        console.log('\nNo posts extracted. LinkedIn may be blocking this view in the harness Chrome.');
        console.log('Tip: Make sure you are logged in and the feed is fully visible in the Chrome window.');
      } else {
        printTable(
          feedData.creators.slice(0, 15).map(c => ({
            name:     c.name?.substring(0, 25),
            headline: c.headline?.substring(0, 40),
            score:    scoreProspect(c),
            react:    c.reactions,
            cmts:     c.comments,
            url:      c.profileUrl?.replace('https://www.linkedin.com/in/', '/in/').substring(0, 30),
          })),
          [
            { key: 'name',     label: 'Creator' },
            { key: 'headline', label: 'Headline' },
            { key: 'score',    label: 'ICP' },
            { key: 'react',    label: 'React' },
            { key: 'cmts',     label: 'Cmts' },
            { key: 'url',      label: 'Profile' },
          ]
        );

        // Show post URLs for follow-up commenter extraction
        const postsWithUrls = feedData.posts.filter(p => p.postUrl).slice(0, 5);
        if (postsWithUrls.length > 0) {
          console.log('\n=== POST URLS (for commenter extraction) ===');
          postsWithUrls.forEach((p, i) =>
            console.log(`  ${i+1}. [${p.reactions}R ${p.comments}C] ${p.name}: ${p.postUrl}`)
          );
          console.log('\nRun: node harness/linkedin-chrome-feed-test.js --post-url <URL> --commenters [--add-to-queue]');
        }

        if (ADD_QUEUE) {
          const added = addToQueue(feedData.creators, `hashtag:${TAG}`);
          console.log(`\nAdded ${added} creators to linkedin-dm-queue.json`);
        }

        // ── Optionally scrape commenters from the top post ──────────────────
        if (THEN_COMMENTS && postsWithUrls.length > 0) {
          const topPost = postsWithUrls.sort((a, b) => (b.reactions + b.comments) - (a.reactions + a.comments))[0];
          console.log(`\n=== COMMENTERS — top post by ${topPost.name} ===`);
          const commResult = await scrapePostCommenters(page, topPost.postUrl, LIMIT);
          if (commResult.error) {
            console.log(`ERROR: ${commResult.error}`);
          } else {
            printTable(
              commResult.commenters.map(c => ({
                name:     c.name?.substring(0, 25),
                headline: c.headline?.substring(0, 45),
                score:    scoreProspect(c),
                likes:    c.likes,
                comment:  c.comment?.substring(0, 50),
              })),
              [
                { key: 'name',    label: 'Commenter' },
                { key: 'headline',label: 'Headline' },
                { key: 'score',   label: 'ICP' },
                { key: 'likes',   label: 'Likes' },
                { key: 'comment', label: 'Comment Preview' },
              ]
            );
            if (ADD_QUEUE) {
              const added = addToQueue(commResult.commenters, `commenters:top-post:${TAG}`);
              console.log(`Added ${added} commenters to linkedin-dm-queue.json`);
            }
          }
        }
      }
    }

  } finally {
    // Never close CDP-connected browser — it's the user's running Chrome
    await browser.close();
  }
}

main().catch(e => {
  console.error(`[chrome-feed] Fatal: ${e.message}`);
  if (process.env.DEBUG) console.error(e.stack);
  process.exit(1);
});
