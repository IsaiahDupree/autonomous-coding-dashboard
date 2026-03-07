#!/usr/bin/env node

/**
 * DM → CRMLite Sync Daemon
 * =========================
 * Watches all platform DM queue files every 5 minutes.
 * When a DM entry has status='sent' and crmlite_synced=false,
 * it POSTs to CRMLite as a first_touch contact.
 *
 * Platforms: twitter, instagram, tiktok, linkedin
 * CRMLite: https://crmlite-isaiahduprees-projects.vercel.app
 *
 * This is decoupled from the individual DM sweep daemons — it
 * just watches queue files and syncs, retrying on failure.
 *
 * Usage:
 *   node harness/dm-crm-sync.js           # daemon (every 5min)
 *   node harness/dm-crm-sync.js --once    # single sync then exit
 *   node harness/dm-crm-sync.js --test    # preflight check only
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const H = __dirname;

const CRMLITE_URL = 'https://crmlite-isaiahduprees-projects.vercel.app';
const LOG_FILE    = path.join(H, 'dm-crm-sync-log.ndjson');
const HOME_ENV    = `${process.env.HOME}/.env`;
const ACTP_ENV    = '/Users/isaiahdupree/Documents/Software/actp-worker/.env';
const CYCLE_MS    = 5 * 60 * 1000; // 5 minutes

// Queue files for all platforms (including LinkedIn which uses its own format)
const DM_QUEUES = [
  { platform: 'twitter',   file: path.join(H, 'twitter-dm-queue.json') },
  { platform: 'instagram', file: path.join(H, 'instagram-dm-queue.json') },
  { platform: 'tiktok',    file: path.join(H, 'tiktok-dm-queue.json') },
  { platform: 'linkedin',  file: path.join(H, 'linkedin-dm-queue.json') },
];

// Normalize queue data: LinkedIn stores a top-level array with different field names
export function normalizeQueue(platform, raw) {
  if (!raw) return null;
  // LinkedIn: top-level array of {id, status:'pending_approval'|'sent', prospect:{...}, crm_synced, crm_id}
  if (Array.isArray(raw)) {
    return raw.map(e => ({
      _raw: e,
      id: e.id,
      platform: 'linkedin',
      username: e.prospect?.name || e.id,
      profileUrl: e.prospect?.profileUrl || '',
      score: e.prospect?.icp_score || 0,
      signals: e.prospect?.icp_reasons || [],
      message: e.drafted_message || '',
      status: e.status === 'pending_approval' ? 'pending' : e.status,
      sentAt: e.sent_at || null,
      discoveredAt: e.queued_at,
      crmlite_synced: e.crm_synced || false,
      crmlite_contact_id: e.crm_id || null,
      crmlite_fail_count: e.crm_fail_count || 0,
    }));
  }
  // Standard format: {queue: [...]}
  return (raw.queue || []).map(e => ({ _raw: e, ...e }));
}

// Write back: update the raw source entry with sync result
export function patchRawEntry(platform, rawEntry, updates) {
  if (platform === 'linkedin') {
    // Map normalized fields back to LinkedIn format
    if ('crmlite_synced' in updates)      rawEntry.crm_synced     = updates.crmlite_synced;
    if ('crmlite_contact_id' in updates)  rawEntry.crm_id         = updates.crmlite_contact_id;
    if ('crmlite_synced_at' in updates)   rawEntry.crm_synced_at  = updates.crmlite_synced_at;
    if ('crmlite_fail_count' in updates)  rawEntry.crm_fail_count = updates.crmlite_fail_count;
  } else {
    Object.assign(rawEntry, updates);
  }
}

const args = process.argv.slice(2);
const MODE = args.includes('--once') ? 'once' : args.includes('--test') ? 'test' : 'daemon';

// ── Env loading ────────────────────────────────────────────────────────────────
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
  if (!process.env.NOHUP || process.stdout.isTTY) console.log(`[dm-crm-sync] ${msg}`);
  try { fs.appendFileSync(LOG_FILE, JSON.stringify(e) + '\n'); } catch { /* non-fatal */ }
}

