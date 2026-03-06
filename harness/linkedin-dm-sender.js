#!/usr/bin/env node

/**
 * LinkedIn DM Sender — Playwright-based message sender via Chrome CDP
 * ===================================================================
 * Reads approved queue items where the prospect is 1st-degree connected,
 * opens a LinkedIn conversation via Chrome CDP, sends the drafted message,
 * marks item `sent`, updates CRMLite stage.
 *
 * Usage:
 *   node harness/linkedin-dm-sender.js              # process all sendable items
 *   node harness/linkedin-dm-sender.js --dry-run    # log what would be sent
 *   node harness/linkedin-dm-sender.js --limit 5    # max 5 this run
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_DIR = __dirname;

const CDP_URL      = process.env.CHROME_CDP_URL || 'http://localhost:9333';
const PROFILE_DIR  = path.join(__dirname, '.chrome-linkedin-profile');
const CHROME_PATH  = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// ── File paths ──────────────────────────────────────────────────────────────
const QUEUE_FILE  = path.join(HARNESS_DIR, 'linkedin-dm-queue.json');
const ENG_QUEUE   = path.join(HARNESS_DIR, 'linkedin-engagement-queue.json');
const FU_QUEUE    = path.join(HARNESS_DIR, 'linkedin-followup-queue.json');
const STATE_FILE  = path.join(HARNESS_DIR, 'linkedin-dm-sender-state.json');
const LOG_FILE    = path.join(HARNESS_DIR, 'linkedin-dm-sender-log.ndjson');
const LOGS_DIR    = path.join(HARNESS_DIR, 'logs');
const ACTP_ENV    = '/Users/isaiahdupree/Documents/Software/actp-worker/.env';
const SAFARI_ENV  = '/Users/isaiahdupree/Documents/Software/Safari Automation/.env';
const HOME_ENV    = `${process.env.HOME}/.env`;

// ── CLI args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(name, fallback) {
  const idx = args.indexOf(name);
  return (idx !== -1 && args[idx + 1] !== undefined) ? args[idx + 1] : String(fallback);
}
const DRY_RUN = args.includes('--dry-run');
const LIMIT   = parseInt(getArg('--limit', '100'), 10);

// ── Rate limit state ────────────────────────────────────────────────────────
const DAILY_LIMIT = 10;

// ── Bootstrap env from files ────────────────────────────────────────────────
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

const CRMLITE_URL = 'https://crmlite-isaiahduprees-projects.vercel.app';
const CRMLITE_KEY = process.env.CRMLITE_API_KEY || '';

// ── Helpers ─────────────────────────────────────────────────────────────────
function err(msg) { process.stderr.write(`[dm-sender] ${msg}\n`); }

function log(msg) {
  const ts = new Date().toISOString();
  const line = `${ts} [dm-sender] ${msg}`;
  console.log(line);
  if (process.stdout.isTTY) {
    try {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
      fs.appendFileSync(path.join(LOGS_DIR, 'linkedin-dm-sender.log'), line + '\n');
    } catch { /* non-fatal */ }
  }
}

function readJson(fp, fallback = null) {
  try { return JSON.parse(fs.readFileSync(fp, 'utf-8')); } catch { return fallback; }
}

function writeJson(fp, data) {
  // Atomic write: tmp + rename prevents partial file on crash
  const tmp = fp + '.tmp.' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, fp);
}

// ── Queue file lock ───────────────────────────────────────────────────────────
const QUEUE_LOCK = QUEUE_FILE + '.lock';
function withQueueLock(fn) {
  const deadline = Date.now() + 10_000;
  function attempt() {
    try {
      fs.writeFileSync(QUEUE_LOCK, String(process.pid), { flag: 'wx' });
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      if (Date.now() > deadline) throw new Error('Queue lock timeout after 10s');
      try {
        const holder = parseInt(fs.readFileSync(QUEUE_LOCK, 'utf8'), 10);
        if (holder && !isNaN(holder)) {
          try { process.kill(holder, 0); } catch { fs.unlinkSync(QUEUE_LOCK); }
        }
      } catch { /* lock already gone */ }
      const until = Date.now() + 100;
      while (Date.now() < until) { /* spin */ }
      return attempt();
    }
    try { return fn(); } finally { try { fs.unlinkSync(QUEUE_LOCK); } catch {} }
  }
  return attempt();
}

