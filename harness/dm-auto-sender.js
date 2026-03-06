#!/usr/bin/env node
/**
 * DM Auto-Sender Daemon
 * =====================
 * Runs every minute. For each platform in AUTO mode:
 *   - Picks next pending (auto) or approved (manual trigger) queue entry
 *   - Respects daily cap, interval between sends, active hours
 *   - Notifies Telegram after every send
 *
 * Weekly cap growth: every Monday, if a platform hit its cap 5+ of last 7 days,
 * the cap grows by capGrowthRate (itself grows if consistently maxing).
 *
 * State: harness/dm-control-state.json
 *
 * Usage:
 *   node harness/dm-auto-sender.js          # daemon
 *   node harness/dm-auto-sender.js --once   # one tick then exit
 *   node harness/dm-auto-sender.js --test   # show state + queue counts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const H = __dirname;

const CONTROL_FILE = path.join(H, 'dm-control-state.json');
const LOG_FILE     = path.join(H, 'dm-auto-sender-log.ndjson');
const HOME_ENV     = `${process.env.HOME}/.env`;
const ACTP_ENV     = '/Users/isaiahdupree/Documents/Software/actp-worker/.env';

function loadEnv(p) {
  try { for (const l of fs.readFileSync(p,'utf8').split('\n')) { const m=l.match(/^([A-Z0-9_]+)=(.+)/); if(m&&!process.env[m[1]])process.env[m[1]]=m[2].trim(); } } catch {}
}
loadEnv(HOME_ENV); loadEnv(ACTP_ENV);

const args = process.argv.slice(2);
const MODE = args.includes('--once') ? 'once' : args.includes('--test') ? 'test' : 'daemon';

// ── Telegram ──────────────────────────────────────────────────────────────────
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TG_CHAT  = process.env.TELEGRAM_CHAT_ID   || '';
async function sendTelegram(text, replyMarkup = null) {
  if (!TG_TOKEN || !TG_CHAT) return;
  try {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: 'HTML', ...(replyMarkup ? { reply_markup: replyMarkup } : {}) }),
      signal: AbortSignal.timeout(8_000),
    });
  } catch { /* non-fatal */ }
}

// ── Platform config ───────────────────────────────────────────────────────────
const PLATFORM_CONFIG = {
  twitter: {
    queueFile:    path.join(H, 'twitter-dm-queue.json'),
    sendUrl:      process.env.TWITTER_DM_URL  || 'http://localhost:3003',
    sendEndpoint: '/api/twitter/messages/send-to',
    bodyKey:      'text',
    icon:         '🐦',
  },
  instagram: {
    queueFile:    path.join(H, 'instagram-dm-queue.json'),
    sendUrl:      process.env.INSTAGRAM_DM_URL || 'http://localhost:3100',
    sendEndpoint: '/api/messages/send-to',
    bodyKey:      'text',
    icon:         '📸',
  },
  tiktok: {
    queueFile:    path.join(H, 'tiktok-dm-queue.json'),
    sendUrl:      process.env.TIKTOK_DM_URL   || 'http://localhost:3102',
    sendEndpoint: '/api/tiktok/messages/send-to',
    bodyKey:      'message',
    icon:         '🎵',
  },
};

// ── Default state ─────────────────────────────────────────────────────────────
const DEFAULT_PLATFORM_STATE = (platform) => ({
  mode:                 'manual',        // 'auto' | 'manual'
  dailyCap:             { twitter:15, instagram:10, tiktok:8 }[platform] || 10,
  intervalMinutes:      10,             // min gap between auto-sends
  activeHours:          [9, 22],        // [startHour, endHour]
  capGrowthRate:        3,              // added to cap each qualifying week
  maxCapEver:           { twitter:50, instagram:30, tiktok:25 }[platform] || 30,
  consecutiveDaysToGrow: 5,            // how many of 7 days at cap before growing
  todaySent:            0,
  todayDate:            today(),
  lastSentAt:           null,
  weeklyHistory:        [],             // [{date, sent, cap}] last 28 days
  totalAllTime:         0,
});

