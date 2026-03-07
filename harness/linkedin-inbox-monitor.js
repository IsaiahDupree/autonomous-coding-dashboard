#!/usr/bin/env node

/**
 * LinkedIn Inbox Monitor
 * ======================
 * Runs 24/7 — every 30 min it:
 *   1. Polls linkedin.com/messaging/ via Chrome CDP
 *   2. Finds replies from known contacts (matched by profile URL → CRM contact)
 *   3. Updates CRMLite stage to 'replied'
 *   4. Writes replies to linkedin-replies.ndjson for review
 *
 * Usage:
 *   node harness/linkedin-inbox-monitor.js              # run 24/7
 *   node harness/linkedin-inbox-monitor.js --once       # single poll, then exit
 *   node harness/linkedin-inbox-monitor.js --test       # preflight check only
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_DIR = __dirname;

// ── Chrome constants (same as linkedin-chrome-search.js) ─────────────────────
const CDP_URL      = process.env.CHROME_CDP_URL || 'http://localhost:9333';
const PROFILE_DIR  = path.join(__dirname, '.chrome-linkedin-profile');
const CHROME_PATH  = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// ── File paths ───────────────────────────────────────────────────────────────
const QUEUE_FILE    = path.join(HARNESS_DIR, 'linkedin-dm-queue.json');
const ENG_QUEUE     = path.join(HARNESS_DIR, 'linkedin-engagement-queue.json');
const FU_QUEUE      = path.join(HARNESS_DIR, 'linkedin-followup-queue.json');
const REPLIES_FILE  = path.join(HARNESS_DIR, 'linkedin-replies.ndjson');
const STATE_FILE    = path.join(HARNESS_DIR, 'linkedin-inbox-state.json');
const LOGS_DIR      = path.join(HARNESS_DIR, 'logs');
const ACTP_ENV      = '/Users/isaiahdupree/Documents/Software/actp-worker/.env';
const SAFARI_ENV    = '/Users/isaiahdupree/Documents/Software/Safari Automation/.env';
const HOME_ENV      = `${process.env.HOME}/.env`;
const CRMLITE_URL   = 'https://crmlite-isaiahduprees-projects.vercel.app';

// ── Config ───────────────────────────────────────────────────────────────────
const CYCLE_MS = 30 * 60 * 1000; // 30 minutes

const args = process.argv.slice(2);
const MODE = args.includes('--once') ? 'once' : args.includes('--test') ? 'test' : 'daemon';

// ── Bootstrap env from files ─────────────────────────────────────────────────
const ENV_OVERRIDE_KEYS = new Set(['CRMLITE_API_KEY', 'CRMLITE_URL']);
function loadEnvFile(filePath) {
  try {
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
    for (const line of lines) {
      const m = line.match(/^([A-Z0-9_]+)=(.+)/);
      if (m && (!process.env[m[1]] || ENV_OVERRIDE_KEYS.has(m[1]))) {
        process.env[m[1]] = m[2].trim();
      }
    }
  } catch { /* non-fatal */ }
}
loadEnvFile(HOME_ENV);
loadEnvFile(SAFARI_ENV);
loadEnvFile(ACTP_ENV);

const CRMLITE_KEY    = process.env.CRMLITE_API_KEY || '';
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT  = process.env.TELEGRAM_CHAT_ID   || '';

async function sendTelegram(text) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT, text, parse_mode: 'HTML' }),
      signal: AbortSignal.timeout(8000),
    });
  } catch { /* non-fatal */ }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function log(msg) {
  const ts = new Date().toISOString();
  const line = `${ts} [inbox-monitor] ${msg}`;
  console.log(line);
  if (process.stdout.isTTY) {
    try {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
      fs.appendFileSync(path.join(LOGS_DIR, 'linkedin-inbox-monitor.log'), line + '\n');
    } catch { /* non-fatal */ }
  }
}

function err(msg) { process.stderr.write(`[inbox-monitor] ${msg}\n`); }

function readJson(fp, fallback = null) {
  try { return JSON.parse(fs.readFileSync(fp, 'utf-8')); } catch { return fallback; }
}

function writeJson(fp, data) {
  fs.writeFileSync(fp, JSON.stringify(data, null, 2));
}

