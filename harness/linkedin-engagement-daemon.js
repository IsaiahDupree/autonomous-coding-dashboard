#!/usr/bin/env node

/**
 * LinkedIn Engagement Daemon
 * ==========================
 * Runs 24/7 — every 2 hours it:
 *   1. Searches LinkedIn for posts matching ICP keywords
 *   2. Extracts commenters from those posts
 *   3. Scores prospects, deduplicates against local queue + CRMLite
 *   4. Pushes qualified prospects to CRMLite (pipeline_stage: "first_touch")
 *   5. Adds them to the local DM approval queue (NEVER auto-sends)
 *
 * DMs are only sent after human approval via:
 *   - Dashboard: POST /api/linkedin/engagement/queue/approve
 *   - CLI:       (manual review)
 *
 * Usage:
 *   node harness/linkedin-engagement-daemon.js                 # run 24/7
 *   node harness/linkedin-engagement-daemon.js --once          # single cycle, then exit
 *   node harness/linkedin-engagement-daemon.js --test          # preflight only
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_DIR = __dirname;

// ── File paths ──────────────────────────────────────────────────────────────
const STATE_FILE    = path.join(HARNESS_DIR, 'linkedin-engagement-state.json');
const LOG_FILE      = path.join(HARNESS_DIR, 'linkedin-engagement-log.ndjson');
const QUEUE_FILE    = path.join(HARNESS_DIR, 'linkedin-engagement-queue.json');
const LOGS_DIR      = path.join(HARNESS_DIR, 'logs');
const GOALS_FILE    = '/Users/isaiahdupree/Documents/Software/business-goals.json';
const SAFARI_ENV    = '/Users/isaiahdupree/Documents/Software/Safari Automation/.env';
const ACTP_ENV      = '/Users/isaiahdupree/Documents/Software/actp-worker/.env';
const HOME_ENV      = `${process.env.HOME}/.env`;
const POST_SCRAPER  = path.join(HARNESS_DIR, 'linkedin-post-scraper.js');

// ── Config ───────────────────────────────────────────────────────────────────
const CRMLITE_URL    = 'https://crmlite-isaiahduprees-projects.vercel.app';
const CYCLE_MS       = 2 * 60 * 60 * 1000;   // 2 hours
const ICP_THRESHOLD  = 6;

const args = process.argv.slice(2);
function getArg(name, fallback) {
  const idx = args.indexOf(name);
  return (idx !== -1 && args[idx + 1] !== undefined) ? args[idx + 1] : String(fallback);
}
const MODE = args.includes('--once') ? 'once' : args.includes('--test') ? 'test' : 'daemon';

// ── Rate limit state tracker (persisted to STATE_FILE) ───────────────────────
let rateLimitState = {
  messagesSentToday: 0,
  messagesSentThisHour: 0,
  lastResetDay: new Date().toDateString(),
  lastResetHour: new Date().getHours(),
};

function loadRateLimits() {
  try {
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    if (state.rateLimits) rateLimitState = { ...rateLimitState, ...state.rateLimits };
  } catch { /* first run */ }
}

