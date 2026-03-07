#!/usr/bin/env node
/**
 * twitter-screenshot-runner.js
 *
 * Takes screenshots of tweets using Playwright.
 * Called as a subprocess by twitter-trend-agent.js.
 *
 * Usage:
 *   node harness/twitter-screenshot-runner.js \
 *     --posts '[{"handle":"...","text":"...","url":"..."}]' \
 *     --outdir '/path/to/screenshots/'
 *
 * Outputs JSON array to stdout (last line).
 */

import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);

function getArg(flag) {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
}

function formatCount(n) {
  const num = typeof n === 'string' ? parseFloat(n.replace(/[^0-9.]/g, '')) : n;
  if (isNaN(num)) return String(n);
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000)     return (num / 1_000).toFixed(1) + 'K';
  return String(Math.round(num));
}

const postsJson = getArg('--posts');
const outdir    = getArg('--outdir');

if (!postsJson || !outdir) {
  process.stderr.write('Usage: --posts <json> --outdir <path>\n');
  process.exit(1);
}

let posts;
try {
  posts = JSON.parse(postsJson);
} catch (e) {
  process.stderr.write('Invalid --posts JSON\n');
  process.exit(1);
}

fs.mkdirSync(outdir, { recursive: true });

function buildTweetHTML(post) {
  const handle = post.handle || post.username || 'unknown';
  const author = post.author || post.name || handle;
  const text = (post.text || post.content || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const likes = formatCount(post.likes || 0);
  const rts   = formatCount(post.retweets || 0);
  const repls = formatCount(post.replies || 0);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #000; font-family: -apple-system, Arial, sans-serif; padding: 12px; }
  .tweet {
    background: #0f1923;
    border: 1px solid #1e2d3d;
    border-radius: 16px;
    padding: 20px 24px;
    color: #fff;
    width: 560px;
  }
  .header { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
  .avatar {
    width: 48px; height: 48px; border-radius: 50%;
    background: linear-gradient(135deg, #1d9bf0, #0d47a1);
    display: flex; align-items: center; justify-content: center;
    font-size: 22px; flex-shrink: 0;
  }
  .names .author { font-weight: 700; font-size: 16px; color: #e7e9ea; }
  .names .handle { color: #71767b; font-size: 14px; margin-top: 2px; }
  .xlogo { margin-left: auto; color: #e7e9ea; font-size: 20px; }
  .body { font-size: 18px; line-height: 1.55; margin-bottom: 18px; color: #e7e9ea; }
  .stats {
    display: flex; gap: 28px; color: #71767b; font-size: 14px;
    border-top: 1px solid #1e2d3d; padding-top: 14px;
  }
  .stat { display: flex; align-items: center; gap: 6px; }
  .stat span.num { color: #e7e9ea; font-weight: 600; }
</style>
</head>
<body>
<div class="tweet">
  <div class="header">
    <div class="avatar">👤</div>
    <div class="names">
      <div class="author">${author}</div>
      <div class="handle">@${handle}</div>
    </div>
    <div class="xlogo">𝕏</div>
  </div>
  <div class="body">${text}</div>
  <div class="stats">
    <span class="stat">💬 <span class="num">${repls}</span></span>
    <span class="stat">🔁 <span class="num">${rts}</span></span>
    <span class="stat">❤️ <span class="num">${likes}</span></span>
  </div>
</div>
</body>
</html>`;
}

async function run() {
  let browser;
  let usingExistingBrowser = false;

  // Try existing Chrome CDP session first
  try {
    browser = await chromium.connectOverCDP('http://localhost:9333');
    usingExistingBrowser = true;
  } catch (e) {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  }

  const context = usingExistingBrowser
    ? (browser.contexts()[0] || await browser.newContext())
    : await browser.newContext({ viewport: { width: 600, height: 500 } });

  const results = [];

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const screenshotPath = path.join(outdir, `tweet-${String(i + 1).padStart(2, '0')}.png`);
    const tweetUrl = post.url || post.tweet_url || post.link || '';

    // Try real URL navigation first
    if (tweetUrl && (tweetUrl.includes('twitter.com') || tweetUrl.includes('x.com'))) {
      try {
        const page = await context.newPage();
        await page.goto(tweetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForSelector('article[data-testid="tweet"]', { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(2000);
        await page.evaluate(() => {
          const header = document.querySelector('header');
          if (header) header.style.display = 'none';
        });
        const tweetEl = await page.$('article[data-testid="tweet"]');
        if (tweetEl) await tweetEl.screenshot({ path: screenshotPath });
        else await page.screenshot({ path: screenshotPath, fullPage: false });
        await page.close();
        results.push({
          screenshotPath,
          author: post.author || post.name || 'X User',
          handle: post.handle || post.username || 'unknown',
          text: post.text || post.content || '',
          likes: formatCount(post.likes || 0),
          retweets: formatCount(post.retweets || 0),
          replies: formatCount(post.replies || 0),
          views: post.views ? formatCount(post.views) : undefined,
        });
        continue;
      } catch (e) {
        process.stderr.write(`Skipping URL navigation for post ${i+1}: ${e.message}\n`);
      }
    }

    // Fallback: synthetic tweet card HTML
    const page = await context.newPage();
    await page.setViewportSize({ width: 600, height: 500 });
    await page.setContent(buildTweetHTML(post), { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const card = await page.$('.tweet');
    if (card) await card.screenshot({ path: screenshotPath });
    else await page.screenshot({ path: screenshotPath });
    await page.close();

    results.push({
      screenshotPath,
      author: post.author || post.name || 'X User',
      handle: post.handle || post.username || 'unknown',
      text: post.text || post.content || '',
      likes: formatCount(post.likes || 0),
      retweets: formatCount(post.retweets || 0),
      replies: formatCount(post.replies || 0),
      views: post.views ? formatCount(post.views) : undefined,
    });
  }

  if (!usingExistingBrowser) await browser.close();

  // Final line is JSON (agent reads this)
  process.stdout.write(JSON.stringify(results) + '\n');
}

run().catch(e => {
  process.stderr.write('Screenshot runner error: ' + e.message + '\n');
  process.stdout.write('[]\n');
  process.exit(0);
});