function appendLog(entry) {
  try { fs.appendFileSync(REPLIES_FILE, JSON.stringify(entry) + '\n'); } catch { /* non-fatal */ }
}

async function fetchWithTimeout(url, opts = {}, ms = 8000) {
  try {
    const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(ms) });
    return res;
  } catch { return null; }
}

// ── State ────────────────────────────────────────────────────────────────────
function loadState() {
  return readJson(STATE_FILE, {
    running: false,
    cycleCount: 0,
    lastPollAt: null,
    nextPollAt: null,
    startedAt: null,
    totalRepliesFound: 0,
    seenMessageIds: [],
  });
}

function saveState(state) {
  try { writeJson(STATE_FILE, state); } catch { /* non-fatal */ }
}

// ── Build contact map from all queues ────────────────────────────────────────
function buildContactMap() {
  const map = new Map();
  const load = fp => { try { return JSON.parse(fs.readFileSync(fp, 'utf-8')); } catch { return []; } };

  for (const [fp, items] of [
    [QUEUE_FILE, load(QUEUE_FILE)],
    [ENG_QUEUE,  load(ENG_QUEUE)],
    [FU_QUEUE,   load(FU_QUEUE)],
  ]) {
    for (const item of items) {
      if (item.status !== 'sent') continue;
      const url = item.prospect?.profileUrl || item.profileUrl || '';
      const slug = url.match(/\/in\/([^/?]+)/)?.[1];
      if (slug) map.set(slug.toLowerCase(), {
        name: item.prospect?.name || item.display_name || slug,
        crm_id: item.crm_id || item.contact_id || null,
        queueFile: fp,
        itemId: item.id,
        item,
      });
    }
  }
  return map;
}

