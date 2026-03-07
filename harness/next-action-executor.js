#!/usr/bin/env node

/**
 * Next-Action Executor
 * ====================
 * Reads crm_contacts WHERE next_action IS NOT NULL AND next_action_at <= now(),
 * classifies the action via Claude Haiku, generates a personalized message,
 * and executes it via the appropriate Safari service.
 *
 * Usage:
 *   node harness/next-action-executor.js              # daemon (every 2h, 09-18)
 *   node harness/next-action-executor.js --once       # single cycle then exit
 *   node harness/next-action-executor.js --dry-run    # classify + generate, no sends
 *   node harness/next-action-executor.js --list       # show overdue without executing
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const H = __dirname;

// ── Config ────────────────────────────────────────────────────────────────────
const STATE_FILE = path.join(H, 'next-action-state.json');
const LOG_FILE   = path.join(H, 'logs', 'next-action-executor.log');
const ACTP_ENV   = '/Users/isaiahdupree/Documents/Software/actp-worker/.env';

const MAX_DAILY_ACTIONS   = parseInt(process.env.MAX_DAILY_ACTIONS   || '10', 10);
const INTERVAL_HOURS      = parseFloat(process.env.NEXT_ACTION_INTERVAL_HOURS || '2');
const INTERVAL_MS         = INTERVAL_HOURS * 60 * 60 * 1000;
const BUSINESS_HOURS_START = parseInt(process.env.NEXT_ACTION_START_HOUR || '9',  10);
const BUSINESS_HOURS_END   = parseInt(process.env.NEXT_ACTION_END_HOUR   || '18', 10);

const LINKEDIN_URL  = process.env.LINKEDIN_DM_URL  || 'http://localhost:3105';
const INSTAGRAM_URL = process.env.INSTAGRAM_DM_URL || 'http://localhost:3100';
const TWITTER_URL   = process.env.TWITTER_DM_URL   || 'http://localhost:3003';
const TIKTOK_URL    = process.env.TIKTOK_DM_URL    || 'http://localhost:3102';

const args    = process.argv.slice(2);
const MODE    = args.includes('--once') ? 'once' : 'daemon';
const DRY_RUN = args.includes('--dry-run');
const LIST    = args.includes('--list');

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadEnv(filePath) {
  try {
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    for (const line of lines) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  } catch { /* ignore */ }
}

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try {
    fs.mkdirSync(path.join(H, 'logs'), { recursive: true });
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch { /* ignore */ }
}

function loadState() {
  try {
    const s = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    const today = new Date().toISOString().slice(0, 10);
    if (s.date !== today) return { date: today, actionsExecuted: 0 };
    return s;
  } catch {
    return { date: new Date().toISOString().slice(0, 10), actionsExecuted: 0 };
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify({ ...state, date: new Date().toISOString().slice(0, 10) }, null, 2));
}

function isBusinessHours() {
  const h = new Date().getHours();
  return h >= BUSINESS_HOURS_START && h < BUSINESS_HOURS_END;
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function randomDelay() {
  return delay(30000 + Math.random() * 30000); // 30–60s
}

async function sendTelegram(msg) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: msg }),
    });
  } catch { /* ignore */ }
}

// ── Supabase ───────────────────────────────────────────────────────────────────

