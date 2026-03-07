#!/usr/bin/env node
/**
 * Cron Manager (SDPA-002)
 * =======================
 * Local daemon that reads automation_cron_jobs from Supabase and fires
 * self-poll endpoints on each Safari service during quiet hours.
 *
 * Port: 3302
 * Endpoints:
 *   GET  /health
 *   GET  /api/cron/status
 *   POST /api/cron/:slug/run-now
 *   POST /api/cron/:slug/toggle
 */

import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_DIR = __dirname;

// ── Env loading ──────────────────────────────────────────────────────────────
function loadEnvFile(filePath) {
  try {
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
    for (const line of lines) {
      const m = line.match(/^([A-Z0-9_]+)=(.+)/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch { /* non-fatal */ }
}
loadEnvFile(`${process.env.HOME}/.env`);
loadEnvFile('/Users/isaiahdupree/Documents/Software/Safari Automation/.env');
loadEnvFile('/Users/isaiahdupree/Documents/Software/actp-worker/.env');

// ── Config ───────────────────────────────────────────────────────────────────
const PORT = 3302;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ivhfuhxorppptyuofbgq.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const RELOAD_INTERVAL_MS = 60_000;   // reload jobs from Supabase every 60s
const TICK_INTERVAL_MS   = 300_000;  // check each job every 5 minutes
const LOG_FILE = path.join(HARNESS_DIR, 'logs', 'cron-manager.log');

// Platform → Safari service port
const PLATFORM_PORTS = {
  linkedin:  3105,
  threads:   3004,
  tiktok:    3006,
  instagram: 3100,
  twitter:   3003,
};

// ── Supabase ─────────────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── State ────────────────────────────────────────────────────────────────────
let jobs = [];          // current job definitions from Supabase
let runningJobs = {};   // slug → true while running (prevents overlap)
let startedAt = new Date().toISOString();

// ── Logging ──────────────────────────────────────────────────────────────────
function log(level, msg, data = {}) {
  const entry = { ts: new Date().toISOString(), level, msg, ...data };
  const line = JSON.stringify(entry);
  console.log(line);
  try {
    fs.mkdirSync(path.join(HARNESS_DIR, 'logs'), { recursive: true });
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch { /* non-fatal */ }
}

// ── Quiet hours check ────────────────────────────────────────────────────────
function isQuietHours(job) {
  const now = new Date();
  const hour = now.getHours();
  const start = job.quiet_hour_start ?? 1;
  const end   = job.quiet_hour_end   ?? 7;
  if (start <= end) return hour >= start && hour < end;
  // wraps midnight
  return hour >= start || hour < end;
}

// ── Simple cron expression check (minute-level) ──────────────────────────────
// Supports: '0 */6 * * *' style — only checks hour/minute match
function cronMatches(expression, now) {
  try {
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 5) return false;
    const [min, hour, , ,] = parts;
    const matchField = (field, value) => {
      if (field === '*') return true;
      if (field.startsWith('*/')) return value % parseInt(field.slice(2)) === 0;
      return parseInt(field) === value;
    };
    return matchField(min, now.getMinutes()) && matchField(hour, now.getHours());
  } catch { return false; }
}

// Per-platform auth headers required by some services
const PLATFORM_AUTH = {
  linkedin: `Bearer ${process.env.LINKEDIN_AUTH_TOKEN || 'test-token-12345'}`,
  threads:  `Bearer ${process.env.THREADS_AUTH_TOKEN  || 'threads-local-dev-token'}`,
};

// ── HTTP POST helper ─────────────────────────────────────────────────────────
function httpPost(hostname, port, path, body = {}, timeoutMs = 30_000, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({ hostname, port, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...extraHeaders }
    }, (res) => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(buf) }); }
        catch { resolve({ status: res.statusCode, body: buf }); }
      });
    });
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ── Supabase update after run ─────────────────────────────────────────────────
async function recordRunResult(slug, status, count, errorMsg) {
  const updates = {
    last_run_at: new Date().toISOString(),
    last_run_status: status,
    last_run_count: count || 0,
    updated_at: new Date().toISOString(),
  };
  if (errorMsg) updates.error_message = errorMsg;
  else updates.error_message = null;

  const { error } = await supabase
    .from('automation_cron_jobs')
    .update(updates)
    .eq('slug', slug);
  if (error) log('warn', `Failed to record run result for ${slug}`, { error: error.message });
}