// ── State I/O ─────────────────────────────────────────────────────────────────
function readControl() {
  try {
    const raw = JSON.parse(fs.readFileSync(CONTROL_FILE, 'utf8'));
    // Migrate missing platforms
    for (const p of Object.keys(PLATFORM_CONFIG)) {
      if (!raw[p]) raw[p] = DEFAULT_PLATFORM_STATE(p);
    }
    return raw;
  } catch {
    const s = {};
    for (const p of Object.keys(PLATFORM_CONFIG)) s[p] = DEFAULT_PLATFORM_STATE(p);
    return s;
  }
}
function writeControl(s) { try { fs.writeFileSync(CONTROL_FILE, JSON.stringify(s, null, 2)); } catch {} }

// ── Queue I/O ─────────────────────────────────────────────────────────────────
function readQueue(file) { try { return JSON.parse(fs.readFileSync(file,'utf8')); } catch { return {queue:[]}; } }
function writeQueue(file, q) { try { fs.writeFileSync(file, JSON.stringify(q, null, 2)); } catch {} }

// ── Logging ───────────────────────────────────────────────────────────────────
function log(msg, data={}) {
  const e = {ts:new Date().toISOString(),msg,...data};
  if (process.stdout.isTTY) console.log(`[dm-auto] ${msg}`);
  try { fs.appendFileSync(LOG_FILE, JSON.stringify(e)+'\n'); } catch {}
}

function today() { return new Date().toISOString().slice(0,10); }