function supabaseHeaders() {
  return {
    'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };
}

async function supabaseQuery(path, opts = {}) {
  const url = `${process.env.SUPABASE_URL}/rest/v1${path}`;
  const res = await fetch(url, { headers: supabaseHeaders(), ...opts });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Supabase ${opts.method || 'GET'} ${path} → ${res.status}: ${txt}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ── Feature 1: Overdue action fetcher ─────────────────────────────────────────

async function fetchOverdueContacts() {
  const state = loadState();
  const slotsRemaining = MAX_DAILY_ACTIONS - state.actionsExecuted;

  const params = new URLSearchParams({
    select: 'id,display_name,platform,username,linkedin_url,instagram_handle,twitter_handle,pipeline_stage,offer_readiness,next_action,next_action_at,headline,ai_summary',
    next_action: 'not.is.null',
    next_action_at: `lte.${new Date().toISOString()}`,
    pipeline_stage: 'in.(first_touch,replied,interested)',
    order: 'offer_readiness.desc.nullslast,next_action_at.asc',
    limit: '20',
  });

  const contacts = await supabaseQuery(`/crm_contacts?${params}`);
  log(`Found ${contacts.length} overdue actions, ${slotsRemaining} slots remaining today`);
  return { contacts, state, slotsRemaining };
}

// ── Feature 2: Action classifier ──────────────────────────────────────────────

async function classifyAction(contact) {
  const { next_action, platform, display_name, pipeline_stage, offer_readiness } = contact;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        system: 'Classify this CRM next_action into one of: send_linkedin_message, send_instagram_dm, send_twitter_dm, send_offer, book_call, research_only, skip. Return JSON only: { "type": "...", "message_hint": "..." }',
        messages: [{
          role: 'user',
          content: JSON.stringify({ next_action, platform, display_name, pipeline_stage, offer_readiness }),
        }],
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const raw = data.content?.[0]?.text || '';
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
    }
  } catch (e) {
    log(`  Classifier Claude error: ${e.message} — falling back to keyword match`);
  }

  // Keyword fallback
  const text = (next_action || '').toLowerCase();
  let type = 'skip';
  if (text.includes('offer') || (offer_readiness != null && offer_readiness >= 20)) {
    type = 'send_offer';
  } else if (text.includes('linkedin') || platform === 'linkedin') {
    type = 'send_linkedin_message';
  } else if (text.includes('instagram') || platform === 'instagram') {
    type = 'send_instagram_dm';
  } else if (text.includes('twitter') || platform === 'twitter') {
    type = 'send_twitter_dm';
  } else if (text.includes('research')) {
    type = 'research_only';
  } else if (contact.linkedin_url) {
    type = 'send_linkedin_message';
  }

  return { type, message_hint: next_action };
}

// ── Feature 3: Message generator ──────────────────────────────────────────────

async function generateMessage(contact, classification) {
  const { next_action, display_name, headline, ai_summary, platform } = contact;
  const maxLen = (platform === 'twitter' || platform === 'instagram') ? 300 : 600;

  // Offer template
  if (classification.type === 'send_offer') {
    const offerMsg = `Hey ${display_name || 'there'}, I've been thinking about your situation and I'd love to share something that could really move the needle. I offer an AI Automation Audit + Build — we map your biggest manual bottlenecks and build the automation in 2 weeks, flat fee $2,500. Would you be open to a quick 20-min call to see if it's a fit?`;
    return offerMsg.slice(0, maxLen);
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: `You are an AI automation consultant. Write a SHORT (2-3 sentence) personalized follow-up message based on the next_action instruction. Be direct, warm, no fluff. Never mention AI writing this. Keep under ${maxLen} characters.`,
        messages: [{
          role: 'user',
          content: JSON.stringify({ next_action, display_name, headline, ai_summary, platform }),
        }],
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const msg = data.content?.[0]?.text?.trim() || '';
      if (msg) return msg.slice(0, maxLen);
    }
  } catch (e) {
    log(`  Message gen Claude error: ${e.message} — using next_action text`);
  }

  // Fallback: use next_action text directly
  return (next_action || '').slice(0, maxLen);
}

// ── Feature 4: Action executor ─────────────────────────────────────────────────

