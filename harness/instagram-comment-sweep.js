#!/usr/bin/env node

/**
 * Instagram Comment Sweep Daemon
 * ================================
 * Reads business-goals.json for niches + ICP, then systematically comments
 * on relevant Instagram posts — per niche + per feed, with daily caps.
 *
 * Note: Instagram is more conservative than Twitter/Threads.
 * Limits are lower and delays are longer to stay safe.
 *
 * Limits:
 *   maxPerNiche  : 3 comments per niche per run
 *   maxPerFeed   : 2 comments from home feed per run
 *   maxPerRun    : 10 comments total per run
 *   dailyCap     : 20 comments/day
 *   runInterval  : every 3 hours (during 8am-10pm only)
 *
 * Usage:
 *   node harness/instagram-comment-sweep.js            # daemon
 *   node harness/instagram-comment-sweep.js --once     # single sweep, then exit
 *   node harness/instagram-comment-sweep.js --dry-run  # generate replies, don't post
 *   node harness/instagram-comment-sweep.js --test     # preflight check only
 *   node harness/instagram-comment-sweep.js --niche saas_growth
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_DIR = __dirname;

// ── Paths ────────────────────────────────────────────────────────────────────
const STATE_FILE = path.join(HARNESS_DIR, 'instagram-comment-sweep-state.json');
const LOG_FILE   = path.join(HARNESS_DIR, 'instagram-comment-sweep-log.ndjson');
const GOALS_FILE = '/Users/isaiahdupree/Documents/Software/business-goals.json';
const ACTP_ENV   = '/Users/isaiahdupree/Documents/Software/actp-worker/.env';
const HOME_ENV   = `${process.env.HOME}/.env`;

// Shared Safari sweep lock — prevents multiple sweep daemons from running simultaneously
const SAFARI_LOCK = '/tmp/safari-comment-sweep.lock';

// ── Config ───────────────────────────────────────────────────────────────────
const IG_COMMENTS_URL = process.env.INSTAGRAM_COMMENTS_URL || 'http://localhost:3005';
const IG_API_TOKEN    = process.env.INSTAGRAM_API_TOKEN || 'test-token';

// Conservative limits for Instagram
const MAX_PER_NICHE   = parseInt(process.env.IG_MAX_PER_NICHE   || '3');
const MAX_PER_FEED    = parseInt(process.env.IG_MAX_PER_FEED    || '2');
const MAX_PER_RUN     = parseInt(process.env.IG_MAX_PER_RUN     || '10');
const DAILY_CAP       = parseInt(process.env.IG_DAILY_CAP       || '20');
const BASE_INTERVAL_MS = parseInt(process.env.IG_RUN_INTERVAL_MS || String(3 * 60 * 60 * 1000)); // 3h
const ACTIVE_HOUR_START = 8;
const ACTIVE_HOUR_END   = 22;
const SEEN_URL_TTL_DAYS = 7;

// ── Niche → keyword mapping ───────────────────────────────────────────────────
const NICHE_KEYWORDS = {
  ai_automation:     ['AI automation', 'AI workflow', '#aitools', '#businessautomation', 'automate with AI'],
  saas_growth:       ['SaaS founder', '#saasfounder', 'B2B SaaS', '#startupgrowth', 'indie SaaS'],
  content_creation:  ['content creator', '#contentcreator', '#buildInPublic', 'solopreneur content', '#creatortips'],
  digital_marketing: ['digital marketing', '#digitalmarketing', 'growth marketing', '#marketingautomation'],
  creator_economy:   ['creator economy', '#creatoreconomy', 'solopreneur', '#indiehacker', 'online business'],
};

const FEED_SOURCES = ['home'];

// ── Args ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const MODE = args.includes('--once') ? 'once'
  : args.includes('--test') ? 'test'
  : 'daemon';
const DRY_RUN = args.includes('--dry-run');
const SINGLE_NICHE = args.includes('--niche') ? args[args.indexOf('--niche') + 1] : '';

// ── Env loader ────────────────────────────────────────────────────────────────
function loadEnvFile(filePath) {
  try {
    for (const line of fs.readFileSync(filePath, 'utf-8').split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.+)/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch { /* non-fatal */ }
}
loadEnvFile(HOME_ENV);
loadEnvFile(ACTP_ENV);

// ── Safari sweep lock ─────────────────────────────────────────────────────────
// Prevents twitter/threads/instagram sweeps from running simultaneously
// (they all share the same Safari browser)
function acquireLock(timeoutMs = 120_000) {
  const lockExpiry = Date.now() + timeoutMs;
  try {
    if (fs.existsSync(SAFARI_LOCK)) {
      const lock = JSON.parse(fs.readFileSync(SAFARI_LOCK, 'utf8'));
      if (lock.expires > Date.now()) {
        return false; // another sweep is running
      }
    }
    fs.writeFileSync(SAFARI_LOCK, JSON.stringify({
      pid: process.pid,
      platform: 'instagram',
      acquired: new Date().toISOString(),
      expires: lockExpiry,
    }));
    return true;
  } catch {
    return false;
  }
}

