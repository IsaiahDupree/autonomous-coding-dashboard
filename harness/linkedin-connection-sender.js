#!/usr/bin/env node

/**
 * LinkedIn Connection Sender — Chrome CDP automation
 * ===================================================
 * Reads approved items from linkedin-dm-queue.json, sends a Chrome CDP
 * connection request with a personalized note for each, marks them
 * `connection_requested`.
 *
 * Usage:
 *   node harness/linkedin-connection-sender.js              # process all approved items
 *   node harness/linkedin-connection-sender.js --dry-run    # log what would be sent, no actions
 *   node harness/linkedin-connection-sender.js --limit 5    # process max 5 this run
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

const QUEUE_FILE    = path.join(HARNESS_DIR, 'linkedin-dm-queue.json');
const STATE_FILE    = path.join(HARNESS_DIR, 'linkedin-connection-state.json');
const LOG_FILE      = path.join(HARNESS_DIR, 'linkedin-connection-log.ndjson');
const LOGS_DIR      = path.join(HARNESS_DIR, 'logs');
const ACTP_ENV      = '/Users/isaiahdupree/Documents/Software/actp-worker/.env';
const SAFARI_ENV    = '/Users/isaiahdupree/Documents/Software/Safari Automation/.env';
const HOME_ENV      = `${process.env.HOME}/.env`;

// CLI args
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT   = parseInt(args[args.indexOf('--limit') + 1] || '10', 10);

// Rate limits
const DAILY_LIMIT  = 15;
const WEEKLY_LIMIT = 80;  // safe margin under LinkedIn's ~100/week

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

// ── Helpers ──────────────────────────────────────────────────────────────────
function log(msg) {
  const ts = new Date().toISOString();
  const line = `${ts} [connection-sender] ${msg}`;
  console.log(line);
  if (process.stdout.isTTY) {
    try {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
      fs.appendFileSync(path.join(LOGS_DIR, 'linkedin-connection-sender.log'), line + '\n');
    } catch { /* non-fatal */ }
  }
}

function err(msg) { process.stderr.write(`[connection-sender] ${msg}\n`); }

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

// ── Rate limit state ─────────────────────────────────────────────────────────
function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')); } catch { return {}; }
}

function getISOWeek() {
  // Correct ISO week: Mon-based, crosses year boundary properly
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}

function refreshCounters(state) {
  const today = new Date().toDateString();
  const week  = getISOWeek();
  if (state.lastResetDay !== today)  { state.sentToday    = 0; state.lastResetDay  = today; }
  if (state.lastResetWeek !== week)  { state.sentThisWeek = 0; state.lastResetWeek = week;  }
  state.sentToday    = state.sentToday    || 0;
  state.sentThisWeek = state.sentThisWeek || 0;
  state.totalSent    = state.totalSent    || 0;
  return state;
}

// ── Connection note generation ───────────────────────────────────────────────
function buildConnectionNote(item) {
  const p = item.prospect || {};
  const firstName = (p.name || '').split(' ')[0] || 'there';
  const role = p.role || '';
  const company = p.company || '';

  if (role && company) {
    return `Hi ${firstName}, noticed your work as ${role} at ${company} — would love to connect and share some thoughts on AI automation for teams like yours. — Isaiah`.slice(0, 300);
  }
  if (role) {
    return `Hi ${firstName}, came across your profile — your background in ${role} caught my attention. Would love to connect. — Isaiah`.slice(0, 300);
  }
  return `Hi ${firstName}, came across your profile and would love to connect — I work with founders on AI automation. — Isaiah`.slice(0, 300);
}

