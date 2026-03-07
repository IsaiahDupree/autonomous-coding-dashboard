#!/usr/bin/env node

/**
 * Multi-Platform Prospect Pipeline Daemon
 * ========================================
 * Runs 24/7 — every 30 min it:
 *   1. Rotates through platforms: IG → TT → TW → Threads
 *   2. Searches using keywords from business-goals.json content_niches
 *   3. Scores prospects with unified ICP scorer (10-point)
 *   4. Deduplicates against CRMLite, creates new contacts
 *   5. Queues qualified prospects for human DM approval (NEVER auto-sends)
 *
 * Usage:
 *   node harness/prospect-pipeline.js                # run 24/7
 *   node harness/prospect-pipeline.js --once         # single cycle, then exit
 *   node harness/prospect-pipeline.js --test         # preflight only
 *   node harness/prospect-pipeline.js --platform ig  # single platform cycle
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_DIR = __dirname;

// ── File paths ──────────────────────────────────────────────────────────────
const STATE_FILE  = path.join(HARNESS_DIR, 'prospect-pipeline-state.json');
const LOG_FILE    = path.join(HARNESS_DIR, 'prospect-pipeline-log.ndjson');
const LOGS_DIR    = path.join(HARNESS_DIR, 'logs');
const GOALS_FILE  = '/Users/isaiahdupree/Documents/Software/business-goals.json';
const ACTP_ENV    = '/Users/isaiahdupree/Documents/Software/actp-worker/.env';
const HOME_ENV    = `${process.env.HOME}/.env`;

// Per-platform DM queue files
const QUEUE_FILES = {
  ig:      path.join(HARNESS_DIR, 'prospect-ig-queue.json'),
  tt:      path.join(HARNESS_DIR, 'prospect-tt-queue.json'),
  tw:      path.join(HARNESS_DIR, 'prospect-tw-queue.json'),
  threads: path.join(HARNESS_DIR, 'prospect-threads-queue.json'),
};

// ── Platform service config ─────────────────────────────────────────────────
// Each service has its own default token (check server.ts VALID_TOKEN/API_TOKEN)
export const PLATFORMS = {
  // IG: navigate to hashtag page (INSTAGRAM_API_TOKEN || 'test-token')
  ig:      { name: 'Instagram', port: 3005, searchPath: '/api/instagram/navigate',   searchKey: 'url',     prefix: 'https://www.instagram.com/explore/tags/', token: process.env.INSTAGRAM_API_TOKEN || 'test-token' },
  // TikTok: search by keyword (port 3006, down — will be skipped if DOWN)
  tt:      { name: 'TikTok',    port: 3006, searchPath: '/api/tiktok/search/keyword', searchKey: 'keyword', prefix: '', token: process.env.TIKTOK_API_TOKEN || 'test-token' },
  // Twitter comments :3007 — API_TOKEN || 'test-token-12345'
  tw:      { name: 'Twitter',   port: 3007, searchPath: '/api/twitter/search',        searchKey: 'query',   prefix: '', token: process.env.TWITTER_API_TOKEN || 'test-token-12345' },
  // Threads :3004 — THREADS_AUTH_TOKEN || 'threads-local-dev-token'
  threads: { name: 'Threads',   port: 3004, searchPath: '/api/threads/search',        searchKey: 'query',   prefix: '', token: process.env.THREADS_AUTH_TOKEN || process.env.AUTH_TOKEN || 'threads-local-dev-token' },
};

const PLATFORM_ORDER = ['ig', 'tt', 'tw', 'threads'];

// ── Config ───────────────────────────────────────────────────────────────────
const CRMLITE_URL   = 'https://crmlite-isaiahduprees-projects.vercel.app';
const CYCLE_MS      = 30 * 60 * 1000;   // 30 minutes
const ICP_THRESHOLD = 6;

const args = process.argv.slice(2);
function getArg(name, fallback) {
  const idx = args.indexOf(name);
  return (idx !== -1 && args[idx + 1] !== undefined) ? args[idx + 1] : String(fallback);
}
const MODE = args.includes('--once') ? 'once' : args.includes('--test') ? 'test' : 'daemon';
const SINGLE_PLATFORM = args.includes('--platform') ? getArg('--platform', '') : '';

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
loadEnvFile(ACTP_ENV);  // loads last so real CRMLITE_API_KEY overrides placeholder

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

// ── Strategy config from business-goals.json content_niches ─────────────────
export function buildSearchTerms(goals) {
  const niches = goals?.content?.niches || ['ai_automation', 'saas_growth', 'content_creation', 'digital_marketing', 'creator_economy'];
  const nicheToKeywords = {
    ai_automation:     ['AI automation', 'AI workflow', 'automate business'],
    saas_growth:       ['SaaS founder', 'SaaS growth', 'startup scaling'],
    content_creation:  ['content creator tools', 'creator economy'],
    digital_marketing: ['digital marketing AI', 'marketing automation'],
    creator_economy:   ['solopreneur AI', 'indie maker'],
  };
  const terms = [];
  for (const niche of niches) {
    const kws = nicheToKeywords[niche] || [niche.replace(/_/g, ' ')];
    terms.push(...kws);
  }
  return terms;
}

export function buildPlatformSearches(terms, platform) {
  const cfg = PLATFORMS[platform];
  if (!cfg) return [];
  return terms.map(term => {
    const value = platform === 'ig' ? `${cfg.prefix}${term.replace(/\s+/g, '')}` : term;
    return { [cfg.searchKey]: value };
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function log(msg) {
  const ts = new Date().toISOString();
  const line = `${ts} [prospect-pipeline] ${msg}`;
  console.log(line);
  if (process.stdout.isTTY) {
    try {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
      fs.appendFileSync(path.join(LOGS_DIR, 'prospect-pipeline.log'), line + '\n');
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

async function platformPost(platform, searchBody, ms = 30000) {
  const cfg = PLATFORMS[platform];
  if (!cfg) return { ok: false, status: 0, error: `unknown platform: ${platform}` };
  const url = `http://localhost:${cfg.port}${cfg.searchPath}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cfg.token}`,
      },
      body: JSON.stringify(searchBody),
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

// ── Unified ICP Scorer (10-point) ───────────────────────────────────────────
export function scoreProspect(profile, platform) {
  let score = 0;
  const reasons = [];

  const text = [
    profile.name || profile.username || profile.display_name || '',
    profile.bio || profile.description || profile.headline || '',
    profile.company || '',
    profile.post_text || '',  // tweet/post content — key signal for Twitter/Threads
  ].join(' ').toLowerCase();

  // Tech/software signals (3 points)
  if (/software|saas|tech|ai|app|platform|startup|engineering|automation|digital|product|api|cloud/.test(text)) {
    score += 3; reasons.push('tech/software signal');
  }

  // Founder/exec role (2 points)
  if (/founder|co-founder|ceo|cto|owner|director|head of|vp |chief/.test(text)) {
    score += 2; reasons.push('founder/exec role');
  }

  // AI/automation signals (2 points)
  if (/ai|automation|machine learning|llm|gpt|workflow|automate|chatbot|no-code|low-code/.test(text)) {
    score += 2; reasons.push('AI/automation signal');
  }

  // Has company/brand (1 point)
  if (profile.company || /\bat\b|\@/.test(profile.bio || profile.headline || '')) {
    score += 1; reasons.push('has company');
  }

  // Revenue/growth signals (1 point)
  if (/arr|revenue|mrr|raised|series|growth|scale|customers|users|k followers|k subs/.test(text)) {
    score += 1; reasons.push('revenue/growth signal');
  }

  // Engagement/influence signals (1 point)
  const followers = profile.followers_count || profile.follower_count || 0;
  if (followers > 1000) {
    score += 1; reasons.push(`${followers} followers`);
  }

  return { score: Math.min(score, 10), reasons };
}

// ── Extract profiles from platform-specific response schemas ─────────────────
export function extractProfiles(data, platform) {
  const profiles = [];
  try {
    // Each platform may return different schemas — handle gracefully
    let items = [];
    if (Array.isArray(data)) {
      items = data;
    } else if (Array.isArray(data?.results)) {
      items = data.results;
    } else if (Array.isArray(data?.tweets)) {
      items = data.tweets;
    } else if (Array.isArray(data?.posts)) {
      items = data.posts;
    } else if (Array.isArray(data?.users)) {
      items = data.users;
    } else if (Array.isArray(data?.data)) {
      items = data.data;
    } else if (data?.result && Array.isArray(data.result)) {
      items = data.result;
    }

    for (const item of items) {
      // Twitter returns author as string + handle as "@handle"
      const rawHandle = item.handle || '';
      const rawUsername = item.username || item.user?.username || (typeof item.author === 'string' ? '' : item.author?.username) || rawHandle.replace(/^@/, '') || '';
      const rawDisplayName = item.display_name || item.name || item.user?.name || (typeof item.author === 'string' ? item.author : item.author?.name) || item.fullName || '';
      const profile = {
        platform,
        username:     rawUsername,
        display_name: rawDisplayName,
        bio:          item.bio || item.description || item.user?.bio || item.author?.bio || '',
        followers_count: item.followers_count || item.follower_count || item.user?.followers_count || 0,
        profile_url:  item.profile_url || item.profileUrl || item.url || '',
        company:      item.company || '',
        post_text:    item.text || item.caption || item.content || '',
      };
      // Skip items with no username
      if (!profile.username && !profile.display_name) continue;
      // Build profile_url if missing
      if (!profile.profile_url && profile.username) {
        if (platform === 'ig') profile.profile_url = `https://www.instagram.com/${profile.username}/`;
        else if (platform === 'tt') profile.profile_url = `https://www.tiktok.com/@${profile.username}`;
        else if (platform === 'tw') profile.profile_url = `https://x.com/${profile.username}`;
        else if (platform === 'threads') profile.profile_url = `https://www.threads.net/@${profile.username}`;
      }
      profiles.push(profile);
    }
  } catch (e) {
    log(`  extractProfiles error (${platform}): ${e.message}`);
  }
  return profiles;
}

// ── CRMLite dedup + upsert ──────────────────────────────────────────────────
async function crmDedup(username, platform) {
  if (!CRMLITE_KEY) return { exists: false, contact_id: null };
  try {
    const res = await fetchWithTimeout(
      `${CRMLITE_URL}/api/contacts?search=${encodeURIComponent(username)}&platform=${platform}&limit=5`,
      { headers: { 'x-api-key': CRMLITE_KEY, 'Content-Type': 'application/json' } },
      5000
    );
    if (!res?.ok) return { exists: false, contact_id: null };
    const data = await res.json();
    const contacts = data.contacts || [];
    const normalizedUsername = username.toLowerCase();
    for (const c of contacts) {
      const accts = c.crm_platform_accounts || c.platform_accounts || [];
      const match = accts.find(a => a.username?.toLowerCase() === normalizedUsername);
      if (match) return { exists: true, contact_id: c.id };
    }
    return { exists: false, contact_id: null };
  } catch {
    return { exists: false, contact_id: null };
  }
}

async function crmUpsert(prospect, icpScore, icpReasons) {
  if (!CRMLITE_KEY) return { synced: false, reason: 'no API key' };

  const notes = [
    `ICP Score: ${icpScore}/10`,
    `Reasons: ${icpReasons.join(', ')}`,
    `Bio: ${(prospect.bio || '').slice(0, 200)}`,
    `Followers: ${prospect.followers_count || 0}`,
    `Platform: ${prospect.platform}`,
    `Auto-added by Prospect Pipeline | ${new Date().toISOString()}`,
  ].filter(Boolean).join('\n');

  const body = {
    display_name: prospect.display_name || prospect.username,
    pipeline_stage: 'first_touch',
    notes,
    tags: [prospect.platform, 'icp-qualified', 'automated', `icp-${icpScore}`],
    platform_accounts: [{ platform: prospect.platform, username: prospect.username, is_primary: true }],
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

// ── State / Queue management ────────────────────────────────────────────────
function loadState() {
  return readJson(STATE_FILE, {
    running: false,
    paused: false,
    cycleCount: 0,
    platformCursor: 0,
    stats: {
      ig:      { found: 0, qualified: 0, synced: 0, queued: 0 },
      tt:      { found: 0, qualified: 0, synced: 0, queued: 0 },
      tw:      { found: 0, qualified: 0, synced: 0, queued: 0 },
      threads: { found: 0, qualified: 0, synced: 0, queued: 0 },
    },
    lastCycleAt: null,
    nextCycleAt: null,
    startedAt: null,
  });
}

function saveState(state) {
  try { writeJson(STATE_FILE, state); } catch { /* non-fatal */ }
}