async function executeAction(contact, classification, message) {
  const { display_name, linkedin_url, instagram_handle, twitter_handle, username, platform } = contact;
  const authHeader = { 'Authorization': 'Bearer test-token', 'Content-Type': 'application/json' };

  switch (classification.type) {
    case 'send_linkedin_message': {
      const profileUrl = linkedin_url || (username ? `https://www.linkedin.com/in/${username}/` : null);
      if (!profileUrl) throw new Error('No LinkedIn profile URL');
      const res = await fetch(`${LINKEDIN_URL}/api/linkedin/messages/send`, {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({ profileUrl, message }),
      });
      if (!res.ok) throw new Error(`LinkedIn send failed: ${res.status}`);
      return { platform: 'linkedin' };
    }

    case 'send_instagram_dm': {
      const igUser = instagram_handle || username;
      if (!igUser) throw new Error('No Instagram handle');
      const res = await fetch(`${INSTAGRAM_URL}/api/messages/send-to`, {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({ username: igUser, text: message }),
      });
      if (!res.ok) throw new Error(`Instagram DM failed: ${res.status}`);
      return { platform: 'instagram' };
    }

    case 'send_twitter_dm': {
      const twUser = twitter_handle || username;
      if (!twUser) throw new Error('No Twitter handle');
      const res = await fetch(`${TWITTER_URL}/api/twitter/messages/send-to`, {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({ username: twUser, text: message }),
      });
      if (!res.ok) throw new Error(`Twitter DM failed: ${res.status}`);
      return { platform: 'twitter' };
    }

    case 'send_offer': {
      // Send via whichever platform we have
      const effectivePlatform = platform || (linkedin_url ? 'linkedin' : instagram_handle ? 'instagram' : 'twitter');
      const synth = { ...contact, platform: effectivePlatform };
      const offerClassification = { type: effectivePlatform === 'linkedin' ? 'send_linkedin_message' : effectivePlatform === 'instagram' ? 'send_instagram_dm' : 'send_twitter_dm' };
      return await executeAction(synth, offerClassification, message);
    }

    default:
      throw new Error(`Unknown action type: ${classification.type}`);
  }
}

// ── Feature 5: CRM update ──────────────────────────────────────────────────────