// ── Core inbox polling ───────────────────────────────────────────────────────
async function pollInbox(page, contactMap) {
  err('Navigating to messaging inbox...');
  await page.goto('https://www.linkedin.com/messaging/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(2000);

  // Check login
  const currentPath = await page.evaluate(() => window.location.pathname);
  if (!currentPath.startsWith('/messaging')) {
    return { ok: false, error: 'not_logged_in_or_redirected' };
  }

  // Wait for conversation list
  await page.waitForSelector(
    '.msg-conversations-container__convo-item, [data-view-name="message-list-item"], .msg-conversation-listitem',
    { timeout: 10000 }
  ).catch(() => {});

  await page.waitForTimeout(1500);

  // Extract conversation threads
  const threads = await page.evaluate(() => {
    const items = document.querySelectorAll(
      '.msg-conversations-container__convo-item, [data-view-name="message-list-item"], .msg-conversation-listitem'
    );
    return Array.from(items).slice(0, 20).map(item => {
      // Profile link
      const profileLink = item.querySelector('a[href*="/in/"]');
      const profileUrl  = profileLink?.href?.split('?')[0] || '';
      const slug = profileUrl.match(/\/in\/([^/?]+)/)?.[1] || '';

      // Name
      const nameEl = item.querySelector('.msg-conversation-listitem__participant-names, .conversations-item__title');
      const name   = nameEl?.innerText?.trim() || '';

      // Last message preview
      const previewEl = item.querySelector('.msg-conversation-listitem__message-snippet, .conversations-item__message-snippet');
      const preview   = previewEl?.innerText?.trim() || '';

      // Unread indicator
      const isUnread = !!item.querySelector('.notification-badge, [data-view-name="unread-count"]');

      // Thread ID from URL or data attribute
      const threadLink = item.querySelector('a[href*="/messaging/thread/"]');
      const threadId   = threadLink?.href?.match(/thread\/([^/?]+)/)?.[1] || slug;

      return { slug: slug.toLowerCase(), name, profileUrl, preview, isUnread, threadId };
    });
  });

  err(`Found ${threads.length} conversation threads`);

  const state = loadState();
  const newReplies = [];

  for (const thread of threads) {
    if (!thread.slug) continue;

    // Check if this is a known contact who we sent a DM to
    const contact = contactMap.get(thread.slug);
    if (!contact) continue;

    // Check if we've already processed this thread's latest message
    if (state.seenMessageIds?.includes(thread.threadId)) continue;
    if (!thread.isUnread && !thread.preview) continue;

    err(`New reply from: ${thread.name} (${thread.slug})`);

    // Click thread to get full message
    try {
      const threadEl = await page.$(`a[href*="${thread.threadId}"], a[href*="${thread.slug}"]`);
      if (threadEl) {
        await threadEl.click();
        await page.waitForTimeout(1500);

        // Get the latest inbound message
        const latestMsg = await page.evaluate(() => {
          const msgEls = document.querySelectorAll('.msg-s-event-listitem, [data-view-name="message-list"]');
          const last = msgEls[msgEls.length - 1];
          const text = last?.querySelector('.msg-s-event__content, .msg-s-event-listitem__message-bubble')?.innerText?.trim() || '';
          const isFromOther = !last?.classList.contains('msg-s-event-listitem--other') === false;
          return { text, isFromOther };
        });

        newReplies.push({
          ts: new Date().toISOString(),
          slug: thread.slug,
          name: thread.name,
          profileUrl: thread.profileUrl,
          crm_id: contact.crm_id,
          threadId: thread.threadId,
          preview: thread.preview,
          fullMessage: latestMsg.text || thread.preview,
          queueFile: contact.queueFile,
          itemId: contact.itemId,
        });

        // Navigate back to inbox
        await page.goBack().catch(() => {});
        await page.waitForTimeout(800);
      }
    } catch (e) {
      err(`Error reading thread for ${thread.name}: ${e.message}`);
    }
  }

  return { ok: true, replies: newReplies };
}

// ── Process a single reply ───────────────────────────────────────────────────
async function processReply(reply) {
  // 1. Write to replies file
  fs.appendFileSync(REPLIES_FILE, JSON.stringify(reply) + '\n');

  // 2. Update queue item status
  const load = fp => { try { return JSON.parse(fs.readFileSync(fp, 'utf-8')); } catch { return []; } };
  const queue = load(reply.queueFile);
  const item  = queue.find(i => i.id === reply.itemId);
  if (item) {
    item.status = 'replied';
    item.replied_at = reply.ts;
    item.reply_preview = reply.preview.slice(0, 200);
    fs.writeFileSync(reply.queueFile, JSON.stringify(queue, null, 2));
  }

  // 3. Update CRMLite stage to 'replied'
  if (reply.crm_id) {
    const key = process.env.CRMLITE_API_KEY || '';
    if (key) {
      await fetch(`${CRMLITE_URL}/api/contacts/${reply.crm_id}`, {
        method: 'PATCH',
        headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipeline_stage: 'replied', tags: ['linkedin', 'icp-qualified', 'replied'] }),
        signal: AbortSignal.timeout(5000),
      }).catch(() => {});
    }
  }

  log(`Reply processed: ${reply.name} — "${reply.preview.slice(0, 60)}"`);
}

