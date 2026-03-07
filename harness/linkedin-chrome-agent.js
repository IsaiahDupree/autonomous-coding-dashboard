#!/usr/bin/env node
/**
 * LinkedIn Chrome Agent — Task-Driven Chrome CDP Daemon
 * =====================================================
 * Polls Supabase safari_command_queue (platform='linkedin_chrome') every 30s.
 * Executes tasks via Chrome CDP, writes results back to Supabase, notifies Telegram.
 *
 * Supported task actions:
 *   scrape_hashtag        — params: { tag, limit? }
 *   get_commenters        — params: { postUrl, limit? }
 *   search_people         — params: { keywords, limit? }
 *   scrape_profile_network — params: { profileUrl, limit? }
 *   full_discovery        — params: { tag, limit? } — hashtag + top post commenters
 *
 * Tasks are inserted into Supabase by:
 *   - Telegram bot (/chrome command)
 *   - linkedin-daemon.js (self-scheduling)
 *   - Any external trigger via Supabase REST
 *
 * Usage:
 *   node harness/linkedin-chrome-agent.js           # daemon mode
 *   node harness/linkedin-chrome-agent.js --once    # single poll cycle
 *   node harness/linkedin-chrome-agent.js --test    # preflight check
 *   node harness/linkedin-chrome-agent.js --queue "scrape_hashtag" '{"tag":"aiautomation"}'
 */

import { chromium } from 'playwright';
import { acquireLock, releaseLock } from './chrome-lock.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_DIR = __dirname;

// ── File paths ────────────────────────────────────────────────────────────────
const QUEUE_FILE  = path.join(HARNESS_DIR, 'linkedin-dm-queue.json');
const STATE_FILE  = path.join(HARNESS_DIR, 'linkedin-chrome-agent-state.json');
const LOG_FILE    = path.join(HARNESS_DIR, 'linkedin-chrome-agent-log.ndjson');
const LOGS_DIR    = path.join(HARNESS_DIR, 'logs');

// ── Constants ─────────────────────────────────────────────────────────────────
const CDP_URL      = process.env.CHROME_CDP_URL || 'http://localhost:9333';
const TABLE        = 'safari_command_queue';
const PLATFORM     = 'linkedin_chrome';
const POLL_MS      = 30_000;
const CRMLITE_URL  = 'https://crmlite-isaiahduprees-projects.vercel.app';

// ── Env loading ───────────────────────────────────────────────────────────────
const ENV_OVERRIDE_KEYS = new Set(['CRMLITE_API_KEY', 'SUPABASE_SERVICE_ROLE_KEY']);
function loadEnvFile(fp) {
  try {
    for (const line of fs.readFileSync(fp, 'utf-8').split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && (!process.env[m[1]] || ENV_OVERRIDE_KEYS.has(m[1])))
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {}
}
loadEnvFile(`${process.env.HOME}/.env`);
loadEnvFile('/Users/isaiahdupree/Documents/Software/Safari Automation/.env');
loadEnvFile('/Users/isaiahdupree/Documents/Software/actp-worker/.env');

const SUPABASE_URL  = process.env.SUPABASE_URL || 'https://ivhfuhxorppptyuofbgq.supabase.co';
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const CRMLITE_KEY   = process.env.CRMLITE_API_KEY || '';
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT  = process.env.TELEGRAM_CHAT_ID || '';

// ── CLI args ──────────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const MODE    = args.includes('--once') ? 'once' : args.includes('--test') ? 'test' : 'daemon';
const QUEUE_ACTION = args.includes('--queue') ? args[args.indexOf('--queue') + 1] : null;
const QUEUE_PARAMS = QUEUE_ACTION ? JSON.parse(args[args.indexOf('--queue') + 2] || '{}') : null;

// ── Logging ───────────────────────────────────────────────────────────────────
function log(msg) {
  const line = `${new Date().toISOString()} [chrome-agent] ${msg}`;
  console.log(line);
}
function appendLog(entry) {
  try { fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n'); } catch {}
}

// ── State ─────────────────────────────────────────────────────────────────────
function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')); } catch {}
  return { cycleCount: 0, tasksExecuted: 0, prospectsFound: 0, crmSynced: 0, errors: 0 };
}
function saveState(s) {
  try { fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2)); } catch {}
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────
async function fetchWithTimeout(url, opts = {}, ms = 10000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
  finally { clearTimeout(t); }
}

