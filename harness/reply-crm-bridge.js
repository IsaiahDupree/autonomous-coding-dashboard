#!/usr/bin/env node

/**
 * Reply-to-CRM Bridge
 * ====================
 * Scans all DM inboxes (IG/TW/TT/LI) for inbound replies from known contacts.
 * When a reply is detected:
 *   1. Matches sender to crm_contacts by username + platform
 *   2. Updates crm_contacts: replies_received+1, last_inbound_at, pipeline_stage='replied'
 *   3. Inserts reply_events row
 *   4. POSTs to CRMLite /api/actions
 *   5. Sends Telegram alert
 *   6. Generates Claude Haiku next_action and writes to crm_contacts
 *
 * Usage:
 *   node harness/reply-crm-bridge.js              # daemon (every 15min)
 *   node harness/reply-crm-bridge.js --once       # single scan then exit
 *   node harness/reply-crm-bridge.js --dry-run    # detect but don't write CRM
 *   node harness/reply-crm-bridge.js --scan-now   # alias for --once
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const H = __dirname;

const STATE_FILE  = path.join(H, 'reply-bridge-state.json');
const LOG_FILE    = path.join(H, 'logs', 'reply-crm-bridge.log');
const HOME_ENV    = `${process.env.HOME}/.env`;
const ACTP_ENV    = '/Users/isaiahdupree/Documents/Software/actp-worker/.env';
const CRMLITE_URL = 'https://crmlite-isaiahduprees-projects.vercel.app';

const INTERVAL_MS = parseInt(process.env.REPLY_SCAN_INTERVAL_MINUTES || '15') * 60 * 1000;

const args     = process.argv.slice(2);
const ONCE     = args.includes('--once') || args.includes('--scan-now');
const DRY_RUN  = args.includes('--dry-run');

// ── Env loader ─────────────────────────────────────────────────────────────────
function loadEnv(p) {
  try {
    for (const l of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = l.match(/^([A-Z0-9_]+)=(.+)/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch { /* non-fatal */ }
}
// Always load CRMLITE_API_KEY from actp-worker
function loadEnvOverride(p, keys) {
  try {
    for (const l of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = l.match(/^([A-Z0-9_]+)=(.+)/);
      if (m && keys.includes(m[1])) process.env[m[1]] = m[2].trim();
    }
  } catch { /* non-fatal */ }
}
loadEnv(HOME_ENV);
loadEnv(ACTP_ENV);
loadEnvOverride(ACTP_ENV, ['CRMLITE_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ANTHROPIC_API_KEY', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID']);

// ── Logging ────────────────────────────────────────────────────────────────────
fs.mkdirSync(path.join(H, 'logs'), { recursive: true });
function log(msg, data = {}) {
  const line = `[reply-bridge] ${new Date().toISOString()} ${msg}${Object.keys(data).length ? ' ' + JSON.stringify(data) : ''}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch {}
}

// ── State ──────────────────────────────────────────────────────────────────────
function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch { return { lastScan: {}, totalRepliesFound: 0 }; }
}
function writeState(s) {
  try { fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2)); } catch {}
}

// ── Telegram ───────────────────────────────────────────────────────────────────
async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat  = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text, parse_mode: 'HTML' }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (e) { log('Telegram send failed', { error: String(e) }); }
}

// ── HTTP helper ────────────────────────────────────────────────────────────────
async function apiGet(url, token) {
  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    return await res.json();
  } catch (e) { return { error: String(e) }; }
}

// ── Supabase ───────────────────────────────────────────────────────────────────
function sbHeaders() {
  return {
    'Content-Type': 'application/json',
    'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
  };
}
const SB_URL = () => process.env.SUPABASE_URL || 'https://ivhfuhxorppptyuofbgq.supabase.co';

async function sbQuery(path_, method = 'GET', body = null, params = '') {
  try {
    const url = `${SB_URL()}/rest/v1/${path_}${params ? '?' + params : ''}`;
    const res = await fetch(url, {
      method,
      headers: { ...sbHeaders(), 'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal' },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const txt = await res.text();
      return { error: `HTTP ${res.status}: ${txt}` };
    }
    if (method === 'PATCH' || method === 'DELETE') return { ok: true };
    return await res.json();
  } catch (e) { return { error: String(e) }; }
}

// ── Contact matcher ────────────────────────────────────────────────────────────
// Pipeline stage ordering — higher index = higher stage
const STAGE_ORDER = ['first_touch', 'replied', 'qualified', 'proposal_sent', 'closed_won', 'closed_lost'];
function stageRank(s) {
  const i = STAGE_ORDER.indexOf(s);
  return i === -1 ? 0 : i;
}

async function findContact(platform, username) {
  if (!username) return null;
  const u = username.replace(/^@/, '').toLowerCase();

  // Primary: match by username + platform
  const rows = await sbQuery('crm_contacts', 'GET', null,
    `username=ilike.${encodeURIComponent(u)}&platform=eq.${platform}&limit=1`);
  if (!rows.error && rows.length > 0) return rows[0];

  // Cross-platform handle fields
  const handleField = {
    instagram: 'instagram_handle',
    twitter:   'twitter_handle',
    tiktok:    'tiktok_handle',
    linkedin:  'linkedin_url',
  }[platform];

  if (handleField) {
    const rows2 = await sbQuery('crm_contacts', 'GET', null,
      `${handleField}=ilike.${encodeURIComponent('%' + u + '%')}&limit=1`);
    if (!rows2.error && rows2.length > 0) return rows2[0];
  }
  return null;
}

// ── Dedup check ────────────────────────────────────────────────────────────────
async function recentReplyExists(contactId) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const rows = await sbQuery('reply_events', 'GET', null,
    `contact_id=eq.${contactId}&detected_at=gte.${oneHourAgo}&limit=1`);
  return !rows.error && rows.length > 0;
}

// ── Claude next_action ─────────────────────────────────────────────────────────
async function generateNextAction(contact, messageText) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 150,
        system: 'You are a B2B sales assistant for an AI automation consultant targeting software founders ($500K-$5M ARR). Generate a specific, actionable next step (1-2 sentences) to advance this conversation toward a discovery call or proposal.',
        messages: [{
          role: 'user',
          content: `Contact: ${contact.display_name || contact.username} on ${contact.platform}
Headline: ${contact.headline || 'N/A'}
Summary: ${contact.ai_summary || 'N/A'}
Their message: "${messageText}"

What is the exact next action to take with this contact?`,
        }],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.content?.[0]?.text?.trim() || null;
  } catch (e) {
    log('Claude next_action failed', { error: String(e) });
    return null;
  }
}

// ── CRM updater ────────────────────────────────────────────────────────────────
async function updateCRM(contact, platform, username, messageText, nextAction) {
  if (DRY_RUN) {
    log('[DRY-RUN] Would update CRM', { contactId: contact.id, platform, username });
    return true;
  }

  // Only upgrade pipeline_stage, never downgrade
  const currentRank = stageRank(contact.pipeline_stage);
  const repliedRank  = stageRank('replied');
  const newStage     = currentRank >= repliedRank ? contact.pipeline_stage : 'replied';

  const patch = {
    replies_received: (contact.replies_received || 0) + 1,
    last_inbound_at: new Date().toISOString(),
    pipeline_stage: newStage,
    updated_at: new Date().toISOString(),
    ...(nextAction ? {
      next_action: nextAction,
      next_action_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    } : {}),
  };

  const r = await sbQuery(`crm_contacts?id=eq.${contact.id}`, 'PATCH', patch);
  if (r.error) {
    log('CRM update failed', { error: r.error, contactId: contact.id });
    return false;
  }

  // Insert reply_events row
  const evRow = {
    contact_id: contact.id,
    platform,
    username,
    message_text: messageText,
    detected_at: new Date().toISOString(),
    next_action_generated: nextAction || null,
    processed: true,
  };
  const ev = await sbQuery('reply_events', 'POST', evRow);
  if (ev.error) log('reply_events insert failed', { error: ev.error });

  return true;
}

// ── CRMLite action POST ────────────────────────────────────────────────────────
async function postCRMLiteAction(contact, platform, messageText) {
  const key = process.env.CRMLITE_API_KEY;
  if (!key) return;
  try {
    await fetch(`${CRMLITE_URL}/api/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key },
      body: JSON.stringify({
        action: 'replied',
        platform,
        contact: {
          username: contact.username,
          display_name: contact.display_name || contact.username,
        },
        message: messageText,
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (e) { log('CRMLite action post failed (non-fatal)', { error: String(e) }); }
}

// ── Per-platform inbox scanner ─────────────────────────────────────────────────
const PLATFORMS = [
  {
    name:    'instagram',
    port:    3100,
    token:   process.env.INSTAGRAM_API_TOKEN || 'test-token',
    convUrl:     (base) => `${base}/api/conversations`,
    navigateUrl: (base) => `${base}/api/inbox/navigate`,
    // Instagram: must open conversation first, then /api/messages reads the open one
    openUrl: (base) => `${base}/api/conversations/open`,
    msgUrl:  (base) => `${base}/api/messages`,
    getSenderHandle: (conv) => conv.username || conv.handle || conv.participant_username || null,
    isInbound: (msg) => msg.isOutbound === false || msg.direction === 'inbound' || msg.from_them === true || msg.is_inbound === true,
    getMsgText: (msg) => msg.text || msg.message || msg.body || '',
    getMsgId:   (msg) => msg.id || msg.message_id || '',
  },
  {
    name:    'twitter',
    port:    3003,
    token:   process.env.TWITTER_DM_TOKEN || 'test-token',
    convUrl: (base) => `${base}/api/twitter/conversations`,
    msgUrl:  (base, id) => `${base}/api/twitter/messages?conversationId=${id}`,
    getSenderHandle: (conv) => conv.username || conv.handle || conv.participant_username || null,
    isInbound: (msg) => msg.isOutbound === false || msg.direction === 'inbound' || msg.from_them === true || msg.is_inbound === true,
    getMsgText: (msg) => msg.text || msg.message || msg.body || '',
    getMsgId:   (msg) => msg.id || msg.message_id || '',
  },
  {
    name:    'tiktok',
    port:    3102,
    token:   process.env.TIKTOK_DM_TOKEN || 'test-token',
    convUrl: (base) => `${base}/api/tiktok/conversations`,
    msgUrl:  (base, id) => `${base}/api/tiktok/messages?conversationId=${id}`,
    getSenderHandle: (conv) => conv.username || conv.handle || conv.participant_username || null,
    isInbound: (msg) => msg.isOutbound === false || msg.direction === 'inbound' || msg.from_them === true || msg.is_inbound === true,
    getMsgText: (msg) => msg.text || msg.message || msg.body || '',
    getMsgId:   (msg) => msg.id || msg.message_id || '',
  },
  {
    name:    'linkedin',
    port:    3105,
    token:   process.env.LINKEDIN_AUTH_TOKEN || 'test-token-12345',
    convUrl: (base) => `${base}/api/linkedin/conversations`,
    msgUrl:  (base, id) => `${base}/api/linkedin/messages?conversationId=${id}`,
    getSenderHandle: (conv) => conv.username || conv.handle || conv.participant_username || conv.name || null,
    isInbound: (msg) => msg.isOutbound === false || msg.direction === 'inbound' || msg.from_them === true || msg.is_inbound === true,
    getMsgText: (msg) => msg.text || msg.message || msg.body || '',
    getMsgId:   (msg) => msg.id || msg.message_id || '',
  },
];

async function navigateToInbox(platform, base) {
  // Navigate the Safari tab to the DM inbox before scraping
  const endpoints = {
    instagram: `${base}/api/inbox/navigate`,
    twitter:   null, // Twitter service handles navigation internally
    tiktok:    null,
    linkedin:  null,
  };
  const navUrl = endpoints[platform.name];
  if (!navUrl) return;
  try {
    const res = await fetch(navUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${platform.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      // Give the SPA 4s to render conversations after navigation
      await new Promise(r => setTimeout(r, 4000));
      log(`${platform.name}: navigated to inbox`);
    }
  } catch (e) { /* non-fatal */ }
}

async function scanPlatform(platform, state, results) {
  const base = `http://localhost:${platform.port}`;
  const cursor = state.lastScan[platform.name] || null;

  log(`Scanning ${platform.name} inbox...`);

  // Navigate to inbox first (ensures Safari tab is on the right page)
  await navigateToInbox(platform, base);

  // Fetch conversations — retry once if empty (SPA timing)
  let convData = await apiGet(platform.convUrl(base), platform.token);
  if (convData.error) {
    log(`${platform.name} service down — skipping`, { error: convData.error });
    return;
  }

  let convs = Array.isArray(convData)
    ? convData
    : (convData.conversations || convData.data || convData.items || []);

  if (!convs.length && platform.navigateUrl) {
    // SPA may still be loading — wait 3s more and retry once
    log(`${platform.name}: inbox appears empty, waiting 3s and retrying...`);
    await new Promise(r => setTimeout(r, 3000));
    convData = await apiGet(platform.convUrl(base), platform.token);
    convs = Array.isArray(convData)
      ? convData
      : (convData.conversations || convData.data || convData.items || []);
  }

  if (!convs.length) {
    log(`${platform.name}: no conversations found`);
    state.lastScan[platform.name] = new Date().toISOString();
    return;
  }

  // Filter: unread OR updated after cursor
  const relevant = convs.filter(c => {
    if (c.unread === true || c.has_unread === true || c.unread_count > 0) return true;
    if (cursor && c.last_message_at) return c.last_message_at > cursor;
    return true; // if no cursor, check all
  });

  log(`${platform.name}: ${relevant.length}/${convs.length} conversations to check`);

  for (const conv of relevant) {
    const handle = platform.getSenderHandle(conv);
    if (!handle) continue;

    // Skip conversations where WE sent the last message (no reply from them yet)
    if (conv.lastMessageIsOutbound === true) {
      log(`${platform.name}: ${handle} — last message was ours, skipping`);
      continue;
    }

    const convId = conv.id || conv.conversation_id || handle;

    // If the conversation list already tells us their last message (lastMessageIsOutbound===false),
    // use it directly — no need to open the conversation and wait for DOM to render.
    let msgText = null;
    if (conv.lastMessageIsOutbound === false && conv.lastMessage && conv.lastMessage.length > 3) {
      msgText = conv.lastMessage;
    } else if (conv.lastMessageIsOutbound === undefined) {
      // Platform doesn't provide direction info — fall back to opening conversation
      if (platform.openUrl) {
        const opened = await fetch(platform.openUrl(base), {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${platform.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: handle }),
          signal: AbortSignal.timeout(10_000),
        }).catch(() => null);
        if (opened && opened.ok) {
          await new Promise(r => setTimeout(r, 3000));
          const msgUrl = platform.msgUrl(base);
          const msgData = await apiGet(msgUrl, platform.token);
          if (!msgData.error) {
            const msgs = Array.isArray(msgData) ? msgData : (msgData.messages || msgData.data || []);
            const inbound = msgs.filter(m => {
              if (!platform.isInbound(m)) return false;
              if (cursor && m.created_at) return m.created_at > cursor;
              return true;
            });
            if (inbound.length) msgText = platform.getMsgText(inbound[inbound.length - 1]);
          }
        }
      } else {
        // Use conversationId-based message fetch for Twitter/TikTok/LinkedIn
        const msgData = await apiGet(platform.msgUrl(base, convId), platform.token);
        if (!msgData.error) {
          const msgs = Array.isArray(msgData) ? msgData : (msgData.messages || msgData.data || []);
          const inbound = msgs.filter(m => {
            if (!platform.isInbound(m)) return false;
            if (cursor && m.created_at) return m.created_at > cursor;
            return true;
          });
          if (inbound.length) msgText = platform.getMsgText(inbound[inbound.length - 1]);
        }
      }
    }

    if (!msgText) continue;

    // Contact matcher
    const contact = await findContact(platform.name, handle);
    if (!contact) {
      log(`Unknown sender ${handle} on ${platform.name} — skipping`);
      continue;
    }

    // Dedup check
    const isDup = await recentReplyExists(contact.id);
    if (isDup) {
      log(`Dedup: ${handle} on ${platform.name} already recorded within 1h — skipping`);
      continue;
    }

    log(`Reply detected: ${handle} on ${platform.name}`, { contactId: contact.id, preview: msgText.slice(0, 50) });

    // Generate Claude next_action
    let nextAction = null;
    if (!DRY_RUN) {
      nextAction = await generateNextAction(contact, msgText);
      if (!nextAction) {
        const name = contact.display_name || handle;
        nextAction = `Reply to ${name}'s message on ${platform.name} within 2 hours — acknowledge their interest and ask about their current automation setup.`;
      }
    }

    // Update CRM
    const updated = await updateCRM(contact, platform.name, handle, msgText, nextAction);

    if (updated && !DRY_RUN) {
      // Post to CRMLite (non-fatal)
      await postCRMLiteAction(contact, platform.name, msgText);

      // Telegram alert
      const preview = msgText.slice(0, 50);
      const name = contact.display_name || handle;
      await sendTelegram(`\u{1F4AC} Reply detected! ${name} on ${platform.name}: "${preview}"`);
    }

    results.push({ platform: platform.name, handle, contactId: contact.id, msgText });
  }

  // Update cursor
  state.lastScan[platform.name] = new Date().toISOString();
}

// ── Main scan cycle ─────────────────────────────────────────────────────────────
async function runScan() {
  const state = readState();
  const results = [];
  let errors = 0;

  for (const platform of PLATFORMS) {
    try {
      await scanPlatform(platform, state, results);
    } catch (e) {
      log(`Error scanning ${platform.name}`, { error: String(e) });
      errors++;
    }
  }

  state.totalRepliesFound = (state.totalRepliesFound || 0) + results.length;
  state.lastRunAt = new Date().toISOString();
  writeState(state);

  log(`Scan complete — ${results.length} new replies, ${errors} platform errors`);
  return results;
}

// ── Entry point ────────────────────────────────────────────────────────────────
async function main() {
  if (DRY_RUN) log('[DRY-RUN] mode — will not write to CRM');

  // Apply migration on first start (idempotent)
  await ensureMigration();

  await sendTelegram('\u{1F50D} Reply bridge started \u2014 scanning IG/TW/TT/LI every 15min');
  log('Reply-to-CRM bridge starting...');

  if (ONCE) {
    await runScan();
    process.exit(0);
  }

  // Daemon loop
  while (true) {
    try {
      await runScan();
    } catch (e) {
      log('Scan cycle error', { error: String(e) });
    }
    log(`Sleeping ${INTERVAL_MS / 60000}min until next scan...`);
    await new Promise(r => setTimeout(r, INTERVAL_MS));
  }
}

// ── Migration (idempotent) ──────────────────────────────────────────────────────
async function ensureMigration() {
  const sql = `
CREATE TABLE IF NOT EXISTS reply_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES crm_contacts(id),
  platform text NOT NULL,
  username text NOT NULL,
  message_text text,
  detected_at timestamptz DEFAULT now(),
  next_action_generated text,
  processed boolean DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_reply_events_contact ON reply_events(contact_id, detected_at DESC);
  `.trim();

  try {
    const res = await fetch(`${SB_URL()}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: sbHeaders(),
      body: JSON.stringify({ query: sql }),
      signal: AbortSignal.timeout(15_000),
    });
    // Table may already exist — any response is fine
  } catch { /* non-fatal */ }
}

main().catch(e => { log('Fatal error', { error: String(e) }); process.exit(1); });