// ── Single poll cycle ────────────────────────────────────────────────────────
async function runPollCycle() {
  const cycleStart = Date.now();
  const state = loadState();
  const cycleNum = state.cycleCount + 1;
  log(`--- Poll cycle #${cycleNum} starting ---`);

  // Build contact map from all queues
  const contactMap = buildContactMap();
  if (contactMap.size === 0) {
    log('No sent items to monitor — skipping cycle');
    state.cycleCount++;
    state.lastPollAt = new Date().toISOString();
    state.nextPollAt = new Date(Date.now() + CYCLE_MS).toISOString();
    saveState(state);
    return;
  }
  log(`Monitoring ${contactMap.size} sent contacts`);

  // Connect to Chrome CDP
  let context = null;
  let browserForCDP = null;
  let usingCDP = false;

  try {
    browserForCDP = await chromium.connectOverCDP(CDP_URL, { timeout: 3000 });
    const contexts = browserForCDP.contexts();
    context = contexts[0] || await browserForCDP.newContext();
    usingCDP = true;
    err(`Connected to running Chrome via CDP (${CDP_URL})`);
  } catch {
    err(`CDP not available at ${CDP_URL} — falling back to persistent profile`);
  }

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

  // Get a page to work with
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
    // Poll inbox
    const result = await pollInbox(page, contactMap);

    if (!result.ok) {
      log(`Poll failed: ${result.error}`);
    } else {
      const newReplies = result.replies;
      log(`Found ${newReplies.length} new replies`);

      // Process each reply
      for (const reply of newReplies) {
        await processReply(reply);
      }

      // Telegram alert for new replies (time-sensitive — notify immediately)
      if (newReplies.length > 0) {
        const lines = newReplies.slice(0, 5).map(r =>
          `• <b>${r.name}</b>: "${(r.preview || '').slice(0, 80)}"`
        ).join('\n');
        await sendTelegram(
          `<b>LinkedIn Replies Received!</b> (${newReplies.length})\n` +
          lines +
          (newReplies.length > 5 ? `\n+ ${newReplies.length - 5} more` : '')
        );
      }

      // Update state
      const newThreadIds = newReplies.map(r => r.threadId);
      state.cycleCount++;
      state.lastPollAt = new Date().toISOString();
      state.nextPollAt = new Date(Date.now() + CYCLE_MS).toISOString();
      state.totalRepliesFound += newReplies.length;
      state.seenMessageIds = [...new Set([...(state.seenMessageIds || []), ...newThreadIds])].slice(-500);
      saveState(state);
    }
  } finally {
    // Never close a Chrome we connected to via CDP
    if (!usingCDP && context) {
      await context.close();
    }
    if (browserForCDP) {
      await browserForCDP.close();
    }
  }

  const elapsed = ((Date.now() - cycleStart) / 1000).toFixed(1);
  log(`--- Poll cycle #${cycleNum} done in ${elapsed}s ---`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  log(`Starting LinkedIn Inbox Monitor (mode: ${MODE})`);
  log(`CRMLite sync: ${CRMLITE_KEY ? 'ENABLED' : 'DISABLED (no CRMLITE_API_KEY)'}`);

  if (MODE === 'test') {
    // Preflight: check Chrome CDP alive, print state + seen thread count
    let cdpAlive = false;
    try {
      const browser = await chromium.connectOverCDP(CDP_URL, { timeout: 3000 });
      cdpAlive = true;
      await browser.close();
    } catch { /* CDP not available */ }

    const state = loadState();
    const contactMap = buildContactMap();
    const preflight = {
      cdp_alive: cdpAlive,
      cdp_url: CDP_URL,
      crmlite_key: !!CRMLITE_KEY,
      state,
      sent_contacts_monitored: contactMap.size,
      seen_thread_count: (state.seenMessageIds || []).length,
    };
    console.log('\nPre-flight:');
    console.log(JSON.stringify(preflight, null, 2));
    return;
  }

  const state = loadState();
  state.running = true;
  state.startedAt = state.startedAt || new Date().toISOString();
  saveState(state);

  if (MODE === 'once') {
    try {
      await runPollCycle();
    } finally {
      state.running = false;
      saveState(state);
    }
    return;
  }

  // ── Daemon loop ──────────────────────────────────────────────────────────────
  log(`Daemon running — poll every ${CYCLE_MS / 60000} min. Ctrl+C or SIGTERM to stop.`);

  process.on('SIGTERM', () => {
    log('SIGTERM received — shutting down cleanly');
    const s = loadState();
    s.running = false;
    saveState(s);
    process.exit(0);
  });
  process.on('SIGINT', () => {
    log('SIGINT received — shutting down cleanly');
    const s = loadState();
    s.running = false;
    saveState(s);
    process.exit(0);
  });

  // Run first poll immediately, then every CYCLE_MS
  while (true) {
    const currentState = loadState();
    if (!currentState.running) {
      log('State set to not running — exiting daemon loop');
      break;
    }

    try {
      await runPollCycle();
    } catch (e) {
      log(`Poll cycle error: ${e.message}`);
    }

    log(`Next poll in ${CYCLE_MS / 60000} min (${new Date(Date.now() + CYCLE_MS).toLocaleTimeString()})`);
    await new Promise(r => setTimeout(r, CYCLE_MS));
  }
}

main().catch(e => {
  console.error('Fatal:', e.message);
  try {
    const state = readJson(STATE_FILE, {});
    state.running = false;
    writeJson(STATE_FILE, state);
  } catch { /* non-fatal */ }
  process.exit(1);
});