function appendLog(entry) {
  try { fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n'); } catch { /* non-fatal */ }
}

async function fetchWithTimeout(url, opts = {}, ms = 8000) {
  try {
    const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(ms) });
    return res;
  } catch { return null; }
}

// ── Queue loading ───────────────────────────────────────────────────────────
function loadAllQueues() {
  const load = fp => { try { return JSON.parse(fs.readFileSync(fp, 'utf-8')); } catch { return []; } };
  return [
    ...load(QUEUE_FILE).map(i => ({ ...i, _queueFile: QUEUE_FILE })),
    ...load(ENG_QUEUE).map(i => ({ ...i, _queueFile: ENG_QUEUE })),
    ...load(FU_QUEUE).map(i => ({ ...i, _queueFile: FU_QUEUE })),
  ];
}

function saveQueueFile(queueFile, items) {
  // Use lock only for the main dm-queue (shared with daemon); others are dm-sender-owned
  if (queueFile === QUEUE_FILE) {
    withQueueLock(() => writeJson(queueFile, items));
  } else {
    writeJson(queueFile, items);
  }
}

function updateItemInQueue(queueFile, itemId, updates) {
  const load = fp => { try { return JSON.parse(fs.readFileSync(fp, 'utf-8')); } catch { return []; } };
  const items = load(queueFile);
  const idx = items.findIndex(i => i.id === itemId);
  if (idx !== -1) {
    Object.assign(items[idx], updates);
    saveQueueFile(queueFile, items);
    return true;
  }
  return false;
}

// ── State management ────────────────────────────────────────────────────────
function loadState() {
  return readJson(STATE_FILE, {
    sentToday: 0,
    lastResetDay: '',
    totalSent: 0,
    lastRunAt: null,
  });
}

function saveState(state) {
  try { writeJson(STATE_FILE, state); } catch { /* non-fatal */ }
}

function refreshDailyCounter(state) {
  const today = new Date().toISOString().slice(0, 10);
  if (state.lastResetDay !== today) {
    state.sentToday = 0;
    state.lastResetDay = today;
  }
  return state;
}

// ── Core sendDM function ────────────────────────────────────────────────────
async function sendDM(page, item) {
  const profileUrl = item.prospect?.profileUrl || item.profileUrl;
  const message    = item.drafted_message || item.message || '';

  if (!profileUrl || !message) return { ok: false, error: 'missing_profile_or_message' };

  err(`Navigating to: ${profileUrl}`);
  await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForTimeout(1500 + Math.random() * 1000);

  // Check login
  const currentPath = await page.evaluate(() => window.location.pathname);
  if (currentPath.startsWith('/login') || currentPath.startsWith('/checkpoint')) {
    return { ok: false, error: 'not_logged_in' };
  }

  // Find "Message" button (only shows for 1st-degree connections)
  const messageBtn = await page.$(
    'button[aria-label*="Message"], ' +
    '.pvs-profile-actions button:has-text("Message"), ' +
    'a[href*="/messaging/thread/"]'
  );

  if (!messageBtn) {
    // Check if it's actually 1st degree
    const degree = await page.evaluate(() => (/\b1st\b/.test(document.body.innerText) ? '1st' : 'not_1st'));
    if (degree !== '1st') return { ok: false, error: 'not_first_degree' };
    return { ok: false, error: 'message_button_not_found' };
  }

  await messageBtn.click();
  await page.waitForTimeout(1500);

  // Messaging modal or page — wait for compose box
  const composeBox = await page.waitForSelector(
    '.msg-form__contenteditable, [role="textbox"][aria-label*="Write a message"], .compose-form__message-field',
    { timeout: 8000 }
  ).catch(() => null);

  if (!composeBox) return { ok: false, error: 'compose_box_not_found' };

  await composeBox.click();
  await page.waitForTimeout(300);
  await composeBox.fill(message);
  await page.waitForTimeout(500);

  // Send button
  const sendBtn = await page.$(
    'button[type="submit"][aria-label*="Send"], ' +
    '.msg-form__send-button, ' +
    'button:has-text("Send")'
  );

  if (!sendBtn) return { ok: false, error: 'send_button_not_found' };

  if (!DRY_RUN) {
    await sendBtn.click();
    await page.waitForTimeout(1500);
  }

  return { ok: true };
}