function loadQueue(platform) {
  return readJson(QUEUE_FILES[platform], []);
}

function saveQueue(platform, queue) {
  writeJson(QUEUE_FILES[platform], queue);
}

function isAlreadyQueued(username, platform) {
  const queue = loadQueue(platform);
  return queue.some(item => item.prospect?.username?.toLowerCase() === username.toLowerCase());
}

// ── Search one platform ─────────────────────────────────────────────────────
async function searchPlatform(platform, goals, state) {
  const cfg = PLATFORMS[platform];
  log(`── Searching ${cfg.name} ──`);

  const cycleEntry = {
    ts: new Date().toISOString(),
    platform,
    service_up: false,
    searches: 0,
    found: 0,
    qualified: 0,
    crm_synced: 0,
    queued: 0,
    errors: [],
  };

  // Health check
  const health = await fetchWithTimeout(`http://localhost:${cfg.port}/health`, {}, 3000);
  cycleEntry.service_up = health?.ok === true;
  if (!cycleEntry.service_up) {
    log(`  ${cfg.name} service DOWN on port ${cfg.port}`);
    cycleEntry.errors.push(`${cfg.name} service DOWN`);
    return cycleEntry;
  }
  log(`  ${cfg.name} service UP`);

  // Build search terms from business goals
  const terms = buildSearchTerms(goals);
  const searches = buildPlatformSearches(terms, platform);
  // Limit to 3 searches per platform per cycle to avoid rate limits
  const searchSubset = searches.slice(0, 3);

  const allProfiles = new Map(); // username → profile

  for (const searchBody of searchSubset) {
    const searchTerm = Object.values(searchBody)[0];
    log(`  Search: "${searchTerm}"`);
    cycleEntry.searches++;

    const res = await platformPost(platform, searchBody);

    if (!res.ok) {
      const errMsg = res.error || JSON.stringify(res.data || {}).slice(0, 80);
      log(`    Error: ${errMsg}`);
      cycleEntry.errors.push(`${searchTerm}: ${errMsg}`);
      continue;
    }

    const profiles = extractProfiles(res.data, platform);
    let newCount = 0;
    for (const p of profiles) {
      const key = (p.username || p.display_name).toLowerCase();
      if (!allProfiles.has(key)) {
        allProfiles.set(key, p);
        newCount++;
      }
    }
    log(`    ${profiles.length} results, ${newCount} new unique`);

    // Pause between searches
    await new Promise(r => setTimeout(r, 2000));
  }

  cycleEntry.found = allProfiles.size;
  log(`  ${cfg.name} total unique: ${allProfiles.size}`);

  // Score, dedup, sync, queue
  const queue = loadQueue(platform);

  for (const [key, prospect] of allProfiles) {
    // Skip if already queued locally
    if (isAlreadyQueued(prospect.username || prospect.display_name, platform)) continue;

    const { score, reasons } = scoreProspect(prospect, platform);
    if (score < ICP_THRESHOLD) continue;

    cycleEntry.qualified++;

    // CRM dedup
    const dedup = await crmDedup(prospect.username || prospect.display_name, platform);
    if (dedup.exists) {
      log(`    Skip (in CRM): ${prospect.display_name || prospect.username}`);
      continue;
    }

    // Push to CRMLite
    const syncResult = await crmUpsert(prospect, score, reasons);
    if (syncResult.synced) {
      cycleEntry.crm_synced++;
      log(`    CRM sync: ${prospect.display_name} → contact ${syncResult.contact_id}`);
    } else {
      log(`    CRM sync failed: ${prospect.display_name} — ${syncResult.reason}`);
    }

    // Queue for DM approval (never auto-send)
    const displayName = prospect.display_name || prospect.username;
    const firstName = displayName.split(' ')[0] || 'there';
    const painPoint = (goals?.icp?.pain_points || ['manual execution work'])[0];
    const draftedMsg = `Hi ${firstName}, I noticed your work in ${prospect.bio ? prospect.bio.slice(0, 50) : 'AI/tech'}. I help founders cut the ${painPoint} by building custom AI automations — typically saves 8-15 hours/week. Would a quick 15-min chat make sense? — Isaiah`;

    const queueItem = {
      id: `${platform}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      queued_at: new Date().toISOString(),
      status: 'pending_approval',
      prospect: {
        username: prospect.username,
        display_name: prospect.display_name,
        bio: (prospect.bio || '').slice(0, 300),
        followers_count: prospect.followers_count,
        profile_url: prospect.profile_url,
        platform,
        icp_score: score,
        icp_reasons: reasons,
      },
      crm_id: syncResult.contact_id || null,
      crm_synced: syncResult.synced,
      drafted_message: draftedMsg,
    };
    queue.push(queueItem);
    cycleEntry.queued++;
    log(`    Queued: ${displayName} (ICP ${score}/10)`);
  }

  saveQueue(platform, queue);

  // Update stats
  if (!state.stats) state.stats = {};
  if (!state.stats[platform]) state.stats[platform] = { found: 0, qualified: 0, synced: 0, queued: 0 };
  state.stats[platform].found += cycleEntry.found;
  state.stats[platform].qualified += cycleEntry.qualified;
  state.stats[platform].synced += cycleEntry.crm_synced;
  state.stats[platform].queued += cycleEntry.queued;

  return cycleEntry;
}

// ── One full cycle ──────────────────────────────────────────────────────────
async function runCycle(goals, state) {
  const cycleNum = state.cycleCount + 1;
  const cycleStart = Date.now();
  log(`═══ Cycle #${cycleNum} starting ═══`);

  // Determine which platform to search this cycle (rotate)
  let platformsThisCycle;
  if (SINGLE_PLATFORM && PLATFORMS[SINGLE_PLATFORM]) {
    platformsThisCycle = [SINGLE_PLATFORM];
  } else {
    // Rotate: one platform per cycle for gentler rate limiting
    const cursor = state.platformCursor || 0;
    platformsThisCycle = [PLATFORM_ORDER[cursor % PLATFORM_ORDER.length]];
    state.platformCursor = (cursor + 1) % PLATFORM_ORDER.length;
  }

  const cycleResults = [];
  for (const platform of platformsThisCycle) {
    try {
      const result = await searchPlatform(platform, goals, state);
      cycleResults.push(result);
      appendLog(result);
    } catch (e) {
      log(`  Platform ${platform} error: ${e.message}`);
      appendLog({ ts: new Date().toISOString(), platform, error: e.message });
    }
  }

  state.cycleCount++;
  state.lastCycleAt = new Date().toISOString();
  state.nextCycleAt = new Date(Date.now() + CYCLE_MS).toISOString();
  saveState(state);

  const elapsed = ((Date.now() - cycleStart) / 1000).toFixed(1);
  const totalQ = cycleResults.reduce((s, r) => s + (r.queued || 0), 0);
  const totalS = cycleResults.reduce((s, r) => s + (r.crm_synced || 0), 0);
  log(`═══ Cycle #${cycleNum} done in ${elapsed}s | platforms: ${platformsThisCycle.join(',')} | synced: ${totalS} | queued: ${totalQ} ═══`);

  if (totalQ > 0) {
    const breakdown = cycleResults
      .filter(r => r.queued > 0)
      .map(r => `${r.platform.toUpperCase()}: ${r.queued} queued`)
      .join(' | ');
    await sendTelegram(
      `<b>Prospect Pipeline — New Prospects</b>\n` +
      `${totalQ} prospects added | ${totalS} synced to CRMLite\n` +
      `${breakdown}\n` +
      `Use /status or dashboard to review`
    );
  }

  return cycleResults;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  log(`Starting Prospect Pipeline (mode: ${MODE})`);
  log(`CRMLite sync: ${CRMLITE_KEY ? 'ENABLED' : 'DISABLED (no CRMLITE_API_KEY)'}`);

  // Initialize per-platform queue files
  for (const [platform, fp] of Object.entries(QUEUE_FILES)) {
    if (!fs.existsSync(fp)) {
      writeJson(fp, []);
    }
  }

  let goals = readJson(GOALS_FILE, {});
  if (!goals || Object.keys(goals).length === 0) {
    log('WARNING: No business goals found at ' + GOALS_FILE);
    goals = { content: { niches: ['ai_automation', 'saas_growth'] }, icp: { pain_points: ['manual execution work'] } };
  } else {
    const niches = goals?.content?.niches || [];
    log(`Goals loaded: ${niches.length} content niches → ${buildSearchTerms(goals).length} search terms`);
  }

  if (MODE === 'test') {
    const platformHealth = {};
    for (const [key, cfg] of Object.entries(PLATFORMS)) {
      const health = await fetchWithTimeout(`http://localhost:${cfg.port}/health`, {}, 3000);
      platformHealth[key] = { name: cfg.name, port: cfg.port, up: health?.ok === true };
    }
    const queueStats = {};
    for (const [platform, fp] of Object.entries(QUEUE_FILES)) {
      const q = readJson(fp, []);
      queueStats[platform] = {
        total: q.length,
        pending: q.filter(i => i.status === 'pending_approval').length,
        approved: q.filter(i => i.status === 'approved').length,
      };
    }
    const preflight = {
      platforms: platformHealth,
      crmlite_key: !!CRMLITE_KEY,
      goals_loaded: !!goals,
      queues: queueStats,
      state: loadState(),
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

  while (true) {
    const currentState = loadState();
    if (currentState.paused) {
      log('Paused — waiting 60s...');
      await new Promise(r => setTimeout(r, 60000));
      continue;
    }

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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(e => {
    console.error('Fatal:', e.message);
    try {
      const state = readJson(STATE_FILE, {});
      state.running = false;
      writeJson(STATE_FILE, state);
    } catch { /* non-fatal */ }
    process.exit(1);
  });
}
