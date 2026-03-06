#!/usr/bin/env node
/**
 * TikTok DM Sweep Daemon — finds creators via tiktok-comments search (:3006),
 * generates DMs via tiktok-dm (:3102), queues for approval. NEVER auto-sends.
 * Usage: --once | --test | --dry-run | --send-approved
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const H = __dirname;
const QUEUE_FILE  = path.join(H,'tiktok-dm-queue.json');
const STATE_FILE  = path.join(H,'tiktok-dm-sweep-state.json');
const LOG_FILE    = path.join(H,'tiktok-dm-sweep-log.ndjson');
const GOALS_FILE  = '/Users/isaiahdupree/Documents/Software/business-goals.json';
const HOME_ENV    = `${process.env.HOME}/.env`;
const ACTP_ENV    = '/Users/isaiahdupree/Documents/Software/actp-worker/.env';
const SAFARI_LOCK = '/tmp/safari-comment-sweep.lock';

const TK_COMMENTS_URL = process.env.TIKTOK_COMMENTS_URL || 'http://localhost:3006';
const TK_DM_URL       = process.env.TIKTOK_DM_URL       || 'http://localhost:3102';
const TK_TOKEN        = process.env.TIKTOK_API_TOKEN     || 'test-token-12345';
const MAX_PER_RUN     = parseInt(process.env.TK_DM_MAX_PER_RUN || '5');
const DAILY_CAP       = parseInt(process.env.TK_DM_DAILY_CAP  || '8');
const BASE_MS         = parseInt(process.env.TK_DM_INTERVAL_MS || String(6*60*60*1000)); // 6h
const SEEN_TTL        = 30;

// Use hashtag-friendly keywords for TikTok search
const NICHE_KEYWORDS = {
  ai_automation:    ['AI automation business','AI tools founder','automate my workflow'],
  saas_growth:      ['SaaS founder','indie SaaS','B2B startup growth'],
  content_creation: ['build in public','solopreneur','content creator tips'],
  creator_economy:  ['creator economy','online business systems','indie maker'],
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
function log(msg,data={}){const e={ts:new Date().toISOString(),msg,...data};if(!process.env.NOHUP||process.stdout.isTTY)console.log(`[tk-dm] ${msg}`);try{fs.appendFileSync(LOG_FILE,JSON.stringify(e)+'\n');}catch{}}

async function fetch_(url,opts={}){
  try{const r=await fetch(url,{...opts,signal:AbortSignal.timeout(60_000)});return await r.json();}
  catch(e){return{error:String(e)};}
}
function headers(){return{'Content-Type':'application/json','Authorization':`Bearer ${TK_TOKEN}`};}

function acquireLock(){try{if(fs.existsSync(SAFARI_LOCK)){const l=JSON.parse(fs.readFileSync(SAFARI_LOCK,'utf8'));if(l.expires>Date.now())return false;}fs.writeFileSync(SAFARI_LOCK,JSON.stringify({pid:process.pid,platform:'tiktok-dm',acquired:new Date().toISOString(),expires:Date.now()+15*60*1000}));return true;}catch{return false;}}
function releaseLock(){try{const l=JSON.parse(fs.readFileSync(SAFARI_LOCK,'utf8'));if(l.pid===process.pid)fs.unlinkSync(SAFARI_LOCK);}catch{}}
function jitter(){return Math.max(BASE_MS+(Math.random()*60-30)*60000,2*60*60*1000);}
function isActive(){const h=new Date().getHours();return h>=8&&h<22;}

function loadKeywords(){
  try{const g=JSON.parse(fs.readFileSync(GOALS_FILE,'utf8'));const n=g?.content?.niches||Object.keys(NICHE_KEYWORDS);return n.filter(k=>NICHE_KEYWORDS[k]).flatMap(k=>NICHE_KEYWORDS[k]);}
  catch{return Object.values(NICHE_KEYWORDS).flat();}
}

// Basic ICP signal check on TikTok video description / author name
function scoreCreator(author,description){
  const text=(author+' '+description).toLowerCase();
  const signals=[];
  if(/ai|automation|automat/i.test(text))signals.push('ai_automation');
  if(/saas|startup|founder|b2b/i.test(text))signals.push('saas');
  if(/content.*creat|build.*public|solopreneur/i.test(text))signals.push('content');
  if(/market|growth|conversion/i.test(text))signals.push('marketing');
  return{score:signals.length*25,signals};
}

async function runSweep(){
  const commHealth=await fetch_(`${TK_COMMENTS_URL}/health`);
  const dmHealth=await fetch_(`${TK_DM_URL}/health`);
  if(commHealth.error||commHealth.status!=='ok'){log(`Comments service not ready`);return;}
  if(dmHealth.error||dmHealth.status!=='ok'){log(`DM service not ready`);return;}

  const state=readState();
  if(state.dailyQueued>=DAILY_CAP){log(`Daily cap ${DAILY_CAP} hit`);return;}

  let locked=false;
  for(let i=0;i<18;i++){if(acquireLock()){locked=true;break;}log('Safari lock busy — waiting 10s');await new Promise(r=>setTimeout(r,10000));}
  if(!locked){log('Could not acquire Safari lock — skipping');return;}

  try{
    const keywords=loadKeywords();
    const runMax=Math.min(MAX_PER_RUN,DAILY_CAP-state.dailyQueued);
    log(`Searching TikTok creators: ${keywords.length} keywords, max ${runMax}`);
    state.lastRun=new Date().toISOString();

    // Collect unique creators from keyword searches
    const seenAuthors=new Set();
    const candidates=[];

    for(const kw of keywords){
      if(candidates.length>=runMax*4)break;
      const r=await fetch_(`${TK_COMMENTS_URL}/api/tiktok/search-cards`,{method:'POST',headers:headers(),body:JSON.stringify({query:kw,maxCards:10})});
      if(r.error||!r.videos)continue;
      for(const v of r.videos){
        if(!v.author||seenAuthors.has(v.author))continue;
        seenAuthors.add(v.author);
        const{score,signals}=scoreCreator(v.author,v.description||'');
        if(score>=25)candidates.push({username:v.author,score,signals,description:v.description});
      }
      await new Promise(r=>setTimeout(r,2000));
    }

    candidates.sort((a,b)=>b.score-a.score);
    const q=readQueue();
    let queued=0;

    for(const c of candidates){
      if(queued>=runMax||state.dailyQueued>=DAILY_CAP)break;
      if(state.seenUsers[c.username])continue;
      if(q.queue.some(e=>e.username===c.username&&e.status!=='skipped'))continue;

      // Generate DM via tiktok-dm service
      const gen=await fetch_(`${TK_DM_URL}/api/tiktok/ai/generate`,{method:'POST',headers:headers(),body:JSON.stringify({username:c.username,purpose:'networking',topic:'AI automation and content creation'})});
      const message=gen.message||null;
      if(!message&&!DRY_RUN)continue;

      const entry={id:`tk-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,platform:'tiktok',username:c.username,score:c.score,signals:c.signals,message:message||'[DM generation failed]',status:'pending',discoveredAt:new Date().toISOString()};
      if(!DRY_RUN){q.queue.push(entry);state.seenUsers[c.username]=Date.now();state.dailyQueued++;state.totalAllTime=(state.totalAllTime||0)+1;}
      queued++;
      log(`  Queued @${c.username} (score=${c.score}): "${(message||'').slice(0,50)}..."`);
    }
    if(!DRY_RUN){writeQueue(q);writeState(state);}
    log(`Sweep done: ${queued} queued${DRY_RUN?' (dry-run)':''}, daily ${state.dailyQueued}/${DAILY_CAP}`);

    if (queued > 0 && !DRY_RUN) {
      const newEntries = q.queue.filter(e=>e.status==='pending').slice(-queued);
      const lines = newEntries.map(e=>`  @${e.username} — score ${e.score} | "${(e.message||'').slice(0,60)}..."`).join('\n');
      await sendTelegram(
        `🎵 <b>TikTok DM Queue</b> — +${queued} new prospects\n\n${lines}\n\nDaily: ${state.dailyQueued}/${DAILY_CAP}`,
        { inline_keyboard: [[{ text: '📋 Review Queue', callback_data: 'queue' }, { text: '✅ Approve All TT', callback_data: 'tt_approve_all' }]] }
      );
    }
  }finally{releaseLock();}
}

async function sendApproved(){
  const q=readQueue();
  const approved=q.queue.filter(e=>e.status==='approved'&&e.platform==='tiktok');
  if(!approved.length){log('No approved TikTok DMs');return;}
  log(`Sending ${approved.length} approved TikTok DMs...`);
  for(const e of approved){
    const r=await fetch_(`${TK_DM_URL}/api/tiktok/messages/send-to`,{method:'POST',headers:headers(),body:JSON.stringify({username:e.username,message:e.message})});
    e.status=r.success?'sent':'failed';
    if(r.success){e.sentAt=new Date().toISOString();log(`  Sent @${e.username}`);}
    else{e.failReason=r.error;log(`  Failed @${e.username}: ${r.error}`);}
    await new Promise(r=>setTimeout(r,25000+Math.random()*20000));
  }
  writeQueue(q);
  const sent=approved.filter(e=>e.status==='sent').length;
  const failed=approved.filter(e=>e.status==='failed').length;
  await sendTelegram(`🎵 <b>TikTok DMs sent</b>\n\n✅ ${sent} sent | ❌ ${failed} failed`);
}

async function main(){
  try{fs.mkdirSync(path.join(H,'logs'),{recursive:true});}catch{}
  if(MODE==='test'){const h=await fetch_(`${TK_DM_URL}/health`);console.log(h.status==='ok'?'OK: :3102':'FAIL: :3102');process.exit(h.status==='ok'?0:1);}
  if(MODE==='send'){await sendApproved();process.exit(0);}
  if(MODE==='once'){await runSweep();log('Single sweep complete');process.exit(0);}
  log(`TikTok DM Sweep daemon started (PID ${process.pid})`);
  const tick=async()=>{if(!isActive())log('Outside active hours');else await runSweep().catch(e=>log(`Error: ${e.message}`));setTimeout(tick,jitter());};
  await runSweep().catch(e=>log(`Initial error: ${e.message}`));
  setTimeout(tick,jitter());
  process.on('SIGINT',()=>{releaseLock();process.exit(0);});
  process.on('SIGTERM',()=>{releaseLock();process.exit(0);});
}
main().catch(e=>{releaseLock();console.error(`[tk-dm] Fatal: ${e.message}`);process.exit(1);});
