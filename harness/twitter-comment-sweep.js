#!/usr/bin/env node

/**
 * Twitter Comment Sweep Daemon
 * ============================
 * Reads business-goals.json for niches + ICP, then systematically comments
 * on relevant Twitter/X posts — per niche + per feed, with daily caps.
 *
 * Limits (safe Twitter usage):
 *   maxPerNiche  : 5 comments per niche per run  (configurable)
 *   maxPerFeed   : 3 comments from home feed per run
 *   maxPerRun    : 20 comments total per run
 *   dailyCap     : 40 comments/day (hard stop — resets at midnight)
 *   runInterval  : every 2 hours (during 8am-10pm only)
 *
 * State persisted in twitter-comment-sweep-state.json:
 *   - Daily comment count (resets at midnight)
 *   - Per-niche daily counts
 *   - Set of tweet URLs already commented on (last 7 days)
 *
 * Usage:
 *   node harness/twitter-comment-sweep.js            # run as daemon
 *   node harness/twitter-comment-sweep.js --once     # single sweep, then exit
 *   node harness/twitter-comment-sweep.js --dry-run  # generate replies, don't post
 *   node harness/twitter-comment-sweep.js --test     # preflight check only
 *   node harness/twitter-comment-sweep.js --niche saas_growth  # single niche
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_DIR = __dirname;

// ── Paths ────────────────────────────────────────────────────────────────────
const STATE_FILE = path.join(HARNESS_DIR, 'twitter-comment-sweep-state.json');
const LOG_FILE   = path.join(HARNESS_DIR, 'twitter-comment-sweep-log.ndjson');
const GOALS_FILE = '/Users/isaiahdupree/Documents/Software/business-goals.json';
const ACTP_ENV   = '/Users/isaiahdupree/Documents/Software/actp-worker/.env';
const HOME_ENV   = `${process.env.HOME}/.env`;

// ── Config ───────────────────────────────────────────────────────────────────
const TW_COMMENTS_URL = process.env.TWITTER_COMMENTS_URL || 'http://localhost:3007';
const TW_API_TOKEN    = process.env.TWITTER_API_TOKEN || 'test-token-12345';

const MAX_PER_NICHE   = parseInt(process.env.TW_MAX_PER_NICHE   || '5');
const MAX_PER_FEED    = parseInt(process.env.TW_MAX_PER_FEED    || '3');
const MAX_PER_RUN     = parseInt(process.env.TW_MAX_PER_RUN     || '20');
const DAILY_CAP       = parseInt(process.env.TW_DAILY_CAP       || '40');
const BASE_INTERVAL_MS = parseInt(process.env.TW_RUN_INTERVAL_MS || String(2 * 60 * 60 * 1000)); // 2h
const ACTIVE_HOUR_START = 8;   // 8am local
const ACTIVE_HOUR_END   = 22;  // 10pm local
const SEEN_URL_TTL_DAYS = 7;   // forget dedup after 7 days

// Shared Safari sweep lock
const SAFARI_LOCK = '/tmp/safari-comment-sweep.lock';

// ── Niche → keyword mapping ───────────────────────────────────────────────────
const NICHE_KEYWORDS = {
  ai_automation:     ['AI automation', 'AI workflow', 'automate with AI', 'AI tools founder', 'business automation AI'],
  saas_growth:       ['SaaS founder', 'SaaS growth hacks', 'B2B SaaS revenue', 'startup scaling', 'indie SaaS'],
  content_creation:  ['content creator tips', 'content strategy', 'creator economy 2025', 'build in public', 'solopreneur content'],
  digital_marketing: ['digital marketing AI', 'marketing automation', 'growth marketing', 'conversion rate optimization'],
  creator_economy:   ['creator economy', 'solopreneur income', 'indie maker revenue', 'online business systems'],
};

// Feed sources to sweep in addition to keyword search
const FEED_SOURCES = ['foryou'];  // 'foryou' | 'following'

// ── Args ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const MODE = args.includes('--once') ? 'once'
  : args.includes('--test') ? 'test'
  : 'daemon';
const DRY_RUN = args.includes('--dry-run');
const SINGLE_NICHE = args.includes('--niche') ? args[args.indexOf('--niche') + 1] : '';

// ── Safari sweep lock ─────────────────────────────────────────────────────────
function acquireLock(timeoutMs = 120_000) {
  const lockExpiry = Date.now() + timeoutMs;
  try {
    if (fs.existsSync(SAFARI_LOCK)) {
      const lock = JSON.parse(fs.readFileSync(SAFARI_LOCK, 'utf8'));
      if (lock.expires > Date.now()) return false;
    }
    fs.writeFileSync(SAFARI_LOCK, JSON.stringify({
      pid: process.pid, platform: 'twitter',
      acquired: new Date().toISOString(), expires: lockExpiry,
    }));
    return true;
  } catch { return false; }
}

function releaseLock() {
  try {
    const lock = JSON.parse(fs.readFileSync(SAFARI_LOCK, 'utf8'));
    if (lock.pid === process.pid) fs.unlinkSync(SAFARI_LOCK);
  } catch { /* non-fatal */ }
}

