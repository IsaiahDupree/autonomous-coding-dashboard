#!/usr/bin/env node
/**
 * Email Follow-up Sequence Daemon
 * =================================
 * Runs a 3-step nurture sequence against Gmail contacts at `first_touch`.
 *
 * Step 1 (day 0)  — Value-first introduction
 * Step 2 (day 3)  — Social proof + relevance
 * Step 3 (day 7)  — Direct offer: free AI Automation Audit
 *
 * Usage:
 *   node harness/email-followup-sequence.js           # daemon (every 4h, 09-17)
 *   node harness/email-followup-sequence.js --once    # single cycle then exit
 *   node harness/email-followup-sequence.js --dry-run # generate emails, don't send
 *   node harness/email-followup-sequence.js --status  # show per-contact progress
 *   node harness/email-followup-sequence.js --init    # initialize new contacts only
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const H = __dirname;

const LOG_FILE    = path.join(H, 'logs/email-followup-sequence.log');
const STATE_FILE  = path.join(H, 'email-sequence-state.json');
const OUTBOX_DIR  = path.join(H, 'email-outbox');
const ACTP_ENV    = '/Users/isaiahdupree/Documents/Software/actp-worker/.env';
const HOME_ENV    = `${process.env.HOME}/.env`;

const DAILY_LIMIT  = parseInt(process.env.EMAIL_DAILY_LIMIT || '15', 10);
const INTERVAL_MS  = (parseInt(process.env.EMAIL_INTERVAL_HOURS || '4', 10)) * 60 * 60 * 1000;
const ACTIVE_START = 9;
const ACTIVE_END   = 17;
const SEND_DELAY_MS = 30_000; // 30s between sends

const STEP_DELAYS = [0, 3, 7]; // days after previous step

const args = process.argv.slice(2);
const MODE    = args.includes('--once') ? 'once' : 'daemon';
const DRY_RUN = args.includes('--dry-run');
const STATUS  = args.includes('--status');
const INIT    = args.includes('--init');

// ── Env ─────────────────────────────────────────────────────────────────────

function loadEnv(p) {
  try {
    for (const l of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = l.match(/^([A-Z0-9_]+)=(.+)/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch { /* non-fatal */ }
}
loadEnv(HOME_ENV);
loadEnv(ACTP_ENV);

// ── Logging ──────────────────────────────────────────────────────────────────

fs.mkdirSync(path.join(H, 'logs'), { recursive: true });
fs.mkdirSync(OUTBOX_DIR, { recursive: true });

function log(msg, data = {}) {
  const e = { ts: new Date().toISOString(), msg, ...data };
  console.log(`[email-seq] ${msg}`);
  try { fs.appendFileSync(LOG_FILE, JSON.stringify(e) + '\n'); } catch {}
}

// ── Supabase ─────────────────────────────────────────────────────────────────

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  return createClient(url, key);
}

// ── Apply migration on startup ────────────────────────────────────────────────

async function ensureTable(db) {
  // Check if table exists
  const { error } = await db.from('email_sequence_state').select('id').limit(1);
  if (!error) return; // table exists

  log('email_sequence_state table not found — attempting to create via Management API');

  const tokenPath = `${process.env.HOME}/.supabase/access-token`;
  if (!fs.existsSync(tokenPath)) {
    log('No supabase access-token found — skipping auto-migration (apply harness/migrations/20260307_email_sequence.sql manually)');
    return;
  }
  const token = fs.readFileSync(tokenPath, 'utf8').trim();
  const sql = fs.readFileSync(path.join(H, 'migrations/20260307_email_sequence.sql'), 'utf8');
  const projectRef = 'ivhfuhxorppptyuofbgq';
  const resp = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  if (resp.ok) log('Migration applied via Management API');
  else log('Migration via Management API failed — apply SQL manually');
}

// ── State ─────────────────────────────────────────────────────────────────────

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch { return { lastRun: null, sentToday: 0, lastResetDate: null }; }
}

function writeState(s) {
  try { fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2)); } catch {}
}

function getDailyCount(state) {
  const today = new Date().toISOString().slice(0, 10);
  if (state.lastResetDate !== today) return 0;
  return state.sentToday || 0;
}

function incrementDailyCount(state) {
  const today = new Date().toISOString().slice(0, 10);
  if (state.lastResetDate !== today) {
    state.lastResetDate = today;
    state.sentToday = 0;
  }
  state.sentToday = (state.sentToday || 0) + 1;
  writeState(state);
}