// ── HTTP ──────────────────────────────────────────────────────────────────────
async function callSend(sendUrl, endpoint, token, body) {
  try {
    const r = await fetch(`${sendUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization':`Bearer test-token-12345` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
    return await r.json();
  } catch(e) { return {error:String(e)}; }
}

// ── Health check ──────────────────────────────────────────────────────────────
async function isServiceUp(sendUrl) {
  try {
    const r = await fetch(`${sendUrl}/health`, {signal:AbortSignal.timeout(3000)});
    const d = await r.json();
    return d.status === 'ok';
  } catch { return false; }
}

// ── Cap growth: run every Monday ──────────────────────────────────────────────
async function maybeGrowCaps(control) {
  const dow = new Date().getDay(); // 0=Sun,1=Mon
  if (dow !== 1) return false; // only Monday

  let anyGrown = false;
  for (const [platform, state] of Object.entries(control)) {
    if (!PLATFORM_CONFIG[platform]) continue;

    // Check if we already ran growth this week
    const thisMonday = new Date(); thisMonday.setDate(thisMonday.getDate() - ((thisMonday.getDay()+6)%7));
    const mondayStr = thisMonday.toISOString().slice(0,10);
    if (state._lastCapGrowthDate === mondayStr) continue;

    // Look at last 7 days of history
    const last7 = state.weeklyHistory.slice(-7);
    const daysAtCap = last7.filter(d => d.sent >= d.cap).length;

    if (daysAtCap >= state.consecutiveDaysToGrow) {
      const oldCap = state.dailyCap;
      const newCap = Math.min(state.dailyCap + state.capGrowthRate, state.maxCapEver);

      if (newCap > oldCap) {
        state.dailyCap = newCap;
        // Also grow the growth rate itself (compound) if we've been maxing out for 2+ weeks
        const last14 = state.weeklyHistory.slice(-14);
        const daysAt14 = last14.filter(d => d.sent >= d.cap).length;
        if (daysAt14 >= state.consecutiveDaysToGrow * 2) {
          state.capGrowthRate = Math.min(state.capGrowthRate + 1, 10);
        }

        state._lastCapGrowthDate = mondayStr;
        log(`${platform}: cap grown ${oldCap} → ${newCap} (${daysAtCap}/7 days at cap, growth rate=${state.capGrowthRate})`);

        const cfg = PLATFORM_CONFIG[platform];
        await sendTelegram(
          `📈 <b>${cfg.icon} ${platform} DM cap increased!</b>\n\n` +
          `${oldCap} → <b>${newCap}/day</b> (was hitting cap ${daysAtCap} of 7 days)\n` +
          `Growth rate: +${state.capGrowthRate}/week going forward\n` +
          `Max ever: ${state.maxCapEver}`
        );
        anyGrown = true;
      }
    }
  }
  return anyGrown;
}

// ── Record daily history ──────────────────────────────────────────────────────
function archiveDailyStats(state, platform) {
  const d = today();
  if (!state.weeklyHistory) state.weeklyHistory = [];
  const existing = state.weeklyHistory.find(h => h.date === d);
  if (existing) {
    existing.sent = state.todaySent;
    existing.cap  = state.dailyCap;
  } else {
    state.weeklyHistory.push({ date: d, sent: state.todaySent, cap: state.dailyCap });
  }
  // Keep last 28 days only
  if (state.weeklyHistory.length > 28) state.weeklyHistory = state.weeklyHistory.slice(-28);
}

// ── Reset daily counter ────────────────────────────────────────────────────────
function resetDailyIfNeeded(state) {
  const d = today();
  if (state.todayDate !== d) {
    archiveDailyStats(state, '');
    state.todayDate  = d;
    state.todaySent  = 0;
  }
}

// ── Core: one tick for one platform ──────────────────────────────────────────
async function tickPlatform(platform, state, control) {
  resetDailyIfNeeded(state);
  archiveDailyStats(state, platform);

  if (state.mode !== 'auto') return; // manual mode — only sends when triggered externally

  const now = new Date();
  const hour = now.getHours();
  const [startH, endH] = state.activeHours || [9, 22];

  if (hour < startH || hour >= endH) return; // outside active hours
  if (state.todaySent >= state.dailyCap) return; // daily cap hit

  // Check interval
  if (state.lastSentAt) {
    const elapsed = (Date.now() - new Date(state.lastSentAt).getTime()) / 60000;
    if (elapsed < state.intervalMinutes) return; // too soon
  }

  const cfg = PLATFORM_CONFIG[platform];

  // Service health check
  if (!(await isServiceUp(cfg.sendUrl))) {
    return; // service down — skip silently
  }

  // Pick next pending entry from queue
  const q = readQueue(cfg.queueFile);
  const candidate = q.queue.find(e => e.status === 'pending' || e.status === 'approved');
  if (!candidate) return; // nothing to send

  // Send it
  const body = { username: candidate.username, [cfg.bodyKey]: candidate.message };
  const result = await callSend(cfg.sendUrl, cfg.sendEndpoint, null, body);

  if (result.success || result.ok) {
    candidate.status = 'sent';
    candidate.sentAt = new Date().toISOString();
    candidate.autoSent = true;
    state.todaySent++;
    state.lastSentAt = candidate.sentAt;
    state.totalAllTime = (state.totalAllTime || 0) + 1;
    writeQueue(cfg.queueFile, q);

    log(`${platform}: auto-sent to @${candidate.username} (${state.todaySent}/${state.dailyCap} today)`);

    const remaining = state.dailyCap - state.todaySent;
    await sendTelegram(
      `${cfg.icon} <b>${platform} DM sent (auto)</b>\n` +
      `@${candidate.username}\n\n` +
      `"${(candidate.message||'').slice(0,120)}"\n\n` +
      `Today: ${state.todaySent}/${state.dailyCap} | ${remaining} remaining\n` +
      `Next send in ~${state.intervalMinutes}min`,
      { inline_keyboard: [[
        { text: `⏸ Pause ${platform}`, callback_data: `dm_mode:${platform}:manual` },
        { text: '📋 Panel', callback_data: 'dm_panel' },
      ]]}
    );
  } else {
    log(`${platform}: auto-send failed for @${candidate.username}: ${result.error || JSON.stringify(result)}`);
    candidate.failReason = result.error || 'auto-send failed';
    candidate.failCount = (candidate.failCount || 0) + 1;
    if (candidate.failCount >= 3) candidate.status = 'failed';
    writeQueue(cfg.queueFile, q);
  }
}

// ── Trigger send from Telegram (N entries) ────────────────────────────────────
export async function triggerSendNow(platform, n = 5) {
  const cfg = PLATFORM_CONFIG[platform];
  if (!cfg) return { error: `Unknown platform: ${platform}` };

  const control = readControl();
  const state = control[platform] || DEFAULT_PLATFORM_STATE(platform);
  resetDailyIfNeeded(state);

  if (!(await isServiceUp(cfg.sendUrl))) return { error: `${platform} service not reachable` };

  const q = readQueue(cfg.queueFile);
  const toSend = q.queue.filter(e => e.status === 'pending' || e.status === 'approved').slice(0, n);
  if (!toSend.length) return { sent: 0, error: 'no entries to send' };

  let sent = 0, failed = 0;
  for (const entry of toSend) {
    if (state.todaySent >= state.dailyCap) {
      await sendTelegram(`⚠️ ${cfg.icon} <b>${platform} daily cap hit</b> (${state.dailyCap}/day)\nNo more sends today.`);
      break;
    }
    const body = { username: entry.username, [cfg.bodyKey]: entry.message };
    const result = await callSend(cfg.sendUrl, cfg.sendEndpoint, null, body);
    if (result.success || result.ok) {
      entry.status = 'sent'; entry.sentAt = new Date().toISOString(); entry.manualSent = true;
      state.todaySent++; state.lastSentAt = entry.sentAt; state.totalAllTime = (state.totalAllTime||0)+1;
      sent++;
    } else {
      entry.failReason = result.error; entry.failCount = (entry.failCount||0)+1;
      if (entry.failCount >= 3) entry.status = 'failed';
      failed++;
    }
    if (sent < toSend.length) await new Promise(r => setTimeout(r, 15000 + Math.random()*10000));
  }

  writeQueue(cfg.queueFile, q);
  archiveDailyStats(state, platform);
  control[platform] = state;
  writeControl(control);

  return { sent, failed, todaySent: state.todaySent, cap: state.dailyCap };
}

// ── Main tick ─────────────────────────────────────────────────────────────────
async function tick() {
  const control = readControl();
  await maybeGrowCaps(control);

  for (const platform of Object.keys(PLATFORM_CONFIG)) {
    if (!control[platform]) control[platform] = DEFAULT_PLATFORM_STATE(platform);
    try {
      await tickPlatform(platform, control[platform], control);
    } catch(e) {
      log(`${platform}: tick error: ${e.message}`);
    }
  }

  writeControl(control);
}

// ── Preflight ─────────────────────────────────────────────────────────────────
async function preflight() {
  const control = readControl();
  console.log('=== DM Auto-Sender State ===\n');
  for (const [p, state] of Object.entries(control)) {
    if (!PLATFORM_CONFIG[p]) continue;
    const cfg = PLATFORM_CONFIG[p];
    const q = readQueue(cfg.queueFile);
    const pending = q.queue?.filter(e => e.status === 'pending' || e.status === 'approved').length || 0;
    const sent    = q.queue?.filter(e => e.status === 'sent').length || 0;
    const up      = await isServiceUp(cfg.sendUrl);
    console.log(`${cfg.icon} ${p}: mode=${state.mode} | cap=${state.todaySent}/${state.dailyCap} today | interval=${state.intervalMinutes}min | service=${up?'✅':'❌'} | queue=${pending} ready | ${sent} sent total`);
  }
  console.log('\nPreflight complete.');
}

// ── Entry ─────────────────────────────────────────────────────────────────────
async function main() {
  try { fs.mkdirSync(path.join(H,'logs'),{recursive:true}); } catch {}

  if (MODE === 'test') { await preflight(); process.exit(0); }
  if (MODE === 'once') { await tick(); log('Single tick complete'); process.exit(0); }

  log(`DM Auto-Sender daemon started (PID ${process.pid}) — checking every 60s`);

  const loop = async () => {
    await tick().catch(e => log(`Tick error: ${e.message}`));
    setTimeout(loop, 60_000);
  };
  await tick().catch(e => log(`Initial tick error: ${e.message}`));
  setTimeout(loop, 60_000);

  process.on('SIGINT',  () => { log('Shutting down'); process.exit(0); });
  process.on('SIGTERM', () => { log('Shutting down'); process.exit(0); });
}

main().catch(e => { console.error(`[dm-auto] Fatal: ${e.message}`); process.exit(1); });
