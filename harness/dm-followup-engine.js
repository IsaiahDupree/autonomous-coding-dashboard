#!/usr/bin/env node

/**
 * Cross-Platform DM Follow-up Engine
 * ====================================
 * Runs every 2 hours. For each platform, reads the DM queue for 'sent' entries,
 * checks the platform's inbox API for replies, and when a reply is detected:
 *   1. Updates CRMLite stage → 'replied'
 *   2. Generates an AI follow-up message
 *   3. Adds to platform-specific followup queue for human approval
 *
 * NEVER auto-sends. All follow-ups require dashboard approval.
 *
 * Platform endpoints used:
 *   Twitter  :3003 — GET /api/twitter/conversations + open + messages
 *   Instagram:3100 — GET /api/conversations + open + messages
 *   TikTok   :3102 — GET /api/tiktok/conversations + open + messages
 *
 * Usage:
 *   node harness/dm-followup-engine.js           # daemon (every 2h)
 *   node harness/dm-followup-engine.js --once    # single cycle then exit
 *   node harness/dm-followup-engine.js --test    # preflight only
 *   node harness/dm-followup-engine.js --dry-run # detect replies, don't queue
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const H = __dirname;

const STATE_FILE     = path.join(H, 'dm-followup-state.json');
const LOG_FILE       = path.join(H, 'dm-followup-log.ndjson');
const REPLIES_FILE   = path.join(H, 'dm-replies.ndjson');
const HOME_ENV       = `${process.env.HOME}/.env`;
const ACTP_ENV       = '/Users/isaiahdupree/Documents/Software/actp-worker/.env';
const CRMLITE_URL    = 'https://crmlite-isaiahduprees-projects.vercel.app';
const CYCLE_MS       = 2 * 60 * 60 * 1000; // 2 hours
const REPLY_WINDOW_DAYS = 14; // only check DMs sent in last 14 days

const args = process.argv.slice(2);
const MODE    = args.includes('--once') ? 'once' : args.includes('--test') ? 'test' : 'daemon';
const DRY_RUN = args.includes('--dry-run');

// ── Platform config ────────────────────────────────────────────────────────────
const PLATFORMS = [
  {
    name:      'twitter',
    queueFile: path.join(H, 'twitter-dm-queue.json'),
    fuQueue:   path.join(H, 'twitter-followup-queue.json'),
    baseUrl:   process.env.TWITTER_DM_URL || 'http://localhost:3003',
    token:     process.env.TWITTER_DM_TOKEN || 'test-token-12345',
    routes: {
      conversations: '/api/twitter/conversations',
      openConv:      '/api/twitter/conversations/open',   // POST {username}
      messages:      '/api/twitter/messages',             // GET ?conversationId=
      aiGenerate:    '/api/twitter/ai/generate',          // POST {username, purpose, topic}
    },
  },
  {
    name:      'instagram',
    queueFile: path.join(H, 'instagram-dm-queue.json'),
    fuQueue:   path.join(H, 'instagram-followup-queue.json'),
    baseUrl:   process.env.INSTAGRAM_DM_URL || 'http://localhost:3100',
    token:     process.env.INSTAGRAM_DM_TOKEN || 'test-token-12345',
    routes: {
      conversations: '/api/conversations',
      openConv:      '/api/conversations/open',            // POST {username}
      messages:      '/api/messages',                      // GET ?conversationId=
      aiGenerate:    '/api/ai/generate',                   // POST {username, purpose, topic}
    },
  },
  {
    name:      'tiktok',
    queueFile: path.join(H, 'tiktok-dm-queue.json'),
    fuQueue:   path.join(H, 'tiktok-followup-queue.json'),
    baseUrl:   process.env.TIKTOK_DM_URL || 'http://localhost:3102',
    token:     process.env.TIKTOK_DM_TOKEN || 'test-token-12345',
    routes: {
      conversations: '/api/tiktok/conversations',
      openConv:      '/api/tiktok/conversations/open',     // POST {username}
      messages:      '/api/tiktok/messages',               // GET ?conversationId=
      aiGenerate:    '/api/tiktok/ai/generate',            // POST {username, purpose, topic}
    },
  },
];

// ── Env ────────────────────────────────────────────────────────────────────────
const ENV_OVERRIDE = new Set(['CRMLITE_API_KEY']);
function loadEnv(p) {
  try {
    for (const l of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = l.match(/^([A-Z0-9_]+)=(.+)/);
      if (m && (!process.env[m[1]] || ENV_OVERRIDE.has(m[1]))) process.env[m[1]] = m[2].trim();
    }
  } catch { /* non-fatal */ }
}
loadEnv(HOME_ENV);
loadEnv(ACTP_ENV);

// ── Logging ────────────────────────────────────────────────────────────────────
function log(msg, data = {}) {
  const e = { ts: new Date().toISOString(), msg, ...data };
  if (!process.env.NOHUP || process.stdout.isTTY) console.log(`[dm-followup] ${msg}`);
  try { fs.appendFileSync(LOG_FILE, JSON.stringify(e) + '\n'); } catch {}
}

