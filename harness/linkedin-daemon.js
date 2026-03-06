#!/usr/bin/env node

/**
 * LinkedIn Prospect Daemon
 * ========================
 * Runs 24/7 — every 30 min it:
 *   1. Rotates through ICP search strategies (currently 13)
 *   2. Scores prospects, deduplicates against local queue + CRMLite
 *   3. Pushes qualified prospects to CRMLite (pipeline_stage: "prospect")
 *   4. Adds them to the local DM approval queue (NEVER auto-sends)
 *
 * DMs are only sent after human approval via:
 *   - Dashboard: POST /api/linkedin/daemon/queue/approve
 *   - CLI:       node harness/linkedin-daemon.js --send-approved
 *
 * Usage:
 *   node harness/linkedin-daemon.js                 # run 24/7
 *   node harness/linkedin-daemon.js --once          # single cycle, then exit
 *   node harness/linkedin-daemon.js --test          # preflight only
 *   node harness/linkedin-daemon.js --chrome-setup  # open Chrome to log into LinkedIn
 *   node harness/linkedin-daemon.js --strategies 2  # N strategies/cycle
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_DIR = __dirname;

// ── File paths ──────────────────────────────────────────────────────────────
const STATE_FILE   = path.join(HARNESS_DIR, 'linkedin-daemon-state.json');
const LOG_FILE     = path.join(HARNESS_DIR, 'linkedin-daemon-log.ndjson');
const QUEUE_FILE   = path.join(HARNESS_DIR, 'linkedin-dm-queue.json');
const LOGS_DIR     = path.join(HARNESS_DIR, 'logs');
const HEALTH_FILE  = path.join(HARNESS_DIR, 'linkedin-daemon-health.json');
const GOALS_FILE  = '/Users/isaiahdupree/Documents/Software/business-goals.json';
const SAFARI_ENV  = '/Users/isaiahdupree/Documents/Software/Safari Automation/.env';
const ACTP_ENV    = '/Users/isaiahdupree/Documents/Software/actp-worker/.env';
const HOME_ENV    = `${process.env.HOME}/.env`;

// ── Config ───────────────────────────────────────────────────────────────────
const LI           = 'http://localhost:3105';
const LI_TOKEN     = process.env.LINKEDIN_AUTH_TOKEN || 'test-token-12345';
const LI_HEADERS   = { 'Authorization': `Bearer ${LI_TOKEN}`, 'Content-Type': 'application/json' };
const CRMLITE_URL  = 'https://crmlite-isaiahduprees-projects.vercel.app';
const CYCLE_MS     = 30 * 60 * 1000;   // 30 minutes
const ICP_THRESHOLD = 6;

const args = process.argv.slice(2);
function getArg(name, fallback) {
  const idx = args.indexOf(name);
  return (idx !== -1 && args[idx + 1] !== undefined) ? args[idx + 1] : String(fallback);
}
const MODE           = args.includes('--once') ? 'once' : args.includes('--test') ? 'test' : args.includes('--chrome-setup') ? 'chrome-setup' : 'daemon';
const STRATS_PER_CYCLE = parseInt(getArg('--strategies', '3'), 10);

// ── Rate limit state tracker ─────────────────────────────────────────────────
const rateLimitState = {
  messagesSentToday: 0,
  messagesSentThisHour: 0,
  lastResetDay: new Date().toDateString(),
  lastResetHour: new Date().getHours(),
};

function checkRateLimits() {
  const now = new Date();
  if (now.toDateString() !== rateLimitState.lastResetDay) {
    rateLimitState.messagesSentToday = 0;
    rateLimitState.lastResetDay = now.toDateString();
  }
  if (now.getHours() !== rateLimitState.lastResetHour) {
    rateLimitState.messagesSentThisHour = 0;
    rateLimitState.lastResetHour = now.getHours();
  }
  return rateLimitState.messagesSentToday < 20 && rateLimitState.messagesSentThisHour < 10;
}

// ── Bootstrap env from files ─────────────────────────────────────────────────
// Keys to always override from later env files (real values beat placeholders)
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
loadEnvFile(ACTP_ENV);  // loads last so ACTP env overrides HOME_ENV defaults (e.g. real CRMLITE_API_KEY)

const CRMLITE_KEY     = process.env.CRMLITE_API_KEY || '';
const TELEGRAM_TOKEN  = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT   = process.env.TELEGRAM_CHAT_ID   || '';

async function sendTelegram(text) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT) return;
  try {
    await fetchWithTimeout(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT, text, parse_mode: 'HTML' }) },
      8000,
    );
  } catch { /* non-fatal */ }
}