function releaseLock() {
  try {
    const lock = JSON.parse(fs.readFileSync(SAFARI_LOCK, 'utf8'));
    if (lock.pid === process.pid) fs.unlinkSync(SAFARI_LOCK);
  } catch { /* non-fatal */ }
}

// ── State management ──────────────────────────────────────────────────────────
function today() {
  return new Date().toISOString().slice(0, 10);
}

function readState() {
  try {
    const s = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    if (s.date !== today()) {
      s.date = today();
      s.dailyTotal = 0;
      s.perNiche = {};
    }
    const cutoff = Date.now() - SEEN_URL_TTL_DAYS * 24 * 60 * 60 * 1000;
    if (s.seenUrls && typeof s.seenUrls === 'object' && !Array.isArray(s.seenUrls)) {
      for (const [url, ts] of Object.entries(s.seenUrls)) {
        if (ts < cutoff) delete s.seenUrls[url];
      }
    } else {
      s.seenUrls = {};
    }
    return s;
  } catch {
    return {
      date: today(),
      dailyTotal: 0,
      perNiche: {},
      seenUrls: {},
      lastRun: null,
      totalAllTime: 0,
    };
  }
}

function writeState(state) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch { /* non-fatal */ }
}

// ── Logging ───────────────────────────────────────────────────────────────────
function log(msg, data = {}) {
  const entry = { ts: new Date().toISOString(), msg, ...data };
  if (!process.env.NOHUP || process.stdout.isTTY) {
    console.log(`[ig-sweep] ${msg}`);
  }
  try { fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n'); } catch { /* non-fatal */ }
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────
async function igPost(path, body) {
  try {
    const res = await fetch(`${IG_COMMENTS_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${IG_API_TOKEN}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000), // IG is slower — 2min timeout
    });
    return await res.json();
  } catch (e) {
    return { error: String(e) };
  }
}

async function igGet(path) {
  try {
    const res = await fetch(`${IG_COMMENTS_URL}${path}`, {
      headers: { 'Authorization': `Bearer ${IG_API_TOKEN}` },
      signal: AbortSignal.timeout(10_000),
    });
    return await res.json();
  } catch (e) {
    return { error: String(e) };
  }
}

// ── Business goals loader ─────────────────────────────────────────────────────
function loadNiches() {
  try {
    const goals = JSON.parse(fs.readFileSync(GOALS_FILE, 'utf8'));
    const activeNiches = goals?.content?.niches || Object.keys(NICHE_KEYWORDS);
    return activeNiches
      .filter(n => NICHE_KEYWORDS[n])
      .map(n => ({
        name: n,
        keywords: NICHE_KEYWORDS[n],
        maxComments: MAX_PER_NICHE,
      }));
  } catch {
    log('Could not load business-goals.json, using defaults');
    return Object.entries(NICHE_KEYWORDS).map(([name, keywords]) => ({
      name, keywords, maxComments: MAX_PER_NICHE,
    }));
  }
}

// ── Jittered interval ─────────────────────────────────────────────────────────
// Adds ±15min randomness to the run interval to avoid detectable patterns
function jitteredIntervalMs() {
  const jitterMs = (Math.random() * 30 - 15) * 60 * 1000; // ±15min
  return Math.max(BASE_INTERVAL_MS + jitterMs, 30 * 60 * 1000); // min 30min
}

function isActiveHours() {
  const h = new Date().getHours();
  return h >= ACTIVE_HOUR_START && h < ACTIVE_HOUR_END;
}

// ── Preflight ─────────────────────────────────────────────────────────────────
async function preflight() {
  console.log('=== Instagram Comment Sweep Preflight ===\n');

  const health = await igGet('/health');
  if (health.error || health.status !== 'ok') {
    console.log(`FAIL: instagram-comments :3005 — ${health.error || health.status}`);
    return false;
  }
  console.log(`OK: instagram-comments :3005 — ${health.status}`);

  const state = readState();
  console.log(`\nToday's stats:`);
  console.log(`  Daily comments: ${state.dailyTotal} / ${DAILY_CAP}`);
  console.log(`  Per-niche: ${JSON.stringify(state.perNiche)}`);
  console.log(`  Seen URLs (dedup): ${Object.keys(state.seenUrls || {}).length}`);
  console.log(`  Last run: ${state.lastRun || 'never'}`);

  const niches = loadNiches();
  console.log(`\nNiches loaded: ${niches.map(n => n.name).join(', ')}`);
  console.log(`Feed sources: ${FEED_SOURCES.join(', ')}`);
  console.log(`\nLimits: ${MAX_PER_NICHE}/niche, ${MAX_PER_FEED}/feed, ${MAX_PER_RUN}/run, ${DAILY_CAP}/day`);

  console.log('\nPreflight complete.\n');
  return true;
}

// ── Core sweep cycle ──────────────────────────────────────────────────────────
async function runSweep() {
  // Health gate — skip if service is down
  const health = await igGet('/health');
  if (health.error || health.status !== 'ok') {
    log(`Service not ready (${health.error || health.status}) — skipping sweep`);
    return;
  }

  const state = readState();

  if (state.dailyTotal >= DAILY_CAP) {
    log(`Daily cap hit (${state.dailyTotal}/${DAILY_CAP}) — skipping until midnight`);
    return;
  }

  // Acquire Safari lock — wait up to 3 min for other sweeps to finish
  let lockAcquired = false;
  for (let attempt = 0; attempt < 18; attempt++) {
    if (acquireLock(10 * 60 * 1000)) { // 10min lock
      lockAcquired = true;
      break;
    }
    log('Safari lock held by another sweep — waiting 10s...');
    await new Promise(r => setTimeout(r, 10_000));
  }
  if (!lockAcquired) {
    log('Could not acquire Safari lock after 3min — skipping sweep');
    return;
  }

  try {
    const remaining = DAILY_CAP - state.dailyTotal;
    const runMax = Math.min(MAX_PER_RUN, remaining);

    let niches = loadNiches();
    if (SINGLE_NICHE) niches = niches.filter(n => n.name === SINGLE_NICHE);
    if (!niches.length) {
      log(`No niches to process${SINGLE_NICHE ? ` (unknown niche: ${SINGLE_NICHE})` : ''}`);
      return;
    }

    const perNicheDailyCap = Math.ceil(DAILY_CAP / niches.length);
    const nichesToRun = niches.map(n => ({
      ...n,
      maxComments: Math.min(
        n.maxComments,
        perNicheDailyCap - (state.perNiche[n.name] || 0)
      ),
    })).filter(n => n.maxComments > 0);

    if (!nichesToRun.length) {
      log('All niches at their daily cap — skipping');
      return;
    }

    log(`Starting sweep: ${nichesToRun.length} niches, max ${runMax} total, dryRun=${DRY_RUN}`);
    state.lastRun = new Date().toISOString();

    const sweepResult = await igPost('/api/instagram/comment-sweep', {
      niches: nichesToRun,
      feedSources: FEED_SOURCES,
      maxPerNiche: MAX_PER_NICHE,
      maxPerFeed: MAX_PER_FEED,
      maxTotal: runMax,
      dryRun: DRY_RUN,
      seenUrls: Object.keys(state.seenUrls || {}),
      style: 'insightful, practitioner-level, concise — adds genuine value to the conversation',
    });

    if (sweepResult.error) {
      log(`Sweep error: ${sweepResult.error}`);
      writeState(state);
      return;
    }

    const commented = sweepResult.totalCommented || 0;
    state.dailyTotal += commented;
    state.totalAllTime = (state.totalAllTime || 0) + commented;

    for (const url of sweepResult.newlyCommentedUrls || []) {
      state.seenUrls[url] = Date.now();
    }

    for (const nicheResult of sweepResult.nicheResults || []) {
      state.perNiche[nicheResult.niche] = (state.perNiche[nicheResult.niche] || 0)
        + nicheResult.commented.length;
    }

    writeState(state);

    log(sweepResult.summary || `${commented} comments posted`, {
      dryRun: DRY_RUN,
      dailyTotal: state.dailyTotal,
      dailyCap: DAILY_CAP,
      nicheBreakdown: Object.fromEntries(
        (sweepResult.nicheResults || []).map(n => [n.niche, n.commented.length])
      ),
      feedComments: sweepResult.feedResults?.length || 0,
    });

    for (const nr of sweepResult.nicheResults || []) {
      if (nr.commented.length > 0) {
        log(`  ${nr.niche}: ${nr.commented.length} comments, ${nr.skipped.length} skipped`, {
          niche: nr.niche,
          examples: nr.commented.slice(0, 2).map(c => ({ author: c.author, replyPreview: c.reply.slice(0, 60) })),
        });
      }
      if (nr.errors.length) {
        log(`  ${nr.niche} errors: ${nr.errors.join('; ')}`);
      }
    }
  } finally {
    releaseLock();
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  try { fs.mkdirSync(path.join(HARNESS_DIR, 'logs'), { recursive: true }); } catch {}

  if (MODE === 'test') {
    const ok = await preflight();
    process.exit(ok ? 0 : 1);
  }

  if (MODE === 'once') {
    await preflight();
    await runSweep();
    log('Single sweep complete');
    process.exit(0);
  }

  // Daemon mode
  log(`Instagram Comment Sweep daemon started (PID ${process.pid})`);
  log(`Config: ${MAX_PER_NICHE}/niche, ${MAX_PER_FEED}/feed, ${MAX_PER_RUN}/run, ${DAILY_CAP}/day, ~${BASE_INTERVAL_MS / 60000}min interval (±15min jitter)`);

  const tick = async () => {
    const nextMs = jitteredIntervalMs();
    if (!isActiveHours()) {
      log('Outside active hours (8am-10pm) — sleeping');
    } else {
      await runSweep().catch(e => log(`Sweep error: ${e.message}`));
    }
    setTimeout(tick, nextMs);
  };

  await runSweep().catch(e => log(`Initial sweep error: ${e.message}`));
  setTimeout(tick, jitteredIntervalMs());

  const shutdown = () => {
    releaseLock();
    log('Shutting down...');
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(e => {
  releaseLock();
  console.error(`[ig-sweep] Fatal: ${e.message}`);
  process.exit(1);
});
