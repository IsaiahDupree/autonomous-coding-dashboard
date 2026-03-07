#!/usr/bin/env node
/**
 * linkedin-discovery.js — LinkedIn data mining test & prospect extractor
 *
 * Tests 5 discovery modes and optionally pushes results into linkedin-dm-queue.json:
 *   1. hashtag   — top posts + creators from a niche hashtag feed
 *   2. commenters — extract commenters from a specific post URL
 *   3. my-connections — scrape your own 1st-degree connections
 *   4. profile-connections — scrape a person's visible connection list
 *   5. search    — keyword people search (existing endpoint)
 *
 * Usage:
 *   node harness/linkedin-discovery.js --mode hashtag --tag aiautomation
 *   node harness/linkedin-discovery.js --mode commenters --post-url https://www.linkedin.com/posts/...
 *   node harness/linkedin-discovery.js --mode my-connections --limit 50
 *   node harness/linkedin-discovery.js --mode profile-connections --profile-url https://www.linkedin.com/in/garyvee/
 *   node harness/linkedin-discovery.js --mode search --keywords "AI automation founder"
 *   node harness/linkedin-discovery.js --mode hashtag --tag saas --add-to-queue
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Env loading (same chain as linkedin-daemon.js) ────────────────────────────
const ENV_OVERRIDE_KEYS = new Set(['CRMLITE_API_KEY', 'CRMLITE_URL']);
function loadEnvFile(filePath) {
  try {
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
    for (const line of lines) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (!m) continue;
      if (!process.env[m[1]] || ENV_OVERRIDE_KEYS.has(m[1])) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
      }
    }
  } catch { /* non-fatal */ }
}
loadEnvFile(`${process.env.HOME}/.env`);
loadEnvFile('/Users/isaiahdupree/Documents/Software/Safari Automation/.env');
loadEnvFile('/Users/isaiahdupree/Documents/Software/actp-worker/.env');

const LI = process.env.LINKEDIN_SERVICE_URL || 'http://localhost:3105';
const TOK = process.env.LINKEDIN_AUTH_TOKEN  || 'test-token-12345';
const QUEUE_FILE = path.join(__dirname, 'linkedin-dm-queue.json');
const CRMLITE_URL  = 'https://crmlite-isaiahduprees-projects.vercel.app';
const CRMLITE_KEY  = process.env.CRMLITE_API_KEY || '';
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT  = process.env.TELEGRAM_CHAT_ID   || '';

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag, fallback = '') => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};
const hasFlag = (flag) => args.includes(flag);

const MODE       = getArg('--mode', 'hashtag');
const TAG        = getArg('--tag', 'aiautomation');
const POST_URL   = getArg('--post-url', '');
const PROFILE_URL= getArg('--profile-url', '');
const KEYWORDS   = getArg('--keywords', 'AI automation founder SaaS');
const LIMIT      = parseInt(getArg('--limit', '20'), 10);
const ADD_QUEUE  = hasFlag('--add-to-queue');
const PAGE       = parseInt(getArg('--page', '1'), 10);

const log = (msg) => console.error(`[discovery] ${msg}`);

// ── CRMLite + Telegram helpers ────────────────────────────────────────────────
async function fetchWithTimeout(url, opts, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
  finally { clearTimeout(t); }
}

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