// ── Supabase helpers ──────────────────────────────────────────────────────────
const SB_HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

async function sbSelect(query = '') {
  const url = `${SUPABASE_URL}/rest/v1/${TABLE}?${query}`;
  const res = await fetchWithTimeout(url, { headers: SB_HEADERS });
  if (!res.ok) throw new Error(`Supabase select failed: ${res.status}`);
  return res.json();
}

async function sbPatch(id, updates) {
  const url = `${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${id}`;
  const res = await fetchWithTimeout(url, {
    method: 'PATCH',
    headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`Supabase patch failed: ${res.status}`);
}

async function sbInsert(row) {
  const url = `${SUPABASE_URL}/rest/v1/${TABLE}`;
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { ...SB_HEADERS, Prefer: 'return=representation' },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`Supabase insert failed: ${res.status}`);
  return res.json();
}

// ── Telegram ──────────────────────────────────────────────────────────────────
async function sendTelegram(text, opts = {}) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT) return;
  try {
    await fetchWithTimeout(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT, text, parse_mode: 'HTML', ...opts }) },
      8000,
    );
  } catch {}
}

// ── CRMLite sync ──────────────────────────────────────────────────────────────
async function crmUpsert(prospect, score) {
  if (!CRMLITE_KEY) return { synced: false };
  const slug = prospect.profileUrl?.match(/linkedin\.com\/in\/([^/?]+)/)?.[1]
    || prospect.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown';
  const notes = [
    `ICP Score: ${score}/100`,
    `Headline: ${prospect.headline || ''}`,
    `Auto-added by LinkedIn Chrome Agent | ${new Date().toISOString()}`,
  ].join('\n');
  try {
    const res = await fetchWithTimeout(
      `${CRMLITE_URL}/api/contacts`,
      { method: 'POST', headers: { 'x-api-key': CRMLITE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: prospect.name,
          pipeline_stage: 'first_touch',
          notes,
          tags: ['linkedin', 'chrome-agent', 'icp-qualified', `icp-${score}`],
          platform_accounts: [{ platform: 'linkedin', username: slug, is_primary: true }],
        }) },
      8000
    );
    if (!res.ok) return { synced: false };
    const data = await res.json();
    return { synced: true, contact_id: data.id || data.contact?.id || null };
  } catch { return { synced: false }; }
}

// ── Local queue helper ────────────────────────────────────────────────────────
const ICP_TITLES    = ['founder','ceo','cto','co-founder','owner','president','head of','vp','director','growth','solopreneur','entrepreneur','creator','consultant','agency'];
const TECH_KEYWORDS = ['saas','ai','automation','software','tech','startup','digital','marketing','crm','analytics'];

function scoreProspect(p) {
  const h = (p.headline || '').toLowerCase();
  let score = 30;
  if (ICP_TITLES.some(t => h.includes(t)))    score += 30;
  if (TECH_KEYWORDS.some(k => h.includes(k))) score += 20;
  if (h.includes('founder') || h.includes('ceo')) score += 10;
  if ((p.reactions || 0) > 20)                score += 5;
  return Math.min(score, 100);
}

