#!/usr/bin/env node
/**
 * Instagram DM Sweep Daemon — discovers ICP prospects, generates DMs, queues for approval.
 * Port: 3100 (instagram-dm). NEVER auto-sends.
 * Usage: --once | --test | --dry-run | --send-approved
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const H = __dirname;
const QUEUE_FILE  = path.join(H,'instagram-dm-queue.json');
const STATE_FILE  = path.join(H,'instagram-dm-sweep-state.json');
const LOG_FILE    = path.join(H,'instagram-dm-sweep-log.ndjson');
const GOALS_FILE  = '/Users/isaiahdupree/Documents/Software/business-goals.json';
const HOME_ENV    = `${process.env.HOME}/.env`;
const ACTP_ENV    = '/Users/isaiahdupree/Documents/Software/actp-worker/.env';
const SAFARI_LOCK = '/tmp/safari-comment-sweep.lock';

const IG_DM_URL   = process.env.INSTAGRAM_DM_URL || 'http://localhost:3100';
const IG_DM_TOKEN = process.env.INSTAGRAM_DM_TOKEN || 'test-token-12345';
const MIN_SCORE   = parseInt(process.env.IG_DM_MIN_SCORE  || '40');
const MAX_PER_RUN = parseInt(process.env.IG_DM_MAX_PER_RUN || '8');
const DAILY_CAP   = parseInt(process.env.IG_DM_DAILY_CAP  || '10');
const BASE_MS     = parseInt(process.env.IG_DM_INTERVAL_MS || String(5*60*60*1000)); // 5h — IG most strict
const SEEN_TTL    = 30;

const NICHE_KEYWORDS = {
  ai_automation:    ['aiautomation','businessautomation','aitools'],
  saas_growth:      ['saasfounder','indiehacker','startupfounder'],
  content_creation: ['buildinpublic','contentcreator','solopreneur'],
  creator_economy:  ['creatoreconomy','onlinebusiness'],
};

const args = process.argv.slice(2);
const MODE = args.includes('--once')?'once':args.includes('--test')?'test':args.includes('--send-approved')?'send':'daemon';
const DRY_RUN = args.includes('--dry-run');

function loadEnv(p){try{for(const l of fs.readFileSync(p,'utf8').split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.+)/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].trim();}}catch{}}
loadEnv(HOME_ENV);loadEnv(ACTP_ENV);

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

function today(){return new Date().toISOString().slice(0,10);}
function readState(){
  try{const s=JSON.parse(fs.readFileSync(STATE_FILE,'utf8'));if(s.date!==today()){s.date=today();s.dailyQueued=0;}const c=Date.now()-SEEN_TTL*86400000;for(const[u,t]of Object.entries(s.seenUsers||{}))if(t<c)delete s.seenUsers[u];return s;}
  catch{return{date:today(),dailyQueued:0,seenUsers:{},lastRun:null,totalAllTime:0};}
}
function writeState(s){try{fs.writeFileSync(STATE_FILE,JSON.stringify(s,null,2));}catch{}}
function readQueue(){try{return JSON.parse(fs.readFileSync(QUEUE_FILE,'utf8'));}catch{return{queue:[]};}}
function writeQueue(q){try{fs.writeFileSync(QUEUE_FILE,JSON.stringify(q,null,2));}catch{}}
function log(msg,data={}){const e={ts:new Date().toISOString(),msg,...data};if(!process.env.NOHUP||process.stdout.isTTY)console.log(`[ig-dm] ${msg}`);try{fs.appendFileSync(LOG_FILE,JSON.stringify(e)+'\n');}catch{}}
async function api(p,method='GET',body=null){
  try{const r=await fetch(`${IG_DM_URL}${p}`,{method,headers:{'Content-Type':'application/json','Authorization':`Bearer ${IG_DM_TOKEN}`},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(90_000)});return await r.json();}
  catch(e){return{error:String(e)};}
}
function acquireLock(){try{if(fs.existsSync(SAFARI_LOCK)){const l=JSON.parse(fs.readFileSync(SAFARI_LOCK,'utf8'));if(l.expires>Date.now())return false;}fs.writeFileSync(SAFARI_LOCK,JSON.stringify({pid:process.pid,platform:'instagram-dm',acquired:new Date().toISOString(),expires:Date.now()+15*60*1000}));return true;}catch{return false;}}
function releaseLock(){try{const l=JSON.parse(fs.readFileSync(SAFARI_LOCK,'utf8'));if(l.pid===process.pid)fs.unlinkSync(SAFARI_LOCK);}catch{}}
function jitter(){return Math.max(BASE_MS+(Math.random()*60-30)*60000,90*60*1000);}
function isActive(){const h=new Date().getHours();return h>=8&&h<22;}

function loadKeywords(){
  try{const g=JSON.parse(fs.readFileSync(GOALS_FILE,'utf8'));const n=g?.content?.niches||Object.keys(NICHE_KEYWORDS);return n.filter(k=>NICHE_KEYWORDS[k]).flatMap(k=>NICHE_KEYWORDS[k]);}
  catch{return Object.values(NICHE_KEYWORDS).flat();}
}

async function runSweep(){
  const health=await api('/health');
  if(health.error||health.status!=='ok'){log(`Service not ready — ${health.error||health.status}`);return;}
  const state=readState();
  if(state.dailyQueued>=DAILY_CAP){log(`Daily cap ${DAILY_CAP} hit`);return;}

  let locked=false;
  for(let i=0;i<18;i++){if(acquireLock()){locked=true;break;}log('Safari lock busy — waiting 10s');await new Promise(r=>setTimeout(r,10000));}
  if(!locked){log('Could not acquire Safari lock — skipping');return;}

  try{
    const keywords=loadKeywords();
    const runMax=Math.min(MAX_PER_RUN,DAILY_CAP-state.dailyQueued);
    log(`Discovering IG prospects: ${keywords.length} keywords, max ${runMax}`);
    state.lastRun=new Date().toISOString();

    // Use IG's full pipeline: discover + score + store
    const discovered=await api('/api/prospect/run-pipeline','POST',{
      keywords,minScore:MIN_SCORE,maxDiscover:runMax*3,dryRun:false,
    });
    if(discovered.error){log(`Pipeline error: ${discovered.error}`);return;}

    // Schedule-batch: pick top prospects + generate messages
    const scheduled=await api('/api/prospect/schedule-batch','POST',{
      limit:runMax,template:'cold_outreach_founder',dryRun:DRY_RUN,
    });
    if(scheduled.error){log(`Schedule error: ${scheduled.error}`);return;}

    const q=readQueue();
    let queued=0;
    for(const p of scheduled.scheduled||[]){
      if(queued>=runMax||state.dailyQueued>=DAILY_CAP)break;
      const username=p.username||p.contact_id||'';
      if(!username||state.seenUsers[username])continue;
      if(q.queue.some(e=>e.username===username&&e.status!=='skipped'))continue;
      const entry={id:`ig-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,platform:'instagram',username,score:p.score||0,signals:p.signals||[],message:p.message||'',status:'pending',discoveredAt:new Date().toISOString()};
      if(!DRY_RUN){q.queue.push(entry);state.seenUsers[username]=Date.now();state.dailyQueued++;state.totalAllTime=(state.totalAllTime||0)+1;}
      queued++;
      log(`  Queued @${username} (score=${p.score||'?'})`);
    }
    if(!DRY_RUN){writeQueue(q);writeState(state);}
    log(`Sweep done: ${queued} queued${DRY_RUN?' (dry-run)':''}, daily ${state.dailyQueued}/${DAILY_CAP}`);

    if (queued > 0 && !DRY_RUN) {
      const newEntries = q.queue.filter(e=>e.status==='pending').slice(-queued);
      const lines = newEntries.map(e=>`  @${e.username} — score ${e.score} | "${(e.message||'').slice(0,60)}..."`).join('\n');
      await sendTelegram(
        `📸 <b>Instagram DM Queue</b> — +${queued} new prospects\n\n${lines}\n\nDaily: ${state.dailyQueued}/${DAILY_CAP}`,
        { inline_keyboard: [[{ text: '📋 Review Queue', callback_data: 'queue' }, { text: '✅ Approve All IG', callback_data: 'ig_approve_all' }]] }
      );
    }
  }finally{releaseLock();}
}

async function sendApproved(){
  const q=readQueue();
  const approved=q.queue.filter(e=>e.status==='approved'&&e.platform==='instagram');
  if(!approved.length){log('No approved IG DMs');return;}
  log(`Sending ${approved.length} approved IG DMs...`);
  for(const e of approved){
    const r=await api('/api/messages/send-to','POST',{username:e.username,text:e.message});
    e.status=r.success?'sent':'failed';
    if(r.success){e.sentAt=new Date().toISOString();log(`  Sent @${e.username}`);}
    else{e.failReason=r.error;log(`  Failed @${e.username}: ${r.error}`);}
    await new Promise(r=>setTimeout(r,20000+Math.random()*15000));
  }
  writeQueue(q);
  const sent=approved.filter(e=>e.status==='sent').length;
  const failed=approved.filter(e=>e.status==='failed').length;
  await sendTelegram(`📸 <b>Instagram DMs sent</b>\n\n✅ ${sent} sent | ❌ ${failed} failed`);
}

async function main(){
  try{fs.mkdirSync(path.join(H,'logs'),{recursive:true});}catch{}
  if(MODE==='test'){const h=await api('/health');console.log(h.status==='ok'?'OK: :3100':'FAIL: :3100');process.exit(h.status==='ok'?0:1);}
  if(MODE==='send'){await sendApproved();process.exit(0);}
  if(MODE==='once'){await runSweep();log('Single sweep complete');process.exit(0);}
  log(`Instagram DM Sweep daemon started (PID ${process.pid})`);
  const tick=async()=>{if(!isActive())log('Outside active hours');else await runSweep().catch(e=>log(`Error: ${e.message}`));setTimeout(tick,jitter());};
  await runSweep().catch(e=>log(`Initial error: ${e.message}`));
  setTimeout(tick,jitter());
  process.on('SIGINT',()=>{releaseLock();process.exit(0);});
  process.on('SIGTERM',()=>{releaseLock();process.exit(0);});
}
main().catch(e=>{releaseLock();console.error(`[ig-dm] Fatal: ${e.message}`);process.exit(1);});
