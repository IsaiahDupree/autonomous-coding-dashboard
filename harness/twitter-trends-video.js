#!/usr/bin/env node

/**
 * twitter-trends-video.js
 * =======================
 * Research trending Twitter/X content → compile brief → voice clone → Remotion render → publish.
 *
 * Pipeline:
 *   1. Twitter search via Safari :3007  (top posts on topic)
 *   2. Claude Sonnet                    (research compilation + voice script)
 *   3. Safari screenshots               (capture top tweet cards)
 *   4. Modal F5-TTS                     (voice clone — NOT ElevenLabs)
 *   5. Remotion render                  (shorts_v1 9:16 video with screenshots)
 *   6. Supabase Storage                 (upload MP4 → public URL)
 *   7. Blotato API                      (publish to YouTube + TikTok + Instagram)
 *   8. Telegram notification
 *   9. Cleanup local files
 *
 * Usage:
 *   node harness/twitter-trends-video.js                           # default topics
 *   node harness/twitter-trends-video.js --topic "AI agents"       # specific topic
 *   node harness/twitter-trends-video.js --dry-run                 # no upload
 *   node harness/twitter-trends-video.js --daemon                  # daily at 9am
 */

import fs from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const H = __dirname;

// ── Env loading ───────────────────────────────────────────────────────────────
function loadEnvFile(f) {
  try {
    for (const line of fs.readFileSync(f, 'utf-8').split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.+)/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {}
}
loadEnvFile(`${process.env.HOME}/.env`);
loadEnvFile('/Users/isaiahdupree/Documents/Software/actp-worker/.env');

const ANTHROPIC_KEY   = process.env.ANTHROPIC_API_KEY   || '';
const MODAL_URL       = process.env.MODAL_VOICE_CLONE_URL || '';
const BLOTATO_KEY     = process.env.BLOTATO_API_KEY      || '';
const SUPABASE_URL    = process.env.SUPABASE_URL         || 'https://ivhfuhxorppptyuofbgq.supabase.co';
const SUPABASE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const TELEGRAM_TOKEN  = process.env.TELEGRAM_BOT_TOKEN   || '';
const TELEGRAM_CHAT   = process.env.TELEGRAM_CHAT_ID     || '';
const TWITTER_PORT    = 3007;
const REMOTION_DIR    = '/Users/isaiahdupree/Documents/Software/Remotion';
const REF_AUDIO       = path.join(REMOTION_DIR, 'public/assets/voices/isaiah.wav');
const SCREENSHOTS_DIR = path.join(H, '.twitter-trends-screenshots');
const LOG_FILE        = path.join(H, 'twitter-trends-video-log.ndjson');

const args     = process.argv.slice(2);
const DRY_RUN  = args.includes('--dry-run');
const DAEMON   = args.includes('--daemon');
const topicArg = args.includes('--topic') ? args[args.indexOf('--topic') + 1] : null;
const TOPICS   = topicArg ? [topicArg] : ['AI automation', 'AI agents', 'build in public'];

const BLOTATO_ACCOUNTS = {
  youtube:   process.env.BLOTATO_YOUTUBE_ID   || '228',
  tiktok:    process.env.BLOTATO_TIKTOK_ID    || '710',
  instagram: process.env.BLOTATO_INSTAGRAM_ID || '807',
};

// ── Logging ───────────────────────────────────────────────────────────────────
function log(msg, data = {}) {
  const entry = { ts: new Date().toISOString(), msg, ...data };
  console.log(`[trends-video] ${msg}`);
  try { fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n'); } catch {}
}

function slug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
async function twitterSearch(query) {
  try {
    const res = await fetch(`http://localhost:${TWITTER_PORT}/api/twitter/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test-token-12345' },
      body: JSON.stringify({ query, limit: 20 }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.posts || data.results || data || [];
  } catch (e) {
    log(`Twitter search failed (non-fatal): ${e.message}`);
    return [];
  }
}

async function claudeCall(prompt, maxTokens = 2000) {
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });
  return res.content[0].text;
}

function parseJson(text) {
  const stripped = text.replace(/```(?:json)?/g, '').trim();
  const m = stripped.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('No JSON in response');
  return JSON.parse(m[0]);
}

async function captureScreenshot(url, outFile) {
  // Use playwright MCP or Safari automation to screenshot a tweet
  // Fallback: skip if service unavailable
  try {
    const res = await fetch(`http://localhost:${TWITTER_PORT}/api/twitter/screenshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test-token-12345' },
      body: JSON.stringify({ url, outputPath: outFile, cropToCard: true }),
      signal: AbortSignal.timeout(30000),
    });
    return res.ok;
  } catch { return false; }
}

async function generateVoiceover(text, voicePath) {
  if (!MODAL_URL) { log('No MODAL_VOICE_CLONE_URL — using text-to-speech fallback'); return false; }
  if (!fs.existsSync(REF_AUDIO)) { log('Reference audio not found — skipping voiceover'); return false; }
  const refAudioB64 = fs.readFileSync(REF_AUDIO).toString('base64');
  const res = await fetch(MODAL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, reference_audio_base64: refAudioB64, ref_text: '', speaker_name: 'isaiah', speed: 1.05 }),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) { log(`Modal voiceover failed: ${res.status}`); return false; }
  const data = await res.json();
  if (!data.audio) { log('No audio in Modal response'); return false; }
  fs.mkdirSync(path.dirname(voicePath), { recursive: true });
  fs.writeFileSync(voicePath, Buffer.from(data.audio, 'base64'));
  log(`Voiceover: ${voicePath} (${(fs.statSync(voicePath).size / 1024).toFixed(0)}KB)`);
  return true;
}

async function renderVideo(brief, voicePath, outFile) {
  return new Promise((resolve, reject) => {
    const briefPath = path.join(REMOTION_DIR, `data/briefs/trends-${brief.id}.json`);
    fs.mkdirSync(path.dirname(briefPath), { recursive: true });
    // Inject voiceover path if available
    if (voicePath && fs.existsSync(voicePath)) {
      brief.audio = { voice_path: voicePath, volume_music: 0.2, volume_voice: 1 };
    }
    fs.writeFileSync(briefPath, JSON.stringify(brief, null, 2));

    log(`Rendering: ${outFile}`);
    const proc = spawn('npx', ['tsx', 'scripts/render.ts', briefPath, outFile, '--quality', 'production'], {
      cwd: REMOTION_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    proc.stderr.on('data', d => { stderr += d.toString(); });
    proc.on('close', code => {
      if (code === 0 && fs.existsSync(outFile)) {
        log(`Render complete: ${outFile} (${(fs.statSync(outFile).size / 1024 / 1024).toFixed(1)}MB)`);
        resolve(outFile);
      } else {
        reject(new Error(`Render failed (code ${code}): ${stderr.slice(-200)}`));
      }
    });
  });
}

async function uploadToSupabase(filePath, bucket, key) {
  const buf = fs.readFileSync(filePath);
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${key}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'video/mp4',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    body: buf,
    signal: AbortSignal.timeout(300000),
  });
  if (!res.ok) { log(`Supabase upload failed: ${res.status}`); return null; }
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${key}`;
}

async function publishBlotato(text, videoUrl, platforms) {
  if (!BLOTATO_KEY) { log('No BLOTATO_API_KEY — skipping publish'); return null; }
  // Upload media
  const mediaRes = await fetch('https://backend.blotato.com/v2/media', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'blotato-api-key': BLOTATO_KEY },
    body: JSON.stringify({ url: videoUrl }),
    signal: AbortSignal.timeout(60000),
  });
  if (!mediaRes.ok) { log(`Blotato media upload failed: ${mediaRes.status}`); return null; }
  const { mediaId } = await mediaRes.json();
  // Post to platforms
  const postRes = await fetch('https://backend.blotato.com/v2/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'blotato-api-key': BLOTATO_KEY },
    body: JSON.stringify({
      post: { text, mediaIds: [mediaId] },
      platforms: platforms.map(p => ({ platform: p, accountId: BLOTATO_ACCOUNTS[p] })),
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!postRes.ok) { log(`Blotato post failed: ${postRes.status}`); return null; }
  return postRes.json();
}

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

// ── Main pipeline for one topic ───────────────────────────────────────────────
async function processTopic(topic) {
  const topicSlug = slug(topic);
  log(`Processing topic: "${topic}"`);
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  fs.mkdirSync(path.join(REMOTION_DIR, 'output'), { recursive: true });

  // ── Step 1: Twitter research ──
  log('Searching Twitter...');
  const posts = await twitterSearch(topic);
  log(`Found ${posts.length} posts`);

  // ── Step 2: Research compilation ──
  log('Compiling research with Claude...');
  const postsContext = posts.slice(0, 15).map(p =>
    `@${p.author || p.username || 'unknown'}: "${p.text || p.content || ''}" — ${p.likes || p.like_count || 0} likes`
  ).join('\n') || `Topic: ${topic} (no live posts — generate based on known trends)`;

  const researchPrompt = `You are a trend researcher and social media content creator.
Analyze these Twitter posts about "${topic}" and create a video brief.

Posts:
${postsContext}

Return a JSON object with exactly these fields:
{
  "trend_title": "catchy, specific title (max 60 chars, include a number if possible)",
  "hook": "opening line that makes someone stop scrolling — surprising, bold, or controversial (max 15 words)",
  "key_points": ["specific insight 1 (≤12 words)", "specific insight 2", "specific insight 3", "specific insight 4", "specific insight 5"],
  "hot_take": "one controversial or surprising insight from the data — opinionated, not generic (1 sentence)",
  "top_posts": [{"author": "@handle", "text": "post excerpt", "why_notable": "brief reason why this post matters"}],
  "voice_script": "60-90 second spoken narration. Energetic, direct, slightly opinionated. Reference real accounts/numbers if available. Opens with the hook. Covers each key point. Ends with hot_take and question. No filler, no slow intros. Max 200 words.",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
}

Return ONLY the JSON. No markdown fences.`;

  const researchText = await claudeCall(researchPrompt, 2000);
  const research = parseJson(researchText);
  log(`Research: "${research.trend_title}", ${research.key_points?.length} points`);

  // ── Step 3: Screenshots ──
  log('Capturing tweet screenshots...');
  const screenshotPaths = [];
  if (research.top_posts?.length) {
    for (const post of research.top_posts.slice(0, 5)) {
      const handle = (post.author || '').replace('@', '');
      const url = handle ? `https://x.com/${handle}` : null;
      if (!url) continue;
      const outFile = path.join(SCREENSHOTS_DIR, `${topicSlug}-${handle}.png`);
      const ok = await captureScreenshot(url, outFile);
      if (ok && fs.existsSync(outFile)) screenshotPaths.push(outFile);
    }
  }
  log(`Screenshots: ${screenshotPaths.length}`);

  // ── Step 4: Voiceover ──
  const voicePath = path.join(REMOTION_DIR, `output/voiceovers/trends-${topicSlug}.wav`);
  const hasVoice = await generateVoiceover(research.voice_script, voicePath);

  // ── Step 5: Build Remotion brief ──
  const brief = {
    id: topicSlug,
    format: 'shorts_v1',
    version: '1.0',
    created_at: new Date().toISOString(),
    settings: { resolution: { width: 1080, height: 1920 }, fps: 30, duration_sec: 45, aspect_ratio: '9:16' },
    style: {
      theme: 'neon',
      font_heading: 'Inter',
      font_body: 'Inter',
      primary_color: '#ffffff',
      secondary_color: '#d4d4d8',
      accent_color: '#1DA1F2',
      background_type: 'gradient',
      background_value: 'linear-gradient(135deg, #0a0a0a 0%, #0d1117 100%)',
    },
    sections: [
      {
        id: 'hook_001',
        type: 'hook',
        duration_sec: 5,
        start_time_sec: 0,
        content: { type: 'hook', hook_text: research.hook, title: research.trend_title },
      },
      {
        id: 'content_001',
        type: 'content',
        duration_sec: 35,
        start_time_sec: 5,
        content: {
          type: 'content',
          points: research.key_points || [],
          hot_take: research.hot_take,
          screenshot_paths: screenshotPaths,
        },
      },
      {
        id: 'cta_001',
        type: 'cta',
        duration_sec: 5,
        start_time_sec: 40,
        content: { type: 'cta', cta_text: 'Follow for daily AI trends', handle: '@isaiahdupree' },
      },
    ],
    audio: {
      voice_path: hasVoice ? voicePath : null,
      volume_music: hasVoice ? 0.15 : 0.4,
      volume_voice: 1,
    },
  };

  // ── Step 6: Render ──
  const outFile = path.join(REMOTION_DIR, `output/trends-${topicSlug}.mp4`);
  if (!DRY_RUN) {
    try {
      await renderVideo(brief, hasVoice ? voicePath : null, outFile);
    } catch (e) {
      log(`Render failed: ${e.message}`);
      throw e;
    }
  } else {
    log('[dry-run] Would render to: ' + outFile);
    // Write brief for inspection
    fs.writeFileSync(path.join(REMOTION_DIR, `data/briefs/trends-${topicSlug}.json`), JSON.stringify(brief, null, 2));
    log('[dry-run] Brief written');
    return { research, brief, voicePath: hasVoice ? voicePath : null };
  }

  // ── Step 7: Upload + publish ──
  log('Uploading to Supabase Storage...');
  const storageKey = `twitter-trends/${topicSlug}-${Date.now()}.mp4`;
  const publicUrl = await uploadToSupabase(outFile, 'videos', storageKey);
  if (!publicUrl) { log('Upload failed — keeping local file'); return { research, brief, videoPath: outFile }; }

  log('Publishing via Blotato...');
  const caption = `${research.trend_title}\n\n${research.hot_take}\n\n${(research.hashtags || []).join(' ')}`;
  const publishResult = await publishBlotato(caption, publicUrl, ['youtube', 'tiktok', 'instagram']);
  log(`Published: ${publishResult ? 'success' : 'failed'}`);

  // ── Step 8: Telegram ──
  await sendTelegram([
    `Trends video posted`,
    ``,
    `Topic: ${research.trend_title}`,
    `Hook: ${research.hook}`,
    ``,
    `Published: YouTube, TikTok, Instagram`,
    research.top_posts?.[0] ? `Top post: ${research.top_posts[0].author} — ${research.top_posts[0].why_notable}` : '',
  ].filter(Boolean).join('\n'));

  // ── Step 9: Cleanup ──
  if (publishResult) {
    try { fs.unlinkSync(outFile); log('Cleaned up local video'); } catch {}
    try { fs.rmSync(SCREENSHOTS_DIR, { recursive: true, force: true }); log('Cleaned up screenshots'); } catch {}
  }

  return { research, brief, publicUrl, published: !!publishResult };
}

// ── Daemon mode (daily at 9am) ─────────────────────────────────────────────────
function scheduleDaily(fn) {
  const now = new Date();
  const next9am = new Date(now);
  next9am.setHours(9, 0, 0, 0);
  if (next9am <= now) next9am.setDate(next9am.getDate() + 1);
  const msUntil = next9am - now;
  log(`Daemon: next run in ${Math.round(msUntil / 60000)} minutes`);
  setTimeout(() => {
    fn();
    setInterval(fn, 24 * 60 * 60 * 1000); // every 24h after first run
  }, msUntil);
}

// ── Entry point ───────────────────────────────────────────────────────────────
async function main() {
  log(`Twitter Trends Video (topics: ${TOPICS.join(', ')}, dry-run: ${DRY_RUN})`);

  if (!ANTHROPIC_KEY) { log('ERROR: Missing ANTHROPIC_API_KEY'); process.exit(1); }

  const runAll = async () => {
    for (const topic of TOPICS) {
      try {
        const result = await processTopic(topic);
        log(`Done: "${topic}"`, { published: result.published });
      } catch (e) {
        log(`Failed: "${topic}" — ${e.message}`);
      }
    }
  };

  if (DAEMON) {
    await runAll(); // run immediately on start
    scheduleDaily(runAll);
  } else {
    await runAll();
    log('Complete.');
  }
}

main().catch(e => { log(`Fatal: ${e.message}`); process.exit(1); });
