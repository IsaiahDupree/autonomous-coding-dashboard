#!/usr/bin/env node
/**
 * telegram-bot.js — Mission control bot for the autonomous system
 *
 * Two-way Telegram interface: observe, control, and steer the system from your phone.
 *
 * Commands:
 *   /status        Live snapshot — sessions today, daemons, queue depth
 *   /queue         LinkedIn DM queue pending your approval
 *   /approve N     Send DM to prospect #N (1-based), or /approve all
 *   /skip N        Remove prospect #N from queue
 *   /pause         Pause all automation (daemons stop booking)
 *   /resume        Resume automation
 *   /boost <plat>  Book 3 extra sessions on a platform right now
 *   /goals         Revenue target vs actual + goal gaps
 *   /goal revenue <N>  Update current monthly revenue
 *   /metrics       Today's session stats per platform
 *   /improve       Trigger Haiku self-improvement analysis now
 *   /dm            DM auto-sender control panel (mode, caps, intervals, send now)
 *   /help          Show this menu
 *
 * Usage:
 *   node harness/telegram-bot.js        # run 24/7
 *   node harness/telegram-bot.js --test # verify credentials + send test message
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ACTP_ENV   = '/Users/isaiahdupree/Documents/Software/actp-worker/.env';
const SAFARI_ENV = '/Users/isaiahdupree/Documents/Software/Safari Automation/.env';
const GOALS_FILE = '/Users/isaiahdupree/Documents/Software/business-goals.json';
const QUEUE_FILE = path.join(__dirname, 'linkedin-dm-queue.json');
const LI_STATE   = path.join(__dirname, 'linkedin-daemon-state.json');
const BSD_STATE  = path.join(__dirname, 'browser-session-daemon-state.json');

function loadEnv(file) {
  if (!existsSync(file)) return;
  readFileSync(file, 'utf8').split('\n').forEach(line => {
    const [k, ...rest] = line.trim().split('=');
    if (k && !k.startsWith('#') && rest.length && !process.env[k])
      process.env[k] = rest.join('=').replace(/^["']|["']$/g, '');
  });
}
loadEnv(ACTP_ENV);
loadEnv(SAFARI_ENV);

const TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const LI_URL  = 'http://localhost:3105';
const LI_HDR  = { 'Authorization': 'Bearer test-token-12345', 'Content-Type': 'application/json' };

if (!TOKEN || !CHAT_ID) {
  console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
  process.exit(1);
}

// ── Supabase ──────────────────────────────────────────────────────────────────
let _db;
function db() {
  if (!_db) _db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  return _db;
}

// ── Telegram API helpers ──────────────────────────────────────────────────────
async function tg(method, body = {}) {
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  return r.json();
}

async function send(text, opts = {}) {
  return tg('sendMessage', { chat_id: CHAT_ID, text, parse_mode: 'HTML', ...opts });
}

async function edit(msgId, text, opts = {}) {
  return tg('editMessageText', { chat_id: CHAT_ID, message_id: msgId, text, parse_mode: 'HTML', ...opts });
}

async function answer(callbackId, text = '') {
  return tg('answerCallbackQuery', { callback_query_id: callbackId, text });
}

function kb(rows) {
  return { reply_markup: { inline_keyboard: rows } };
}

// ── File helpers ──────────────────────────────────────────────────────────────
function readJson(fp, fallback = {}) {
  try { return JSON.parse(readFileSync(fp, 'utf8')); } catch { return fallback; }
}
function writeJson(fp, data) {
  writeFileSync(fp, JSON.stringify(data, null, 2));
}

// ── Command handlers ──────────────────────────────────────────────────────────

async function cmdStatus() {
  const today = new Date(); today.setHours(0,0,0,0);
  const { data: sessions } = await db()
    .from('actp_browser_sessions')
    .select('platform, status')
    .gte('created_at', today.toISOString());

  const byStatus = { completed: 0, failed: 0, running: 0, scheduled: 0 };
  const byPlatform = {};
  for (const s of (sessions || [])) {
    byStatus[s.status] = (byStatus[s.status] || 0) + 1;
    byPlatform[s.platform] = (byPlatform[s.platform] || 0) + 1;
  }
  const total = sessions?.length || 0;
  const rate = total ? Math.round(100 * byStatus.completed / total) : 0;

  const { data: crmRow } = await db().from('crm_contacts').select('id', { count: 'exact', head: true });

  const queue  = readJson(QUEUE_FILE, []);
  const pending = queue.filter(q => q.status === 'pending_approval').length;
  const liState = readJson(LI_STATE, {});
  const bsdPaused = readJson(BSD_STATE, {}).paused;

  // Daemon health
  const platforms = ['instagram','twitter','tiktok','threads','linkedin'];
  const healthChecks = await Promise.all(platforms.map(async p => {
    const ports = { instagram:3100, twitter:3003, tiktok:3102, threads:3004, linkedin:3105 };
    try {
      const r = await fetch(`http://localhost:${ports[p]}/health`, { signal: AbortSignal.timeout(2000) });
      return [p, r.ok ? '✅' : '⚠️'];
    } catch { return [p, '❌']; }
  }));
  const healthStr = healthChecks.map(([p,s]) => `${s} ${p}`).join('  ');

  const lines = [
    `📊 <b>System Status</b>`,
    ``,
    `<b>Sessions today:</b> ${total} total | ${byStatus.completed} done | ${byStatus.failed} failed | ${rate}% success`,
    `<b>Platforms:</b> ${Object.entries(byPlatform).map(([p,n]) => `${p}:${n}`).join(' ')}`,
    `<b>CRM contacts:</b> ${crmRow?.count ?? '?'}`,
    `<b>LI queue:</b> ${pending} pending approval`,
    `<b>Automation:</b> ${bsdPaused ? '⏸ PAUSED' : '▶️ running'}`,
    ``,
    `<b>Services:</b>`,
    healthStr,
    `<b>LinkedIn daemon:</b> cycle #${liState.cycleCount || 0} | total prospects: ${liState.totalProspectsFound || 0}`,
  ];

  return send(lines.join('\n'), kb([
    [{ text: '📋 DM Queue', callback_data: 'queue' }, { text: '📈 Metrics', callback_data: 'metrics' }],
    [{ text: '⏸ Pause', callback_data: 'pause' }, { text: '🚀 Boost IG', callback_data: 'boost:instagram' }],
  ]));
}

async function cmdQueue(page = 0) {
  const queue = readJson(QUEUE_FILE, []);
  const pending = queue.filter(q => q.status === 'pending_approval');
  if (pending.length === 0) return send('📭 <b>DM Queue</b>\n\nNo prospects waiting for approval.');

  const PAGE_SIZE = 5;
  const start = page * PAGE_SIZE;
  const slice = pending.slice(start, start + PAGE_SIZE);

  const lines = [`📋 <b>LinkedIn DM Queue</b> — ${pending.length} pending\n`];
  const buttons = [];

  slice.forEach((item, i) => {
    const n = start + i + 1;
    const p = item.prospect;
    lines.push(`<b>${n}. ${p.name}</b> [ICP ${p.icp_score}/10]`);
    lines.push(`   ${(p.headline || '').slice(0, 70)}`);
    lines.push(`   💬 ${(item.drafted_message || '').slice(0, 90)}...`);
    lines.push('');
    buttons.push([
      { text: `✅ Approve #${n}`, callback_data: `approve:${item.id}` },
      { text: `⏭ Skip #${n}`,    callback_data: `skip:${item.id}` },
    ]);
  });

  const navRow = [];
  if (page > 0) navRow.push({ text: '◀ Prev', callback_data: `queue:${page - 1}` });
  if (start + PAGE_SIZE < pending.length) navRow.push({ text: 'Next ▶', callback_data: `queue:${page + 1}` });
  if (pending.length > 0) {
    buttons.push([{ text: `✅ Approve All ${pending.length}`, callback_data: 'approve_all' }]);
  }
  if (navRow.length) buttons.push(navRow);

  return send(lines.join('\n'), kb(buttons));
}

async function cmdApprove(itemId) {
  const queue = readJson(QUEUE_FILE, []);
  const idx = queue.findIndex(q => q.id === itemId);
  if (idx === -1) return send(`❌ Item ${itemId} not found in queue`);

  const item = queue[idx];
  const p = item.prospect;

  // Send DM via LinkedIn service
  try {
    const r = await fetch(`${LI_URL}/api/linkedin/messages/send`, {
      method: 'POST',
      headers: LI_HDR,
      body: JSON.stringify({ profileUrl: p.profileUrl, message: item.drafted_message }),
      signal: AbortSignal.timeout(30_000),
    });
    const result = await r.json().catch(() => ({}));

    if (r.ok || result.sent || result.success) {
      queue[idx].status = 'sent';
      queue[idx].sent_at = new Date().toISOString();
      writeJson(QUEUE_FILE, queue);
      return send(`✅ <b>DM sent to ${p.name}</b>\n\n"${item.drafted_message}"`);
    } else {
      return send(`❌ <b>DM failed for ${p.name}</b>\n${JSON.stringify(result).slice(0, 200)}`);
    }
  } catch (err) {
    return send(`❌ <b>DM error for ${p.name}</b>\n${err.message}`);
  }
}

async function cmdApproveAll() {
  const queue = readJson(QUEUE_FILE, []);
  const pending = queue.filter(q => q.status === 'pending_approval');
  if (pending.length === 0) return send('📭 No pending DMs to approve');

  await send(`⏳ Sending ${pending.length} DMs... (this may take a minute)`);

  let sent = 0, failed = 0;
  for (const item of pending) {
    const p = item.prospect;
    try {
      const r = await fetch(`${LI_URL}/api/linkedin/messages/send`, {
        method: 'POST', headers: LI_HDR,
        body: JSON.stringify({ profileUrl: p.profileUrl, message: item.drafted_message }),
        signal: AbortSignal.timeout(30_000),
      });
      const result = await r.json().catch(() => ({}));
      if (r.ok || result.sent || result.success) {
        const qi = queue.findIndex(q => q.id === item.id);
        queue[qi].status = 'sent';
        queue[qi].sent_at = new Date().toISOString();
        sent++;
      } else { failed++; }
    } catch { failed++; }
    await new Promise(r => setTimeout(r, 2000)); // rate limit
  }
  writeJson(QUEUE_FILE, queue);
  return send(`✅ <b>Batch DMs complete</b>\n\nSent: ${sent} | Failed: ${failed}`);
}

async function cmdSkip(itemId) {
  const queue = readJson(QUEUE_FILE, []);
  const idx = queue.findIndex(q => q.id === itemId);
  if (idx === -1) return send(`❌ Item ${itemId} not found`);
  const name = queue[idx].prospect.name;
  queue[idx].status = 'skipped';
  queue[idx].skipped_at = new Date().toISOString();
  writeJson(QUEUE_FILE, queue);
  return send(`⏭ <b>Skipped ${name}</b>`);
}

async function cmdPause() {
  // Pause LinkedIn daemon
  const liState = readJson(LI_STATE, {});
  liState.paused = true;
  writeJson(LI_STATE, liState);

  // Pause browser session daemon
  const bsdState = readJson(BSD_STATE, {});
  bsdState.paused = true;
  writeJson(BSD_STATE, bsdState);

  return send('⏸ <b>Automation paused</b>\n\nAll daemons will stop booking new sessions.\nTap /resume to restart.', kb([
    [{ text: '▶️ Resume', callback_data: 'resume' }],
  ]));
}

async function cmdResume() {
  const liState = readJson(LI_STATE, {});
  liState.paused = false;
  writeJson(LI_STATE, liState);

  const bsdState = readJson(BSD_STATE, {});
  bsdState.paused = false;
  writeJson(BSD_STATE, bsdState);

  return send('▶️ <b>Automation resumed</b>\n\nDaemons will pick up next cycle.');
}

async function cmdBoost(platform) {
  const VALID = ['instagram', 'twitter', 'tiktok', 'threads', 'linkedin'];
  if (!VALID.includes(platform)) {
    return send(`❌ Unknown platform: ${platform}\nValid: ${VALID.join(', ')}`);
  }

  const ACTION_MAP = {
    instagram: 'prospect_hunt',
    twitter:   'prospect_hunt',
    tiktok:    'prospect_hunt',
    threads:   'prospect_hunt',
    linkedin:  'inbox_check',
  };
  const PARAMS_MAP = {
    instagram: { niche: 'ai automation', keyword: 'saas founders',   maxPosts: 5 },
    twitter:   { niche: 'build in public', keyword: 'ai tools',      maxPosts: 5 },
    tiktok:    { niche: 'ai automation', keyword: 'productivity',     maxPosts: 5 },
    threads:   { niche: 'saas growth',   keyword: 'automation',       maxPosts: 5 },
    linkedin:  {},
  };

  const sessions = [1, 2, 3].map((_, i) => ({
    platform,
    browser: platform === 'linkedin' ? 'chrome' : 'safari',
    action: ACTION_MAP[platform],
    params: PARAMS_MAP[platform],
    scheduled_at: new Date(Date.now() + i * 3 * 60_000).toISOString(),
    expires_at:   new Date(Date.now() + 30 * 60_000).toISOString(),
    status: 'scheduled',
    priority: 1,
    goal_tag: 'telegram-boost',
  }));

  const { data, error } = await db().from('actp_browser_sessions').insert(sessions).select();
  if (error) return send(`❌ Boost failed: ${error.message}`);

  return send(`🚀 <b>Boosted ${platform}</b>\n\n3 sessions booked over the next 9 minutes.\nDaemon will claim them at next poll.`);
}

async function cmdGoals() {
  const goals = readJson(GOALS_FILE, {});
  const rev = goals.revenue || {};
  const gap = (rev.target_monthly_usd || 5000) - (rev.current_monthly_usd || 0);
  const pct = Math.round(100 * (rev.current_monthly_usd || 0) / (rev.target_monthly_usd || 5000));

  const growth = goals.growth || {};
  const { data: crmRow } = await db().from('crm_contacts').select('id', { count: 'exact', head: true });
  const crmCount  = crmRow?.count || 0;
  const crmTarget = growth.crm_contacts_target || 1000;
  const crmPct    = Math.round(100 * crmCount / crmTarget);

  const bar = (pct) => '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10));

  return send([
    `🎯 <b>Business Goals</b>`,
    ``,
    `<b>Revenue</b>`,
    `$${rev.current_monthly_usd || 0} / $${rev.target_monthly_usd || 5000}/mo`,
    `${bar(pct)} ${pct}%  (gap: $${gap})`,
    ``,
    `<b>CRM Contacts</b>`,
    `${crmCount} / ${crmTarget}`,
    `${bar(crmPct)} ${crmPct}%`,
    ``,
    `<b>ICP:</b> ${goals.icp?.description || 'Software founders $500K-$5M ARR'}`,
    `<b>Offers:</b> ${(goals.offers || []).map(o => o.name).join(', ')}`,
  ].join('\n'), kb([
    [{ text: '💰 Update Revenue', callback_data: 'update_revenue' }],
  ]));
}

async function cmdUpdateRevenue(amount) {
  const n = parseFloat(amount);
  if (isNaN(n) || n < 0) return send('❌ Usage: /goal revenue 1500');
  const goals = readJson(GOALS_FILE, {});
  goals.revenue = goals.revenue || {};
  goals.revenue.current_monthly_usd = n;
  writeJson(GOALS_FILE, goals);
  return send(`✅ <b>Revenue updated</b>\n\nCurrent: $${n}/mo\nTarget: $${goals.revenue.target_monthly_usd}/mo\nGap: $${goals.revenue.target_monthly_usd - n}`);
}

async function cmdMetrics() {
  const today = new Date(); today.setHours(0,0,0,0);
  const { data: sessions } = await db()
    .from('actp_browser_sessions')
    .select('platform, action, status, created_at')
    .gte('created_at', today.toISOString())
    .order('created_at', { ascending: false });

  const rows = sessions || [];
  const total = rows.length;
  const done  = rows.filter(r => r.status === 'completed').length;
  const rate  = total ? Math.round(100 * done / total) : 0;

  // Per-platform breakdown
  const byPlat = {};
  for (const s of rows) {
    if (!byPlat[s.platform]) byPlat[s.platform] = { ok: 0, fail: 0 };
    if (s.status === 'completed') byPlat[s.platform].ok++;
    else if (s.status === 'failed') byPlat[s.platform].fail++;
  }

  const platLines = Object.entries(byPlat)
    .sort(([,a],[,b]) => (b.ok+b.fail) - (a.ok+a.fail))
    .map(([p, c]) => {
      const icon = c.fail === 0 ? '✅' : c.ok === 0 ? '❌' : '⚠️';
      return `${icon} ${p.padEnd(12)} ${c.ok}✓  ${c.fail}✗`;
    });

  // Last 7 days
  const week = new Date(Date.now() - 7 * 86400_000).toISOString();
  const { data: weekSessions } = await db()
    .from('actp_browser_sessions')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', week)
    .eq('status', 'completed');

  return send([
    `📈 <b>Metrics</b> — ${new Date().toLocaleDateString()}`,
    ``,
    `<b>Today:</b> ${total} sessions | ${done} completed | ${rate}% success`,
    `<b>This week:</b> ${weekSessions?.count || 0} completed`,
    ``,
    `<b>By platform:</b>`,
    ...platLines,
  ].join('\n'));
}

async function cmdImprove() {
  await send('🧠 <b>Self-improvement triggered</b>\n\nRunning Haiku analysis on last 24h sessions...');
  try {
    const { runSelfImprovement } = await import('./browser-session-daemon.js');
    if (typeof runSelfImprovement === 'function') {
      await runSelfImprovement();
      return send('✅ <b>Self-improvement complete</b>\n\nStrategy configs updated in Supabase.');
    }
  } catch {}
  // Fallback: spawn daemon in --improve mode
  const { spawn } = await import('child_process');
  spawn(process.execPath, ['harness/browser-session-daemon.js', '--improve'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'ignore',
    detached: true,
  }).unref();
  return send('✅ <b>Improvement analysis started</b>\n\nRunning in background. Results in ~30s.');
}

async function cmdHelp() {
  return send([
    `🤖 <b>ACD Mission Control</b>`,
    ``,
    `/status      — Live system snapshot`,
    `/connections — Top prospects ranked by priority + send connections`,
    `/queue       — LinkedIn DMs awaiting approval`,
    `/approve N   — Send DM to prospect #N`,
    `/approve all — Send all pending DMs`,
    `/skip N      — Remove prospect #N`,
    `/pause       — Pause all automation`,
    `/resume      — Resume automation`,
    `/boost &lt;platform&gt;  — Book 3 extra sessions`,
    `/goals       — Revenue + CRM targets`,
    `/goal revenue &lt;N&gt; — Update current MRR`,
    `/metrics     — Today's session stats`,
    `/improve     — Trigger Haiku analysis now`,
    `/dm          — DM auto-sender panel (mode, caps, send now)`,
    `/help        — Show this menu`,
    ``,
    `Platforms: instagram twitter tiktok threads linkedin`,
  ].join('\n'), kb([
    [{ text: '📊 Status', callback_data: 'status' }, { text: '📋 Queue', callback_data: 'queue' }],
    [{ text: '📈 Metrics', callback_data: 'metrics' }, { text: '🎯 Goals', callback_data: 'goals' }],
  ]));
}

// ── DM Auto-Sender panel ──────────────────────────────────────────────────────
const DM_CONTROL_FILE = path.join(__dirname, 'dm-control-state.json');
const DM_PLATFORM_CFG = {
  twitter:   { icon: '🐦', defaultCap: 15, maxCap: 50, queueFile: 'twitter-dm-queue.json' },
  instagram: { icon: '📸', defaultCap: 10, maxCap: 30, queueFile: 'instagram-dm-queue.json' },
  tiktok:    { icon: '🎵', defaultCap: 8,  maxCap: 25, queueFile: 'tiktok-dm-queue.json' },
};

function dmTodayStr() { return new Date().toISOString().slice(0, 10); }

function readDmControl() {
  try {
    const raw = JSON.parse(readFileSync(DM_CONTROL_FILE, 'utf8'));
    for (const [p, cfg] of Object.entries(DM_PLATFORM_CFG)) {
      if (!raw[p]) raw[p] = { mode: 'manual', dailyCap: cfg.defaultCap, intervalMinutes: 10, activeHours: [9, 22], todaySent: 0, todayDate: dmTodayStr(), lastSentAt: null, totalAllTime: 0 };
    }
    return raw;
  } catch {
    const s = {};
    for (const [p, cfg] of Object.entries(DM_PLATFORM_CFG)) {
      s[p] = { mode: 'manual', dailyCap: cfg.defaultCap, intervalMinutes: 10, activeHours: [9, 22], todaySent: 0, todayDate: dmTodayStr(), lastSentAt: null, totalAllTime: 0 };
    }
    return s;
  }
}

function writeDmControl(c) { try { writeFileSync(DM_CONTROL_FILE, JSON.stringify(c, null, 2)); } catch {} }

async function cmdDmPanel() {
  const control = readDmControl();
  const lines = ['🎛️ <b>DM Auto-Sender</b>\n'];
  const buttons = [];

  for (const [platform, cfg] of Object.entries(DM_PLATFORM_CFG)) {
    const state = control[platform] || {};
    if (state.todayDate !== dmTodayStr()) { state.todaySent = 0; state.todayDate = dmTodayStr(); }
    const q = readJson(path.join(__dirname, cfg.queueFile), { queue: [] });
    const qCount = (q.queue || []).filter(e => e.status === 'pending' || e.status === 'approved').length;
    const modeIcon = state.mode === 'auto' ? '▶️' : '⏸';
    const lastSent = state.lastSentAt
      ? `${Math.round((Date.now() - new Date(state.lastSentAt).getTime()) / 60000)}min ago`
      : 'never';
    lines.push(`${cfg.icon} <b>${platform}</b>  ${modeIcon} ${state.mode.toUpperCase()}  |  ${state.todaySent}/${state.dailyCap} today  |  ${qCount} queued  |  last: ${lastSent}`);
    buttons.push([{ text: `⚙️ ${platform} settings`, callback_data: `dm_settings:${platform}` }]);
  }

  lines.push('\n<i>Auto sends queued DMs on your chosen interval.\nManual only sends when you tap "Send Now".</i>');
  return send(lines.join('\n'), kb(buttons));
}

async function cmdDmSettings(platform) {
  const cfg = DM_PLATFORM_CFG[platform];
  if (!cfg) return send(`❌ Unknown platform: ${platform}`);

  const control = readDmControl();
  const state = control[platform];
  if (state.todayDate !== dmTodayStr()) { state.todaySent = 0; state.todayDate = dmTodayStr(); }

  const q = readJson(path.join(__dirname, cfg.queueFile), { queue: [] });
  const qCount = (q.queue || []).filter(e => e.status === 'pending' || e.status === 'approved').length;
  const lastSent = state.lastSentAt
    ? `${Math.round((Date.now() - new Date(state.lastSentAt).getTime()) / 60000)}min ago`
    : 'never';
  const [startH, endH] = state.activeHours || [9, 22];
  const endStr = endH > 12 ? `${endH - 12}pm` : `${endH}am`;

  const lines = [
    `${cfg.icon} <b>${platform} DM Settings</b>`,
    ``,
    `Mode: <b>${state.mode === 'auto' ? '▶️ AUTO' : '⏸ MANUAL'}</b>`,
    `Daily cap: <b>${state.dailyCap}/day</b> (max: ${cfg.maxCap})`,
    `Interval: <b>${state.intervalMinutes}min</b> between sends`,
    `Active hours: <b>${startH}am – ${endStr}</b>`,
    ``,
    `Today: <b>${state.todaySent} sent</b> / ${state.dailyCap} cap`,
    `Queue: <b>${qCount} ready to send</b>`,
    `Last sent: ${lastSent}`,
    `Total all-time: ${state.totalAllTime || 0}`,
    ``,
    `<i>Cap grows automatically each Monday when you consistently max out.</i>`,
  ];

  return send(lines.join('\n'), kb([
    [
      { text: state.mode === 'auto' ? '✅ Auto' : '▶️ Set Auto',   callback_data: `dm_mode:${platform}:auto` },
      { text: state.mode === 'manual' ? '✅ Manual' : '⏸ Set Manual', callback_data: `dm_mode:${platform}:manual` },
    ],
    [
      { text: 'Cap −5', callback_data: `dm_cap:${platform}:-5` },
      { text: 'Cap +5', callback_data: `dm_cap:${platform}:+5` },
    ],
    [
      { text: '5min',  callback_data: `dm_interval:${platform}:5` },
      { text: '10min', callback_data: `dm_interval:${platform}:10` },
      { text: '20min', callback_data: `dm_interval:${platform}:20` },
      { text: '30min', callback_data: `dm_interval:${platform}:30` },
    ],
    [
      { text: '🚀 Send 1 now', callback_data: `dm_send:${platform}:1` },
      { text: '🚀 Send 5 now', callback_data: `dm_send:${platform}:5` },
    ],
    [{ text: '← DM Panel', callback_data: 'dm_panel' }],
  ]));
}

async function cmdDmSetMode(platform, mode) {
  const cfg = DM_PLATFORM_CFG[platform];
  if (!cfg) return send(`❌ Unknown platform: ${platform}`);
  const control = readDmControl();
  control[platform].mode = mode;
  writeDmControl(control);
  const icon = mode === 'auto' ? '▶️' : '⏸';
  await send(`${icon} <b>${cfg.icon} ${platform} → ${mode.toUpperCase()}</b>\n${mode === 'auto' ? `Auto-sending every ${control[platform].intervalMinutes}min during active hours.` : 'Will only send when you tap "Send Now".'}`);
  return cmdDmSettings(platform);
}

async function cmdDmAdjustCap(platform, delta) {
  const cfg = DM_PLATFORM_CFG[platform];
  if (!cfg) return send(`❌ Unknown platform: ${platform}`);
  const control = readDmControl();
  const state = control[platform];
  state.dailyCap = Math.max(1, Math.min(cfg.maxCap, state.dailyCap + parseInt(delta)));
  writeDmControl(control);
  await send(`✅ ${cfg.icon} <b>${platform} cap → ${state.dailyCap}/day</b>`);
  return cmdDmSettings(platform);
}

async function cmdDmSetInterval(platform, minutes) {
  const cfg = DM_PLATFORM_CFG[platform];
  if (!cfg) return send(`❌ Unknown platform: ${platform}`);
  const control = readDmControl();
  control[platform].intervalMinutes = parseInt(minutes);
  writeDmControl(control);
  await send(`✅ ${cfg.icon} <b>${platform} interval → ${minutes}min</b>`);
  return cmdDmSettings(platform);
}

async function cmdDmSendNow(platform, n) {
  const cfg = DM_PLATFORM_CFG[platform];
  if (!cfg) return send(`❌ Unknown platform: ${platform}`);
  await send(`⏳ Sending ${n} ${cfg.icon} ${platform} DM(s) now...`);
  try {
    const { triggerSendNow } = await import('./dm-auto-sender.js');
    const result = await triggerSendNow(platform, parseInt(n));
    if (result.error && !result.sent) return send(`❌ Send failed: ${result.error}`);
    return send(
      `${cfg.icon} <b>${result.sent} DM(s) sent</b>\n` +
      `${result.failed ? `${result.failed} failed\n` : ''}` +
      `Today: ${result.todaySent}/${result.cap}`
    );
  } catch (e) {
    return send(`❌ dm-auto-sender error: ${e.message.slice(0, 120)}`);
  }
}

// ── Message + callback router ─────────────────────────────────────────────────
async function handleMessage(msg) {
  const text = (msg.text || '').trim();
  if (!text.startsWith('/')) return;

  const [cmd, ...args] = text.slice(1).split(/\s+/);

  switch (cmd.toLowerCase()) {
    case 'start':
    case 'help':    return cmdHelp();
    case 'status':  return cmdStatus();
    case 'queue':   return cmdQueue(0);
    case 'pause':   return cmdPause();
    case 'resume':  return cmdResume();
    case 'goals':   return cmdGoals();
    case 'metrics': return cmdMetrics();
    case 'improve': return cmdImprove();
    case 'dm':      return cmdDmPanel();
    case 'approve':
      if (args[0]?.toLowerCase() === 'all') return cmdApproveAll();
      if (args[0]) {
        // /approve 3 — find the Nth pending item
        const queue = readJson(QUEUE_FILE, []);
        const pending = queue.filter(q => q.status === 'pending_approval');
        const n = parseInt(args[0]) - 1;
        if (pending[n]) return cmdApprove(pending[n].id);
        return send(`❌ No prospect #${args[0]} in queue (${pending.length} pending)`);
      }
      return cmdQueue(0);
    case 'skip': {
      const queue = readJson(QUEUE_FILE, []);
      const pending = queue.filter(q => q.status === 'pending_approval');
      const n = parseInt(args[0]) - 1;
      if (pending[n]) return cmdSkip(pending[n].id);
      return send(`❌ No prospect #${args[0]} in queue`);
    }
    case 'connections':
      return cmdConnections();
    case 'boost':
      return cmdBoost(args[0] || 'instagram');
    case 'goal':
      if (args[0] === 'revenue' && args[1]) return cmdUpdateRevenue(args[1]);
      return send('Usage: /goal revenue &lt;amount&gt;\nExample: /goal revenue 1500');
    default:
      return send(`❓ Unknown command: /${cmd}\nTry /help`);
  }
}

async function cmdConnections() {
  const queue = readJson(QUEUE_FILE, []);
  const pending = queue.filter(q => q.status === 'pending_approval' && q.prospect?.connectionDegree !== '1st');
  const approved = queue.filter(q => q.status === 'approved' && q.prospect?.connectionDegree !== '1st');

  if (pending.length === 0 && approved.length === 0) {
    return send('📭 <b>Connections</b>\n\nNo prospects queued for connection requests.');
  }

  // Load priority scorer dynamically from connection-sender
  const { priorityScore } = await import('./linkedin-connection-sender.js').catch(() => ({ priorityScore: (i) => i.prospect?.icp_score * 6 || 0 }));

  // Rank pending by priority
  const ranked = pending
    .map(item => ({ item, score: item.priority_score ?? priorityScore(item) }))
    .sort((a, b) => b.score - a.score);

  const top10 = ranked.slice(0, 10);
  const state = readJson(path.join(__dirname, 'linkedin-connection-state.json'), {});
  const sentToday = state.sentToday || 0;
  const remaining = Math.max(0, 15 - sentToday);

  const lines = [
    `🤝 <b>LinkedIn Connection Queue</b>`,
    ``,
    `📊 ${pending.length} pending | ${approved.length} approved | ${sentToday}/15 sent today | ${remaining} slots left`,
    ``,
    `<b>Top prospects by priority:</b>`,
  ];

  top10.forEach(({ item, score }, i) => {
    const p = item.prospect;
    const src = item.source === 'post_engagement' ? '🔥' : item.prospect?.connectionDegree === '2nd' ? '👥' : '🔍';
    lines.push(`${i + 1}. ${src} <b>${p.name}</b> [ICP ${p.icp_score}/10, pri ${score}]`);
    lines.push(`   ${(p.headline || '').slice(0, 65)}`);
  });

  return send(lines.join('\n'), {
    reply_markup: { inline_keyboard: [
      [{ text: `🚀 Send Top ${Math.min(remaining, 15)} Connections Now`, callback_data: 'send_connections' }],
      [{ text: '📋 DM Queue', callback_data: 'queue' }, { text: '📊 Status', callback_data: 'status' }],
    ]},
  });
}

async function cmdSendConnections() {
  const state = readJson(path.join(__dirname, 'linkedin-connection-state.json'), {});
  const sentToday = state.sentToday || 0;
  const remaining = Math.max(0, 15 - sentToday);

  if (remaining === 0) {
    return send('⏸ <b>Daily limit reached</b>\n\n15/15 connection requests already sent today. Resets at midnight.');
  }

  await send(`⏳ <b>Sending connections...</b>\n\nRanking prospects by priority → auto-approving top ${remaining} → sending via Chrome CDP.\n\nMake sure Chrome is open in debug mode.`);

  return new Promise((resolve) => {
    const child = spawn('node', [
      path.join(__dirname, 'linkedin-connection-sender.js'),
      '--auto-approve',
      '--limit', String(remaining),
    ], { detached: true, stdio: ['ignore', 'pipe', 'pipe'] });

    let output = '';
    child.stdout?.on('data', d => { output += d; });
    child.stderr?.on('data', d => { output += d; });

    const timer = setTimeout(async () => {
      child.kill();
      await send(`⚠️ <b>Connection sender timed out</b>\n\nCheck Chrome is in debug mode:\n<code>bash harness/start-chrome-debug.sh start</code>`);
      resolve();
    }, 300_000); // 5 min max

    child.on('close', async (code) => {
      clearTimeout(timer);
      const lastLines = output.trim().split('\n').slice(-5).join('\n');
      const match = lastLines.match(/sent:\s*(\d+).*skipped:\s*(\d+).*failed:\s*(\d+)/);
      if (match) {
        await send(`✅ <b>Connections sent!</b>\n\nSent: ${match[1]} | Skipped: ${match[2]} | Failed: ${match[3]}\n\n<code>${lastLines.slice(0, 300)}</code>`);
      } else if (code === 0) {
        await send(`✅ <b>Connection sender done</b>\n\n<code>${lastLines.slice(0, 300)}</code>`);
      } else {
        await send(`❌ <b>Connection sender failed (exit ${code})</b>\n\n<code>${lastLines.slice(0, 300)}</code>`);
      }
      resolve();
    });

    child.unref();
  });
}

async function cmdSendApproved(platform) {
  const scripts = { twitter: 'twitter-dm-sweep.js', instagram: 'instagram-dm-sweep.js', tiktok: 'tiktok-dm-sweep.js' };
  const script = scripts[platform];
  if (!script) return send(`❌ Unknown platform: ${platform}`);

  const qFile = path.join(__dirname, `${platform}-dm-queue.json`);
  let q = [];
  try { q = JSON.parse(readFileSync(qFile, 'utf8')).queue || []; } catch {}
  const pending = q.filter(e => e.status === 'approved');
  if (!pending.length) return send(`📭 No approved ${platform} DMs to send`);

  await send(`⏳ Sending ${pending.length} approved ${platform} DMs... (runs in background)`);
  const child = spawn('node', [path.join(__dirname, script), '--send-approved'], {
    detached: true, stdio: 'ignore',
    env: { ...process.env },
  });
  child.unref();
  return send(`🚀 <b>${platform} send started</b>\nYou'll get a confirmation when done.`);
}

async function handleCallback(cb) {
  const data = cb.data || '';
  await answer(cb.id);

  const [action, ...rest] = data.split(':');
  const arg = rest.join(':');

  switch (action) {
    case 'status':        return cmdStatus();
    case 'queue':         return cmdQueue(parseInt(arg) || 0);
    case 'approve':       return arg === 'all' ? cmdApproveAll() : cmdApprove(arg);
    case 'approve_all':   return cmdApproveAll();
    case 'skip':          return cmdSkip(arg);
    case 'pause':         return cmdPause();
    case 'resume':        return cmdResume();
    case 'boost':         return cmdBoost(arg || 'instagram');
    case 'goals':         return cmdGoals();
    case 'metrics':       return cmdMetrics();
    case 'improve':       return cmdImprove();
    case 'update_revenue': return send('Send: /goal revenue &lt;amount&gt;\nExample: /goal revenue 1500');
    case 'connections':       return cmdConnections();
    case 'send_connections':  return cmdSendConnections();
    case 'tw_approve_all': return cmdSendApproved('twitter');
    case 'ig_approve_all': return cmdSendApproved('instagram');
    case 'tt_approve_all': return cmdSendApproved('tiktok');
    // DM auto-sender panel
    case 'dm_panel':    return cmdDmPanel();
    case 'dm_settings': return cmdDmSettings(arg);
    case 'dm_mode': {
      const [plat, mode] = arg.split(':');
      return cmdDmSetMode(plat, mode);
    }
    case 'dm_cap': {
      const [plat, delta] = arg.split(':');
      return cmdDmAdjustCap(plat, delta);
    }
    case 'dm_interval': {
      const [plat, min] = arg.split(':');
      return cmdDmSetInterval(plat, min);
    }
    case 'dm_send': {
      const [plat, n] = arg.split(':');
      return cmdDmSendNow(plat, n);
    }
    default:              return send(`❓ Unknown action: ${data}`);
  }
}

// ── Long-poll loop ────────────────────────────────────────────────────────────
let offset = 0;

let _pollConflictUntil = 0;

async function poll() {
  // Back off if we recently had a 409 conflict
  if (Date.now() < _pollConflictUntil) {
    await new Promise(r => setTimeout(r, 3000));
    return;
  }
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TOKEN}/getUpdates?offset=${offset}&timeout=0&allowed_updates=["message","callback_query"]`,
      { signal: AbortSignal.timeout(8_000) }
    );
    const json = await res.json();
    if (!json.ok) {
      if (json.error_code === 409) {
        // Another instance has the connection — back off 30s and retry
        _pollConflictUntil = Date.now() + 30_000;
        console.log('[telegram-bot] 409 conflict — backing off 30s for old connection to expire');
      } else {
        console.error('getUpdates error:', json);
      }
      return;
    }

    for (const update of (json.result || [])) {
      offset = update.update_id + 1;

      // Only handle messages/callbacks from the authorized chat
      const chatId = update.message?.chat?.id || update.callback_query?.message?.chat?.id;
      if (String(chatId) !== String(CHAT_ID)) continue;

      try {
        if (update.message)        await handleMessage(update.message);
        if (update.callback_query) await handleCallback(update.callback_query);
      } catch (err) {
        console.error('Handler error:', err.message);
        await send(`⚠️ Error: ${err.message.slice(0, 200)}`).catch(() => {});
      }
    }
  } catch (err) {
    if (!err.message.includes('timeout') && !err.message.includes('abort')) {
      console.error('Poll error:', err.message);
    }
  }
}

// ── Overstory log watcher (replaces overstory_telegram_bridge.py) ────────────
const OVERSTORY_LOGS = '/Users/isaiahdupree/Documents/Software/actp-worker/.overstory/logs';
const OV_SEEN_FILE   = path.join(__dirname, '.ov-bridge-seen.json');

// Milestone patterns that trigger a notification
const OV_PATTERNS = [
  { re: /branch.*merged|PR.*merged/i,      icon: '🔀', label: 'Branch merged' },
  { re: /tests.*pass|all tests.*green/i,    icon: '✅', label: 'Tests passing' },
  { re: /build.*failed|error.*fatal/i,      icon: '❌', label: 'Build failed' },
  { re: /feature.*complete|task.*done/i,    icon: '🎯', label: 'Feature done' },
  { re: /stuck|blocked|timeout.*exceeded/i, icon: '⚠️', label: 'Agent stuck' },
  { re: /coordinator.*assigned/i,           icon: '📋', label: 'Task assigned' },
];

async function watchOverstoryLogs() {
  if (!existsSync(OVERSTORY_LOGS)) return;
  const seen = readJson(OV_SEEN_FILE, {});

  try {
    const { readdirSync } = await import('fs');
    const files = readdirSync(OVERSTORY_LOGS).filter(f => f.endsWith('.ndjson') || f.endsWith('.log'));

    for (const file of files) {
      const fp = path.join(OVERSTORY_LOGS, file);
      const stat = (await import('fs')).default.statSync(fp);
      const lastSeen = seen[file] || 0;
      if (stat.size <= lastSeen) continue;

      const content = readFileSync(fp, 'utf8').slice(lastSeen);
      seen[file] = stat.size;

      for (const line of content.split('\n').filter(Boolean)) {
        let obj;
        try { obj = JSON.parse(line); } catch { obj = { msg: line }; }
        const text = obj.msg || obj.message || obj.event || line;

        for (const { re, icon, label } of OV_PATTERNS) {
          if (re.test(text)) {
            const agent = file.replace(/\.(ndjson|log)$/, '');
            await send(`${icon} <b>Overstory: ${label}</b>\n<code>${agent}</code>\n${text.slice(0, 200)}`).catch(() => {});
            break;
          }
        }
      }
    }
    writeJson(OV_SEEN_FILE, seen);
  } catch { /* non-fatal */ }
}

// ── Entry point ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);

if (args.includes('--test')) {
  const r = await send('🔔 <b>Telegram bot connected</b>\n\nSend /help to see all commands.');
  if (r.ok) { console.log('✅ Bot connected, msg_id:', r.result.message_id); process.exit(0); }
  else { console.error('❌ Failed:', r); process.exit(1); }
}

console.log(`[telegram-bot] Starting — polling Telegram for ${CHAT_ID}...`);
await send('🤖 <b>ACD Mission Control online</b>\n\nSend /help to see commands or /status for live state.').catch(() => {});

let overstoryTick = 0;
while (true) {
  await poll();
  await new Promise(r => setTimeout(r, 2000)); // 2s between polls (short-poll mode)
  // Check Overstory logs every ~30s (every 30 poll cycles)
  if (++overstoryTick % 30 === 0) await watchOverstoryLogs();
}
