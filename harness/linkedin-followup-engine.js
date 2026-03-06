#!/usr/bin/env node

/**
 * LinkedIn Followup Engine
 * ========================
 * Runs every 4 hours — checks CRMLite for contacts that need follow-up:
 *   1. Fetches LinkedIn contacts from CRMLite
 *   2. Evaluates stage + timing → decides if follow-up is needed
 *   3. Generates personalized follow-up messages
 *   4. Adds to approval queue (NEVER auto-sends)
 *
 * Follow-ups are only sent after human approval via:
 *   - Dashboard: POST /api/linkedin/followup/queue/approve
 *   - CLI:       (future — via LinkedIn Hub)
 *
 * Usage:
 *   node harness/linkedin-followup-engine.js              # run 24/7
 *   node harness/linkedin-followup-engine.js --once       # single cycle, then exit
 *   node harness/linkedin-followup-engine.js --test       # preflight only
 *   node harness/linkedin-followup-engine.js --dry-run    # cycle but don't save queue
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_DIR = __dirname;

const STATE_FILE = path.join(HARNESS_DIR, 'linkedin-followup-state.json');
const QUEUE_FILE = path.join(HARNESS_DIR, 'linkedin-followup-queue.json');
const LOGS_DIR   = path.join(HARNESS_DIR, 'logs');
const GOALS_FILE = '/Users/isaiahdupree/Documents/Software/business-goals.json';
const SAFARI_ENV = '/Users/isaiahdupree/Documents/Software/Safari Automation/.env';
const ACTP_ENV   = '/Users/isaiahdupree/Documents/Software/actp-worker/.env';
const HOME_ENV   = `${process.env.HOME}/.env`;

const CRMLITE_URL = 'https://crmlite-isaiahduprees-projects.vercel.app';
const CYCLE_MS    = 4 * 60 * 60 * 1000; // 4 hours

const args = process.argv.slice(2);
const MODE     = args.includes('--once') ? 'once' : args.includes('--test') ? 'test' : 'daemon';
const DRY_RUN  = args.includes('--dry-run');

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
  const line = `${ts} [linkedin-followup] ${msg}`;
  console.log(line);
  if (process.stdout.isTTY) {
    try {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
      fs.appendFileSync(path.join(LOGS_DIR, 'linkedin-followup.log'), line + '\n');
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
  try {
    fs.appendFileSync(
      path.join(HARNESS_DIR, 'linkedin-followup-log.ndjson'),
      JSON.stringify(entry) + '\n'
    );
  } catch { /* non-fatal */ }
}

async function fetchWithTimeout(url, opts = {}, ms = 8000) {
  try {
    const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(ms) });
    return res;
  } catch { return null; }
}

// ── CRMLite API ─────────────────────────────────────────────────────────────
async function fetchContacts(limit = 100) {
  if (!CRMLITE_KEY) return [];
  const res = await fetchWithTimeout(
    `${CRMLITE_URL}/api/contacts?platform=linkedin&limit=${limit}`,
    { headers: { 'x-api-key': CRMLITE_KEY, 'Content-Type': 'application/json' } },
    8000
  );
  if (!res?.ok) return [];
  const data = await res.json();
  return data.contacts || [];
}

// ── Stage logic ─────────────────────────────────────────────────────────────
function needsFollowup(contact) {
  const stage = contact.pipeline_stage;
  const tags = contact.tags || [];
  const hasLinkedIn = tags.includes('linkedin');
  const hasConnected = tags.includes('connected');
  const lastTouched = contact.last_touched_at ? new Date(contact.last_touched_at) : new Date(contact.created_at || 0);
  const daysSince = (Date.now() - lastTouched.getTime()) / (1000 * 60 * 60 * 24);

  if (stage === 'first_touch' && hasLinkedIn && hasConnected && daysSince >= 3) {
    return { messageType: 'value', nextStage: 'value_sent' };
  }
  if (stage === 'value_sent' && hasLinkedIn && daysSince >= 7) {
    return { messageType: 'offer', nextStage: 'offer_sent' };
  }
  return null;
}

// ── Message generation ──────────────────────────────────────────────────────
function generateMessage(contact, messageType) {
  const firstName = (contact.display_name || '').split(' ')[0] || 'there';
  const notes = contact.notes || '';
  const companyMatch = notes.match(/Company:\s*(.+)/);
  const company = companyMatch?.[1]?.trim() || 'your company';

  if (messageType === 'value') {
    return `Hey ${firstName}, saw you're building ${company}. I wrote up how similar founders cut manual ops with AI workflows — happy to share if useful. — Isaiah`;
  }
  if (messageType === 'offer') {
    return `Hi ${firstName}, following up — I do a free 30-min AI Automation Audit for SaaS founders. Usually surfaces 2-3 high-ROI automation wins. Interested? — Isaiah`;
  }
  return '';
}

// ── Extract LinkedIn username from contact ──────────────────────────────────
function getLinkedInUsername(contact) {
  const accounts = contact.crm_platform_accounts || contact.platform_accounts || [];
  const liAccount = accounts.find(a => a.platform === 'linkedin');
  return liAccount?.username || null;
}