// ── Jittered interval (±15min) ────────────────────────────────────────────────
function jitteredIntervalMs() {
  const jitterMs = (Math.random() * 30 - 15) * 60 * 1000;
  return Math.max(BASE_INTERVAL_MS + jitterMs, 30 * 60 * 1000);
}

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

// ── State management ──────────────────────────────────────────────────────────
function today() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function readState() {
  try {
    const s = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    // Reset daily counts if it's a new day
    if (s.date !== today()) {
      s.date = today();
      s.dailyTotal = 0;
      s.perNiche = {};
    }
    // Evict old seen URLs (older than TTL_DAYS)
    const cutoff = Date.now() - SEEN_URL_TTL_DAYS * 24 * 60 * 60 * 1000;
    if (s.seenUrls && typeof s.seenUrls === 'object' && !Array.isArray(s.seenUrls)) {
      for (const [url, ts] of Object.entries(s.seenUrls)) {
        if ((ts as number) < cutoff) delete s.seenUrls[url];
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
      seenUrls: {},      // url → timestamp
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
    console.log(`[tw-sweep] ${msg}`);
  }
  try { fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n'); } catch { /* non-fatal */ }
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────
async function twPost(path, body) {
  try {
    const res = await fetch(`${TW_COMMENTS_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TW_API_TOKEN}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90_000),
    });
    return await res.json();
  } catch (e) {
    return { error: String(e) };
  }
}

async function twGet(path) {
  try {
    const res = await fetch(`${TW_COMMENTS_URL}${path}`, {
      headers: { 'Authorization': `Bearer ${TW_API_TOKEN}` },
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

// ── Active hours check ────────────────────────────────────────────────────────
function isActiveHours() {
  const h = new Date().getHours();
  return h >= ACTIVE_HOUR_START && h < ACTIVE_HOUR_END;
}

// ── Preflight ─────────────────────────────────────────────────────────────────
async function preflight() {
  console.log('=== Twitter Comment Sweep Preflight ===\n');

  const health = await twGet('/health');
  if (health.error || health.status !== 'ok') {
    console.log(`FAIL: twitter-comments :3007 — ${health.error || health.status}`);
    return false;
  }
  console.log(`OK: twitter-comments :3007 — ${health.status}`);

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
  // Health gate
  const health = await twGet('/health');
  if (health.error || health.status !== 'ok') {
    log(`Service not ready (${health.error || health.status}) — skipping sweep`);
    return;
  }

  const state = readState();

  // Hard daily cap check
  if (state.dailyTotal >= DAILY_CAP) {
    log(`Daily cap hit (${state.dailyTotal}/${DAILY_CAP}) — skipping until midnight`);
    return;
  }

  const remaining = DAILY_CAP - state.dailyTotal;
  const runMax = Math.min(MAX_PER_RUN, remaining);

  // Build niche list (filter if --niche flag used)
  let niches = loadNiches();
  if (SINGLE_NICHE) niches = niches.filter(n => n.name === SINGLE_NICHE);
  if (!niches.length) {
    log(`No niches to process${SINGLE_NICHE ? ` (unknown niche: ${SINGLE_NICHE})` : ''}`);
    return;
  }

  // Per-niche daily cap: each niche gets up to ceil(DAILY_CAP / niches.length)
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

  // Acquire Safari lock — wait up to 3min for other sweeps to finish
  let lockAcquired = false;
  for (let attempt = 0; attempt < 18; attempt++) {
    if (acquireLock(10 * 60 * 1000)) { lockAcquired = true; break; }
    log('Safari lock held by another sweep — waiting 10s...');
    await new Promise(r => setTimeout(r, 10_000));
  }
  if (!lockAcquired) {
    log('Could not acquire Safari lock after 3min — skipping sweep');
    return;
  }

  log(`Starting sweep: ${nichesToRun.length} niches, max ${runMax} total, dryRun=${DRY_RUN}`);
  state.lastRun = new Date().toISOString();

  // Call the comment-sweep endpoint
  const sweepResult = await twPost('/api/twitter/comment-sweep', {
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
    releaseLock();
    return;
  }

  // Update state with results
  const commented = sweepResult.totalCommented || 0;
  state.dailyTotal += commented;
  state.totalAllTime = (state.totalAllTime || 0) + commented;

  // Record newly seen URLs with timestamp
  for (const url of sweepResult.newlyCommentedUrls || []) {
    state.seenUrls[url] = Date.now();
  }

  // Update per-niche counts
  for (const nicheResult of sweepResult.nicheResults || []) {
    state.perNiche[nicheResult.niche] = (state.perNiche[nicheResult.niche] || 0)
      + nicheResult.commented.length;
  }

  writeState(state);
  releaseLock();

  // Log summary
  log(sweepResult.summary || `${commented} comments posted`, {
    dryRun: DRY_RUN,
    dailyTotal: state.dailyTotal,
    dailyCap: DAILY_CAP,
    nicheBreakdown: Object.fromEntries(
      (sweepResult.nicheResults || []).map(n => [n.name, n.commented.length])
    ),
    feedComments: sweepResult.feedResults?.length || 0,
  });

  // Log per-niche detail
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
  log(`Twitter Comment Sweep daemon started (PID ${process.pid})`);
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
  console.error(`[tw-sweep] Fatal: ${e.message}`);
  process.exit(1);
});