// ── HTTP helper ────────────────────────────────────────────────────────────────
async function api(baseUrl, route, token, method = 'GET', body = null) {
  try {
    const res = await fetch(`${baseUrl}${route}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(30_000),
    });
    return await res.json();
  } catch (e) { return { error: String(e) }; }
}

// ── State ──────────────────────────────────────────────────────────────────────
function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch { return { lastRun: null, totalRepliesFound: 0, seenMessageIds: {} }; }
}
function writeState(s) { try { fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2)); } catch {} }

// ── Queue helpers ──────────────────────────────────────────────────────────────
function readQueue(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } }
function writeQueue(file, data) { try { fs.writeFileSync(file, JSON.stringify(data, null, 2)); } catch {} }
function readFUQueue(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return { queue: [] }; } }

// ── CRMLite ────────────────────────────────────────────────────────────────────
async function crmUpdateStage(contactId, stage, note) {
  const key = process.env.CRMLITE_API_KEY || '';
  if (!key || !contactId) return false;
  try {
    const res = await fetch(`${CRMLITE_URL}/api/contacts/${contactId}`, {
      method: 'PATCH',
      headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipeline_stage: stage, notes: note }),
      signal: AbortSignal.timeout(8_000),
    });
    return res.ok;
  } catch { return false; }
}

// ── Core: check one platform for replies ──────────────────────────────────────
async function checkPlatformReplies(platform, state) {
  const { name, queueFile, fuQueue, baseUrl, token, routes } = platform;

  // Check service health
  const health = await api(baseUrl, '/health', token);
  if (health.error || health.status !== 'ok') {
    log(`${name}: service not ready (${health.error || health.status}) — skipping`);
    return { checked: 0, repliesFound: 0 };
  }

  const dmQ = readQueue(queueFile);
  if (!dmQ?.queue?.length) return { checked: 0, repliesFound: 0 };

  // Only check DMs sent recently and not already replied
  const cutoff = Date.now() - REPLY_WINDOW_DAYS * 86400000;
  const toCheck = dmQ.queue.filter(e =>
    e.status === 'sent' &&
    !e.reply_detected &&
    e.sentAt &&
    new Date(e.sentAt).getTime() > cutoff
  );

  if (!toCheck.length) {
    log(`${name}: no recent sent DMs to check`);
    return { checked: 0, repliesFound: 0 };
  }

  log(`${name}: checking ${toCheck.length} sent DMs for replies`);
  let repliesFound = 0;
  let queueChanged = false;

  const fuQ = readFUQueue(fuQueue);
  const seenMsgIds = state.seenMessageIds[name] || {};

  for (const entry of toCheck) {
    try {
      // Open conversation with this user
      const conv = await api(baseUrl, routes.openConv, token, 'POST', { username: entry.username });
      if (conv.error || !conv.conversationId) continue;

      await new Promise(r => setTimeout(r, 2000)); // wait for messages to load

      // Read messages
      const msgs = await api(baseUrl, `${routes.messages}?conversationId=${conv.conversationId}`, token);
      if (msgs.error || !Array.isArray(msgs.messages)) continue;

      // Find messages from them (not us) that are newer than our sent DM
      const sentAt = new Date(entry.sentAt).getTime();
      const replies = msgs.messages.filter(m =>
        !m.isOwn &&
        m.from !== 'me' &&
        new Date(m.timestamp || 0).getTime() > sentAt &&
        !seenMsgIds[m.id || m.timestamp]
      );

      if (!replies.length) continue;

      const latestReply = replies[replies.length - 1];
      const msgId = latestReply.id || latestReply.timestamp || `${entry.username}-${Date.now()}`;

      if (seenMsgIds[msgId]) continue; // already processed

      // Reply detected!
      log(`  ${name}: @${entry.username} replied → "${latestReply.text?.slice(0, 80)}"`);
      repliesFound++;

      // Mark in dm queue
      entry.reply_detected = true;
      entry.reply_at = latestReply.timestamp || new Date().toISOString();
      entry.reply_preview = latestReply.text?.slice(0, 200) || '';
      queueChanged = true;

      // Mark msgId as seen
      seenMsgIds[msgId] = Date.now();

      // Log reply to replies file
      try {
        fs.appendFileSync(REPLIES_FILE, JSON.stringify({
          ts: new Date().toISOString(), platform: name, username: entry.username,
          reply: latestReply.text, originalDM: entry.message, dmId: entry.id,
        }) + '\n');
      } catch {}

      // Update CRMLite stage to 'replied' if we have a contact ID
      if (entry.crmlite_contact_id) {
        const updated = await crmUpdateStage(
          entry.crmlite_contact_id,
          'replied',
          `Replied on ${name} at ${new Date().toISOString()}: "${latestReply.text?.slice(0, 200)}"`
        );
        if (updated) {
          entry.crmlite_stage = 'replied';
          log(`    CRMLite updated → replied (contact ${entry.crmlite_contact_id})`);
        }
      }

      if (!DRY_RUN) {
        // Generate follow-up message
        const gen = await api(baseUrl, routes.aiGenerate, token, 'POST', {
          username: entry.username,
          purpose: 'followup',
          topic: `They replied: "${latestReply.text?.slice(0, 100)}" — continue the conversation naturally, move toward a discovery call`,
        });
        const followupMsg = gen.message || null;

        if (followupMsg) {
          fuQ.queue.push({
            id: `fu-${name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            platform: name,
            username: entry.username,
            theirReply: latestReply.text?.slice(0, 300) || '',
            originalDM: entry.message?.slice(0, 300) || '',
            followupMessage: followupMsg,
            status: 'pending',
            discoveredAt: new Date().toISOString(),
            crmlite_contact_id: entry.crmlite_contact_id || null,
          });
          log(`    Follow-up generated and queued for approval`);
        }
      }

      await new Promise(r => setTimeout(r, 3000)); // brief pause between conversation checks

    } catch (e) {
      log(`  ${name}: error checking @${entry.username}: ${e.message}`);
    }
  }

  if (queueChanged && !DRY_RUN) {
    writeQueue(queueFile, dmQ);
    writeQueue(fuQueue, fuQ);
  }
  if (!state.seenMessageIds[name]) state.seenMessageIds[name] = {};
  Object.assign(state.seenMessageIds[name], seenMsgIds);

  return { checked: toCheck.length, repliesFound };
}