// ── Email templates ───────────────────────────────────────────────────────────

const BASE_TEMPLATES = [
  {
    step: 0,
    subjectTemplate: `Quick question about your AI automation stack, {first_name}`,
    bodyTemplate: `Hi {first_name},

I came across your profile and noticed you're working on {what_theyre_building_or_role}.

Quick question: what's the most manual, time-consuming process in your business right now that you wish you could automate?

I ask because I've been helping SaaS founders eliminate those exact bottlenecks with AI agents — things like lead research, outreach sequences, and CRM updates that eat 10+ hours a week.

If you're running into anything like that, I'd love to share what's been working. No pitch — just genuinely curious what's slowing you down.

Best,
Isaiah`,
  },
  {
    step: 1,
    subjectTemplate: `How a founder cut 10hrs/week with AI agents`,
    bodyTemplate: `Hi {first_name},

Last month I helped a SaaS founder automate their entire outreach pipeline — prospect research, personalized DMs, and CRM updates — with a single AI agent stack.

Result: 10 hours/week back, 3x more outreach, zero extra headcount.

Given that you're {what_theyre_building_or_role}, I imagine the repetitive ops side can get heavy.

If you ever want to talk through what that could look like for your business, just reply to this — I'm happy to share what worked.

Best,
Isaiah`,
  },
  {
    step: 2,
    subjectTemplate: `Last thing from me — AI Automation Audit (free 30min)`,
    bodyTemplate: `Hi {first_name},

I'll keep this brief — I'm offering free 30-minute AI Automation Audits to founders like you.

In 30 minutes we'll map the 2-3 biggest automation wins in your business and I'll give you a clear action plan — no obligation to work with me afterward.

If that sounds useful, just reply with "audit" and I'll send you a booking link.

Either way, hope the work is going well.

Isaiah`,
  },
];

async function generatePersonalizedEmail(contact, step) {
  const tpl = BASE_TEMPLATES[step];
  const firstName = (contact.name || contact.display_name || 'there').split(' ')[0];
  const role = contact.headline || contact.bio || contact.what_theyre_building || 'your business';

  const subject = tpl.subjectTemplate.replace('{first_name}', firstName);
  const baseBody = tpl.bodyTemplate
    .replace(/\{first_name\}/g, firstName)
    .replace(/\{what_theyre_building_or_role\}/g, role);

  // Try Claude Haiku personalization
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('No ANTHROPIC_API_KEY');

    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });

    const prompt = `You are writing a cold email follow-up. Personalize this email for the contact.

Contact info:
- Name: ${contact.name || contact.display_name || 'Unknown'}
- Headline: ${contact.headline || 'N/A'}
- Bio: ${contact.bio || 'N/A'}
- What they're building: ${contact.what_theyre_building || 'N/A'}

Base email to personalize (keep the same structure, subject, and call to action — just make the body feel more specific to this person):

SUBJECT: ${subject}

${baseBody}

Rules:
- Keep body under 200 words
- Maintain the same tone (warm, direct, no fluff)
- Only reference real info from the contact profile above
- Return ONLY the email body (no subject line, no extra commentary)`;

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    });

    const personalizedBody = msg.content[0]?.text?.trim();
    if (personalizedBody && personalizedBody.length > 50) {
      return { subject, body: personalizedBody };
    }
  } catch (e) {
    log(`Claude personalization failed for ${contact.email} — using base template: ${e.message}`);
  }

  return { subject, body: baseBody };
}

// ── Feature 2: Gmail contact loader + sequence initializer ─────────────────────

async function initializeContacts(db) {
  const { data: contacts, error } = await db
    .from('crm_contacts')
    .select('id, email, name, display_name, headline, bio, what_theyre_building, do_not_do')
    .eq('platform', 'gmail')
    .not('email', 'is', null);

  if (error) { log('Failed to load gmail contacts: ' + error.message); return 0; }

  const eligible = (contacts || []).filter(c => {
    const dnd = (c.do_not_do || '').toLowerCase();
    return !dnd.includes('no email') && !dnd.includes('noemail');
  });

  let initialized = 0;
  for (const c of eligible) {
    const { error: insertErr } = await db
      .from('email_sequence_state')
      .insert({
        contact_id:   c.id,
        email:        c.email,
        sequence_step: 0,
        next_send_at:  new Date().toISOString(),
        status:        'active',
        emails_sent:   0,
      })
      .select()
      .single();

    if (!insertErr) initialized++;
    // Unique constraint violation = already initialized → skip silently
  }

  log(`Initialized ${initialized} new Gmail contacts into email sequence`);
  return initialized;
}

