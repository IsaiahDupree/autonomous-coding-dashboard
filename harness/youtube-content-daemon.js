#!/usr/bin/env node

/**
 * youtube-content-daemon.js
 * ==========================
 * Watches YouTube playlists every 2 hours.
 * Queues unprocessed videos → runs full content pipeline → publishes → cleans up Passport drive.
 *
 * Rate limit: max 10 videos/day (env: YT_DAILY_LIMIT)
 *
 * Usage:
 *   node harness/youtube-content-daemon.js               # daemon (every 2h)
 *   node harness/youtube-content-daemon.js --once        # one cycle, exit
 *   node harness/youtube-content-daemon.js --test        # preflight only
 *   node harness/youtube-content-daemon.js --scan-only   # scan + queue, no pipeline
 *   node harness/youtube-content-daemon.js --process-one # process next pending video, exit
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { runPipeline } from './youtube-content-pipeline.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const H = __dirname;

const STATE_FILE = path.join(H, 'youtube-content-state.json');
const LOG_FILE   = path.join(H, 'youtube-content-log.ndjson');

// ── Env loading ───────────────────────────────────────────────────────────────
function loadEnvFile(filePath) {
  try {
    for (const line of fs.readFileSync(filePath, 'utf-8').split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.+)/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch { /* non-fatal */ }
}
loadEnvFile(`${process.env.HOME}/.env`);
loadEnvFile('/Users/isaiahdupree/Documents/Software/actp-worker/.env');

const YOUTUBE_API_KEY  = process.env.YOUTUBE_API_KEY  || '';
const PLAYLIST_IDS     = (process.env.YOUTUBE_PLAYLIST_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
const SUPABASE_URL     = process.env.SUPABASE_URL     || 'https://ivhfuhxorppptyuofbgq.supabase.co';
const SUPABASE_KEY     = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const TELEGRAM_TOKEN   = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT    = process.env.TELEGRAM_CHAT_ID   || '';
const DAILY_LIMIT      = parseInt(process.env.YT_DAILY_LIMIT || '10', 10);
const SCAN_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 hours
const PASSPORT_DIR     = '/Volumes/My Passport/yt-downloads';

const args = process.argv.slice(2);
const MODE = args.includes('--once')          ? 'once'
  : args.includes('--test')                   ? 'test'
  : args.includes('--scan-only')              ? 'scan-only'
  : args.includes('--process-one')            ? 'process-one'
  : 'daemon';

// ── Logging ───────────────────────────────────────────────────────────────────
function log(level, msg, data = {}) {
  const entry = { ts: new Date().toISOString(), level, msg, ...data };
  console.log(`[yt-daemon] [${level}] ${msg}`);
  try { fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n'); } catch {}
}

// ── State ─────────────────────────────────────────────────────────────────────
function loadState() { try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')); } catch { return {}; } }
function saveState(s) { fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2)); }

// ── Supabase ──────────────────────────────────────────────────────────────────
async function supabase(method, table, body, params = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${params}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': method === 'POST' ? 'resolution=merge-duplicates,return=representation' : 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`Supabase ${method} ${table}: ${res.status} ${await res.text()}`);
  return res.json().catch(() => null);
}

// ── Telegram ──────────────────────────────────────────────────────────────────
async function sendTelegram(text) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT, text, parse_mode: 'HTML' }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {}
}

// ── YouTube Data API ──────────────────────────────────────────────────────────
async function fetchPlaylistVideos(playlistId) {
  if (!YOUTUBE_API_KEY) throw new Error('Missing YOUTUBE_API_KEY');
  const videos = [];
  let pageToken = '';
  do {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems`
      + `?part=snippet&maxResults=50&playlistId=${playlistId}`
      + (pageToken ? `&pageToken=${pageToken}` : '')
      + `&key=${YOUTUBE_API_KEY}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`YouTube API ${res.status}: ${await res.text()}`);
    const data = await res.json();
    for (const item of (data.items || [])) {
      const s = item.snippet || {};
      const videoId = s.resourceId?.videoId;
      if (!videoId) continue;
      videos.push({
        id:          videoId,
        playlist_id: playlistId,
        title:       s.title || '',
        channel:     s.channelTitle || s.videoOwnerChannelTitle || '',
        url:         `https://www.youtube.com/watch?v=${videoId}`,
      });
    }
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return videos;
}

// ── Queue scan ────────────────────────────────────────────────────────────────
async function scanAndQueue() {
  let totalQueued = 0;
  for (const playlistId of PLAYLIST_IDS) {
    log('info', `Scanning playlist ${playlistId}`);
    let videos;
    try {
      videos = await fetchPlaylistVideos(playlistId);
    } catch (e) {
      log('error', `Playlist ${playlistId} fetch failed: ${e.message}`);
      continue;
    }
    log('info', `${videos.length} videos in playlist ${playlistId}`);
    for (const video of videos) {
      try {
        const existing = await supabase('GET', 'yt_content_queue', undefined, `?id=eq.${video.id}&select=id,status`);
        if (existing?.[0] && existing[0].status !== 'error') continue;
        await supabase('POST', 'yt_content_queue', {
          id:          video.id,
          playlist_id: video.playlist_id,
          title:       video.title,
          channel:     video.channel,
          url:         video.url,
          status:      'pending',
          error_msg:   null,
          queued_at:   new Date().toISOString(),
        });
        totalQueued++;
        log('info', `Queued: "${video.title}" (${video.id})`);
      } catch (e) {
        log('warn', `Could not queue ${video.id}: ${e.message}`);
      }
    }
  }
  log('info', `Scan done. Newly queued: ${totalQueued}`);
  return totalQueued;
}