// ── CRMLite API ────────────────────────────────────────────────────────────────
async function crmUpsert(entry) {
  const key = process.env.CRMLITE_API_KEY || '';
  if (!key) return { synced: false, reason: 'no CRMLITE_API_KEY' };

  const notes = [
    `Platform: ${entry.platform}`,
    `DM sent at: ${entry.sentAt || entry.discoveredAt}`,
    `ICP Score: ${entry.score || '?'}`,
    `Signals: ${(entry.signals || []).join(', ') || 'none'}`,
    `Message: ${(entry.message || '').slice(0, 300)}`,
    `Auto-added by DM Sweep | ${new Date().toISOString()}`,
  ].join('\n');

  const body = {
    display_name: entry.username,
    pipeline_stage: 'first_touch',
    notes,
    tags: [entry.platform, 'dm-outreach', 'automated', `score-${entry.score || 0}`],
    platform_accounts: [{ platform: entry.platform, username: entry.username, is_primary: true }],
  };

  try {
    const res = await fetch(`${CRMLITE_URL}/api/contacts`, {
      method: 'POST',
      headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { synced: true, contact_id: data.id || data.contact?.id || null };
    // 409 Conflict = already exists — treat as success
    if (res.status === 409) return { synced: true, contact_id: data.id || null, existing: true };
    return { synced: false, reason: data.error || `HTTP ${res.status}` };
  } catch (e) {
    return { synced: false, reason: String(e) };
  }
}

// ── Update CRMLite stage when reply detected ───────────────────────────────────
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

// ── Queue file read/write ──────────────────────────────────────────────────────
function readQueue(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function writeQueue(file, data) {
  try { fs.writeFileSync(file, JSON.stringify(data, null, 2)); } catch { /* non-fatal */ }
}

// ── Single sync cycle ──────────────────────────────────────────────────────────
async function syncAll() {
  const key = process.env.CRMLITE_API_KEY || '';
  if (!key) { log('WARNING: CRMLITE_API_KEY not set — sync will not run'); return; }

  let totalSynced = 0;
  let totalFailed = 0;

  for (const { platform, file } of DM_QUEUES) {
    const raw = readQueue(file);
    const entries = normalizeQueue(platform, raw);
    if (!entries?.length) continue;

    const toSync = entries.filter(e => e.status === 'sent' && !e.crmlite_synced);
    if (!toSync.length) continue;

    log(`${platform}: ${toSync.length} sent DMs to sync`);
    let changed = false;

    for (const entry of toSync) {
      const result = await crmUpsert(entry);
      if (result.synced) {
        const updates = {
          crmlite_synced: true,
          crmlite_contact_id: result.contact_id || null,
          crmlite_synced_at: new Date().toISOString(),
        };
        patchRawEntry(platform, entry._raw, updates);
        totalSynced++;
        log(`  ✓ @${entry.username} → CRMLite${result.existing ? ' (existing)' : ''} contact=${result.contact_id}`);
        changed = true;
      } else {
        // Increment fail count — stop retrying after 5 failures
        const failCount = (entry.crmlite_fail_count || 0) + 1;
        const updates = { crmlite_fail_count: failCount };
        if (failCount >= 5) {
          updates.crmlite_synced = 'failed';
          log(`  ✗ @${entry.username} — max retries reached: ${result.reason}`);
        } else {
          log(`  ✗ @${entry.username} — will retry (attempt ${failCount}/5): ${result.reason}`);
        }
        patchRawEntry(platform, entry._raw, updates);
        totalFailed++;
        changed = true;
      }

      // Small delay between CRMLite writes
      await new Promise(r => setTimeout(r, 500));
    }

    if (changed) {
      // Write back raw format: LinkedIn is array, others are {queue:[]}
      if (Array.isArray(raw)) {
        writeQueue(file, raw);
      } else {
        writeQueue(file, raw);
      }
    }
  }

  if (totalSynced + totalFailed > 0) {
    log(`Cycle complete: ${totalSynced} synced, ${totalFailed} failed/pending`);
  } else {
    log('No new sent DMs to sync');
  }
}

// ── Preflight ──────────────────────────────────────────────────────────────────
async function preflight() {
  console.log('=== DM→CRMLite Sync Preflight ===\n');
  const key = process.env.CRMLITE_API_KEY || '';
  console.log(`CRMLite API key: ${key ? '✓ loaded' : '✗ MISSING'}`);

  let totalPending = 0;
  for (const { platform, file } of DM_QUEUES) {
    const raw = readQueue(file);
    if (!raw) { console.log(`  ${platform}: queue file not found (${file})`); continue; }
    const entries = normalizeQueue(platform, raw) || [];
    const sent = entries.filter(e => e.status === 'sent');
    const unsynced = sent.filter(e => !e.crmlite_synced);
    console.log(`  ${platform}: ${entries.length} total | ${sent.length} sent | ${unsynced.length} unsynced`);
    totalPending += unsynced.length;
  }
  console.log(`\nTotal unsynced: ${totalPending}`);
  console.log('\nPreflight complete.');
  return !!key;
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  try { fs.mkdirSync(path.join(H, 'logs'), { recursive: true }); } catch {}

  if (MODE === 'test') {
    const ok = await preflight();
    process.exit(ok ? 0 : 1);
  }

  if (MODE === 'once') {
    await syncAll();
    log('Single sync complete');
    process.exit(0);
  }

  // Daemon mode
  log(`DM→CRMLite sync daemon started (PID ${process.pid}) — cycle every ${CYCLE_MS / 60000}min`);

  const tick = async () => {
    await syncAll().catch(e => log(`Sync error: ${e.message}`));
    setTimeout(tick, CYCLE_MS);
  };

  await syncAll().catch(e => log(`Initial sync error: ${e.message}`));
  setTimeout(tick, CYCLE_MS);

  process.on('SIGINT',  () => { log('Shutting down'); process.exit(0); });
  process.on('SIGTERM', () => { log('Shutting down'); process.exit(0); });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(e => { console.error(`[dm-crm-sync] Fatal: ${e.message}`); process.exit(1); });
}
