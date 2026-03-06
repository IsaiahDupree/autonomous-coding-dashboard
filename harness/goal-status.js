#!/usr/bin/env node
/**
 * goal-status.js — Business Goal Progress + Safari↔Cloud Data Exchange Status
 *
 * Shows:
 *   - Revenue & growth goal gaps
 *   - Safari service health (which ports are up/down)
 *   - Sessions today: by platform, by status (completed/failed/scheduled)
 *   - Safari command queue: commands processed (non-zero data proof)
 *   - Daemon health: which background processes are running
 *   - LinkedIn pipeline: discovery queue, seen URLs, daemons
 *
 * Run: node harness/goal-status.js
 *      node harness/goal-status.js --json      (machine-readable output)
 *      node harness/goal-status.js --watch     (refresh every 60s)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS = __dirname;

// ── Env loading ──────────────────────────────────────────────────────────────
function loadEnv(fp) {
  try {
    for (const line of fs.readFileSync(fp, 'utf-8').split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.+)/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {}
}
loadEnv(`${process.env.HOME}/.env`);
loadEnv('/Users/isaiahdupree/Documents/Software/actp-worker/.env');
if (!process.env.SUPABASE_SERVICE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY)
  process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const GOALS_FILE   = '/Users/isaiahdupree/Documents/Software/business-goals.json';

// ── Helpers ──────────────────────────────────────────────────────────────────
function readJson(fp, fallback = null) {
  try { return JSON.parse(fs.readFileSync(fp, 'utf-8')); } catch { return fallback; }
}

async function sbFetch(path, params = '') {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}${params}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Prefer: 'count=exact' },
      signal: AbortSignal.timeout(6000),
    });
    const count = parseInt(r.headers.get('content-range')?.split('/')[1] || '0');
    const data = await r.json();
    return { data, count };
  } catch { return null; }
}

function bar(value, max, width = 20) {
  const pct = Math.min(value / Math.max(max, 1), 1);
  const filled = Math.round(pct * width);
  return '[' + '█'.repeat(filled) + '░'.repeat(width - filled) + ']';
}

function pct(n, d) { return d === 0 ? '0%' : `${Math.round((n / d) * 100)}%`; }

async function checkPort(port) {
  try {
    const r = await fetch(`http://localhost:${port}/health`, { signal: AbortSignal.timeout(2000) });
    const d = await r.json();
    return { up: true, status: d.status || 'ok', service: d.service || '' };
  } catch {
    return { up: false };
  }
}

async function getProcesses() {
  return new Promise(resolve => {
    const child = spawn('ps', ['aux']);
    let out = '';
    child.stdout.on('data', d => { out += d; });
    child.on('close', () => resolve(out));
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function runStatus() {
  const isJson = process.argv.includes('--json');
  const goals = readJson(GOALS_FILE, {});

  // ── Supabase metrics ────────────────────────────────────────────────────────
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();
  const week = new Date(); week.setDate(week.getDate() - 7); const weekISO = week.toISOString();

  const [
    crmR, sessToday, sessWeek, cmdQueue, cmdQueueCompleted,
  ] = await Promise.all([
    sbFetch('crm_contacts', '?select=id&limit=1'),
    sbFetch('actp_browser_sessions', `?select=platform,action,status,result&created_at=gte.${todayISO}`),
    sbFetch('actp_browser_sessions', `?select=platform,status&created_at=gte.${weekISO}`),
    sbFetch('safari_command_queue', `?select=platform,action,status,created_at&order=created_at.desc&limit=5`),
    sbFetch('safari_command_queue', `?select=id&status=eq.completed&created_at=gte.${todayISO}&limit=1`),
  ]);

  // ── Sessions breakdown ──────────────────────────────────────────────────────
  const sessions = sessToday?.data || [];
  const byStatus = {}, byPlatform = {};
  for (const s of sessions) {
    byStatus[s.status] = (byStatus[s.status] || 0) + 1;
    byPlatform[s.platform] = (byPlatform[s.platform] || 0) + 1;
  }
  const completedSessions = byStatus.completed || 0;
  const failedSessions = byStatus.failed || 0;
  const totalSessions = sessions.length;

  // ── Week sessions ───────────────────────────────────────────────────────────
  const weekSessions = sessWeek?.data || [];
  const weekByStatus = {};
  for (const s of weekSessions) weekByStatus[s.status] = (weekByStatus[s.status] || 0) + 1;

  // ── Safari service health ───────────────────────────────────────────────────
  const SAFARI_PORTS = [
    { port: 3100, name: 'Instagram DM' },
    { port: 3003, name: 'Twitter DM' },
    { port: 3102, name: 'TikTok DM' },
    { port: 3105, name: 'LinkedIn DM' },
    { port: 3005, name: 'IG Comments' },
    { port: 3006, name: 'TK Comments' },
    { port: 3007, name: 'TW Comments' },
    { port: 3004, name: 'Threads' },
    { port: 3106, name: 'Market Res.' },
  ];
  const portStatuses = await Promise.all(SAFARI_PORTS.map(async s => ({ ...s, ...(await checkPort(s.port)) })));
  const upCount = portStatuses.filter(p => p.up).length;

  // ── Daemon processes ────────────────────────────────────────────────────────
  const psOut = await getProcesses();
  const DAEMONS = [
    { name: 'linkedin-daemon.js', label: 'LI Discovery' },
    { name: 'linkedin-engagement-daemon.js', label: 'LI Engagement' },
    { name: 'linkedin-followup-engine.js', label: 'LI Followup' },
    { name: 'cloud-orchestrator.js', label: 'Orchestrator' },
    { name: 'browser-session-daemon.js', label: 'Session Exec' },
    { name: 'cloud-bridge.js', label: 'Cloud Bridge' },
  ];
  const daemonStatus = DAEMONS.map(d => ({ ...d, running: psOut.includes(d.name) }));
  const runningCount = daemonStatus.filter(d => d.running).length;

  // ── Local state files ───────────────────────────────────────────────────────
  const liState = readJson(path.join(HARNESS, 'linkedin-daemon-state.json'), {});
  const liQueue = readJson(path.join(HARNESS, 'linkedin-dm-queue.json'), []);
  const cbState = readJson(path.join(HARNESS, 'cloud-bridge-state.json'), {});
  const orchState = readJson(path.join(HARNESS, 'orchestrator-state.json'), {});

  // ── Goals ───────────────────────────────────────────────────────────────────
  const revenue = goals.revenue || {};
  const revTarget = revenue.target_monthly_usd || 5000;
  const revCurrent = revenue.current_monthly_usd || 0;
  const crmTarget = goals.growth?.crm_contacts_target || 1000;
  const crmCurrent = crmR?.count || 0;
  const pendingApproval = liQueue.filter(i => i.status === 'pending_approval').length;
  const seenUrls = (liState.seenUrls || []).length;

  if (isJson) {
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      revenue: { current: revCurrent, target: revTarget, pct: pct(revCurrent, revTarget) },
      crm: { current: crmCurrent, target: crmTarget, pct: pct(crmCurrent, crmTarget) },
      sessions_today: { total: totalSessions, completed: completedSessions, failed: failedSessions, by_platform: byPlatform },
      sessions_7day: { total: weekSessions.length, ...weekByStatus },
      safari_services: { up: upCount, total: SAFARI_PORTS.length },
      daemons: { running: runningCount, total: DAEMONS.length },
      linkedin: { queue_pending: pendingApproval, seen_urls: seenUrls, cycles: liState.cycleCount || 0 },
      cloud_bridge: { processed: cbState.totalProcessed || 0, last_poll: cbState.lastPoll },
      cmd_queue_completed_today: cmdQueueCompleted?.count || 0,
    }, null, 2));
    return;
  }

  // ── Pretty-print output ─────────────────────────────────────────────────────
  const now = new Date().toLocaleString();
  console.log(`\n${'═'.repeat(62)}`);
  console.log(`  BUSINESS GOAL STATUS   ${now}`);
  console.log(`${'═'.repeat(62)}`);

  // Revenue
  console.log('\n── Revenue Goal ─────────────────────────────────────────────');
  console.log(`  Target:  $${revTarget.toLocaleString()}/month`);
  console.log(`  Current: $${revCurrent.toLocaleString()}  ${bar(revCurrent, revTarget)} ${pct(revCurrent, revTarget)}`);
  if (revCurrent === 0) {
    console.log(`  ⚠️  Gap: $${revTarget.toLocaleString()} — prioritize Upwork proposals + LinkedIn DMs`);
    const sources = revenue.sources || [];
    for (const s of sources) {
      console.log(`     • ${s.name.padEnd(28)} target $${s.target_usd}/mo  [${s.type}]`);
    }
  }

  // Growth
  console.log('\n── Growth Metrics ───────────────────────────────────────────');
  console.log(`  CRM Contacts:  ${crmCurrent.toLocaleString().padEnd(6)} / ${crmTarget.toLocaleString()} ${bar(crmCurrent, crmTarget)} ${pct(crmCurrent, crmTarget)}`);
  console.log(`  LI Queue Pending Approval: ${pendingApproval} prospects`);
  console.log(`  LI Seen URLs (dedup set): ${seenUrls.toLocaleString()}`);
  console.log(`  LI Discovery Cycles: ${liState.cycleCount || 0}  | Total found: ${liState.totalProspectsFound || 0}`);

  // Safari services
  console.log('\n── Safari Service Health ────────────────────────────────────');
  for (const s of portStatuses) {
    const icon = s.up ? '✅' : '❌';
    const label = s.name.padEnd(14);
    console.log(`  ${icon} :${s.port}  ${label}  ${s.up ? s.status : 'DOWN'}`);
  }
  console.log(`  Total: ${upCount}/${SAFARI_PORTS.length} up`);

  // Sessions today
  console.log('\n── Automation Sessions Today (Safari↔Cloud Exchange) ────────');
  console.log(`  Total: ${totalSessions}  ✅ Completed: ${completedSessions}  ❌ Failed: ${failedSessions}  ⏳ Scheduled: ${byStatus.scheduled || 0}`);
  if (totalSessions > 0) {
    const successRate = Math.round((completedSessions / totalSessions) * 100);
    console.log(`  Success rate: ${successRate}%  ${bar(completedSessions, totalSessions)}`);
    console.log(`  By platform:  ${Object.entries(byPlatform).map(([k, v]) => `${k}:${v}`).join('  ')}`);
  }
  console.log(`\n  Safari Command Queue (cloud→local bridge):`);
  console.log(`    Commands completed today: ${cmdQueueCompleted?.count || 0} ✅`);
  const cmds = cmdQueue?.data || [];
  for (const c of cmds.slice(0, 3)) {
    const ts = c.created_at?.slice(11, 19) || '?';
    console.log(`    ${c.status?.padEnd(12)} ${c.platform?.padEnd(10)} ${c.action?.padEnd(20)} ${ts}`);
  }

  // 7-day summary
  console.log('\n── Last 7 Days ──────────────────────────────────────────────');
  console.log(`  Sessions: ${weekSessions.length}  ✅ ${weekByStatus.completed || 0}  ❌ ${weekByStatus.failed || 0}`);

  // Daemons
  console.log('\n── Background Daemons ───────────────────────────────────────');
  for (const d of daemonStatus) {
    const icon = d.running ? '🟢' : '🔴';
    console.log(`  ${icon} ${d.label.padEnd(16)}  ${d.name}`);
  }
  console.log(`  Total: ${runningCount}/${DAEMONS.length} running`);
  if (cbState.lastPoll) {
    const pollAgo = Math.round((Date.now() - new Date(cbState.lastPoll)) / 60000);
    console.log(`  Cloud bridge last poll: ${pollAgo}min ago  (${cbState.totalProcessed || 0} processed)`);
  }
  if (orchState.lastCycleAt) {
    const cycleAgo = Math.round((Date.now() - new Date(orchState.lastCycleAt)) / 3600000);
    console.log(`  Orchestrator last cycle: ${cycleAgo}h ago  (cycle #${orchState.cycleCount || 0})`);
  }

  // Next actions
  console.log('\n── Priority Actions to Hit $5K/month ────────────────────────');
  const actions = goals.next_actions || [];
  for (const a of actions.slice(0, 4)) console.log(`  • ${a}`);

  console.log(`\n${'═'.repeat(62)}\n`);
}

async function main() {
  if (process.argv.includes('--watch')) {
    console.log('Watching... (Ctrl+C to stop, refreshes every 60s)');
    const run = async () => { try { await runStatus(); } catch(e) { console.error('Error:', e.message); } };
    await run();
    setInterval(run, 60_000);
  } else {
    await runStatus();
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
