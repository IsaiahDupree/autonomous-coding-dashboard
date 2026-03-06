#!/usr/bin/env node

/**
 * Twitter DM Sweep Daemon
 * =======================
 * Discovers ICP prospects from niche keyword searches, generates personalized
 * AI DMs, and adds them to a local approval queue. NEVER auto-sends.
 *
 * Limits:
 *   maxPerRun    : 10 prospects added to queue per run
 *   dailyCap     : 15 new prospects queued per day
 *   runInterval  : every 4 hours (during 8am-10pm, ±20min jitter)
 *
 * Usage:
 *   node harness/twitter-dm-sweep.js               # daemon
 *   node harness/twitter-dm-sweep.js --once        # single sweep then exit
 *   node harness/twitter-dm-sweep.js --test        # preflight only
 *   node harness/twitter-dm-sweep.js --dry-run     # discover, don't queue
 *   node harness/twitter-dm-sweep.js --send-approved  # send all approved DMs then exit
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const H = __dirname;

const QUEUE_FILE  = path.join(H, 'twitter-dm-queue.json');
const STATE_FILE  = path.join(H, 'twitter-dm-sweep-state.json');
const LOG_FILE    = path.join(H, 'twitter-dm-sweep-log.ndjson');
const GOALS_FILE  = '/Users/isaiahdupree/Documents/Software/business-goals.json';
const HOME_ENV    = `${process.env.HOME}/.env`;
const ACTP_ENV    = '/Users/isaiahdupree/Documents/Software/actp-worker/.env';
const SAFARI_LOCK = '/tmp/safari-comment-sweep.lock';

const TW_DM_URL   = process.env.TWITTER_DM_URL || 'http://localhost:3003';
const TW_DM_TOKEN = process.env.TWITTER_DM_TOKEN || 'test-token-12345';
const MIN_SCORE   = parseInt(process.env.TW_DM_MIN_SCORE  || '40');
const MAX_PER_RUN = parseInt(process.env.TW_DM_MAX_PER_RUN || '10');
const DAILY_CAP   = parseInt(process.env.TW_DM_DAILY_CAP  || '15');
const BASE_INTERVAL_MS = parseInt(process.env.TW_DM_INTERVAL_MS || String(4 * 60 * 60 * 1000));
const SEEN_TTL_DAYS = 30;

const NICHE_KEYWORDS = {
  ai_automation:     ['AI automation founder', 'AI workflow tools', 'automate my business', 'AI tools for SaaS'],
  saas_growth:       ['SaaS founder', 'B2B SaaS growth', 'indie SaaS revenue', 'startup scaling'],
  content_creation:  ['build in public', 'solopreneur content', 'creator economy founder'],
  digital_marketing: ['marketing automation founder', 'growth marketing AI', 'performance marketing'],
  creator_economy:   ['solopreneur income', 'indie maker revenue', 'online business systems'],
};

const args = process.argv.slice(2);
const MODE = args.includes('--once') ? 'once' : args.includes('--test') ? 'test'
  : args.includes('--send-approved') ? 'send' : 'daemon';
const DRY_RUN = args.includes('--dry-run');

function loadEnv(p) {
  try { for (const l of fs.readFileSync(p,'utf8').split('\n')) { const m=l.match(/^([A-Z0-9_]+)=(.+)/); if(m&&!process.env[m[1]])process.env[m[1]]=m[2].trim(); } } catch {}
}
loadEnv(HOME_ENV); loadEnv(ACTP_ENV);

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

function today() { return new Date().toISOString().slice(0,10); }

function readState() {
  try {
    const s = JSON.parse(fs.readFileSync(STATE_FILE,'utf8'));
    if (s.date !== today()) { s.date=today(); s.dailyQueued=0; }
    const cutoff = Date.now() - SEEN_TTL_DAYS*86400000;
    for (const [u,ts] of Object.entries(s.seenUsers||{})) if (ts<cutoff) delete s.seenUsers[u];
    return s;
  } catch { return { date:today(), dailyQueued:0, seenUsers:{}, lastRun:null, totalAllTime:0 }; }
}
function writeState(s) { try { fs.writeFileSync(STATE_FILE,JSON.stringify(s,null,2)); } catch {} }

function readQueue() {
  try { return JSON.parse(fs.readFileSync(QUEUE_FILE,'utf8')); }
  catch { return { queue:[] }; }
}
function writeQueue(q) { try { fs.writeFileSync(QUEUE_FILE,JSON.stringify(q,null,2)); } catch {} }

function log(msg, data={}) {
  const e={ts:new Date().toISOString(),msg,...data};
  if(!process.env.NOHUP||process.stdout.isTTY) console.log(`[tw-dm] ${msg}`);
  try { fs.appendFileSync(LOG_FILE,JSON.stringify(e)+'\n'); } catch {}
}

async function api(path, method='GET', body=null) {
  try {
    const res = await fetch(`${TW_DM_URL}${path}`, {
      method, headers:{'Content-Type':'application/json','Authorization':`Bearer ${TW_DM_TOKEN}`},
      ...(body ? {body:JSON.stringify(body)} : {}),
      signal: AbortSignal.timeout(60_000),
    });
    return await res.json();
  } catch(e) { return {error:String(e)}; }
}

function acquireLock() {
  try {
    if (fs.existsSync(SAFARI_LOCK)) { const l=JSON.parse(fs.readFileSync(SAFARI_LOCK,'utf8')); if(l.expires>Date.now()) return false; }
    fs.writeFileSync(SAFARI_LOCK,JSON.stringify({pid:process.pid,platform:'twitter-dm',acquired:new Date().toISOString(),expires:Date.now()+10*60*1000}));
    return true;
  } catch { return false; }
}
function releaseLock() { try { const l=JSON.parse(fs.readFileSync(SAFARI_LOCK,'utf8')); if(l.pid===process.pid) fs.unlinkSync(SAFARI_LOCK); } catch {} }
function jitter() { return Math.max(BASE_INTERVAL_MS+(Math.random()*40-20)*60000,60*60*1000); }
function isActive() { const h=new Date().getHours(); return h>=8&&h<22; }

function loadKeywords() {
  try {
    const goals = JSON.parse(fs.readFileSync(GOALS_FILE,'utf8'));
    const niches = goals?.content?.niches || Object.keys(NICHE_KEYWORDS);
    return niches.filter(n=>NICHE_KEYWORDS[n]).flatMap(n=>NICHE_KEYWORDS[n]);
  } catch { return Object.values(NICHE_KEYWORDS).flat(); }
}

async function runSweep() {
  const health = await api('/health');
  if (health.error || health.status !== 'ok') { log(`Service not ready — ${health.error||health.status}`); return; }

  const state = readState();
  if (state.dailyQueued >= DAILY_CAP) { log(`Daily cap (${DAILY_CAP}) hit`); return; }

  let lockAcquired = false;
  for (let i=0; i<18; i++) { if(acquireLock()){lockAcquired=true;break;} log('Safari lock busy — waiting 10s'); await new Promise(r=>setTimeout(r,10000)); }
  if (!lockAcquired) { log('Could not acquire Safari lock — skipping'); return; }

  try {
    const keywords = loadKeywords();
    const runMax = Math.min(MAX_PER_RUN, DAILY_CAP - state.dailyQueued);

    log(`Discovering prospects: ${keywords.length} keywords, max ${runMax}`);
    state.lastRun = new Date().toISOString();

    const discovered = await api('/api/twitter/prospect/discover', 'POST', {
      keywords,
      minScore: MIN_SCORE,
      maxResults: runMax * 3,
    });

    if (discovered.error) { log(`Discover error: ${discovered.error}`); return; }

    const prospects = discovered.prospects || [];
    const q = readQueue();
    let queued = 0;

    for (const p of prospects) {
      if (queued >= runMax || state.dailyQueued >= DAILY_CAP) break;
      if (!p.username || p.score < MIN_SCORE) continue;
      if (state.seenUsers[p.username]) continue;
      if (q.queue.some(e => e.username === p.username && e.status !== 'skipped')) continue;

      // Generate AI message
      const gen = await api('/api/twitter/ai/generate', 'POST', {
        username: p.username,
        purpose: 'cold_outreach',
        topic: 'AI automation and SaaS growth',
      });
      const message = gen.message || gen.error ? null : gen.message;
      if (!message && !DRY_RUN) continue;

      const entry = {
        id: `tw-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
        platform: 'twitter',
        username: p.username,
        score: p.score,
        signals: p.signals || [],
        message: message || '[DM generation failed]',
        status: 'pending',
        discoveredAt: new Date().toISOString(),
      };

      if (!DRY_RUN) {
        q.queue.push(entry);
        state.seenUsers[p.username] = Date.now();
        state.dailyQueued++;
        state.totalAllTime = (state.totalAllTime||0)+1;
      }
      queued++;
      log(`  Queued @${p.username} (score=${p.score}): "${(message||'').slice(0,50)}..."`);
    }

    if (!DRY_RUN) { writeQueue(q); writeState(state); }
    log(`Sweep done: ${queued} queued (${DRY_RUN?'dry-run':'saved'}), daily total ${state.dailyQueued}/${DAILY_CAP}`);

    if (queued > 0 && !DRY_RUN) {
      const newEntries = q.queue.filter(e => e.status === 'pending').slice(-queued);
      const lines = newEntries.map(e => `  @${e.username} — score ${e.score} | "${(e.message||'').slice(0,60)}..."`).join('\n');
      await sendTelegram(
        `🐦 <b>Twitter DM Queue</b> — +${queued} new prospects\n\n${lines}\n\nDaily: ${state.dailyQueued}/${DAILY_CAP}`,
        { inline_keyboard: [[{ text: '📋 Review LinkedIn Queue', callback_data: 'queue' }, { text: '✅ Approve All TW', callback_data: 'tw_approve_all' }]] }
      );
    }

  } finally { releaseLock(); }
}

async function sendApproved() {
  const q = readQueue();
  const approved = q.queue.filter(e => e.status === 'approved' && e.platform === 'twitter');
  if (!approved.length) { log('No approved DMs to send'); return; }

  log(`Sending ${approved.length} approved Twitter DMs...`);
  for (const entry of approved) {
    const result = await api('/api/twitter/messages/send-to', 'POST', {
      username: entry.username,
      text: entry.message,
    });
    if (result.success) {
      entry.status = 'sent';
      entry.sentAt = new Date().toISOString();
      log(`  Sent to @${entry.username}`);
    } else {
      entry.status = 'failed';
      entry.failReason = result.error;
      log(`  Failed @${entry.username}: ${result.error}`);
    }
    await new Promise(r => setTimeout(r, 15000 + Math.random()*10000)); // 15-25s between sends
  }
  writeQueue(q);
  const sent = approved.filter(e=>e.status==='sent').length;
  const failed = approved.filter(e=>e.status==='failed').length;
  log(`Done: ${sent} sent, ${failed} failed`);
  await sendTelegram(`🐦 <b>Twitter DMs sent</b>\n\n✅ ${sent} sent | ❌ ${failed} failed`);
}

async function preflight() {
  console.log('=== Twitter DM Sweep Preflight ===\n');
  const h = await api('/health');
  console.log(h.error||h.status!=='ok' ? `FAIL: :3003 — ${h.error||h.status}` : `OK: :3003 — ${h.status}`);
  const s = readState();
  console.log(`Daily queued: ${s.dailyQueued}/${DAILY_CAP} | Seen users: ${Object.keys(s.seenUrls||s.seenUsers||{}).length}`);
  const q = readQueue();
  const counts = q.queue.reduce((a,e)=>{a[e.status]=(a[e.status]||0)+1;return a},{});
  console.log(`Queue: ${JSON.stringify(counts)}`);
  console.log('\nPreflight complete.');
  return !h.error && h.status === 'ok';
}

async function main() {
  try { fs.mkdirSync(path.join(H,'logs'),{recursive:true}); } catch {}

  if (MODE==='test') { process.exit(await preflight()?0:1); }
  if (MODE==='send') { await sendApproved(); process.exit(0); }
  if (MODE==='once') { await preflight(); await runSweep(); log('Single sweep complete'); process.exit(0); }

  log(`Twitter DM Sweep daemon started (PID ${process.pid})`);
  const tick = async () => {
    if (!isActive()) { log('Outside active hours — sleeping'); } else { await runSweep().catch(e=>log(`Error: ${e.message}`)); }
    setTimeout(tick, jitter());
  };
  await runSweep().catch(e=>log(`Initial error: ${e.message}`));
  setTimeout(tick, jitter());
  process.on('SIGINT', ()=>{releaseLock();process.exit(0);});
  process.on('SIGTERM',()=>{releaseLock();process.exit(0);});
}

main().catch(e=>{releaseLock();console.error(`[tw-dm] Fatal: ${e.message}`);process.exit(1);});
