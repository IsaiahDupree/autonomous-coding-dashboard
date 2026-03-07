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
const DRY_RUN      = args.includes('--dry-run');
const AUTO_APPROVE = args.includes('--auto-approve');  // rank pending → approve top N → send
const LIMIT        = parseInt(args[args.indexOf('--limit') + 1] || '15', 10);

// Rate limits
const DAILY_LIMIT  = 15;
const WEEKLY_LIMIT = 80;  // safe margin under LinkedIn's ~100/week

// ── Priority ranking ─────────────────────────────────────────────────────────
// Scores each prospect 0-100. Higher = send connection request first.
//
// Rubric:
//   ICP score (0-10) × 6       = 0-60  [primary signal — quality of fit]
//   Signal richness (reasons)  = 0-15  [+3 per reason beyond 2, max 5 extra]
//   Source warmth              = 0-10  [post engager > keyword search]
//   Connection degree          = 0-8   [2nd > 3rd — mutual connections help]
//   Strategy intent tier       = 0-8   [high-intent niches convert better]
//   Recency                    = 0-3   [fresher = more relevant]
const HIGH_INTENT_STRATEGIES = new Set([
  'AI SaaS Founders', 'Bootstrapped SaaS', 'App Creation Founders',
  'No-Code SaaS Founders', 'AI SaaS Founders 3rd',
]);
const MED_INTENT_STRATEGIES = new Set([
  'Agency AI Owners', 'Creator Economy AI', 'Web App Builders',
  'App Founders 3rd',
]);

// ── Chrome auto-launch + LinkedIn auto-login ──────────────────────────────────

/** Try to bring up Chrome in debug mode. Returns 'cdp' | 'cdp_launched' | 'unavailable' */
async function ensureChromeDebugMode() {
  // Already up?
  try {
    const r = await fetch(`${CDP_URL}/json/version`, { signal: AbortSignal.timeout(2000) });
    if (r.ok) return 'cdp';
  } catch {}

  // Regular Chrome running? Can't safely share the profile — report back
  const { execSync } = await import('child_process');
  const regularRunning = (() => {
    try { execSync('pgrep -x "Google Chrome"', { stdio: 'pipe' }); return true; } catch { return false; }
  })();

  if (regularRunning) {
    err('Regular Chrome is open — cannot share profile. Quit Chrome (Cmd+Q) then retry.');
    return 'unavailable_regular_chrome_open';
  }

  // Launch Chrome in debug mode using real profile (already logged into LinkedIn)
  err('CDP not reachable — auto-launching Chrome in debug mode...');
  const { spawn } = await import('child_process');
  const launchScript = path.join(__dirname, 'start-chrome-debug.sh');
  spawn('bash', [launchScript, 'start'], { stdio: 'pipe', detached: false });

  // Wait up to 20s for CDP to come up
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      const r = await fetch(`${CDP_URL}/json/version`, { signal: AbortSignal.timeout(2000) });
      if (r.ok) { err('Chrome debug mode ready'); return 'cdp_launched'; }
    } catch {}
  }

  err('Chrome failed to start in debug mode after 20s');
  return 'unavailable_launch_failed';
}

/** Auto-login to LinkedIn using LINKEDIN_EMAIL + LINKEDIN_PASSWORD from env */
async function loginLinkedIn(page) {
  const email    = process.env.LINKEDIN_EMAIL;
  const password = process.env.LINKEDIN_PASSWORD;

  if (!email || !password) {
    err('LINKEDIN_EMAIL or LINKEDIN_PASSWORD not set in actp-worker/.env');
    return false;
  }

  err('Detected login page — auto-signing in...');
  try {
    await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForSelector('#username', { timeout: 8000 });
    await page.fill('#username', email);
    await page.fill('#password', password);
    await page.waitForTimeout(500 + Math.random() * 500);
    await page.click('button[type="submit"]');
    // Wait for redirect away from login
    await page.waitForURL(url => !url.includes('/login') && !url.includes('/checkpoint'), { timeout: 20000 });
    const dest = await page.evaluate(() => window.location.pathname);
    err(`Login successful — landed on ${dest}`);
    return true;
  } catch (e) {
    err(`Login failed: ${e.message}`);
    return false;
  }
}