// ── Core: send connection request on a profile page ──────────────────────────
async function sendConnectionRequest(page, item) {
  const profileUrl = item.prospect?.profileUrl;
  if (!profileUrl) return { ok: false, error: 'no profileUrl' };

  err(`Navigating to: ${profileUrl}`);
  await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForTimeout(2000 + Math.random() * 1500); // jitter

  // Check login
  const currentPath = await page.evaluate(() => window.location.pathname);
  if (currentPath.startsWith('/login') || currentPath.startsWith('/checkpoint')) {
    return { ok: false, error: 'not_logged_in' };
  }

  // Check if already connected (1st degree) — skip if so
  const degree = await page.evaluate(() => {
    const text = document.body.innerText;
    if (/\b1st\b/.test(text)) return '1st';
    if (/\b2nd\b/.test(text)) return '2nd';
    if (/\b3rd\b/.test(text)) return '3rd';
    return 'unknown';
  });

  if (degree === '1st') {
    return { ok: false, skipped: true, reason: 'already_connected' };
  }

  // Find "Connect" button — LinkedIn has multiple placements
  const connectBtn = await page.$(
    'button[aria-label*="Connect"], button[aria-label*="connect"], ' +
    '.pvs-profile-actions button:has-text("Connect"), ' +
    '.pv-s-profile-actions button:has-text("Connect")'
  );

  if (!connectBtn) {
    // Try "More" dropdown first
    const moreBtn = await page.$('button[aria-label*="More actions"]');
    if (moreBtn) {
      await moreBtn.click();
      await page.waitForTimeout(800);
      const connectInMenu = await page.$('[role="menuitem"]:has-text("Connect")');
      if (!connectInMenu) return { ok: false, error: 'connect_button_not_found' };
      await connectInMenu.click();
    } else {
      return { ok: false, error: 'connect_button_not_found' };
    }
  } else {
    await connectBtn.click();
  }

  await page.waitForTimeout(1000);

  // "Add a note" modal should appear — click "Add a note"
  const addNoteBtn = await page.$('button[aria-label*="Add a note"], button:has-text("Add a note")');
  if (addNoteBtn) {
    await addNoteBtn.click();
    await page.waitForTimeout(700);

    // Type the note
    const noteInput = await page.$('textarea[name="message"], textarea[placeholder*="note"]');
    if (noteInput) {
      const note = buildConnectionNote(item);
      await noteInput.fill(note);
      err(`Note: ${note.slice(0, 60)}...`);
    }
  }

  // Find and click Send/Done button
  const sendBtn = await page.$(
    'button[aria-label*="Send invitation"], button:has-text("Send"), ' +
    'button[aria-label*="Done"], button:has-text("Done")'
  );

  if (!sendBtn) return { ok: false, error: 'send_button_not_found' };

  if (!DRY_RUN) {
    await sendBtn.click();
    await page.waitForTimeout(1500);
  }

  return { ok: true, note: buildConnectionNote(item).slice(0, 60) };
}

