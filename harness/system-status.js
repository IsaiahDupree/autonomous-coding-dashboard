#!/usr/bin/env node
/**
 * System Status — Unified local terminal for the full ACD ecosystem
 * =================================================================
 * One command to see everything: Safari services, all daemons, DM counts,
 * Safari tab claims, prospect queues, cloud-bridge, CRM stats.
 *
 * Usage:
 *   node harness/system-status.js            # one-shot snapshot
 *   node harness/system-status.js --watch    # refresh every 30s (Ctrl+C to exit)
 *   node harness/system-status.js --json     # machine-readable JSON
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const H = __dirname;

const args = process.argv.slice(2);
const WATCH = args.includes('--watch');
const JSON_MODE = args.includes('--json');
const REFRESH_MS = 30_000;

// ── ANSI colours ──────────────────────────────────────────────────────────────
const NO_CLR = JSON_MODE || !process.stdout.isTTY || process.env.NO_COLOR;
const c = {
  reset:  s => NO_CLR ? s : `\x1b[0m${s}\x1b[0m`,
  bold:   s => NO_CLR ? s : `\x1b[1m${s}\x1b[0m`,
  dim:    s => NO_CLR ? s : `\x1b[2m${s}\x1b[0m`,
  green:  s => NO_CLR ? s : `\x1b[32m${s}\x1b[0m`,
  yellow: s => NO_CLR ? s : `\x1b[33m${s}\x1b[0m`,
  red:    s => NO_CLR ? s : `\x1b[31m${s}\x1b[0m`,
  cyan:   s => NO_CLR ? s : `\x1b[36m${s}\x1b[0m`,
  blue:   s => NO_CLR ? s : `\x1b[34m${s}\x1b[0m`,
  gray:   s => NO_CLR ? s : `\x1b[90m${s}\x1b[0m`,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function readJson(fp, fb = null) {
  try { return JSON.parse(fs.readFileSync(fp, 'utf-8')); } catch { return fb; }
}

async function httpGet(url, ms = 3000) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(ms) });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

function pidAlive(pid) {
  if (!pid) return false;
  try { process.kill(Number(pid), 0); return true; } catch { return false; }
}

function pidFromFile(fp) {
  try { return parseInt(fs.readFileSync(fp, 'utf-8').trim(), 10); } catch { return null; }
}

function pgrep(pattern) {
  try {
    return execSync(`pgrep -f "${pattern}"`, { encoding: 'utf-8', stdio: ['ignore','pipe','ignore'] })
      .trim().split('\n').map(Number).filter(Boolean);
  } catch { return []; }
}

function todayDate() { return new Date().toISOString().slice(0, 10); }

function bar(val, max, width = 20) {
  const filled = Math.round(Math.min(val / Math.max(max, 1), 1) * width);
  const pct = Math.round(100 * val / Math.max(max, 1));
  const b = '█'.repeat(filled) + '░'.repeat(width - filled);
  return `${b} ${val}/${max} (${pct}%)`;
}

// ── Safari services ───────────────────────────────────────────────────────────
const SAFARI_SERVICES = [
  { name: 'IG DM',      port: 3100 },
  { name: 'TW DM',      port: 3003 },
  { name: 'TK DM',      port: 3102 },
  { name: 'LI DM',      port: 3105 },
  { name: 'Threads',    port: 3004 },
  { name: 'IG Comments',port: 3005 },
  { name: 'TK Comments',port: 3006 },
  { name: 'TW Comments',port: 3007 },
  { name: 'Market Res', port: 3106 },
];

async function checkSafariServices() {
  return Promise.all(SAFARI_SERVICES.map(async svc => {
    const data = await httpGet(`http://localhost:${svc.port}/health`);
    return { ...svc, up: data !== null };
  }));
}

// ── Daemons ───────────────────────────────────────────────────────────────────
const DAEMONS = [
  { name: 'cloud-bridge',          pattern: 'cloud-bridge.js',          pidFile: 'cloud-bridge.pid' },
  { name: 'cloud-orchestrator',    pattern: 'cloud-orchestrator.js',     pidFile: 'cloud-orchestrator.pid' },
  { name: 'browser-session-daemon',pattern: 'browser-session-daemon.js', pidFile: 'browser-session-daemon.pid' },
  { name: 'linkedin-daemon',       pattern: 'linkedin-daemon.js',        pidFile: 'linkedin-daemon.pid' },
  { name: 'linkedin-engagement',   pattern: 'linkedin-engagement-daemon.js', pidFile: null },
  { name: 'linkedin-followup',     pattern: 'linkedin-followup-engine.js',   pidFile: null },
  { name: 'dm-outreach',           pattern: 'dm-outreach-daemon.js',     pidFile: 'dm-outreach.pid' },
  { name: 'prospect-pipeline',     pattern: 'prospect-pipeline.js',      pidFile: null },
  { name: 'twitter-dm-sweep',      pattern: 'twitter-dm-sweep.js',       pidFile: 'twitter-dm-sweep.pid' },
  { name: 'instagram-dm-sweep',    pattern: 'instagram-dm-sweep.js',     pidFile: 'instagram-dm-sweep.pid' },
  { name: 'tiktok-dm-sweep',       pattern: 'tiktok-dm-sweep.js',        pidFile: 'tiktok-dm-sweep.pid' },
  { name: 'tw-comment-sweep',      pattern: 'twitter-comment-sweep.js',  pidFile: 'twitter-comment-sweep.pid' },
  { name: 'ig-comment-sweep',      pattern: 'instagram-comment-sweep.js',pidFile: 'instagram-comment-sweep.pid' },
  { name: 'tk-comment-sweep',      pattern: 'tiktok-comment-sweep.js',   pidFile: 'tiktok-comment-sweep.pid' },
  { name: 'th-comment-sweep',      pattern: 'threads-comment-sweep.js',  pidFile: 'threads-comment-sweep.pid' },
  { name: 'dm-crm-sync',           pattern: 'dm-crm-sync.js',            pidFile: 'dm-crm-sync.pid' },
  { name: 'dm-followup-engine',    pattern: 'dm-followup-engine.js',     pidFile: 'dm-followup-engine.pid' },
  { name: 'telegram-bot',          pattern: 'telegram-bot.js',           pidFile: null },
  { name: 'doctor-daemon',         pattern: 'doctor-daemon.js',          pidFile: null },
];

function checkDaemons() {
  return DAEMONS.map(d => {
    const pids = pgrep(d.pattern);
    const running = pids.length > 0;
    return { ...d, running, pid: pids[0] || null };
  });
}

// ── DM counts ─────────────────────────────────────────────────────────────────
function getDMCounts() {
  const today = todayDate();
  const outreachState = readJson(path.join(H, 'dm-outreach-state.json'), {});
  const dc = outreachState.dailyCounts || {};
  const result = {};
  for (const [p, info] of Object.entries(dc)) {
    result[p] = info.date === today ? info.sent : 0;
  }
  return {
    ig: result.ig || 0,
    tw: result.tw || 0,
    tt: result.tt || 0,
    limits: { ig: 10, tw: 15, tt: 8 },
    totalSent: outreachState.totalSent || 0,
    totalFailed: outreachState.totalFailed || 0,
  };
}

// ── Prospect queues ───────────────────────────────────────────────────────────
function getQueueStats() {
  const platforms = { ig: 'prospect-ig-queue.json', tw: 'prospect-tw-queue.json', tt: 'prospect-tt-queue.json' };
  const result = {};
  for (const [p, file] of Object.entries(platforms)) {
    const q = readJson(path.join(H, file), []);
    result[p] = {
      total: q.length,
      pending: q.filter(i => i.status === 'pending_approval' || i.status === 'approved').length,
      sent: q.filter(i => i.status === 'sent').length,
      failed: q.filter(i => i.status === 'failed').length,
    };
  }
  // LinkedIn queue
  const liQ = readJson(path.join(H, 'linkedin-dm-queue.json'), []);
  result.li = {
    total: liQ.length,
    pending: liQ.filter(i => i.status === 'pending_approval').length,
    sent: liQ.filter(i => i.status === 'sent').length,
    failed: 0,
  };
  return result;
}

// ── Safari tab layout ─────────────────────────────────────────────────────────
function getTabLayout() {
  const layout = readJson(path.join(H, 'safari-tab-layout.json'), null);
  if (!layout) return null;
  return layout;
}

// ── Cloud-bridge state ────────────────────────────────────────────────────────
function getCloudBridgeState() {
  return readJson(path.join(H, 'cloud-bridge-state.json'), {});
}

// ── Recent errors ─────────────────────────────────────────────────────────────
function getRecentErrors() {
  const errors = [];
  const logFiles = [
    'logs/dm-outreach.log',
    'logs/cloud-bridge.log',
    'logs/browser-session-daemon.log',
    'logs/linkedin-daemon.log',
  ];
  for (const lf of logFiles) {
    try {
      const lines = fs.readFileSync(path.join(H, lf), 'utf-8').split('\n').filter(Boolean);
      const recent = lines.slice(-100).filter(l => /error|Error|FAIL|failed|Fatal/i.test(l) && !/non-fatal/i.test(l));
      if (recent.length > 0) {
        errors.push({ file: lf, last: recent[recent.length - 1].slice(0, 120) });
      }
    } catch { /* log missing */ }
  }
  return errors.slice(0, 5);
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderOutput(data) {
  if (JSON_MODE) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  const { services, daemons, dmCounts, queues, tabLayout, bridgeState, errors, ts } = data;
  const lines = [];
  const W = 72;
  const divider = c.gray('─'.repeat(W));
  const header  = (t) => c.bold(c.cyan(`\n  ${t}`));

  lines.push(`\n${c.bold(c.blue('  ╔══ ACD System Status ══╗'))}  ${c.gray(new Date(ts).toLocaleTimeString())}`);

  // ── Safari services ──
  lines.push(header('Safari Services'));
  const up = services.filter(s => s.up);
  lines.push(`  ${up.length}/${services.length} UP`);
  const rows = [];
  for (let i = 0; i < services.length; i += 3) {
    const chunk = services.slice(i, i + 3);
    rows.push('  ' + chunk.map(s => {
      const icon = s.up ? c.green('●') : c.red('●');
      return `${icon} ${s.name.padEnd(12)}:${s.port}`;
    }).join('   '));
  }
  lines.push(...rows);

  // ── Safari tab layout ──
  if (tabLayout?.platforms) {
    const claimed = tabLayout.platforms.filter(p => p.claimed);
    const claimedAt = tabLayout.coordinatedAt ? new Date(tabLayout.coordinatedAt).toLocaleTimeString() : '?';
    lines.push(`  ${c.gray('Tabs claimed:')} ${claimed.length}/${tabLayout.platforms.length} (last run ${claimedAt})`);
    lines.push('  ' + tabLayout.platforms.map(p =>
      `${p.claimed ? c.green('●') : c.red('○')} ${p.platform.padEnd(13)} ${c.gray(p.tab || '—')}`
    ).join('  '));
  }

  lines.push(divider);

  // ── Daemons ──
  lines.push(header('Daemons'));
  const daemonCols = [];
  for (let i = 0; i < daemons.length; i += 2) {
    const a = daemons[i];
    const b = daemons[i + 1];
    const fmt = d => {
      const icon = d.running ? c.green('●') : c.gray('○');
      const pid  = d.running ? c.gray(`[${d.pid}]`) : '';
      return `${icon} ${d.name.padEnd(20)} ${pid}`;
    };
    daemonCols.push('  ' + fmt(a) + (b ? '  ' + fmt(b) : ''));
  }
  lines.push(...daemonCols);

  const running = daemons.filter(d => d.running).length;
  lines.push(`  ${c.gray(`${running}/${daemons.length} running`)}`);
  lines.push(divider);

  // ── DM counts ──
  lines.push(header('DM Outreach (today)'));
  const { ig, tw, tt, limits, totalSent, totalFailed } = dmCounts;
  lines.push(`  IG  ${bar(ig, limits.ig)}`);
  lines.push(`  TW  ${bar(tw, limits.tw)}`);
  lines.push(`  TT  ${bar(tt, limits.tt)}`);
  lines.push(`  ${c.gray(`All-time: ${totalSent} sent, ${totalFailed} failed`)}`);

  // ── Prospect queues ──
  lines.push(divider);
  lines.push(header('Prospect Queues'));
  lines.push(`  ${'Platform'.padEnd(10)} ${'Pending'.padEnd(10)} ${'Sent'.padEnd(10)} Total`);
  for (const [p, q] of Object.entries(queues)) {
    const pendingStr = q.pending > 0 ? c.yellow(String(q.pending)) : String(q.pending);
    lines.push(`  ${p.toUpperCase().padEnd(10)} ${pendingStr.padEnd(10)} ${String(q.sent).padEnd(10)} ${q.total}`);
  }

  // ── Cloud bridge ──
  lines.push(divider);
  lines.push(header('Cloud Bridge'));
  const cb = bridgeState;
  lines.push(`  Processed: ${cb.totalProcessed || 0}  Failed: ${cb.totalFailed || 0}  Rate-limited: ${cb.totalRateLimited || 0}`);
  if (cb.lastPoll) lines.push(`  Last poll: ${c.gray(new Date(cb.lastPoll).toLocaleTimeString())}`);

  // ── Errors ──
  if (errors.length > 0) {
    lines.push(divider);
    lines.push(header('Recent Errors'));
    for (const e of errors) {
      lines.push(`  ${c.red('!')} ${c.gray(e.file)}`);
      lines.push(`    ${c.yellow(e.last)}`);
    }
  }

  lines.push(divider);
  lines.push(c.gray(`  Refresh with --watch (30s). Log dir: harness/logs/`));
  lines.push('');

  if (WATCH) process.stdout.write('\x1b[2J\x1b[H'); // clear screen
  console.log(lines.join('\n'));
}

async function snapshot() {
  const [services] = await Promise.all([checkSafariServices()]);
  const daemons    = checkDaemons();
  const dmCounts   = getDMCounts();
  const queues     = getQueueStats();
  const tabLayout  = getTabLayout();
  const bridgeState = getCloudBridgeState();
  const errors     = getRecentErrors();
  const data = { ts: Date.now(), services, daemons, dmCounts, queues, tabLayout, bridgeState, errors };
  renderOutput(data);
  return data;
}

async function main() {
  await snapshot();
  if (WATCH) {
    process.stdout.write(c.gray('\n  Watching... Ctrl+C to exit\n'));
    setInterval(snapshot, REFRESH_MS);
  }
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