// ── Main cycle ──────────────────────────────────────────────────────────────────
async function runCycle() {
  const state = readState();
  state.lastRun = new Date().toISOString();

  let totalChecked = 0;
  let totalReplies = 0;

  for (const platform of PLATFORMS) {
    const { checked, repliesFound } = await checkPlatformReplies(platform, state);
    totalChecked += checked;
    totalReplies += repliesFound;

    // Brief pause between platforms to avoid Safari conflicts
    await new Promise(r => setTimeout(r, 5000));
  }

  state.totalRepliesFound = (state.totalRepliesFound || 0) + totalReplies;
  writeState(state);

  log(`Cycle complete: ${totalChecked} DMs checked, ${totalReplies} new replies found`, {
    dryRun: DRY_RUN, totalRepliesAllTime: state.totalRepliesFound,
  });
}

// ── Preflight ──────────────────────────────────────────────────────────────────
async function preflight() {
  console.log('=== DM Follow-up Engine Preflight ===\n');
  const crmKey = process.env.CRMLITE_API_KEY || '';
  console.log(`CRMLite API key: ${crmKey ? '✓' : '✗ MISSING'}`);
  console.log('');

  for (const p of PLATFORMS) {
    const h = await api(p.baseUrl, '/health', p.token);
    const q = readQueue(p.queueFile);
    const sent = q?.queue?.filter(e => e.status === 'sent') || [];
    const replyWindow = sent.filter(e => e.sentAt && Date.now() - new Date(e.sentAt).getTime() < REPLY_WINDOW_DAYS * 86400000);
    const hasReplied = replyWindow.filter(e => e.reply_detected);
    console.log(`${p.name}: service ${h.status === 'ok' ? '✓' : '✗ ' + (h.error || h.status)} | sent=${sent.length} | in-window=${replyWindow.length} | replied=${hasReplied.length}`);

    const fuQ = readFUQueue(p.fuQueue);
    const pending = fuQ.queue.filter(e => e.status === 'pending');
    if (pending.length) console.log(`  → ${pending.length} follow-ups pending approval`);
  }
  console.log('\nPreflight complete.');
  return true;
}

// ── Entry ──────────────────────────────────────────────────────────────────────
async function main() {
  try { fs.mkdirSync(path.join(H, 'logs'), { recursive: true }); } catch {}

  if (MODE === 'test') { await preflight(); process.exit(0); }
  if (MODE === 'once') { await runCycle(); log('Single cycle complete'); process.exit(0); }

  log(`DM Follow-up Engine started (PID ${process.pid}) — cycle every ${CYCLE_MS / 60000}min`);
  log(`Monitoring ${PLATFORMS.length} platforms: ${PLATFORMS.map(p => p.name).join(', ')}`);
  log(`Reply window: ${REPLY_WINDOW_DAYS} days | dry-run: ${DRY_RUN}`);

  const tick = async () => {
    await runCycle().catch(e => log(`Cycle error: ${e.message}`));
    setTimeout(tick, CYCLE_MS);
  };

  await runCycle().catch(e => log(`Initial error: ${e.message}`));
  setTimeout(tick, CYCLE_MS);

  process.on('SIGINT',  () => { log('Shutting down'); process.exit(0); });
  process.on('SIGTERM', () => { log('Shutting down'); process.exit(0); });
}

main().catch(e => { console.error(`[dm-followup] Fatal: ${e.message}`); process.exit(1); });