async function addToQueue(prospects, source) {
  let queue = [];
  try { queue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8')); } catch {}
  const existingUrls = new Set(queue.map(x => x.prospect?.profileUrl));
  let added = 0, crmSynced = 0;
  for (const p of prospects) {
    if (!p.profileUrl || existingUrls.has(p.profileUrl)) continue;
    const score = scoreProspect(p);
    if (score < 40) continue;
    const syncResult = await crmUpsert(p, score);
    if (syncResult.synced) crmSynced++;
    queue.push({
      id: `li-chrome-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      queued_at: new Date().toISOString(),
      status: 'pending_approval',
      source: `chrome-agent:${source}`,
      priority_score: score,
      crm_id: syncResult.synced ? syncResult.contact_id : null,
      crm_synced: syncResult.synced,
      prospect: { name: p.name, profileUrl: p.profileUrl, headline: p.headline || '', connectionDegree: 'unknown' },
    });
    existingUrls.add(p.profileUrl);
    added++;
  }
  try { fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2)); } catch {}
  return { added, crmSynced };
}

// ── Chrome connection ─────────────────────────────────────────────────────────
async function withChromePage(fn) {
  // Acquire Chrome page lock — wait up to 2 min for other scrapers to finish
  const locked = await acquireLock('chrome-agent', 120_000);
  if (!locked) {
    throw new Error('Could not acquire Chrome page lock after 2 min — another scraper is holding it');
  }

  let browser = null;
  try {
    browser = await chromium.connectOverCDP(CDP_URL, { timeout: 8000 });
  } catch (e) {
    releaseLock();
    throw new Error(`Chrome not reachable at ${CDP_URL}: ${e.message}. Run: bash harness/start-chrome-debug.sh start`);
  }
  const context = browser.contexts()[0] || await browser.newContext();
  const pages = context.pages();
  const page = pages.find(p => p.url().includes('linkedin.com') && !p.url().includes('login'))
    || pages[0]
    || await context.newPage();

  // Anti-detection
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  // Check login
  if (page.url().includes('/login') || page.url().includes('/authwall')) {
    releaseLock();
    throw new Error('Chrome not logged into LinkedIn — please log in manually in the Chrome window');
  }

  try {
    return await fn(page);
  } finally {
    releaseLock();
    await browser.close(); // closes CDP connection only, not Chrome itself
  }
}

// ── Task Executors ────────────────────────────────────────────────────────────

async function taskScrapeHashtag(params) {
  const { tag = 'aiautomation', limit = 20 } = params;
  log(`scrape_hashtag: #${tag} limit=${limit}`);

  return withChromePage(async (page) => {
    await page.goto(`https://www.linkedin.com/feed/hashtag/${encodeURIComponent(tag)}/`, {
      waitUntil: 'domcontentloaded', timeout: 20000
    });
    await page.waitForTimeout(8000);
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(2000);

    const creators = await page.evaluate((lim) => {
      const results = [];
      const seenContainers = new Set();
      const seenProfiles = new Set();
      const authorLinks = Array.from(document.querySelectorAll('a[href*="linkedin.com/in/"]'));

      for (const a of authorLinks) {
        if (results.length >= lim) break;
        const rawText = a.innerText.trim();
        if (!rawText || rawText === 'Feed post' || rawText.length < 2) continue;
        const profileUrl = a.href.split('?')[0];
        if (!profileUrl.match(/\/in\/[^/]+\/?$/) || seenProfiles.has(profileUrl)) continue;
        seenProfiles.add(profileUrl);

        const name = rawText.split('\n')[0]
          .replace(/\s*(Premium|Verified|Profile|3rd\+|2nd|1st|\u2022.*)/gi, '').trim();

        let card = a;
        for (let i = 0; i < 4; i++) card = card.parentElement || card;
        if (seenContainers.has(card)) continue;
        seenContainers.add(card);

        const text = card.innerText.trim();
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 1);
        const nameIdx = lines.findIndex(l => l.includes(name.split(' ')[0]));
        const headline = lines.slice(nameIdx + 1)
          .find(l => l.length > 5 && l.length < 120
            && !/^(Follow|Connect|Message|3rd|2nd|1st|\d|\u2022)/.test(l)
            && !l.includes(name)) || '';

        const reactionMatch = text.match(/(\d[\d,]*)\s*reaction/i);
        const reactions = reactionMatch ? parseInt(reactionMatch[1].replace(',', '')) : 0;
        const commentMatch = text.match(/(\d[\d,]*)\s*comment/i);
        const comments = commentMatch ? parseInt(commentMatch[1].replace(',', '')) : 0;

        const postLink = card.querySelector('a[href*="/feed/update/"], a[href*="/posts/"]');
        const postUrl = postLink ? postLink.href.split('?')[0] : '';

        if (name.length > 1) results.push({ name, profileUrl, headline, reactions, comments, postUrl });
      }
      return results;
    }, limit);

    const { added, crmSynced } = await addToQueue(creators, `hashtag:${tag}`);
    log(`scrape_hashtag #${tag}: ${creators.length} creators, ${added} queued, ${crmSynced} → CRM`);
    return { tag, creators, count: creators.length, queued: added, crmSynced };
  });
}

async function taskGetCommenters(params) {
  const { postUrl, limit = 30 } = params;
  if (!postUrl) throw new Error('postUrl required');
  log(`get_commenters: ${postUrl}`);

  return withChromePage(async (page) => {
    await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(5000);
    await page.evaluate(() => window.scrollBy(0, 1200));
    await page.waitForTimeout(2500);
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(2000);

    try {
      const loadMore = await page.$('button[aria-label*="Load more comments" i]');
      if (loadMore) { await loadMore.click(); await page.waitForTimeout(2000); }
    } catch {}

    const commenters = await page.evaluate((lim) => {
      const results = [];
      const seen = new Set();
      const actorEls = document.querySelectorAll('.comments-comment-meta__actor a[href*="/in/"]');

      for (const a of actorEls) {
        if (results.length >= lim) break;
        const profileUrl = a.href.split('?')[0];
        if (!profileUrl.match(/\/in\/[^/]+/) || seen.has(profileUrl)) continue;

        const rawName = a.innerText.trim().split('\n')[0]
          .replace(/\s*(Premium|Verified|Profile|3rd\+|2nd|1st)/gi, '').trim();
        if (!rawName || rawName.length < 2) continue;

        let card = a;
        for (let i = 0; i < 6; i++) {
          if (!card) break;
          if (card.className?.includes('comments-comment-item') || card.tagName === 'ARTICLE') break;
          card = card.parentElement;
        }

        const cardText = card?.innerText?.trim() || '';
        const lines = cardText.split('\n').map(l => l.trim()).filter(l => l.length > 1);
        const nameIdx = lines.findIndex(l => l.includes(rawName.split(' ')[0]));
        const headline = lines.slice(nameIdx + 1)
          .find(l => l.length > 5 && l.length < 120
            && !/^(Follow|Connect|1st|2nd|3rd|\d|\u2022|Like|Reply)/.test(l)
            && !l.includes(rawName)) || '';
        const comment = lines.filter(l => l.length > 20 && !l.includes(rawName) && !l.includes(headline))
          .join(' ').substring(0, 150);

        seen.add(profileUrl);
        results.push({ name: rawName, profileUrl, headline, comment });
      }
      return results;
    }, limit);

    const { added, crmSynced } = await addToQueue(commenters, `commenters:${postUrl}`);
    log(`get_commenters: ${commenters.length} found, ${added} queued, ${crmSynced} → CRM`);
    return { postUrl, commenters, count: commenters.length, queued: added, crmSynced };
  });
}

async function taskSearchPeople(params) {
  const { keywords = 'AI automation founder', limit = 20 } = params;
  log(`search_people: "${keywords}"`);

  return withChromePage(async (page) => {
    const q = encodeURIComponent(keywords);
    await page.goto(`https://www.linkedin.com/search/results/people/?keywords=${q}&network=%5B%22S%22%5D`, {
      waitUntil: 'domcontentloaded', timeout: 20000
    });
    await page.waitForTimeout(6000);

    const people = await page.evaluate((lim) => {
      const results = [];
      const seen = new Set();
      const cards = document.querySelectorAll('li[class]');

      for (const card of cards) {
        if (results.length >= lim) break;
        const link = card.querySelector('a[href*="linkedin.com/in/"]');
        if (!link) continue;
        const profileUrl = link.href.split('?')[0];
        if (!profileUrl.match(/\/in\/[^/]+\/?$/) || seen.has(profileUrl)) continue;

        const rawName = link.innerText.trim().split('\n')[0]
          .replace(/\s*(Premium|Verified|Profile|3rd\+|2nd|1st|\u2022.*)/gi, '').trim();
        if (!rawName || rawName.length < 2) continue;

        const text = card.innerText.trim();
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 1);
        const nameIdx = lines.findIndex(l => l.includes(rawName.split(' ')[0]));
        const headline = lines.slice(nameIdx + 1)
          .find(l => l.length > 5 && l.length < 120
            && !/^(Connect|Message|Follow|1st|2nd|3rd|\d|\u2022)/.test(l)
            && !l.includes(rawName)) || '';

        const mutualMatch = text.match(/(\d+)\s*mutual/i);
        const mutual = mutualMatch ? parseInt(mutualMatch[1]) : 0;

        seen.add(profileUrl);
        results.push({ name: rawName, profileUrl, headline, mutualConnections: mutual });
      }
      return results;
    }, limit);

    const { added, crmSynced } = await addToQueue(people, `search:${keywords}`);
    log(`search_people "${keywords}": ${people.length} found, ${added} queued, ${crmSynced} → CRM`);
    return { keywords, people, count: people.length, queued: added, crmSynced };
  });
}

async function taskScrapeProfileNetwork(params) {
  const { profileUrl, limit = 20 } = params;
  if (!profileUrl) throw new Error('profileUrl required');
  log(`scrape_profile_network: ${profileUrl}`);

  return withChromePage(async (page) => {
    await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(5000);

    const vanity = profileUrl.match(/\/in\/([^/?]+)/)?.[1]?.toLowerCase() || '';

    const connections = await page.evaluate((lim, vanity) => {
      const results = [];
      const seen = new Set();
      const allLinks = Array.from(document.querySelectorAll('a[href*="linkedin.com/in/"]'));

      for (const a of allLinks) {
        if (results.length >= lim) break;
        const profileUrl = a.href.split('?')[0];
        const path = profileUrl.replace('https://www.linkedin.com', '').toLowerCase();
        if (path.startsWith(`/in/${vanity}/`)) continue; // skip profile's own section links
        if (!profileUrl.match(/\/in\/[^/]+\/?$/) || seen.has(profileUrl)) continue;

        const rawName = a.innerText.trim().split('\n')[0]
          .replace(/\s*(Premium|Verified|Profile|3rd\+|2nd|1st|\u2022.*)/gi, '').trim();
        if (!rawName || rawName.length < 2 || rawName === 'LinkedIn') continue;

        const parent = a.parentElement;
        const text = parent?.parentElement?.innerText?.trim() || '';
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 1);
        const headline = lines.find(l => l.length > 5 && l.length < 120
          && !/^(Connect|Message|1st|2nd|3rd|\d|\u2022)/.test(l)
          && !l.includes(rawName)) || '';

        seen.add(profileUrl);
        results.push({ name: rawName, profileUrl, headline });
      }
      return results;
    }, limit, vanity);

    const { added, crmSynced } = await addToQueue(connections, `profile-network:${vanity}`);
    log(`scrape_profile_network ${vanity}: ${connections.length} found, ${added} queued, ${crmSynced} → CRM`);
    return { profileUrl, vanity, connections, count: connections.length, queued: added, crmSynced };
  });
}

async function taskFullDiscovery(params) {
  const { tag = 'aiautomation', limit = 15 } = params;
  log(`full_discovery: #${tag}`);

  const feedResult = await taskScrapeHashtag({ tag, limit });
  let commenterResult = null;

  // Find the top post with most comments and scrape its commenters
  const topPost = (feedResult.creators || [])
    .filter(c => c.postUrl && c.comments > 0)
    .sort((a, b) => (b.reactions + b.comments * 2) - (a.reactions + a.comments * 2))[0];

  if (topPost?.postUrl) {
    log(`full_discovery: scraping commenters from top post by ${topPost.name}`);
    commenterResult = await taskGetCommenters({ postUrl: topPost.postUrl, limit });
  }

  const totalQueued = (feedResult.queued || 0) + (commenterResult?.queued || 0);
  const totalCrm    = (feedResult.crmSynced || 0) + (commenterResult?.crmSynced || 0);

  return {
    tag,
    feed: feedResult,
    commenters: commenterResult,
    totalQueued,
    totalCrmSynced: totalCrm,
  };
}

// ── Task dispatcher ───────────────────────────────────────────────────────────
const TASK_HANDLERS = {
  scrape_hashtag:         taskScrapeHashtag,
  get_commenters:         taskGetCommenters,
  search_people:          taskSearchPeople,
  scrape_profile_network: taskScrapeProfileNetwork,
  full_discovery:         taskFullDiscovery,
};

async function executeTask(cmd) {
  const handler = TASK_HANDLERS[cmd.action];
  if (!handler) throw new Error(`Unknown action: ${cmd.action}`);
  const params = typeof cmd.params === 'string' ? JSON.parse(cmd.params) : (cmd.params || {});
  return handler(params);
}

// ── Telegram summary builder ──────────────────────────────────────────────────
function buildResultMessage(cmd, result) {
  const action = cmd.action;
  const p = typeof cmd.params === 'string' ? JSON.parse(cmd.params) : (cmd.params || {});

  if (action === 'scrape_hashtag') {
    return `<b>Chrome: #${result.tag} Hashtag Scraped</b>\n` +
      `${result.count} creators found | ${result.queued} queued | ${result.crmSynced} → CRM\n` +
      (result.creators || []).slice(0, 5)
        .map(c => `• ${c.name}: ${(c.headline||'').substring(0,50)}`)
        .join('\n');
  }
  if (action === 'get_commenters') {
    return `<b>Chrome: Post Commenters Scraped</b>\n` +
      `${result.count} commenters | ${result.queued} queued | ${result.crmSynced} → CRM\n` +
      (result.commenters || []).slice(0, 5)
        .map(c => `• ${c.name}: ${(c.headline||'').substring(0,40)}`)
        .join('\n');
  }
  if (action === 'search_people') {
    return `<b>Chrome: People Search — "${result.keywords}"</b>\n` +
      `${result.count} found | ${result.queued} queued | ${result.crmSynced} → CRM`;
  }
  if (action === 'scrape_profile_network') {
    return `<b>Chrome: Profile Network — ${result.vanity}</b>\n` +
      `${result.count} connections | ${result.queued} queued | ${result.crmSynced} → CRM`;
  }
  if (action === 'full_discovery') {
    return `<b>Chrome: Full Discovery — #${result.tag}</b>\n` +
      `Feed: ${result.feed?.count || 0} creators\n` +
      `Commenters: ${result.commenters?.count || 0}\n` +
      `Total queued: ${result.totalQueued} | CRM: ${result.totalCrmSynced}\n` +
      `Use /connections to review`;
  }
  return `<b>Chrome task done: ${action}</b>\n${result.count || 0} items processed`;
}

// ── Poll cycle ────────────────────────────────────────────────────────────────
async function pollCycle(state) {
  if (!SUPABASE_KEY) {
    log('WARN: No SUPABASE_SERVICE_ROLE_KEY — cannot poll Supabase. Running local-only.');
    return;
  }

  let cmds;
  try {
    cmds = await sbSelect(
      `platform=eq.${PLATFORM}&status=eq.pending&order=priority.asc,created_at.asc&limit=3`
    );
  } catch (e) {
    log(`Supabase poll error: ${e.message}`);
    return;
  }

  if (!cmds.length) return;
  log(`Found ${cmds.length} pending task(s)`);

  for (const cmd of cmds) {
    const taskStart = Date.now();
    log(`Executing: ${cmd.action} (id=${cmd.id})`);

    // Claim the row
    try {
      await sbPatch(cmd.id, { status: 'running', updated_at: new Date().toISOString() });
    } catch (e) {
      log(`Failed to claim task ${cmd.id}: ${e.message}`);
      continue;
    }

    let result, error;
    try {
      result = await executeTask(cmd);
      state.tasksExecuted++;
      state.prospectsFound += result.queued || result.totalQueued || 0;
      state.crmSynced += result.crmSynced || result.totalCrmSynced || 0;
      await sbPatch(cmd.id, {
        status: 'completed',
        result: JSON.stringify(result),
        updated_at: new Date().toISOString(),
      });
      log(`Task ${cmd.id} done in ${((Date.now() - taskStart)/1000).toFixed(1)}s`);
      await sendTelegram(buildResultMessage(cmd, result));
    } catch (e) {
      error = e.message;
      state.errors++;
      log(`Task ${cmd.id} FAILED: ${error}`);
      await sbPatch(cmd.id, { status: 'failed', error, updated_at: new Date().toISOString() }).catch(() => {});
      await sendTelegram(`<b>Chrome Agent Error</b>\nTask: ${cmd.action}\nError: ${error}`);
    }

    appendLog({ ts: new Date().toISOString(), id: cmd.id, action: cmd.action, result, error });
  }
}

// ── Queue a task from CLI (--queue mode) ──────────────────────────────────────
async function queueTask(action, params) {
  if (!SUPABASE_KEY) {
    // No Supabase — run the task directly
    log(`No Supabase key — running ${action} directly...`);
    const result = await executeTask({ action, params });
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  const row = {
    platform: PLATFORM,
    action,
    params: JSON.stringify(params),
    status: 'pending',
    priority: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const rows = await sbInsert(row);
  const id = Array.isArray(rows) ? rows[0]?.id : rows?.id;
  log(`Task queued: ${action} (id=${id})`);
  console.log(JSON.stringify({ queued: true, id, action, params }));
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  log(`LinkedIn Chrome Agent starting (mode=${MODE})`);
  log(`CDP: ${CDP_URL} | Supabase: ${SUPABASE_KEY ? 'ENABLED' : 'DISABLED'} | CRMLite: ${CRMLITE_KEY ? 'ENABLED' : 'DISABLED'}`);

  // ── --queue mode: insert a task and optionally run immediately ───────────────
  if (QUEUE_ACTION) {
    await queueTask(QUEUE_ACTION, QUEUE_PARAMS);
    return;
  }

  // ── --test mode: preflight check ─────────────────────────────────────────────
  if (MODE === 'test') {
    let cdpAlive = false;
    try {
      const b = await chromium.connectOverCDP(CDP_URL, { timeout: 3000 });
      cdpAlive = true;
      await b.close();
    } catch {}

    let sbAlive = false;
    if (SUPABASE_KEY) {
      try {
        const cmds = await sbSelect(`platform=eq.${PLATFORM}&status=eq.pending&limit=1`);
        sbAlive = true;
        log(`Supabase OK — ${cmds.length} pending tasks`);
      } catch (e) { log(`Supabase error: ${e.message}`); }
    }

    console.log(JSON.stringify({
      cdp_alive: cdpAlive, cdp_url: CDP_URL,
      supabase_alive: sbAlive, crmlite_key: !!CRMLITE_KEY,
      telegram: !!(TELEGRAM_TOKEN && TELEGRAM_CHAT),
      supported_actions: Object.keys(TASK_HANDLERS),
    }, null, 2));
    return;
  }

  const state = loadState();
  state.startedAt = state.startedAt || new Date().toISOString();
  saveState(state);

  // ── --once mode ──────────────────────────────────────────────────────────────
  if (MODE === 'once') {
    await pollCycle(state);
    saveState(state);
    return;
  }

  // ── Daemon mode ──────────────────────────────────────────────────────────────
  log(`Daemon running — polling every ${POLL_MS / 1000}s. SIGTERM to stop.`);

  process.on('SIGTERM', () => { log('SIGTERM — exiting'); saveState(state); process.exit(0); });
  process.on('SIGINT',  () => { log('SIGINT — exiting');  saveState(state); process.exit(0); });

  // Run immediately on startup, then on interval
  await pollCycle(state);
  saveState(state);

  setInterval(async () => {
    state.cycleCount++;
    try { await pollCycle(state); }
    catch (e) { log(`Poll cycle error: ${e.message}`); state.errors++; }
    saveState(state);
  }, POLL_MS);
}

main().catch(e => {
  console.error(`[chrome-agent] Fatal: ${e.message}`);
  process.exit(1);
});