// ── Rotating ICP search strategies ───────────────────────────────────────────
// Strategies are rotated STRATS_PER_CYCLE at a time (default 3/cycle).
// Add new strategies here — they enter the rotation automatically.
// Format: { name, keywords: [string], title: string, connectionDegree: '2nd'|'3rd' }
const SEARCH_STRATEGIES = [
  // ── Original 10 ──────────────────────────────────────────────────────────
  { name: 'AI SaaS Founders',        keywords: ['AI automation SaaS founder'],              title: 'CEO OR Founder OR CTO',                        connectionDegree: '2nd' },
  { name: 'Software Startup CTOs',   keywords: ['software startup engineering automation'],  title: 'CTO OR VP Engineering OR Technical Co-Founder', connectionDegree: '2nd' },
  { name: 'Marketing Tech Ops',      keywords: ['marketing automation startup growth'],      title: 'CEO OR Founder OR Head of Growth',              connectionDegree: '2nd' },
  { name: 'API Integration Builders',keywords: ['API integration developer tools founder'],  title: 'CEO OR Founder OR Product Lead',                connectionDegree: '2nd' },
  { name: 'Scale-Up Operators',      keywords: ['startup scale Series A operations'],        title: 'COO OR VP Operations OR Founder',               connectionDegree: '2nd' },
  { name: 'No-Code SaaS Founders',   keywords: ['no-code automation platform founder SaaS'],title: 'CEO OR Founder',                               connectionDegree: '2nd' },
  { name: 'Agency AI Owners',        keywords: ['digital agency AI automation owner'],       title: 'Owner OR Founder OR CEO',                      connectionDegree: '2nd' },
  { name: 'Creator Economy AI',      keywords: ['content creator AI tools solopreneur'],     title: 'Founder OR Creator OR CEO',                    connectionDegree: '2nd' },
  { name: 'AI Consulting Space',     keywords: ['AI consulting advisor automation startup'], title: 'Consultant OR Advisor OR Founder',              connectionDegree: '2nd' },
  { name: 'Bootstrapped SaaS',       keywords: ['bootstrapped SaaS indie hacker founder'],   title: 'Founder OR CEO OR Solo Founder',               connectionDegree: '2nd' },

  // ── Niche tests added 2026-03-06 (10 results each, all 2nd degree) ───────
  { name: 'Ecom DTC Founders',       keywords: ['ecommerce DTC brand founder shopify automation'],              title: 'CEO OR Founder OR Co-Founder OR Owner',                  connectionDegree: '2nd' },
  { name: 'RevOps SaaS Leaders',     keywords: ['RevOps sales automation B2B SaaS revenue operations'],         title: 'VP Sales OR Head of RevOps OR Revenue Operations OR CRO', connectionDegree: '2nd' },
  { name: 'App Creation Founders',   keywords: ['mobile app founder startup SaaS product-led growth'],          title: 'CEO OR Founder OR Co-Founder OR CPO',                    connectionDegree: '2nd' },
  { name: 'Web App Builders',        keywords: ['web app startup founder SaaS build launch automation'],        title: 'CEO OR Founder OR Co-Founder',                           connectionDegree: '2nd' },

  // ── 3rd-degree companions — same keywords, fresh pool of people ──────────
  // LinkedIn shows completely different results for 3rd degree vs 2nd degree.
  { name: 'AI SaaS Founders 3rd',    keywords: ['AI automation SaaS founder'],                                  title: 'CEO OR Founder OR CTO',                                  connectionDegree: '3rd' },
  { name: 'No-Code SaaS 3rd',        keywords: ['no-code automation platform founder SaaS'],                    title: 'CEO OR Founder',                                         connectionDegree: '3rd' },
  { name: 'Bootstrapped SaaS 3rd',   keywords: ['bootstrapped SaaS indie hacker founder'],                      title: 'Founder OR CEO OR Solo Founder',                         connectionDegree: '3rd' },
  { name: 'App Founders 3rd',        keywords: ['mobile app founder startup SaaS product-led growth'],          title: 'CEO OR Founder OR Co-Founder OR CPO',                    connectionDegree: '3rd' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function log(msg) {
  const ts = new Date().toISOString();
  const line = `${ts} [linkedin-daemon] ${msg}`;
  console.log(line);
  // Only write to file when stdout is not already redirected to the log (avoids duplicate lines from nohup)
  if (process.stdout.isTTY) {
    try {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
      fs.appendFileSync(path.join(LOGS_DIR, 'linkedin-daemon.log'), line + '\n');
    } catch { /* non-fatal */ }
  }
}

function readJson(fp, fallback = null) {
  try { return JSON.parse(fs.readFileSync(fp, 'utf-8')); } catch { return fallback; }
}

function writeJson(fp, data) {
  // Atomic write: tmp file + rename — prevents partial writes on crash
  const tmp = fp + '.tmp.' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, fp);
}

// ── Queue file lock (POSIX O_EXCL atomic create) ─────────────────────────────
// Prevents concurrent writes from connection-sender / dm-sender overwriting
// queue items added by this daemon during the same window.
const QUEUE_LOCK = QUEUE_FILE + '.lock';

function withQueueLock(fn) {
  const deadline = Date.now() + 10_000;
  function attempt() {
    try {
      fs.writeFileSync(QUEUE_LOCK, String(process.pid), { flag: 'wx' });
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      if (Date.now() > deadline) throw new Error('Queue lock timeout after 10s');
      // Check if lock holder is still alive; clean up stale lock if not
      try {
        const holder = parseInt(fs.readFileSync(QUEUE_LOCK, 'utf8'), 10);
        if (holder && !isNaN(holder)) {
          try { process.kill(holder, 0); } catch { fs.unlinkSync(QUEUE_LOCK); }
        }
      } catch { /* lock already gone */ }
      // Busy-wait 100ms then retry
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

async function liPost(path, body, ms = 60000) {
  try {
    const res = await fetch(`${LI}${path}`, {
      method: 'POST',
      headers: LI_HEADERS,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(ms),
    });
    const text = await res.text();
    try {
      return { ok: res.ok, status: res.status, data: JSON.parse(text) };
    } catch {
      return { ok: res.ok, status: res.status, data: { raw: text } };
    }
  } catch (e) {
    return { ok: false, status: 0, error: e.message };
  }
}

// ── Chrome-based LinkedIn search (Playwright, persistent profile) ─────────────
const CHROME_SEARCH_SCRIPT = path.join(HARNESS_DIR, 'linkedin-chrome-search.js');

async function searchViaChrome(strategy, maxResults = 15) {
  return new Promise((resolve) => {
    const keywords = Array.isArray(strategy.keywords)
      ? strategy.keywords.join(' ')
      : strategy.keywords;

    const scriptArgs = [
      '--keywords', keywords,
      '--max', String(maxResults),
    ];
    if (strategy.title)            scriptArgs.push('--title', strategy.title);
    if (strategy.connectionDegree) scriptArgs.push('--degree', strategy.connectionDegree);

    const child = spawn(process.execPath, [CHROME_SEARCH_SCRIPT, ...scriptArgs], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => {
      const line = d.toString().trim();
      if (line) log(`  [Chrome] ${line.replace('[chrome-search] ', '')}`);
    });

    const timer = setTimeout(() => {
      child.kill();
      resolve({ ok: false, results: [], error: 'timeout after 90s' });
    }, 90000);

    child.on('close', () => {
      clearTimeout(timer);
      try {
        const data = JSON.parse(stdout.trim() || '[]');
        if (Array.isArray(data)) {
          resolve({ ok: true, results: data });
        } else if (data.error === 'not_logged_in') {
          resolve({ ok: false, results: [], error: 'Chrome: not logged in — run --setup' });
        } else {
          resolve({ ok: false, results: [], error: data.error || 'unexpected output' });
        }
      } catch {
        resolve({ ok: false, results: [], error: `parse error: ${stdout.slice(0, 80)}` });
      }
    });
  });
}

// ── Parse role/company from LinkedIn headline ─────────────────────────────────
function parseHeadline(headline = '') {
  if (!headline) return { role: '', company: '' };
  const atMatch = headline.match(/^([^@|]+?)\s*@\s*([^|]+)/);
  if (atMatch) return { role: atMatch[1].trim(), company: atMatch[2].split('|')[0].trim() };
  const atWordMatch = headline.match(/^([^|]+?)\s+at\s+([^|]+)/i);
  if (atWordMatch) return { role: atWordMatch[1].trim(), company: atWordMatch[2].split('|')[0].trim() };
  const parts = headline.split('|').map(s => s.trim());
  if (parts.length >= 2) return { role: parts[0], company: parts[1] };
  return { role: parts[0] || '', company: '' };
}

// ── ICP scoring (10-point) ────────────────────────────────────────────────────
function scoreProspect(profile) {
  let score = 0;
  const reasons = [];
  const text = [profile.headline || '', profile.name || ''].join(' ').toLowerCase();
  const parsed = parseHeadline(profile.headline);
  const title = parsed.role.toLowerCase();
  const company = parsed.company.toLowerCase();

  if (/software|saas|tech|ai|app|platform|startup|engineering|automation|digital|product/.test(text)) {
    score += 3; reasons.push('tech/software company');
  }
  if (/founder|co-founder|ceo|cto|owner/.test(title)) {
    score += 2; reasons.push('founder/exec role');
  }
  if (/ai|automation|machine learning|llm|gpt|workflow|automate/.test(text)) {
    score += 2; reasons.push('AI/automation signal');
  }
  if (company && company.length > 2 && !['self-employed', 'freelance'].includes(company)) {
    score += 1; reasons.push('has company');
  }
  if (/arr|revenue|mrr|raised|series|growth|scale|customers/.test(text)) {
    score += 1; reasons.push('revenue/growth signal');
  }
  if (/scale|grow|expand|bootstrap|profitable/.test(text)) {
    score += 1; reasons.push('scaling signal');
  }

  return { score: Math.min(score, 10), reasons };
}

// ── CRMLite cloud sync ────────────────────────────────────────────────────────
async function crmDedup(profileSlug) {
  if (!CRMLITE_KEY) return { exists: false, contact_id: null };
  try {
    const res = await fetchWithTimeout(
      `${CRMLITE_URL}/api/contacts?search=${encodeURIComponent(profileSlug)}&platform=linkedin&limit=5`,
      { headers: { 'x-api-key': CRMLITE_KEY, 'Content-Type': 'application/json' } },
      5000
    );
    if (!res?.ok) return { exists: false, contact_id: null };
    const data = await res.json();
    const contacts = data.contacts || [];
    const normalizedSlug = profileSlug.toLowerCase();
    for (const c of contacts) {
      const accts = c.crm_platform_accounts || c.platform_accounts || [];
      const match = accts.find(a => a.username?.toLowerCase() === normalizedSlug);
      if (match) return { exists: true, contact_id: c.id };
    }
    return { exists: false, contact_id: null };
  } catch {
    return { exists: false, contact_id: null };
  }
}

async function crmUpsert(prospect, icpScore, icpReasons, goals) {
  if (!CRMLITE_KEY) return { synced: false, reason: 'no API key' };

  // Extract LinkedIn slug from profileUrl
  const slug = prospect.profileUrl?.match(/linkedin\.com\/in\/([^/?]+)/)?.[1] || prospect.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown';
  const parsed = parseHeadline(prospect.headline);
  const notes = [
    `ICP Score: ${icpScore}/10`,
    `Reasons: ${icpReasons.join(', ')}`,
    `Headline: ${prospect.headline || ''}`,
    `Location: ${prospect.location || ''}`,
    `Connection: ${prospect.connectionDegree || ''}`,
    `Role: ${parsed.role}`,
    `Company: ${parsed.company}`,
    `Auto-added by LinkedIn Daemon | ${new Date().toISOString()}`,
  ].filter(Boolean).join('\n');

  const body = {
    display_name: prospect.name,
    pipeline_stage: 'first_touch',
    notes,
    tags: ['linkedin', 'icp-qualified', 'automated', `icp-${icpScore}`],
    platform_accounts: [{ platform: 'linkedin', username: slug, is_primary: true }],
  };

  try {
    const res = await fetchWithTimeout(
      `${CRMLITE_URL}/api/contacts`,
      {
        method: 'POST',
        headers: { 'x-api-key': CRMLITE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      8000
    );
    if (!res) return { synced: false, reason: 'timeout' };
    const data = await res.json();
    if (res.ok) return { synced: true, contact_id: data.id || data.contact?.id || null };
    return { synced: false, reason: data.error || `HTTP ${res.status}` };
  } catch (e) {
    return { synced: false, reason: e.message };
  }
}

// ── Load state / queue ────────────────────────────────────────────────────────
function loadState() {
  const defaults = {
    running: false,
    paused: false,
    cycleCount: 0,
    strategyCursor: 0,
    totalProspectsFound: 0,
    totalSyncedCrm: 0,
    totalQueuedForDm: 0,
    lastCycleAt: null,
    nextCycleAt: null,
    startedAt: null,
    seenUrls: [],           // persistent dedup across restarts
  };
  const saved = readJson(STATE_FILE, null);
  return saved ? { ...defaults, ...saved } : defaults;
}

function saveState(state) {
  try { writeJson(STATE_FILE, state); } catch { /* non-fatal */ }
}

function loadQueue() {
  return readJson(QUEUE_FILE, []);
}

function saveQueue(queue) {
  withQueueLock(() => writeJson(QUEUE_FILE, queue));
}

function isAlreadyQueued(profileUrl, queue) {
  return queue.some(item => item.prospect?.profileUrl === profileUrl);
}

// Persistent seen-URL set — survives restarts, prevents re-finding same people forever
function loadSeenUrls(state) {
  return new Set(state.seenUrls || []);
}
function saveSeenUrls(state, seenSet) {
  // Cap at 5000 to prevent unbounded growth
  const arr = [...seenSet];
  state.seenUrls = arr.slice(-5000);
}

// ── One discovery cycle ───────────────────────────────────────────────────────
async function runCycle(goals, state) {
  // Active hours guard (9am–9pm only)
  const hour = new Date().getHours();
  if (hour < 9 || hour >= 21) {
    log(`Outside active hours (${hour}:xx) — skipping cycle, next check in 30min`);
    return { skipped: true, reason: 'outside_active_hours' };
  }

  const cycleNum = state.cycleCount + 1;
  const cycleStart = Date.now();
  const seenUrls = loadSeenUrls(state);
  log(`─── Cycle #${cycleNum} starting | seen: ${seenUrls.size} URLs ───`);

  // Pick strategies for this cycle (rotate through all 10)
  const cursor = state.strategyCursor || 0;
  const strategies = [];
  for (let i = 0; i < STRATS_PER_CYCLE; i++) {
    strategies.push(SEARCH_STRATEGIES[(cursor + i) % SEARCH_STRATEGIES.length]);
  }
  const nextCursor = (cursor + STRATS_PER_CYCLE) % SEARCH_STRATEGIES.length;

  const cycleEntry = {
    ts: new Date().toISOString(),
    cycle: cycleNum,
    strategies: strategies.map(s => s.name),
    li_up: false,
    searched: 0,
    unique_new: 0,
    qualified: 0,
    crm_synced: 0,
    queued_for_dm: 0,
    errors: [],
  };

  // Step 1: Health check Safari LinkedIn service
  const health = await fetchWithTimeout(`${LI}/health`, {}, 3000);
  cycleEntry.li_up = health?.ok === true;
  if (!cycleEntry.li_up) {
    log('Safari LinkedIn service DOWN — will rely on Chrome fallback');
    cycleEntry.errors.push('Safari LinkedIn service DOWN');
  } else {
    log('Safari LinkedIn service UP');
  }

  // Step 2: Navigate to LinkedIn (Safari only, skip if down)
  if (cycleEntry.li_up) {
    const navRes = await liPost('/api/linkedin/navigate/network', {}, 12000);
    if (!navRes.ok) {
      log(`Navigate failed: ${JSON.stringify(navRes.data || navRes.error)}`);
      cycleEntry.errors.push('Navigate failed');
    } else {
      log('Navigated to LinkedIn network');
    }
    await new Promise(r => setTimeout(r, 3000));
  }

  // Step 3: Search — Safari primary, Chrome fallback
  const queue = loadQueue();
  const allFound = new Map(); // profileUrl → prospect

  for (const strategy of strategies) {
    log(`Search: "${strategy.name}" — keywords: ${strategy.keywords[0]}`);
    let safariResults = [];
    let usedChrome = false;

    // ── Try Safari first ──────────────────────────────────────────────────────
    if (cycleEntry.li_up) {
      const body = { keywords: strategy.keywords, title: strategy.title, connectionDegree: strategy.connectionDegree };
      let res = await liPost('/api/linkedin/search/people', body, 45000);

      // One retry on transient failure
      if (!res.ok && res.status === 0) {
        await new Promise(r => setTimeout(r, 5000));
        res = await liPost('/api/linkedin/search/people', body, 45000);
      }

      if (res.ok && Array.isArray(res.data?.results)) {
        safariResults = res.data.results;
      } else {
        const errMsg = res.error || JSON.stringify(res.data).slice(0, 80);
        log(`  → Safari error: ${errMsg}`);
        cycleEntry.errors.push(`${strategy.name} (Safari): ${errMsg}`);
      }
    }

    // ── Chrome fallback if Safari down or returned 0 results ─────────────────
    if (safariResults.length === 0) {
      log(`  → Safari returned 0 — trying Chrome…`);
      const chromeRes = await searchViaChrome(strategy, 15);
      if (chromeRes.ok && chromeRes.results.length > 0) {
        safariResults = chromeRes.results;
        usedChrome = true;
        log(`  → Chrome: ${chromeRes.results.length} results`);
      } else {
        log(`  → Chrome: ${chromeRes.error || 'no results'}`);
        if (chromeRes.error) cycleEntry.errors.push(`${strategy.name} (Chrome): ${chromeRes.error}`);
      }
    }

    // ── Collect unique results ────────────────────────────────────────────────
    cycleEntry.searched += safariResults.length;
    let newForStrategy = 0;
    for (const p of safariResults) {
      if (p.profileUrl && !allFound.has(p.profileUrl)) {
        allFound.set(p.profileUrl, { ...p, _strategy: strategy.name, _source: usedChrome ? 'chrome' : 'safari' });
        newForStrategy++;
      }
    }
    log(`  → ${safariResults.length} results, ${newForStrategy} new unique (via ${usedChrome ? 'Chrome' : 'Safari'})`);

    // Pause between strategies
    if (strategies.indexOf(strategy) < strategies.length - 1) {
      await new Promise(r => setTimeout(r, 4000));
    }
  }

  cycleEntry.unique_new = allFound.size;
  log(`Unique prospects this cycle: ${allFound.size}`);

  // Step 4: Score, dedup, sync to CRMLite, queue for DM
  for (const [profileUrl, prospect] of allFound) {
    // Skip if already seen in a previous cycle (persistent dedup)
    if (seenUrls.has(profileUrl)) continue;
    seenUrls.add(profileUrl);

    // Skip if already in local DM queue
    if (isAlreadyQueued(profileUrl, queue)) continue;

    const { score, reasons } = scoreProspect(prospect);
    if (score < ICP_THRESHOLD) continue;

    cycleEntry.qualified++;

    // CRM dedup check
    const slug = profileUrl.match(/linkedin\.com\/in\/([^/?]+)/)?.[1] || prospect.name;
    const dedup = await crmDedup(slug);
    if (dedup.exists) {
      log(`  Skip (already in CRM): ${prospect.name}`);
      continue;
    }

    // Push to CRMLite
    const syncResult = await crmUpsert(prospect, score, reasons, goals);
    if (syncResult.synced) {
      cycleEntry.crm_synced++;
      log(`  CRM sync: ${prospect.name} → contact ${syncResult.contact_id}`);
    } else {
      log(`  CRM sync failed: ${prospect.name} — ${syncResult.reason}`);
    }

    // Add to local DM approval queue (never auto-send)
    const parsed = parseHeadline(prospect.headline);
    const firstName = prospect.name?.split(' ')[0] || 'there';
    const contextLine = parsed.role && parsed.company
      ? `your work as ${parsed.role} at ${parsed.company}`
      : parsed.role ? `your role as ${parsed.role}`
      : parsed.company ? `what you're building at ${parsed.company}`
      : 'your background in AI automation';
    const painPoint = (goals.icp?.pain_points || ['manual execution work'])[0];
    const draftedMsg = `Hi ${firstName}, I noticed ${contextLine}. I help founders cut the ${painPoint} by building custom AI automations — typically saves 8-15 hours/week. Would a quick 15-min chat make sense? — Isaiah`;

    const queueItem = {
      id: `li-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      queued_at: new Date().toISOString(),
      cycle: cycleNum,
      status: 'pending_approval',
      prospect: {
        name: prospect.name,
        profileUrl,
        headline: prospect.headline,
        location: prospect.location,
        connectionDegree: prospect.connectionDegree,
        role: parsed.role,
        company: parsed.company,
        icp_score: score,
        icp_reasons: reasons,
      },
      crm_id: syncResult.contact_id || null,
      crm_synced: syncResult.synced,
      drafted_message: draftedMsg,
      strategy: prospect._strategy,
      source: prospect._source || 'safari',
    };
    queue.push(queueItem);
    cycleEntry.queued_for_dm++;
    log(`  Queued for DM approval: ${prospect.name} (ICP ${score}/10)`);
  }

  saveQueue(queue);
  appendLog(cycleEntry);

  state.cycleCount++;
  state.strategyCursor = nextCursor;
  state.totalProspectsFound += cycleEntry.searched;
  state.totalSyncedCrm += cycleEntry.crm_synced;
  state.totalQueuedForDm += cycleEntry.queued_for_dm;
  state.lastCycleAt = new Date().toISOString();
  state.nextCycleAt = new Date(Date.now() + CYCLE_MS).toISOString();
  saveState(state);

  // Write health state file after each cycle
  try {
    writeJson(HEALTH_FILE, {
      status: 'ok',
      service: 'linkedin-daemon-chrome',
      timestamp: new Date().toISOString(),
      rateLimits: {
        messagesSentToday: rateLimitState.messagesSentToday,
        messagesSentThisHour: rateLimitState.messagesSentThisHour,
        limits: { messagesPerHour: 10, messagesPerDay: 20, activeHoursStart: 9, activeHoursEnd: 21 },
      },
      cycleCount: state.cycleCount,
      lastCycleAt: state.lastCycleAt,
      queueLength: loadQueue().length,
    });
  } catch { /* non-fatal */ }

  // Persist seen URLs so we never re-process the same profiles
  saveSeenUrls(state, seenUrls);
  saveState(state);

  const elapsed = ((Date.now() - cycleStart) / 1000).toFixed(1);
  log(`─── Cycle #${cycleNum} done in ${elapsed}s | qualified: ${cycleEntry.qualified} | CRM synced: ${cycleEntry.crm_synced} | DM queue: ${cycleEntry.queued_for_dm} new | seen total: ${seenUrls.size} ───`);

  // Telegram notification — when new prospects found (always) or milestone hit (5+)
  if (cycleEntry.queued_for_dm > 0 || cycleEntry.crm_synced > 0) {
    const queue = loadQueue();
    const newItems = queue.slice(-cycleEntry.queued_for_dm);
    const prospectLines = newItems.map(item => {
      const p = item.prospect || {};
      return `  👤 <b>${p.name || 'Unknown'}</b> — ${(p.headline || '').slice(0, 65)}${p.company ? ' @ ' + p.company : ''} [ICP ${p.icp_score}/10]`;
    }).join('\n');

    const milestone = cycleEntry.queued_for_dm >= 10 ? ' 🎯 10+ milestone!' : cycleEntry.queued_for_dm >= 5 ? ' 🎯 5+ milestone!' : '';
    const text = [
      `🔗 <b>LinkedIn Prospects</b> — Cycle #${cycleNum}${milestone}`,
      `Searched: ${cycleEntry.searched} | Qualified: ${cycleEntry.qualified} | CRM: +${cycleEntry.crm_synced} | Queue: +${cycleEntry.queued_for_dm}`,
      prospectLines || '',
      cycleEntry.errors.length ? `⚠️ ${cycleEntry.errors[0]}` : '',
    ].filter(Boolean).join('\n');

    // Inline buttons: approve all or review queue
    const buttons = { inline_keyboard: [
      [
        { text: `✅ Approve All (${cycleEntry.queued_for_dm})`, callback_data: 'approve_all' },
        { text: '📋 Review Queue', callback_data: 'queue' },
      ],
    ]};

    try {
      await fetchWithTimeout(
        `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: TELEGRAM_CHAT, text, parse_mode: 'HTML', reply_markup: buttons }) },
        8000,
      );
    } catch { /* non-fatal */ }
  }

  return cycleEntry;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  log(`Starting LinkedIn Daemon (mode: ${MODE}, strategies/cycle: ${STRATS_PER_CYCLE})`);
  log(`CRMLite sync: ${CRMLITE_KEY ? 'ENABLED' : 'DISABLED (no CRMLITE_API_KEY)'}`);

  // Load goals
  let goals = readJson(GOALS_FILE, {});
  if (!goals || Object.keys(goals).length === 0) {
    log('WARNING: No business goals found at ' + GOALS_FILE);
    goals = { revenue: { target_monthly_usd: 5000, current_monthly_usd: 0 }, icp: { pain_points: ['manual execution work'] } };
  } else {
    log(`Goals: $${goals.revenue?.target_monthly_usd}/mo target, gap $${(goals.revenue?.target_monthly_usd || 5000) - (goals.revenue?.current_monthly_usd || 0)}`);
  }

  if (MODE === 'chrome-setup') {
    log('Chrome setup mode — opening visible Chrome for LinkedIn login.');
    log('Log into LinkedIn in the browser window, then close it to save session.');
    const child = spawn(process.execPath, [CHROME_SEARCH_SCRIPT, '--setup'], { stdio: 'inherit' });
    await new Promise(resolve => child.on('close', resolve));
    log('Chrome setup complete. LinkedIn session saved.');
    return;
  }

  if (MODE === 'test') {
    const health = await fetchWithTimeout(`${LI}/health`, {}, 3000);
    const queue = loadQueue();
    const state = loadState();
    const preflight = {
      linkedin_up: health?.ok === true,
      crmlite_key: !!CRMLITE_KEY,
      anthropic_key: !!process.env.ANTHROPIC_API_KEY,
      goals_loaded: !!goals,
      queue_length: queue.length,
      pending_approval: queue.filter(q => q.status === 'pending_approval').length,
      state,
    };
    console.log('\nPre-flight:');
    console.log(JSON.stringify(preflight, null, 2));
    return preflight;
  }

  const state = loadState();
  state.running = true;
  state.startedAt = state.startedAt || new Date().toISOString();
  saveState(state);

  if (MODE === 'once') {
    try {
      await runCycle(goals, state);
    } finally {
      state.running = false;
      saveState(state);
    }
    return;
  }

  // ── Daemon loop ──────────────────────────────────────────────────────────────
  log(`Daemon running — cycle every ${CYCLE_MS / 60000} min. Ctrl+C or SIGTERM to stop.`);

  process.on('SIGTERM', () => {
    log('SIGTERM received — shutting down cleanly');
    state.running = false;
    saveState(state);
    process.exit(0);
  });
  process.on('SIGINT', () => {
    log('SIGINT received — shutting down cleanly');
    state.running = false;
    saveState(state);
    process.exit(0);
  });

  // Run first cycle immediately, then every CYCLE_MS
  while (true) {
    const currentState = loadState();
    if (currentState.paused) {
      log('Paused — waiting 60s...');
      await new Promise(r => setTimeout(r, 60000));
      continue;
    }

    // Re-read goals each cycle so changes take effect without restart
    goals = readJson(GOALS_FILE, goals);

    try {
      await runCycle(goals, currentState);
    } catch (e) {
      log(`Cycle error: ${e.message}`);
      appendLog({ ts: new Date().toISOString(), cycle_error: e.message });
    }

    log(`Next cycle in ${CYCLE_MS / 60000} min (${new Date(Date.now() + CYCLE_MS).toLocaleTimeString()})`);
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