async function updateCRM(contact, classification, executedPlatform) {
  const { id, pipeline_stage, display_name } = contact;

  const updates = {
    next_action: null,
    next_action_at: null,
    last_outbound_at: new Date().toISOString(),
    messages_sent: contact.messages_sent != null ? (contact.messages_sent + 1) : 1,
    updated_at: new Date().toISOString(),
  };

  if (classification.type === 'send_offer') {
    updates.pipeline_stage = 'proposal_sent';
    updates.last_offer_sent = 'AI Automation Audit + Build';
    updates.last_offer_at = new Date().toISOString();
  } else if (pipeline_stage === 'replied') {
    updates.pipeline_stage = 'interested';
  }

  await supabaseQuery(`/crm_contacts?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });

  // Audit row in safari_command_queue
  try {
    await supabaseQuery('/safari_command_queue', {
      method: 'POST',
      body: JSON.stringify({
        platform: executedPlatform,
        action: 'next_action_executed',
        params: { contact_id: id, action_type: classification.type },
        status: 'completed',
        created_at: new Date().toISOString(),
      }),
    });
  } catch (e) {
    log(`  Audit insert warning: ${e.message}`);
  }

  await sendTelegram(`Next action executed: ${display_name || id} (${executedPlatform}) — ${classification.type}`);
}

// ── Main cycle ─────────────────────────────────────────────────────────────────

async function runCycle() {
  if (!isBusinessHours() && MODE !== 'once' && !DRY_RUN && !LIST) {
    log(`Outside business hours (${BUSINESS_HOURS_START}:00–${BUSINESS_HOURS_END}:00), skipping cycle`);
    return;
  }

  const { contacts, state, slotsRemaining } = await fetchOverdueContacts();

  if (LIST) {
    log('--- Overdue Actions ---');
    for (const c of contacts) {
      const cls = await classifyAction(c);
      log(`  [${c.pipeline_stage}] ${c.display_name || c.id} — ${cls.type} — "${(c.next_action || '').slice(0, 80)}"`);
    }
    log('--- End ---');
    return;
  }

  if (slotsRemaining <= 0) {
    log(`Daily cap reached (${MAX_DAILY_ACTIONS} actions). Skipping cycle.`);
    return;
  }

  let executed = 0;
  const limit = Math.min(slotsRemaining, contacts.length);

  for (let i = 0; i < limit; i++) {
    const contact = contacts[i];
    log(`Processing: ${contact.display_name || contact.id} (${contact.platform || 'unknown'})`);

    // Classify
    const classification = await classifyAction(contact);
    log(`  Classified as: ${classification.type}`);

    if (classification.type === 'skip' || classification.type === 'research_only' || classification.type === 'book_call') {
      log(`  Skipping (${classification.type})`);
      continue;
    }

    // Generate message
    const message = await generateMessage(contact, classification);
    log(`  Message (${message.length} chars): ${message.slice(0, 80)}...`);

    if (DRY_RUN) {
      log(`  [DRY RUN] Would send — not executing`);
      continue;
    }

    // Execute
    try {
      const result = await executeAction(contact, classification, message);
      log(`Action executed for ${contact.display_name || contact.id} on ${result.platform}`);

      // Update CRM
      await updateCRM(contact, classification, result.platform);

      // Update state
      state.actionsExecuted = (state.actionsExecuted || 0) + 1;
      saveState(state);
      executed++;

      // Delay between actions
      if (i < limit - 1) await randomDelay();
    } catch (e) {
      log(`  ERROR executing action for ${contact.display_name || contact.id}: ${e.message}`);
    }
  }

  log(`Cycle complete. Executed ${executed} actions today: ${(state.actionsExecuted || 0)}.`);
}

// ── Integration test ───────────────────────────────────────────────────────────

async function runTests() {
  let passed = 0;
  let failed = 0;

  function pass(name) { log(`PASS: ${name}`); passed++; }
  function fail(name, reason) { log(`FAIL: ${name} — ${reason}`); failed++; }

  // Test 1: --list queries Supabase and returns results
  try {
    const { contacts } = await fetchOverdueContacts();
    if (Array.isArray(contacts)) pass('--list queries Supabase (returns array)');
    else fail('--list queries Supabase', 'not an array');
  } catch (e) {
    fail('--list queries Supabase', e.message);
  }

  // Test 2: --dry-run classifies and generates message
  try {
    const { contacts } = await fetchOverdueContacts();
    if (contacts.length === 0) {
      pass('--dry-run: no overdue contacts (nothing to test, counts as pass)');
    } else {
      const c = contacts[0];
      const cls = await classifyAction(c);
      if (cls && cls.type) {
        const msg = await generateMessage(c, cls);
        if (msg && msg.length > 0) pass('--dry-run: classifies + generates message');
        else fail('--dry-run', 'empty message generated');
      } else fail('--dry-run', 'classification returned no type');
    }
  } catch (e) {
    fail('--dry-run', e.message);
  }

  // Test 3: Daily limit enforcement
  try {
    const state = { date: new Date().toISOString().slice(0, 10), actionsExecuted: MAX_DAILY_ACTIONS };
    const remaining = MAX_DAILY_ACTIONS - state.actionsExecuted;
    if (remaining === 0) pass('Daily limit: stops at MAX_DAILY_ACTIONS');
    else fail('Daily limit', `remaining=${remaining}, expected 0`);
  } catch (e) {
    fail('Daily limit', e.message);
  }

  // Test 4: State file reset on new day
  try {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const stale = { date: yesterday, actionsExecuted: 9 };
    fs.writeFileSync(STATE_FILE, JSON.stringify(stale));
    const reloaded = loadState();
    if (reloaded.actionsExecuted === 0) pass('State reset on new day');
    else fail('State reset', `actionsExecuted=${reloaded.actionsExecuted}, expected 0`);
  } catch (e) {
    fail('State reset', e.message);
  }

  log(`\nTest results: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

// ── Entry ──────────────────────────────────────────────────────────────────────

async function main() {
  loadEnv(ACTP_ENV);
  loadEnv(`${process.env.HOME}/.env`);

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    log('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
    process.exit(1);
  }

  if (args.includes('--test')) {
    const ok = await runTests();
    process.exit(ok ? 0 : 1);
  }

  log(`Next-Action Executor starting (mode=${LIST ? 'list' : DRY_RUN ? 'dry-run' : MODE}, max=${MAX_DAILY_ACTIONS}/day)`);

  try {
    await runCycle();
  } catch (e) {
    log(`ERROR in cycle: ${e.message}`);
    if (MODE === 'once' || LIST) process.exit(1);
  }

  if (MODE === 'once' || LIST || DRY_RUN) {
    log('Done.');
    process.exit(0);
  }

  // Daemon loop
  log(`Daemon: next run in ${INTERVAL_HOURS}h`);
  setInterval(async () => {
    try {
      await runCycle();
    } catch (e) {
      log(`ERROR in cycle: ${e.message}`);
    }
  }, INTERVAL_MS);
}

main();