// ── Feature 4: Gmail sender with graceful degradation ────────────────────────

async function checkGmailApi() {
  // Try agent-comms service on known ports
  const ports = [parseInt(process.env.GMAIL_SERVICE_PORT || '0'), 8090, 3108, 3109];
  for (const port of ports) {
    if (!port) continue;
    try {
      const r = await fetch(`http://localhost:${port}/health`, { signal: AbortSignal.timeout(2000) });
      const j = await r.json().catch(() => ({}));
      if (j.gmail || j.service === 'gmail' || j.status === 'ok') {
        return { available: true, port };
      }
    } catch { /* not available */ }
  }

  // Try actp-worker Gmail check
  try {
    const r = await fetch('http://localhost:8090/api/gmail/health', { signal: AbortSignal.timeout(2000) });
    if (r.ok) return { available: true, port: 8090, path: '/api/gmail/send' };
  } catch { /* not available */ }

  return { available: false };
}

async function sendViaGmailApi(port, apiPath, to, subject, body) {
  const sendPath = apiPath || '/api/gmail/send';
  const r = await fetch(`http://localhost:${port}${sendPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, subject, body }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!r.ok) throw new Error(`Gmail API returned ${r.status}`);
  return true;
}

function writeToOutbox(contact, step, subject, body) {
  const date = new Date().toISOString().slice(0, 10);
  const fname = `${date}-${contact.id}.json`;
  const outboxPath = path.join(OUTBOX_DIR, fname);
  fs.writeFileSync(outboxPath, JSON.stringify({ to: contact.email, subject, body, contact_id: contact.id, step, queued_at: new Date().toISOString() }, null, 2));
  log(`Email queued to outbox: ${fname}`, { to: contact.email, step });
}

async function recordSentMessage(db, contactId, subject) {
  const { error } = await db.from('crm_message_queue').insert({
    contact_id:  contactId,
    platform:    'gmail',
    direction:   'outbound',
    content:     subject,
    sent_at:     new Date().toISOString(),
  });
  if (error) log('crm_message_queue insert failed: ' + error.message);
}

async function updateSequenceAfterSend(db, seqRow, nextStep) {
  const stepDelay = STEP_DELAYS[nextStep] ?? null;
  const nextSendAt = stepDelay !== null
    ? new Date(Date.now() + stepDelay * 86400000).toISOString()
    : null;

  await db.from('email_sequence_state').update({
    emails_sent:   seqRow.emails_sent + 1,
    sequence_step: nextStep,
    last_sent_at:  new Date().toISOString(),
    next_send_at:  nextSendAt,
    status:        nextStep >= 3 ? 'completed' : 'active',
    updated_at:    new Date().toISOString(),
  }).eq('id', seqRow.id);

  await db.from('crm_contacts').update({
    last_outbound_at: new Date().toISOString(),
  }).eq('id', seqRow.contact_id);
}

// ── Feature 5: Reply detector ────────────────────────────────────────────────

async function sendTelegram(msg) {
  const token = process.env.TELEGRAM_BOT_TOKEN || '8794428438:AAHIkgi_S9EYTr_8GcaDmjv4IlsdF3tYJEc';
  const chat  = process.env.TELEGRAM_CHAT_ID  || '7070052335';
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text: msg }),
      signal: AbortSignal.timeout(8000),
    });
  } catch { /* non-fatal */ }
}

async function detectReplies(db) {
  const { data: replied, error } = await db
    .from('crm_contacts')
    .select('id, name, display_name, email, last_inbound_at, last_outbound_at, pipeline_stage, replies_received')
    .eq('platform', 'gmail')
    .not('last_inbound_at', 'is', null)
    .not('last_outbound_at', 'is', null);

  if (error) { log('Reply detection query failed: ' + error.message); return; }

  const repliers = (replied || []).filter(c =>
    c.last_inbound_at > c.last_outbound_at
  );

  for (const contact of repliers) {
    // Check if still active in sequence
    const { data: seq } = await db
      .from('email_sequence_state')
      .select('id, status')
      .eq('contact_id', contact.id)
      .single();

    if (!seq || seq.status === 'replied') continue; // already handled

    log(`Reply detected from ${contact.email}`);

    // Stop sequence for this contact
    await db.from('email_sequence_state').update({
      status:     'replied',
      updated_at: new Date().toISOString(),
    }).eq('id', seq.id);

    // Advance CRM stage
    await db.from('crm_contacts').update({
      pipeline_stage:   'replied',
      replies_received: (contact.replies_received || 0) + 1,
    }).eq('id', contact.id);

    // Generate Claude next action
    try {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (apiKey) {
        const { default: Anthropic } = await import('@anthropic-ai/sdk');
        const client = new Anthropic({ apiKey });
        const msg = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 200,
          messages: [{ role: 'user', content: `A Gmail contact named ${contact.name || contact.email} replied to our email sequence. In 1-2 sentences, what should be the next action to convert them to a client? Be specific and actionable.` }],
        });
        const nextAction = msg.content[0]?.text?.trim();
        if (nextAction) {
          await db.from('crm_contacts').update({ next_action: nextAction }).eq('id', contact.id);
          log(`Next action set for ${contact.email}: ${nextAction}`);
        }
      }
    } catch (e) { log('Claude next-action failed: ' + e.message); }

    const displayName = contact.name || contact.display_name || contact.email;
    await sendTelegram(`📧 Gmail reply from ${displayName}: (${contact.email})`);
  }

  if (repliers.length > 0) log(`Reply detection: found ${repliers.length} replies`);
}

// ── Feature 6: Main cycle ────────────────────────────────────────────────────

function isActiveHour() {
  const h = new Date().getHours();
  return h >= ACTIVE_START && h < ACTIVE_END;
}

async function runCycle(opts = {}) {
  const { dryRun = DRY_RUN, initOnly = INIT } = opts;
  const db    = getSupabase();
  const state = readState();

  if (!initOnly) await ensureTable(db);

  // Always initialize new contacts
  const newCount = await initializeContacts(db);

  if (initOnly) {
    log(`--init complete. ${newCount} new contacts added.`);
    return { newCount };
  }

  // Detect replies first
  await detectReplies(db);

  if (dryRun) {
    log('--dry-run: generating step-1 emails for up to 3 active contacts');
    const { data: preview } = await db
      .from('email_sequence_state')
      .select('id, contact_id, email, sequence_step, emails_sent')
      .eq('status', 'active')
      .eq('sequence_step', 0)
      .limit(3);

    if (!preview?.length) { log('No step-0 contacts found for dry-run'); return { dryRun: true, generated: 0 }; }

    for (const seq of preview) {
      const { data: contact } = await db.from('crm_contacts').select('*').eq('id', seq.contact_id).single();
      if (!contact) continue;
      const { subject, body } = await generatePersonalizedEmail(contact, 0);
      log(`[DRY-RUN] Step 1 email for ${seq.email}`);
      log(`  Subject: ${subject}`);
      log(`  Body preview: ${body.slice(0, 100)}...`);
    }
    return { dryRun: true, generated: preview.length };
  }

  if (!isActiveHour()) {
    log(`Outside active hours (${ACTIVE_START}:00-${ACTIVE_END}:00) — skipping sends`);
    return { skipped: 'outside_hours' };
  }

  const dailySent = getDailyCount(state);
  if (dailySent >= DAILY_LIMIT) {
    log(`Daily limit reached (${dailySent}/${DAILY_LIMIT}) — skipping sends`);
    return { skipped: 'daily_limit', sent: dailySent };
  }

  // Find contacts due to send
  const { data: due, error: dueErr } = await db
    .from('email_sequence_state')
    .select('id, contact_id, email, sequence_step, emails_sent')
    .eq('status', 'active')
    .lte('next_send_at', new Date().toISOString())
    .lt('emails_sent', 3)
    .order('next_send_at')
    .limit(DAILY_LIMIT - dailySent);

  if (dueErr) { log('Failed to query due emails: ' + dueErr.message); return { error: dueErr.message }; }
  if (!due?.length) { log('No emails due to send'); return { sent: 0 }; }

  log(`${due.length} emails due to send (daily budget remaining: ${DAILY_LIMIT - dailySent})`);

  const gmailApi = await checkGmailApi();
  log(`Gmail API: ${gmailApi.available ? `available :${gmailApi.port}` : 'not available (will write to outbox)'}`);

  let sent = 0;
  for (const seq of due) {
    if (getDailyCount(readState()) >= DAILY_LIMIT) {
      log(`Daily limit hit at ${sent} sends — stopping`);
      break;
    }

    const { data: contact } = await db.from('crm_contacts').select('*').eq('id', seq.contact_id).single();
    if (!contact) continue;

    // Double-check do_not_do
    const dnd = (contact.do_not_do || '').toLowerCase();
    if (dnd.includes('no email') || contact.unsubscribed) {
      await db.from('email_sequence_state').update({ status: 'unsubscribed', updated_at: new Date().toISOString() }).eq('id', seq.id);
      continue;
    }

    const step = seq.sequence_step;
    if (step >= 3) {
      await db.from('email_sequence_state').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', seq.id);
      continue;
    }

    const { subject, body } = await generatePersonalizedEmail(contact, step);

    let emailSent = false;
    if (gmailApi.available) {
      try {
        await sendViaGmailApi(gmailApi.port, gmailApi.path, seq.email, subject, body);
        emailSent = true;
        log(`Sent step ${step + 1} email to ${seq.email} via Gmail API`);
      } catch (e) {
        log(`Gmail API send failed: ${e.message} — writing to outbox`);
      }
    }

    if (!emailSent) {
      writeToOutbox(contact, step, subject, body);
      emailSent = true; // treat outbox write as "sent" for sequence tracking
    }

    if (emailSent) {
      await recordSentMessage(db, seq.contact_id, subject);
      await updateSequenceAfterSend(db, seq, step + 1);
      incrementDailyCount(readState());
      sent++;

      if (sent < due.length) {
        log(`Waiting ${SEND_DELAY_MS / 1000}s before next send...`);
        await new Promise(r => setTimeout(r, SEND_DELAY_MS));
      }
    }
  }

  state.lastRun = new Date().toISOString();
  writeState(state);
  log(`Cycle complete: ${sent} emails sent`);
  return { sent };
}

// ── Status command ────────────────────────────────────────────────────────────

async function showStatus() {
  const db = getSupabase();
  const { data: rows, error } = await db
    .from('email_sequence_state')
    .select('email, sequence_step, status, emails_sent, last_sent_at, next_send_at')
    .order('next_send_at');

  if (error) { log('Status query failed: ' + error.message); return; }

  const counts = { active: 0, replied: 0, completed: 0, unsubscribed: 0, bounced: 0 };
  for (const r of (rows || [])) counts[r.status] = (counts[r.status] || 0) + 1;

  console.log('\n=== Email Sequence Status ===');
  console.log(`Total in sequence: ${rows?.length || 0}`);
  console.log(`  active: ${counts.active}  replied: ${counts.replied}  completed: ${counts.completed}  unsubscribed: ${counts.unsubscribed}`);
  console.log('\nNext 10 due:');
  const due = (rows || []).filter(r => r.status === 'active').slice(0, 10);
  for (const r of due) {
    const nextStr = r.next_send_at ? new Date(r.next_send_at).toLocaleString() : 'now';
    console.log(`  [step ${r.sequence_step}] ${r.email}  next: ${nextStr}  sent: ${r.emails_sent}`);
  }
  console.log('');

  const state = readState();
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = state.lastResetDate === today ? (state.sentToday || 0) : 0;
  console.log(`Today's sends: ${todayCount}/${DAILY_LIMIT}`);
  console.log(`Last cycle: ${state.lastRun || 'never'}`);
  console.log('');
}

// ── Startup Telegram ──────────────────────────────────────────────────────────

async function sendStartupNotification(db) {
  const { data: rows } = await db.from('email_sequence_state').select('id, status, next_send_at').eq('status', 'active');
  const total = rows?.length || 0;
  const today = new Date().toISOString().slice(0, 10) + 'T';
  const dueToday = (rows || []).filter(r => r.next_send_at && r.next_send_at.startsWith(today.slice(0, 10))).length;
  await sendTelegram(`📧 Email sequence started — ${total} contacts in sequence, ~${Math.min(dueToday, DAILY_LIMIT)} due to send today`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (STATUS) { await showStatus(); return; }

  if (INIT) {
    const db = getSupabase();
    await ensureTable(db);
    await initializeContacts(db);
    return;
  }

  if (MODE === 'once' || DRY_RUN) {
    await runCycle();
    return;
  }

  // Daemon mode
  log('Starting email follow-up sequence daemon');
  const db = getSupabase();
  await ensureTable(db);
  await sendStartupNotification(db);

  const runLoop = async () => {
    try {
      await runCycle();
    } catch (e) {
      log('Cycle error: ' + e.message);
    }
    setTimeout(runLoop, INTERVAL_MS);
  };

  runLoop();
}

main().catch(e => { log('Fatal: ' + e.message); process.exit(1); });