function saveRateLimits() {
  try {
    let state = {};
    try { state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')); } catch { /* ok */ }
    fs.writeFileSync(STATE_FILE, JSON.stringify({ ...state, rateLimits: rateLimitState }, null, 2));
  } catch { /* non-fatal */ }
}

loadRateLimits();

function checkRateLimits() {
  const now = new Date();
  if (now.toDateString() !== rateLimitState.lastResetDay) {
    rateLimitState.messagesSentToday = 0;
    rateLimitState.lastResetDay = now.toDateString();
    saveRateLimits();
  }
  if (now.getHours() !== rateLimitState.lastResetHour) {
    rateLimitState.messagesSentThisHour = 0;
    rateLimitState.lastResetHour = now.getHours();
    saveRateLimits();
  }
  return rateLimitState.messagesSentToday < 20 && rateLimitState.messagesSentThisHour < 10;
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
loadEnvFile(HOME_ENV);
loadEnvFile(SAFARI_ENV);
loadEnvFile(ACTP_ENV);

const CRMLITE_KEY = process.env.CRMLITE_API_KEY || '';

// ── Helpers ───────────────────────────────────────────────────────────────────
function log(msg) {
  const ts = new Date().toISOString();
  const line = `${ts} [engagement-daemon] ${msg}`;
  console.log(line);
  if (process.stdout.isTTY) {
    try {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
      fs.appendFileSync(path.join(LOGS_DIR, 'linkedin-engagement-daemon.log'), line + '\n');
    } catch { /* non-fatal */ }
  }
}

function readJson(fp, fallback = null) {
  try { return JSON.parse(fs.readFileSync(fp, 'utf-8')); } catch { return fallback; }
}

function writeJson(fp, data) {
  fs.writeFileSync(fp, JSON.stringify(data, null, 2));
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

  const slug = prospect.profileUrl?.match(/linkedin\.com\/in\/([^/?]+)/)?.[1] || prospect.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown';
  const parsed = parseHeadline(prospect.headline);
  const notes = [
    `ICP Score: ${icpScore}/10`,
    `Reasons: ${icpReasons.join(', ')}`,
    `Headline: ${prospect.headline || ''}`,
    `Source: Post engagement (${prospect.engagementType || 'comment'})`,
    `Post: ${prospect.postUrl || ''}`,
    `Role: ${parsed.role}`,
    `Company: ${parsed.company}`,
    `Auto-added by LinkedIn Engagement Daemon | ${new Date().toISOString()}`,
  ].filter(Boolean).join('\n');

  const body = {
    display_name: prospect.name,
    pipeline_stage: 'first_touch',
    notes,
    tags: ['linkedin', 'icp-qualified', 'automated', 'post-engagement', `icp-${icpScore}`],
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
  return readJson(STATE_FILE, {
    running: false,
    paused: false,
    cycleCount: 0,
    seenProfiles: [],
    totalCommentersFound: 0,
    totalSyncedCrm: 0,
    totalQueuedForDm: 0,
    lastCycleAt: null,
    nextCycleAt: null,
    startedAt: null,
    keywordStats: {},
  });
}

function saveState(state) {
  try { writeJson(STATE_FILE, state); } catch { /* non-fatal */ }
}

function loadQueue() {
  return readJson(QUEUE_FILE, []);
}

function saveQueue(queue) {
  writeJson(QUEUE_FILE, queue);
}

function isAlreadyQueued(profileUrl, queue) {
  return queue.some(item => item.prospect?.profileUrl === profileUrl);
}

// ── Spawn post scraper ──────────────────────────────────────────────────────
async function scrapePostCommenters(keyword, maxPosts = 5, maxCommenters = 20) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [POST_SCRAPER,
      '--keyword', keyword,
      '--max-posts', String(maxPosts),
      '--max-commenters', String(maxCommenters),
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    let stdout = '';
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { const line = d.toString().trim(); if (line) log(`  [scraper] ${line}`); });

    const timer = setTimeout(() => { child.kill(); resolve({ ok: false, results: [], error: 'timeout after 120s' }); }, 120000);

    child.on('close', () => {
      clearTimeout(timer);
      try {
        const data = JSON.parse(stdout.trim() || '[]');
        if (Array.isArray(data)) resolve({ ok: true, results: data });
        else resolve({ ok: false, results: [], error: data.error || 'unexpected output' });
      } catch {
        resolve({ ok: false, results: [], error: `parse error: ${stdout.slice(0, 80)}` });
      }
    });
  });
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
  log(`--- Cycle #${cycleNum} starting ---`);

  // Extract keywords from goals
  const keywords = goals.content?.niches || ['AI automation', 'SaaS growth', 'content creation', 'digital marketing'];
  log(`Keywords for this cycle: ${keywords.join(', ')}`);

  const queue = loadQueue();
  const seenSet = new Set(state.seenProfiles || []);

  const cycleEntry = {
    ts: new Date().toISOString(),
    cycle: cycleNum,
    keywords,
    totalCommenters: 0,
    newCommenters: 0,
    qualified: 0,
    crm_synced: 0,
    queued_for_dm: 0,
    errors: [],
  };

  for (const keyword of keywords) {
    log(`Scraping posts for keyword: "${keyword}"`);
    const result = await scrapePostCommenters(keyword, 5, 20);

    if (!result.ok) {
      log(`  Scraper error: ${result.error}`);
      cycleEntry.errors.push(`${keyword}: ${result.error}`);
      continue;
    }

    const commenters = result.results;
    cycleEntry.totalCommenters += commenters.length;
    log(`  Found ${commenters.length} commenters`);

    // Update keyword stats
    if (!state.keywordStats[keyword]) state.keywordStats[keyword] = { found: 0, queued: 0 };
    state.keywordStats[keyword].found += commenters.length;

    // Filter already-seen profiles
    const newCommenters = commenters.filter(c => !seenSet.has(c.profileUrl));
    cycleEntry.newCommenters += newCommenters.length;
    log(`  New (unseen): ${newCommenters.length}`);

    for (const commenter of newCommenters) {
      // Mark as seen
      seenSet.add(commenter.profileUrl);

      // Score
      const { score, reasons } = scoreProspect(commenter);
      if (score < ICP_THRESHOLD) continue;

      cycleEntry.qualified++;

      // CRM dedup
      const slug = commenter.profileUrl?.match(/linkedin\.com\/in\/([^/?]+)/)?.[1] || commenter.name;
      const dedup = await crmDedup(slug);
      if (dedup.exists) {
        log(`  Skip (already in CRM): ${commenter.name}`);
        continue;
      }

      // Skip if already in local queue
      if (isAlreadyQueued(commenter.profileUrl, queue)) {
        log(`  Skip (already queued): ${commenter.name}`);
        continue;
      }

      // Push to CRMLite
      const syncResult = await crmUpsert(commenter, score, reasons, goals);
      if (syncResult.synced) {
        cycleEntry.crm_synced++;
        log(`  CRM sync: ${commenter.name} -> contact ${syncResult.contact_id}`);
      } else {
        log(`  CRM sync failed: ${commenter.name} -- ${syncResult.reason}`);
      }

      // Build queue item
      const parsed = parseHeadline(commenter.headline);
      const firstName = commenter.name?.split(' ')[0] || 'there';
      const contextLine = parsed.role && parsed.company
        ? `your work as ${parsed.role} at ${parsed.company}`
        : parsed.role ? `your role as ${parsed.role}`
        : parsed.company ? `what you're building at ${parsed.company}`
        : 'your background in AI automation';
      const painPoint = (goals.icp?.pain_points || ['manual execution work'])[0];
      const draftedMsg = `Hi ${firstName}, I noticed ${contextLine}. I help founders cut the ${painPoint} by building custom AI automations — typically saves 8-15 hours/week. Would a quick 15-min chat make sense? — Isaiah`;

      const queueItem = {
        id: `li-eng-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        queued_at: new Date().toISOString(),
        cycle: cycleNum,
        status: 'pending_approval',
        prospect: {
          name: commenter.name,
          profileUrl: commenter.profileUrl,
          headline: commenter.headline,
          role: parsed.role,
          company: parsed.company,
          icp_score: score,
          icp_reasons: reasons,
        },
        crm_id: syncResult.contact_id || null,
        crm_synced: syncResult.synced,
        drafted_message: draftedMsg,
        source: 'post_engagement',
        postUrl: commenter.postUrl,
        engagementType: commenter.engagementType || 'comment',
      };
      queue.push(queueItem);
      cycleEntry.queued_for_dm++;
      state.keywordStats[keyword].queued++;
      log(`  Queued for DM approval: ${commenter.name} (ICP ${score}/10)`);
    }

    // Pause between keywords
    if (keywords.indexOf(keyword) < keywords.length - 1) {
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  saveQueue(queue);
  appendLog(cycleEntry);

  state.cycleCount++;
  state.seenProfiles = Array.from(seenSet);
  state.totalCommentersFound += cycleEntry.totalCommenters;
  state.totalSyncedCrm += cycleEntry.crm_synced;
  state.totalQueuedForDm += cycleEntry.queued_for_dm;
  state.lastCycleAt = new Date().toISOString();
  state.nextCycleAt = new Date(Date.now() + CYCLE_MS).toISOString();
  saveState(state);

  const elapsed = ((Date.now() - cycleStart) / 1000).toFixed(1);
  log(`--- Cycle #${cycleNum} done in ${elapsed}s | commenters: ${cycleEntry.totalCommenters} | qualified: ${cycleEntry.qualified} | CRM synced: ${cycleEntry.crm_synced} | DM queue: ${cycleEntry.queued_for_dm} new ---`);
  return cycleEntry;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  log(`Starting LinkedIn Engagement Daemon (mode: ${MODE})`);
  log(`CRMLite sync: ${CRMLITE_KEY ? 'ENABLED' : 'DISABLED (no CRMLITE_API_KEY)'}`);

  // Load goals
  let goals = readJson(GOALS_FILE, {});
  if (!goals || Object.keys(goals).length === 0) {
    log('WARNING: No business goals found at ' + GOALS_FILE);
    goals = { revenue: { target_monthly_usd: 5000, current_monthly_usd: 0 }, icp: { pain_points: ['manual execution work'] } };
  } else {
    log(`Goals: $${goals.revenue?.target_monthly_usd}/mo target`);
  }

  if (MODE === 'test') {
    const queue = loadQueue();
    const state = loadState();
    const preflight = {
      post_scraper_exists: fs.existsSync(POST_SCRAPER),
      crmlite_key: !!CRMLITE_KEY,
      goals_loaded: !!goals,
      keywords: goals.content?.niches || ['AI automation', 'SaaS growth', 'content creation', 'digital marketing'],
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