// ── CRMLite stage update ─────────────────────────────────────────────────────
async function updateCrmStage(contactId, stage) {
  const CRMLITE_URL = 'https://crmlite-isaiahduprees-projects.vercel.app';
  const CRMLITE_KEY = process.env.CRMLITE_API_KEY || '';
  if (!CRMLITE_KEY || !contactId) return;
  await fetch(`${CRMLITE_URL}/api/contacts/${contactId}`, {
    method: 'PATCH',
    headers: { 'x-api-key': CRMLITE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ pipeline_stage: stage }),
    signal: AbortSignal.timeout(5000),
  }).catch(() => {});
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  loadEnvFile(HOME_ENV); loadEnvFile(SAFARI_ENV); loadEnvFile(ACTP_ENV);

  const state = refreshCounters(loadState());

  if (state.sentToday >= DAILY_LIMIT) {
    log(`Daily limit reached (${state.sentToday}/${DAILY_LIMIT}) — exiting`);
    return;
  }
  if (state.sentThisWeek >= WEEKLY_LIMIT) {
    log(`Weekly limit reached (${state.sentThisWeek}/${WEEKLY_LIMIT}) — exiting`);
    return;
  }

  // Load queue — find approved items (2nd/3rd degree, not yet connection_requested)
  const queue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8') || '[]');
  const eligible = queue.filter(item =>
    item.status === 'approved' &&
    item.prospect?.connectionDegree !== '1st'
  ).slice(0, Math.min(LIMIT, DAILY_LIMIT - state.sentToday));

  log(`Eligible items: ${eligible.length} | sentToday: ${state.sentToday}/${DAILY_LIMIT} | sentThisWeek: ${state.sentThisWeek}/${WEEKLY_LIMIT}`);

  if (eligible.length === 0) {
    log('No eligible approved items — done');
    return;
  }

  if (DRY_RUN) {
    log('DRY RUN — would send connections to:');
    eligible.forEach(item => log(`  - ${item.prospect?.name} (${item.prospect?.connectionDegree}) — ${item.prospect?.profileUrl}`));
    return;
  }

  // Connect to Chrome CDP (same pattern as linkedin-chrome-search.js)
  let context = null, browserForCDP = null, usingCDP = false;
  try {
    browserForCDP = await chromium.connectOverCDP(CDP_URL, { timeout: 3000 });
    context = browserForCDP.contexts()[0] || await browserForCDP.newContext();
    usingCDP = true;
    err('Connected via CDP');
  } catch {
    err('CDP not available — falling back to persistent profile');
    fs.mkdirSync(PROFILE_DIR, { recursive: true });
    context = await chromium.launchPersistentContext(PROFILE_DIR, {
      headless: false, executablePath: CHROME_PATH,
      viewport: { width: 1280, height: 800 },
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
      ignoreDefaultArgs: ['--enable-automation'],
    });
  }

  const existingPages = context.pages();
  const page = existingPages.find(p => p.url().includes('linkedin.com')) || existingPages[0] || await context.newPage();
  await page.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });

  try {
    let sent = 0, skipped = 0, failed = 0;

    for (const item of eligible) {
      log(`Processing: ${item.prospect?.name}`);

      const result = await sendConnectionRequest(page, item).catch(e => ({ ok: false, error: e.message }));

      // Update queue item
      if (result.ok) {
        item.status = 'connection_requested';
        item.connection_requested_at = new Date().toISOString();
        item.connection_note = result.note;
        state.sentToday++;
        state.sentThisWeek++;
        state.totalSent++;
        sent++;
        log(`  + Connection request sent to ${item.prospect?.name}`);
      } else if (result.skipped) {
        item.status = 'already_connected';
        skipped++;
        log(`  ~ Skipped ${item.prospect?.name}: ${result.reason}`);
      } else {
        item.connection_error = result.error;
        failed++;
        log(`  x Failed ${item.prospect?.name}: ${result.error}`);
      }

      // Update CRMLite stage if connected
      if (result.ok && item.crm_id) {
        await updateCrmStage(item.crm_id, 'connection_requested').catch(() => {});
      }

      // Save queue after each item (locked — daemon may write concurrently)
      withQueueLock(() => writeJson(QUEUE_FILE, queue));
      state.lastRunAt = new Date().toISOString();
      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

      // Check limits after each send
      if (state.sentToday >= DAILY_LIMIT || state.sentThisWeek >= WEEKLY_LIMIT) {
        log('Limit reached mid-run — stopping');
        break;
      }

      // Random jitter between requests (2-5 seconds)
      if (eligible.indexOf(item) < eligible.length - 1) {
        const wait = 2000 + Math.random() * 3000;
        await page.waitForTimeout(wait);
      }
    }

    log(`Done — sent: ${sent}, skipped: ${skipped}, failed: ${failed}`);
    fs.appendFileSync(LOG_FILE, JSON.stringify({ ts: new Date().toISOString(), sent, skipped, failed, sentToday: state.sentToday, sentThisWeek: state.sentThisWeek }) + '\n');

  } finally {
    if (!usingCDP && context) await context.close();
    if (browserForCDP) await browserForCDP.close();
  }
}

main().catch(e => {
  err(`Fatal: ${e.message}`);
  process.exit(1);
});