// ── Fire a single job ────────────────────────────────────────────────────────
async function fireJob(job) {
  const slug = job.slug;
  if (runningJobs[slug]) {
    log('debug', `Job ${slug} already running, skipping`);
    return;
  }
  runningJobs[slug] = true;
  log('info', `Firing job ${slug}`, { platform: job.platform, dataType: job.data_type });

  const port = PLATFORM_PORTS[job.platform];
  if (!port) {
    log('warn', `No port for platform ${job.platform}, skipping ${slug}`);
    await recordRunResult(slug, 'skipped', 0, `No port for platform: ${job.platform}`);
    runningJobs[slug] = false;
    return;
  }

  try {
    const endpoint = `/api/${job.platform}/self-poll`;
    const authHeader = PLATFORM_AUTH[job.platform] ? { Authorization: PLATFORM_AUTH[job.platform] } : {};
    // Threads navigates Safari — allow 90s; others 30s
    const timeoutMs = job.platform === 'threads' ? 90_000 : 30_000;
    const result = await httpPost('localhost', port, endpoint, { dataType: job.data_type }, timeoutMs, authHeader);
    if (result.status === 200 && result.body?.success !== false) {
      const count = result.body?.fetched
        ? Object.values(result.body.fetched).reduce((a, v) => a + (Array.isArray(v) ? v.length : (v || 0)), 0)
        : 0;
      log('info', `Job ${slug} succeeded`, { count, result: result.body });
      await recordRunResult(slug, 'success', count);
    } else {
      const errMsg = result.body?.error || `HTTP ${result.status}`;
      log('warn', `Job ${slug} returned non-success`, { status: result.status, body: result.body });
      await recordRunResult(slug, 'error', 0, errMsg);
    }
  } catch (err) {
    log('error', `Job ${slug} failed`, { error: err.message });
    await recordRunResult(slug, 'error', 0, err.message);
  } finally {
    runningJobs[slug] = false;
  }
}

// ── Load jobs from Supabase ──────────────────────────────────────────────────
async function loadJobs() {
  const { data, error } = await supabase
    .from('automation_cron_jobs')
    .select('*')
    .order('slug');
  if (error) {
    log('error', 'Failed to load jobs', { error: error.message });
    return;
  }
  jobs = data || [];
  log('info', `Loaded ${jobs.length} cron jobs from Supabase`);
}

// ── Tick — evaluate all jobs ──────────────────────────────────────────────────
async function tick() {
  const now = new Date();
  for (const job of jobs) {
    if (!job.enabled) continue;

    let shouldFire = false;
    if (job.schedule === 'quiet_hours') {
      shouldFire = isQuietHours(job);
    } else {
      // cron expression — only fire when it matches current minute
      shouldFire = cronMatches(job.schedule, now);
    }

    if (shouldFire) {
      fireJob(job).catch(err => log('error', `Unhandled error in job ${job.slug}`, { error: err.message }));
    }
  }
}

// ── Toggle a job enabled/disabled ────────────────────────────────────────────
async function toggleJob(slug) {
  const job = jobs.find(j => j.slug === slug);
  if (!job) return { ok: false, error: 'Job not found' };
  const newEnabled = !job.enabled;
  const { error } = await supabase
    .from('automation_cron_jobs')
    .update({ enabled: newEnabled, updated_at: new Date().toISOString() })
    .eq('slug', slug);
  if (error) return { ok: false, error: error.message };
  job.enabled = newEnabled;
  log('info', `Toggled job ${slug}: enabled=${newEnabled}`);
  return { ok: true, slug, enabled: newEnabled };
}