async function crmUpsert(prospect, score) {
  if (!CRMLITE_KEY) return { synced: false, reason: 'no API key' };
  const slug = prospect.profileUrl?.match(/linkedin\.com\/in\/([^/?]+)/)?.[1]
    || prospect.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown';
  const notes = [
    `ICP Score: ${score}/100`,
    `Headline: ${prospect.headline || ''}`,
    `Connection: ${prospect.connectionDegree || ''}`,
    `Auto-added by linkedin-discovery.js | ${new Date().toISOString()}`,
  ].filter(Boolean).join('\n');
  const body = {
    display_name: prospect.name,
    pipeline_stage: 'first_touch',
    notes,
    tags: ['linkedin', 'icp-qualified', 'discovery', `icp-${score}`],
    platform_accounts: [{ platform: 'linkedin', username: slug, is_primary: true }],
  };
  try {
    const res = await fetchWithTimeout(
      `${CRMLITE_URL}/api/contacts`,
      { method: 'POST', headers: { 'x-api-key': CRMLITE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(body) },
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

// ── HTTP helper ───────────────────────────────────────────────────────────────
async function call(method, path, body = null) {
  const opts = {
    method,
    headers: { Authorization: `Bearer ${TOK}`, 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${LI}${path}`, opts);
  const data = await r.json();
  if (!r.ok || data.error) {
    throw new Error(`${data.error || `HTTP ${r.status}`} at ${path}`);
  }
  return data;
}

// ── ICP scorer (same logic as connection-sender) ──────────────────────────────
const ICP_TITLES = ['founder','ceo','cto','co-founder','owner','president','head of','vp of','director','growth','solopreneur','entrepreneur','creator','consultant','agency'];
const TECH_KEYWORDS = ['saas','ai','automation','software','tech','startup','digital','marketing','no-code','nocode','crm','analytics'];

function scoreProspect(p) {
  const h = (p.headline || '').toLowerCase();
  const name = (p.name || '').toLowerCase();
  let score = 30; // base
  if (ICP_TITLES.some(t => h.includes(t))) score += 30;
  if (TECH_KEYWORDS.some(k => h.includes(k))) score += 20;
  if (h.includes('founder') || h.includes('ceo')) score += 10;
  if (p.connectionDegree === '2nd') score += 5;
  if (p.reactions > 50 || p.comments > 20) score += 10; // high engagement creator
  return Math.min(score, 100);
}

// ── Queue helper ──────────────────────────────────────────────────────────────
async function addToQueue(prospects, source) {
  let queue = [];
  try { queue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8')); } catch {}
  const existingUrls = new Set(queue.map(x => x.prospect?.profileUrl));

  let added = 0;
  let crmSynced = 0;
  const newEntries = [];

  for (const p of prospects) {
    if (!p.profileUrl || existingUrls.has(p.profileUrl)) continue;
    const score = scoreProspect(p);
    if (score < 40) continue; // skip low-quality

    // Push to CRMLite and get contact ID
    const syncResult = await crmUpsert(p, score);
    if (syncResult.synced) crmSynced++;

    const entry = {
      id: `li-disc-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      queued_at: new Date().toISOString(),
      status: 'pending_approval',
      source: `discovery:${source}`,
      priority_score: score,
      crm_id: syncResult.synced ? syncResult.contact_id : null,
      crm_synced: syncResult.synced,
      prospect: {
        name: p.name,
        profileUrl: p.profileUrl,
        headline: p.headline || '',
        connectionDegree: p.connectionDegree || 'unknown',
      },
    };
    queue.push(entry);
    existingUrls.add(p.profileUrl);
    newEntries.push(entry);
    added++;
  }

  fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
  return { added, crmSynced, entries: newEntries };
}

// ── Pretty table printer ──────────────────────────────────────────────────────
function printTable(rows, cols) {
  const widths = cols.map(c => Math.max(c.label.length, ...rows.map(r => String(r[c.key] ?? '').length)));
  const line = widths.map(w => '-'.repeat(w + 2)).join('+');
  const header = cols.map((c, i) => c.label.padEnd(widths[i])).join(' | ');
  console.log('\n' + header);
  console.log(line);
  for (const r of rows) {
    console.log(cols.map((c, i) => String(r[c.key] ?? '').substring(0, widths[i]).padEnd(widths[i])).join(' | '));
  }
  console.log(`\n${rows.length} results\n`);
}

// ── Mode: hashtag ─────────────────────────────────────────────────────────────
async function modeHashtag() {
  log(`Fetching hashtag feed: #${TAG} (limit=${LIMIT})`);
  const data = await call('GET', `/api/linkedin/discover/hashtag?tag=${encodeURIComponent(TAG)}&limit=${LIMIT}`);

  console.log(`\n=== TOP POSTS — #${data.tag} (${data.postCount} posts, ${data.creatorCount} creators) ===`);
  printTable(
    (data.posts || []).slice(0, 10).map(p => ({
      author: p.authorName?.substring(0, 25),
      reactions: p.reactions,
      comments: p.comments,
      text: p.text?.substring(0, 60),
      postUrl: p.postUrl?.substring(0, 50),
    })),
    [
      { key: 'author', label: 'Author' },
      { key: 'reactions', label: 'React' },
      { key: 'comments', label: 'Cmts' },
      { key: 'text', label: 'Post Text (preview)' },
    ]
  );

  console.log(`\n=== TOP CREATORS — #${data.tag} ===`);
  printTable(
    (data.creators || []).slice(0, 15).map(c => ({
      name: c.authorName?.substring(0, 25),
      headline: c.headline?.substring(0, 40),
      score: scoreProspect({ headline: c.headline, reactions: c.reactions, comments: c.comments }),
      react: c.reactions,
      cmts: c.comments,
      url: c.authorUrl?.replace('https://www.linkedin.com/in/', '/in/').substring(0, 30),
    })),
    [
      { key: 'name', label: 'Creator' },
      { key: 'headline', label: 'Headline' },
      { key: 'score', label: 'ICP' },
      { key: 'react', label: 'React' },
      { key: 'cmts', label: 'Cmts' },
      { key: 'url', label: 'Profile' },
    ]
  );

  if (ADD_QUEUE) {
    const prospects = (data.creators || []).map(c => ({
      name: c.authorName,
      profileUrl: c.authorUrl,
      headline: c.headline,
      reactions: c.reactions,
      comments: c.comments,
    }));
    const { added, crmSynced } = await addToQueue(prospects, `hashtag:${TAG}`);
    console.log(`✓ Added ${added} creators to queue (${crmSynced} synced to CRMLite)`);
    if (added > 0) {
      await sendTelegram(`🔍 LinkedIn Discovery (#${TAG})\n${added} new prospects queued, ${crmSynced} synced to CRMLite.\nReview: /connections`);
    }
  }

  // Output post URLs for commenter extraction follow-up
  if (data.posts?.length > 0) {
    console.log('\n=== POST URLs for commenter extraction ===');
    (data.posts || []).slice(0, 5).forEach((p, i) => console.log(`  ${i+1}. ${p.postUrl}`));
    console.log('\nRun: node harness/linkedin-discovery.js --mode commenters --post-url <URL> [--add-to-queue]');
  }

  return data;
}

// ── Mode: commenters ──────────────────────────────────────────────────────────
async function modeCommenters() {
  if (!POST_URL) { console.error('--post-url required'); process.exit(1); }
  log(`Extracting commenters from: ${POST_URL}`);
  const data = await call('POST', '/api/linkedin/discover/commenters', { postUrl: POST_URL, limit: LIMIT });

  console.log(`\n=== COMMENTERS (${data.count}) — ${POST_URL.substring(0, 60)} ===`);
  printTable(
    (data.commenters || []).map(c => ({
      name: c.name?.substring(0, 25),
      headline: c.headline?.substring(0, 45),
      score: scoreProspect(c),
      likes: c.likes,
      comment: c.comment?.substring(0, 50),
    })),
    [
      { key: 'name', label: 'Commenter' },
      { key: 'headline', label: 'Headline' },
      { key: 'score', label: 'ICP' },
      { key: 'likes', label: 'Likes' },
      { key: 'comment', label: 'Comment Preview' },
    ]
  );

  if (ADD_QUEUE) {
    const { added, crmSynced } = await addToQueue(data.commenters || [], `commenters:post`);
    console.log(`✓ Added ${added} commenters to queue (${crmSynced} synced to CRMLite)`);
    if (added > 0) {
      await sendTelegram(`🔍 LinkedIn Discovery (commenters)\n${added} new prospects queued, ${crmSynced} synced to CRMLite.\nReview: /connections`);
    }
  }
  return data;
}

// ── Mode: my-connections ──────────────────────────────────────────────────────
async function modeMyConnections() {
  log(`Scraping my connections (page=${PAGE}, limit=${LIMIT})`);
  const data = await call('GET', `/api/linkedin/discover/my-connections?limit=${LIMIT}&page=${PAGE}`);

  console.log(`\n=== MY CONNECTIONS — page ${data.page} (${data.count} fetched) ===`);
  printTable(
    (data.connections || []).map(c => ({
      name: c.name?.substring(0, 25),
      headline: c.headline?.substring(0, 50),
      score: scoreProspect(c),
      url: c.profileUrl?.replace('https://www.linkedin.com/in/', '/in/').substring(0, 30),
    })),
    [
      { key: 'name', label: 'Name' },
      { key: 'headline', label: 'Headline' },
      { key: 'score', label: 'ICP' },
      { key: 'url', label: 'Profile' },
    ]
  );

  if (ADD_QUEUE) {
    const { added, crmSynced } = await addToQueue(data.connections || [], 'my-connections');
    console.log(`✓ Added ${added} connections to queue (${crmSynced} synced to CRMLite)`);
    if (added > 0) {
      await sendTelegram(`🔍 LinkedIn Discovery (my-connections)\n${added} new prospects queued, ${crmSynced} synced to CRMLite.\nReview: /connections`);
    }
  }
  return data;
}

// ── Mode: profile-connections ──────────────────────────────────────────────────
async function modeProfileConnections() {
  if (!PROFILE_URL) { console.error('--profile-url required'); process.exit(1); }
  log(`Scraping connections of: ${PROFILE_URL}`);
  const data = await call('POST', '/api/linkedin/discover/profile-connections', { profileUrl: PROFILE_URL, limit: LIMIT });

  console.log(`\n=== CONNECTIONS OF ${PROFILE_URL.replace('https://www.linkedin.com/in/', '/in/')} ===`);
  console.log(`  Navigated to: ${data.navigatedUrl}`);
  console.log(`  Click result: ${data.clickResult}\n`);
  printTable(
    (data.connections || []).map(c => ({
      name: c.name?.substring(0, 25),
      headline: c.headline?.substring(0, 50),
      score: scoreProspect(c),
      url: c.profileUrl?.replace('https://www.linkedin.com/in/', '/in/').substring(0, 30),
    })),
    [
      { key: 'name', label: 'Name' },
      { key: 'headline', label: 'Headline' },
      { key: 'score', label: 'ICP' },
      { key: 'url', label: 'Profile' },
    ]
  );

  if (ADD_QUEUE) {
    const { added, crmSynced } = await addToQueue(data.connections || [], `profile-connections:${data.vanityName}`);
    console.log(`✓ Added ${added} connections to queue (${crmSynced} synced to CRMLite)`);
    if (added > 0) {
      await sendTelegram(`🔍 LinkedIn Discovery (profile-connections)\n${added} new prospects queued, ${crmSynced} synced to CRMLite.\nReview: /connections`);
    }
  }
  return data;
}

// ── Mode: search ──────────────────────────────────────────────────────────────
async function modeSearch() {
  log(`Searching people: "${KEYWORDS}" (limit=${LIMIT})`);
  const data = await call('POST', '/api/linkedin/search/people', {
    keywords: KEYWORDS.split(' '),
    connectionDegree: '2nd',
    page: PAGE,
  });

  console.log(`\n=== PEOPLE SEARCH — "${KEYWORDS}" (${data.count} results) ===`);
  printTable(
    (data.results || []).map(r => ({
      name: r.name?.substring(0, 25),
      headline: r.headline?.substring(0, 45),
      degree: r.connectionDegree,
      mutual: r.mutualConnections,
      score: scoreProspect(r),
      url: r.profileUrl?.replace('https://www.linkedin.com/in/', '/in/').substring(0, 30),
    })),
    [
      { key: 'name', label: 'Name' },
      { key: 'headline', label: 'Headline' },
      { key: 'degree', label: 'Deg' },
      { key: 'mutual', label: 'Mutual' },
      { key: 'score', label: 'ICP' },
      { key: 'url', label: 'Profile' },
    ]
  );

  if (ADD_QUEUE) {
    const { added, crmSynced } = await addToQueue(data.results || [], `search:${KEYWORDS}`);
    console.log(`✓ Added ${added} people to queue (${crmSynced} synced to CRMLite)`);
    if (added > 0) {
      await sendTelegram(`🔍 LinkedIn Discovery (search: ${KEYWORDS})\n${added} new prospects queued, ${crmSynced} synced to CRMLite.\nReview: /connections`);
    }
  }
  return data;
}

// ── Run all modes for a full discovery sweep ──────────────────────────────────
// Uses only working modes: multi-keyword people search + profile "People Also Viewed"
async function modeAll() {
  log('Running full ICP discovery sweep (people search + profile network)...');

  // ICP-focused search queries. LinkedIn search works best with 1-3 tight keywords.
  // Each query costs 1 action against the 15/hour limit.
  const ICP_SEARCHES = [
    { keywords: ['AI automation founder'],       title: '' },
    { keywords: ['SaaS CEO founder'],            title: '' },
    { keywords: ['solopreneur AI tools'],        title: '' },
    { keywords: ['agency owner automation'],     title: '' },
    { keywords: ['content creator monetize'],    title: '' },
    { keywords: ['startup founder software'],    title: '' },
    { keywords: ['marketing automation'],        title: 'Founder OR CEO OR Owner' },
    { keywords: ['AI consultant'],               title: '' },
  ];

  // Seed profiles to extract "People Also Viewed" from (active creators in our niche)
  const SEED_PROFILES = [
    'https://www.linkedin.com/in/garyvaynerchuk/',
    'https://www.linkedin.com/in/alexhormozi/',
    'https://www.linkedin.com/in/justinwelsh/',
  ];

  let totalAdded = 0;

  for (const q of ICP_SEARCHES) {
    const label = q.keywords.join(' ') + (q.title ? ` | title:${q.title}` : '');
    log(`Search: "${label}"`);
    try {
      const body = { keywords: q.keywords, connectionDegree: '2nd' };
      if (q.title) body.title = q.title;
      const data = await call('POST', '/api/linkedin/search/people', body);
      const { added, crmSynced } = await addToQueue(data.results || [], `search:${label}`);
      totalAdded += added;
      console.log(`  "${label}": ${data.count} results, ${added} added (${crmSynced} → CRM)`);
    } catch (e) {
      log(`  Error (${e.message}) — skipping`);
      if (e.message.includes('Rate limit')) { log('  Rate limit hit — stopping search loop'); break; }
    }
    await new Promise(r => setTimeout(r, 3000)); // 3s between searches
  }

  for (const profileUrl of SEED_PROFILES) {
    const slug = profileUrl.replace(/.*\/in\//, '').replace('/', '');
    log(`Profile network: ${slug}`);
    try {
      const data = await call('POST', '/api/linkedin/discover/profile-connections', { profileUrl, limit: 30 });
      const { added, crmSynced } = await addToQueue(data.connections || [], `profile:${slug}`);
      totalAdded += added;
      console.log(`  ${slug}: ${data.count} found, ${added} added (${crmSynced} → CRM)`);
    } catch (e) { log(`  Error: ${e.message}`); }
  }

  const qData = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
  const pending = qData.filter(x => x.status === 'pending_approval').length;
  const crmTotal = qData.filter(x => x.crm_synced).length;
  console.log(`\n✓ Sweep complete. Added ${totalAdded} new prospects. ${pending} total pending_approval. ${crmTotal} synced to CRMLite.`);

  if (totalAdded > 0) {
    await sendTelegram(
      `🔍 LinkedIn Discovery Sweep Complete\n` +
      `${totalAdded} new prospects found\n` +
      `${pending} total pending approval\n` +
      `${crmTotal} synced to CRMLite\n` +
      `Use /connections to review + send`
    );
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  // Health check
  try {
    const status = await call('GET', '/api/linkedin/status');
    log(`Service: isOnLinkedIn=${status.isOnLinkedIn} isLoggedIn=${status.isLoggedIn} url=${status.currentUrl}`);
    if (!status.isLoggedIn) { console.error('LinkedIn not logged in — open Safari and navigate to LinkedIn first'); process.exit(1); }
  } catch (e) {
    console.error(`LinkedIn service not reachable at ${LI}: ${e.message}`);
    console.error('Start it: npm run --prefix "Safari Automation/packages/linkedin-automation" start:server');
    process.exit(1);
  }

  const modes = {
    hashtag: modeHashtag,
    commenters: modeCommenters,
    'my-connections': modeMyConnections,
    'profile-connections': modeProfileConnections,
    search: modeSearch,
    all: modeAll,
  };

  const fn = modes[MODE];
  if (!fn) {
    console.error(`Unknown mode: ${MODE}. Choose: ${Object.keys(modes).join(', ')}`);
    process.exit(1);
  }

  try {
    await fn();
  } catch (e) {
    console.error(`[discovery] Error: ${e.message}`);
    if (process.env.DEBUG) console.error(e.stack);
    process.exit(1);
  }
}

main();