export function priorityScore(item) {
  const p = item.prospect || {};
  let score = 0;

  // ICP fit (primary)
  score += (p.icp_score || 0) * 6;

  // Signal richness: each reason beyond 2 = +3 (max +15)
  const reasons = p.icp_reasons || [];
  score += Math.min(5, Math.max(0, reasons.length - 2)) * 3;

  // Source warmth: engager > search
  const src = item.source || '';
  if (src === 'post_engagement' || src === 'engagement' || src === 'commenter') score += 10;

  // Connection degree: 2nd is much easier to connect with
  if (p.connectionDegree === '2nd') score += 8;

  // Strategy intent
  const strat = item.strategy || '';
  if (HIGH_INTENT_STRATEGIES.has(strat)) score += 8;
  else if (MED_INTENT_STRATEGIES.has(strat)) score += 4;

  // Recency bonus (queued recently = fresher intel)
  const ageHours = (Date.now() - new Date(item.queued_at || 0).getTime()) / 3_600_000;
  if (ageHours < 24)  score += 3;
  else if (ageHours < 72) score += 1;

  return Math.round(score);
}

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
function buildConnectionNote(item, addNote = true) {
  if (!addNote) return null;
  const p = item.prospect || {};
  const firstName = (p.name || '').split(' ')[0] || 'there';
  const headline = (p.headline || '').toLowerCase();

  // Parse role/company from headline (format: "Role at Company" or "Role | Company")
  const atMatch = (p.headline || '').match(/^([^|@]+?)\s+(?:at|@)\s+(.+?)(?:\s*[|•].*)?$/i);
  const pipeMatch = (p.headline || '').match(/^([^|]+?)\s*[|•]\s*(.+?)(?:\s*[|•].*)?$/);
  const role    = (atMatch?.[1] || pipeMatch?.[1] || '').trim().replace(/\s+/g,' ').slice(0,50);
  const company = (atMatch?.[2] || pipeMatch?.[2] || '').trim().replace(/\s+/g,' ').slice(0,40);

  // Pick the most relevant template based on what we know
  if (role && company) {
    return `Hi ${firstName}, came across your profile — your work as ${role} at ${company} caught my eye. I help founders automate their growth with AI. Would love to connect! — Isaiah`.slice(0, 300);
  }
  if (role) {
    return `Hi ${firstName}, your background as ${role} caught my attention. I work with founders on AI automation systems — would love to connect. — Isaiah`.slice(0, 300);
  }
  if (headline.includes('founder') || headline.includes('ceo') || headline.includes('owner')) {
    return `Hi ${firstName}, fellow founder here — I build AI automation systems that help founders scale without adding headcount. Would love to connect! — Isaiah`.slice(0, 300);
  }
  if (headline.includes('saas') || headline.includes('software') || headline.includes('tech')) {
    return `Hi ${firstName}, came across your profile — love connecting with people in the SaaS/tech space. I work on AI automation for growth teams. — Isaiah`.slice(0, 300);
  }
  return `Hi ${firstName}, came across your profile and would love to connect — I help founders and operators scale with AI automation. — Isaiah`.slice(0, 300);
}

// ── Core: send connection request on a profile page ──────────────────────────
async function sendConnectionRequest(page, item) {
  const profileUrl = item.prospect?.profileUrl;
  if (!profileUrl) return { ok: false, error: 'no profileUrl' };

  err(`Navigating to: ${profileUrl}`);
  await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForTimeout(2000 + Math.random() * 1500); // jitter

  // Check login — auto-sign in if credentials are available
  const currentPath = await page.evaluate(() => window.location.pathname);
  if (currentPath.startsWith('/login') || currentPath.startsWith('/checkpoint')) {
    const loggedIn = await loginLinkedIn(page);
    if (!loggedIn) return { ok: false, error: 'not_logged_in — add LINKEDIN_EMAIL + LINKEDIN_PASSWORD to actp-worker/.env' };
    // Re-navigate to the profile after login
    await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(2000);
    const newPath = await page.evaluate(() => window.location.pathname);
    if (newPath.startsWith('/login') || newPath.startsWith('/checkpoint')) {
      return { ok: false, error: 'login_failed — check LINKEDIN_EMAIL + LINKEDIN_PASSWORD in actp-worker/.env' };
    }
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

  // Load queue
  const queue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8') || '[]');

  // --auto-approve: rank all pending_approval by priority, approve top N, then send
  if (AUTO_APPROVE) {
    const cap = Math.min(LIMIT, DAILY_LIMIT - state.sentToday);
    const pending = queue
      .filter(item => item.status === 'pending_approval' && item.prospect?.connectionDegree !== '1st')
      .map(item => ({ item, score: priorityScore(item) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, cap);

    let autoApproved = 0;
    for (const { item, score } of pending) {
      const idx = queue.findIndex(q => q.id === item.id);
      if (idx !== -1) {
        queue[idx].status = 'approved';
        queue[idx].priority_score = score;
        queue[idx].auto_approved_at = new Date().toISOString();
        autoApproved++;
      }
    }
    if (autoApproved > 0) {
      if (!DRY_RUN) writeJson(QUEUE_FILE, queue);
      log(`${DRY_RUN ? 'DRY RUN — would auto-approve' : 'Auto-approved'} top ${autoApproved} prospects by priority score`);
      pending.slice(0, 5).forEach(({ item, score }) => {
        const p = item.prospect;
        log(`  [${score}] ${p.name} — ${(p.headline||'').slice(0,60)} (${p.connectionDegree}, ${item.strategy})`);
      });
    } else {
      log('Auto-approve: no pending_approval items to rank');
    }
  }

  // Find approved items, sorted by priority_score desc (highest priority first)
  const eligible = queue
    .filter(item => item.status === 'approved' && item.prospect?.connectionDegree !== '1st')
    .map(item => ({ item, score: item.priority_score ?? priorityScore(item) }))
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item)
    .slice(0, Math.min(LIMIT, DAILY_LIMIT - state.sentToday));

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

  // Ensure Chrome is in debug mode (auto-launch if needed)
  const chromeStatus = await ensureChromeDebugMode();
  if (chromeStatus.startsWith('unavailable')) {
    const reason = chromeStatus === 'unavailable_regular_chrome_open'
      ? 'Chrome is open in regular mode — quit Chrome (Cmd+Q) then retry'
      : 'Chrome failed to start in debug mode — run: bash harness/start-chrome-debug.sh start';
    err(`Cannot connect to Chrome: ${reason}`);
    // Print a summary line the Telegram caller can parse
    process.stderr.write(`[connection-sender] Done — sent: 0, skipped: 0, failed: 0, error: ${reason}\n`);
    return;
  }

  // Connect to Chrome CDP
  let context = null, browserForCDP = null, usingCDP = false;
  try {
    browserForCDP = await chromium.connectOverCDP(CDP_URL, { timeout: 8000 });
    context = browserForCDP.contexts()[0] || await browserForCDP.newContext();
    usingCDP = true;
    err('Connected via CDP');
  } catch {
    err('CDP connect failed — falling back to persistent profile');
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(e => {
    err(`Fatal: ${e.message}`);
    process.exit(1);
  });
}