// ── State / Queue ───────────────────────────────────────────────────────────
function loadState() {
  return readJson(STATE_FILE, {
    cycleCount: 0,
    totalQueued: 0,
    lastCycleAt: null,
    nextCycleAt: null,
    running: false,
    startedAt: null,
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

// ── One follow-up cycle ─────────────────────────────────────────────────────
async function runCycle(state) {
  const cycleNum = state.cycleCount + 1;
  const cycleStart = Date.now();
  log(`--- Cycle #${cycleNum} starting ---`);

  const cycleEntry = {
    ts: new Date().toISOString(),
    cycle: cycleNum,
    contacts_fetched: 0,
    followups_needed: 0,
    queued: 0,
    skipped_dedup: 0,
    dry_run: DRY_RUN,
    errors: [],
  };

  // Step 1: Fetch contacts from CRMLite
  const contacts = await fetchContacts(100);
  cycleEntry.contacts_fetched = contacts.length;
  log(`Fetched ${contacts.length} LinkedIn contacts from CRMLite`);

  if (contacts.length === 0) {
    log('No contacts found — skipping cycle');
    appendLog(cycleEntry);
    state.cycleCount++;
    state.lastCycleAt = new Date().toISOString();
    state.nextCycleAt = new Date(Date.now() + CYCLE_MS).toISOString();
    saveState(state);
    return cycleEntry;
  }

  // Step 2: Load current queue for dedup
  const queue = loadQueue();
  const existingContactIds = new Set(
    queue.filter(q => q.status === 'pending_approval').map(q => q.contact_id)
  );

  // Step 3: Evaluate each contact
  for (const contact of contacts) {
    const followup = needsFollowup(contact);
    if (!followup) continue;

    cycleEntry.followups_needed++;

    // Dedup: don't add if contact_id already in queue with pending_approval
    if (existingContactIds.has(contact.id)) {
      cycleEntry.skipped_dedup++;
      continue;
    }

    const liUsername = getLinkedInUsername(contact);
    const message = generateMessage(contact, followup.messageType);

    const queueItem = {
      id: `li-fu-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      queued_at: new Date().toISOString(),
      status: 'pending_approval',
      stage: followup.messageType,
      nextStage: followup.nextStage,
      contact_id: contact.id,
      display_name: contact.display_name,
      profileUrl: liUsername ? `https://linkedin.com/in/${liUsername}` : null,
      message,
      messageType: followup.messageType,
    };

    if (!DRY_RUN) {
      queue.push(queueItem);
      existingContactIds.add(contact.id);
    }
    cycleEntry.queued++;
    log(`  Queued ${followup.messageType} follow-up: ${contact.display_name} (stage: ${contact.pipeline_stage} -> ${followup.nextStage})`);
  }

  // Step 4: Save queue + state
  if (!DRY_RUN) {
    saveQueue(queue);
  }
  appendLog(cycleEntry);

  state.cycleCount++;
  state.totalQueued = (state.totalQueued || 0) + cycleEntry.queued;
  state.lastCycleAt = new Date().toISOString();
  state.nextCycleAt = new Date(Date.now() + CYCLE_MS).toISOString();
  saveState(state);

  const elapsed = ((Date.now() - cycleStart) / 1000).toFixed(1);
  log(`--- Cycle #${cycleNum} done in ${elapsed}s | needed: ${cycleEntry.followups_needed} | queued: ${cycleEntry.queued} | dedup-skipped: ${cycleEntry.skipped_dedup} ---`);
  return cycleEntry;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  log(`Starting LinkedIn Followup Engine (mode: ${MODE}${DRY_RUN ? ', dry-run' : ''})`);
  log(`CRMLite sync: ${CRMLITE_KEY ? 'ENABLED' : 'DISABLED (no CRMLITE_API_KEY)'}`);

  if (MODE === 'test') {
    const contacts = await fetchContacts(5);
    const queue = loadQueue();
    const state = loadState();
    const preflight = {
      crmlite_key: !!CRMLITE_KEY,
      sample_contacts: contacts.length,
      contacts_with_followup: contacts.filter(c => needsFollowup(c) !== null).length,
      queue_length: queue.length,
      pending_approval: queue.filter(q => q.status === 'pending_approval').length,
      state,
    };
    console.log('\nPre-flight:');
    console.log(JSON.stringify(preflight, null, 2));
    if (contacts.length > 0) {
      console.log('\nSample contacts:');
      for (const c of contacts.slice(0, 3)) {
        const fu = needsFollowup(c);
        console.log(`  ${c.display_name} | stage: ${c.pipeline_stage} | tags: ${(c.tags || []).join(',')} | followup: ${fu ? fu.messageType : 'none'}`);
      }
    }
    return;
  }

  const state = loadState();
  state.running = true;
  state.startedAt = state.startedAt || new Date().toISOString();
  saveState(state);

  if (MODE === 'once') {
    try {
      await runCycle(state);
    } finally {
      state.running = false;
      saveState(state);
    }
    return;
  }

  // ── Daemon loop ────────────────────────────────────────────────────────────
  log(`Daemon running — cycle every ${CYCLE_MS / 3600000} hours. Ctrl+C or SIGTERM to stop.`);

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

    try {
      await runCycle(currentState);
    } catch (e) {
      log(`Cycle error: ${e.message}`);
      appendLog({ ts: new Date().toISOString(), cycle_error: e.message });
    }

    log(`Next cycle in ${CYCLE_MS / 3600000} hours (${new Date(Date.now() + CYCLE_MS).toLocaleTimeString()})`);
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