// ── CRMLite updates ─────────────────────────────────────────────────────────
async function updateCrmStage(item) {
  if (!CRMLITE_KEY || !item.crm_id) return;
  try {
    await fetchWithTimeout(
      `${CRMLITE_URL}/api/contacts/${item.crm_id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-api-key': CRMLITE_KEY },
        body: JSON.stringify({ pipeline_stage: 'dm_sent' }),
      },
      5000
    );
  } catch { /* non-fatal */ }
}

async function logDmToCrm(item, message) {
  if (!CRMLITE_KEY) return;
  const profileUrl = item.prospect?.profileUrl || item.profileUrl || '';
  try {
    await fetch(
      `${CRMLITE_URL}/api/sync/dm`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': CRMLITE_KEY },
        body: JSON.stringify({
          platform: 'linkedin',
          conversations: [{
            username: profileUrl.match(/\/in\/([^/?]+)/)?.[1] || '',
            display_name: item.prospect?.name || item.display_name || '',
            messages: [{ text: message, is_outbound: true, sent_at: new Date().toISOString() }],
          }],
        }),
        signal: AbortSignal.timeout(5000),
      }
    ).catch(() => {});
  } catch { /* non-fatal */ }
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  log(`Starting LinkedIn DM Sender (dry-run: ${DRY_RUN}, limit: ${LIMIT})`);
  log(`CRMLite sync: ${CRMLITE_KEY ? 'ENABLED' : 'DISABLED (no CRMLITE_API_KEY)'}`);

  // Load & refresh state
  const state = refreshDailyCounter(loadState());
  saveState(state);

  if (state.sentToday >= DAILY_LIMIT) {
    log(`Daily limit reached (${state.sentToday}/${DAILY_LIMIT}) — exiting`);
    return;
  }

  // Load all queues, find eligible items
  const allItems = loadAllQueues();
  const eligible = allItems.filter(item => {
    if (item.status !== 'approved') return false;
    // 1st-degree connections OR followup queue items with messageType
    if (item.prospect?.connectionDegree === '1st') return true;
    if (item.messageType) return true;
    return false;
  });

  if (eligible.length === 0) {
    log('No eligible items (approved + 1st-degree or followup) — exiting');
    return;
  }

  const maxToSend = Math.min(LIMIT, DAILY_LIMIT - state.sentToday);
  const toSend = eligible.slice(0, maxToSend);
  log(`Found ${eligible.length} eligible items, will process ${toSend.length} (daily budget: ${DAILY_LIMIT - state.sentToday})`);

  // ── Connect to Chrome via CDP ──────────────────────────────────────────────
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

  // Get a page
  const existingPages = context.pages();
  let page = existingPages.find(p => p.url().includes('linkedin.com')) || null;
  if (!page) {
    page = existingPages[0] || await context.newPage();
  }

  // Remove automation fingerprints
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  let sentCount = 0;
  let failCount = 0;
  const runLog = {
    ts: new Date().toISOString(),
    dry_run: DRY_RUN,
    eligible: eligible.length,
    attempted: toSend.length,
    sent: 0,
    failed: 0,
    errors: [],
  };

  try {
    for (const item of toSend) {
      const name = item.prospect?.name || item.display_name || 'unknown';
      const message = item.drafted_message || item.message || '';
      log(`Processing: ${name} — ${DRY_RUN ? '[DRY RUN]' : 'sending...'}`);

      const result = await sendDM(page, item);

      if (result.ok) {
        sentCount++;
        state.sentToday++;
        state.totalSent++;
        state.lastRunAt = new Date().toISOString();

        // Update queue item
        updateItemInQueue(item._queueFile, item.id, {
          status: 'sent',
          sent_at: new Date().toISOString(),
        });

        // CRM updates (non-fatal)
        await updateCrmStage(item);
        await logDmToCrm(item, message);

        log(`  OK: ${name} — message ${DRY_RUN ? 'would be' : ''} sent`);
      } else {
        failCount++;
        log(`  FAIL: ${name} — ${result.error}`);
        runLog.errors.push({ name, error: result.error });
        // Leave status as 'approved' so it can be retried
      }

      saveState(state);

      // Random jitter 3-6 seconds between sends
      if (toSend.indexOf(item) < toSend.length - 1) {
        const jitter = 3000 + Math.random() * 3000;
        await page.waitForTimeout(jitter);
      }
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

  runLog.sent = sentCount;
  runLog.failed = failCount;
  appendLog(runLog);

  log(`Done — sent: ${sentCount}, failed: ${failCount}, daily total: ${state.sentToday}/${DAILY_LIMIT}`);
}

main().catch(e => {
  err(`Fatal: ${e.message}`);
  process.exit(1);
});