// ── HTTP API server ──────────────────────────────────────────────────────────
function sendJSON(res, statusCode, body) {
  const data = JSON.stringify(body);
  res.writeHead(statusCode, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) });
  res.end(data);
}

const server = http.createServer(async (req, res) => {
  const url = req.url || '';
  const method = req.method || 'GET';

  // GET /health
  if (method === 'GET' && url === '/health') {
    return sendJSON(res, 200, { status: 'ok', port: PORT, jobCount: jobs.length, startedAt });
  }

  // GET /api/cron/status
  if (method === 'GET' && url === '/api/cron/status') {
    return sendJSON(res, 200, {
      jobs: jobs.map(j => ({
        slug: j.slug,
        platform: j.platform,
        data_type: j.data_type,
        schedule: j.schedule,
        enabled: j.enabled,
        last_run_at: j.last_run_at,
        last_run_status: j.last_run_status,
        last_run_count: j.last_run_count,
        error_message: j.error_message,
        running: !!runningJobs[j.slug],
      })),
      startedAt,
    });
  }

  // POST /api/cron/:slug/run-now
  const runNowMatch = url.match(/^\/api\/cron\/([^/]+)\/run-now$/);
  if (method === 'POST' && runNowMatch) {
    const slug = runNowMatch[1];
    const job = jobs.find(j => j.slug === slug);
    if (!job) return sendJSON(res, 404, { error: 'Job not found', slug });
    fireJob(job).catch(err => log('error', `run-now error for ${slug}`, { error: err.message }));
    return sendJSON(res, 202, { ok: true, slug, message: 'Job queued' });
  }

  // POST /api/cron/:slug/toggle
  const toggleMatch = url.match(/^\/api\/cron\/([^/]+)\/toggle$/);
  if (method === 'POST' && toggleMatch) {
    const slug = toggleMatch[1];
    const result = await toggleJob(slug);
    return sendJSON(res, result.ok ? 200 : 404, result);
  }

  // GET /api/tabs/profile — automation window config + active tab claims (SDPA-014)
  if (method === 'GET' && url === '/api/tabs/profile') {
    const automationWindow = parseInt(process.env.SAFARI_AUTOMATION_WINDOW || '1', 10);
    const enforced = process.env.SAFARI_ALLOW_ANY_WINDOW !== 'true';
    // Read tab claims from coordinator claims file for window URL
    let windowUrl = null;
    let claims = [];
    try {
      const claimsRaw = fs.readFileSync('/tmp/safari-tab-claims.json', 'utf-8');
      const claimsData = JSON.parse(claimsRaw);
      claims = Object.values(claimsData).filter(
        (c) => c && c.windowIndex === automationWindow && Date.now() - new Date(c.claimedAt || 0).getTime() < 120_000
      );
      if (claims.length > 0) windowUrl = claims[0].url || null;
    } catch { /* claims file not present yet */ }
    return sendJSON(res, 200, { automationWindow, enforced, windowUrl, activeClaims: claims.length });
  }

  sendJSON(res, 404, { error: 'Not found', url });
});

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  log('info', `cron-manager starting on port ${PORT}`);

  await loadJobs();

  // Reload jobs every 60s
  setInterval(async () => {
    await loadJobs();
  }, RELOAD_INTERVAL_MS);

  // Tick every 5 minutes to evaluate jobs
  setInterval(tick, TICK_INTERVAL_MS);

  server.listen(PORT, '0.0.0.0', () => {
    log('info', `cron-manager HTTP listening on :${PORT}`);
  });

  server.on('error', (err) => {
    log('error', 'HTTP server error', { error: err.message });
    process.exit(1);
  });

  // Initial tick after 10s (give services time to start)
  setTimeout(tick, 10_000);
}

main().catch(err => {
  log('error', 'Fatal startup error', { error: err.message });
  process.exit(1);
});