// ── Daily processed count ─────────────────────────────────────────────────────
async function processedTodayCount() {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const rows = await supabase('GET', 'yt_content_queue', undefined,
      `?status=eq.done&processed_at=gte.${today}T00:00:00Z&select=id`
    );
    return rows?.length || 0;
  } catch { return 0; }
}

// ── Process next pending video ────────────────────────────────────────────────
async function processNext() {
  const pending = await supabase('GET', 'yt_content_queue', undefined,
    `?status=eq.pending&order=queued_at.asc&limit=1`
  );
  if (!pending?.length) { log('info', 'Queue empty — no pending videos'); return false; }
  const video = pending[0];
  log('info', `Processing: "${video.title}" (${video.id})`);
  try {
    await runPipeline(video);
    log('info', `Pipeline complete: ${video.id}`);
    return true;
  } catch (e) {
    log('error', `Pipeline failed for ${video.id}: ${e.message}`);
    return false;
  }
}

// ── Passport drive status ─────────────────────────────────────────────────────
function passportStatus() {
  try {
    fs.accessSync(PASSPORT_DIR.split('/yt-downloads')[0]);
    const dirs = fs.existsSync(PASSPORT_DIR) ? fs.readdirSync(PASSPORT_DIR) : [];
    return { mounted: true, pendingDirs: dirs.length };
  } catch {
    return { mounted: false, pendingDirs: 0 };
  }
}

// ── Preflight ─────────────────────────────────────────────────────────────────
async function preflight() {
  const issues = [];
  if (!SUPABASE_KEY)                    issues.push('Missing SUPABASE_SERVICE_ROLE_KEY');
  if (!YOUTUBE_API_KEY)                 issues.push('Missing YOUTUBE_API_KEY');
  if (!process.env.OPENAI_API_KEY)      issues.push('Missing OPENAI_API_KEY (Whisper + DALL-E)');
  if (!process.env.ANTHROPIC_API_KEY)   issues.push('Missing ANTHROPIC_API_KEY');
  if (!PLAYLIST_IDS.length)             issues.push('Missing YOUTUBE_PLAYLIST_IDS');

  const passport = passportStatus();
  if (!passport.mounted) issues.push('Passport drive not mounted at /Volumes/My Passport');

  // Check yt-dlp + ffmpeg
  try { execSyncSilent('/opt/homebrew/bin/yt-dlp --version'); } catch { issues.push('yt-dlp not found at /opt/homebrew/bin/yt-dlp'); }
  try { execSyncSilent('/opt/homebrew/bin/ffmpeg -version'); } catch { issues.push('ffmpeg not found at /opt/homebrew/bin/ffmpeg'); }

  if (!process.env.BLOTATO_API_KEY) log('warn', 'BLOTATO_API_KEY not set — social publishing disabled');
  if (!TELEGRAM_TOKEN)              log('warn', 'TELEGRAM_BOT_TOKEN not set — notifications disabled');

  if (issues.length) {
    log('error', `Preflight failed: ${issues.join(', ')}`);
    issues.forEach(i => log('error', `  Missing: ${i}`));
    return false;
  }
  log('info', `Preflight OK — ${PLAYLIST_IDS.length} playlists, daily limit: ${DAILY_LIMIT}, Passport: ${passport.pendingDirs} dirs`);
  return true;
}

function execSyncSilent(cmd) {
  return execSync(cmd, { stdio: 'pipe' });
}

// ── Main cycle ────────────────────────────────────────────────────────────────
async function runCycle() {
  const state = loadState();
  state.last_cycle = new Date().toISOString();
  state.cycles = (state.cycles || 0) + 1;
  saveState(state);
  log('info', `Cycle ${state.cycles} starting`);

  await scanAndQueue();

  const todayCount = await processedTodayCount();
  const remaining  = DAILY_LIMIT - todayCount;
  if (remaining <= 0) {
    log('info', `Daily limit reached (${todayCount}/${DAILY_LIMIT})`);
    return;
  }
  log('info', `Processing up to ${remaining} videos (done today: ${todayCount})`);

  for (let i = 0; i < remaining; i++) {
    const processed = await processNext();
    if (!processed) break;
    if (i < remaining - 1) await new Promise(r => setTimeout(r, 5000));
  }
  log('info', 'Cycle complete');
}

// ── Entry point ───────────────────────────────────────────────────────────────
async function main() {
  log('info', `YouTube Content Daemon starting (mode: ${MODE})`);

  const ok = await preflight();
  if (!ok && MODE !== 'test') process.exit(1);

  if (MODE === 'test') {
    process.exit(ok ? 0 : 1);
  }

  if (MODE === 'scan-only') {
    await scanAndQueue();
    process.exit(0);
  }

  if (MODE === 'process-one') {
    await processNext();
    process.exit(0);
  }

  await runCycle();

  if (MODE === 'once') {
    log('info', 'Single cycle complete. Exiting.');
    process.exit(0);
  }

  log('info', `Daemon running. Next scan in ${SCAN_INTERVAL_MS / 60000} minutes.`);
  setInterval(async () => {
    try { await runCycle(); }
    catch (e) { log('error', `Cycle error: ${e.message}`); }
  }, SCAN_INTERVAL_MS);
}

main().catch(e => { log('error', `Fatal: ${e.message}`); process.exit(1); });
