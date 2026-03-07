#!/usr/bin/env node

/**
 * youtube-content-pipeline.js
 * ============================
 * Core pipeline: download → transcribe → AI analyse → generate → publish → cleanup.
 *
 * No RapidAPI. No third-party transcript service.
 * Uses yt-dlp + ffmpeg + OpenAI Whisper + Claude vision.
 *
 * Flow per video:
 *   1. yt-dlp  → download video to /Volumes/My Passport/yt-downloads/{videoId}/
 *   2. ffmpeg  → extract audio.m4a from video
 *   3. Whisper → transcribe audio to full text
 *   4. ffmpeg  → extract 8 keyframes as JPEGs
 *   5. Claude vision → analyse frames (slides, diagrams, on-screen text)
 *   6. Claude Sonnet (Call 1) → structured extract: insights/lessons/takeaways/resources/skill/voice
 *   7. Claude Sonnet (Call 2) → full content package: blog/newsletter/community/tweets/LinkedIn
 *   8. Claude Haiku  (Call 3) → attachments: summary sheet/lesson plan/resource guide
 *   9. DALL-E 3     → feature image → Supabase Storage
 *  10. Medium REST  → publish blog post
 *  11. Blotato API  → publish to Twitter, LinkedIn, Instagram, TikTok
 *  12. Supabase     → upsert yt_content_packages, mark queue done
 *  13. Telegram     → notification with links
 *  14. Cleanup      → delete /Volumes/My Passport/yt-downloads/{videoId}/
 *
 * Usage:
 *   node harness/youtube-content-pipeline.js --video-id P17i2ElVVEI
 *   node harness/youtube-content-pipeline.js --video-id P17i2ElVVEI --dry-run
 *   node harness/youtube-content-pipeline.js --video-id P17i2ElVVEI --skip-publish
 */

import fs from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';

import {
  buildExtractPrompt,
  buildFrameAnalysisPrompt,
  buildContentPackagePrompt,
  buildAttachmentsPrompt,
  buildImagePrompt,
} from './youtube-content-prompts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

const OPENAI_API_KEY  = process.env.OPENAI_API_KEY   || '';
const ANTHROPIC_KEY   = process.env.ANTHROPIC_API_KEY || '';
const SUPABASE_URL    = process.env.SUPABASE_URL     || 'https://ivhfuhxorppptyuofbgq.supabase.co';
const SUPABASE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const TELEGRAM_TOKEN  = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT   = process.env.TELEGRAM_CHAT_ID   || '';
const BLOTATO_KEY     = process.env.BLOTATO_API_KEY    || '';
const MEDIUM_BASE     = `http://localhost:${process.env.MEDIUM_PORT || '3108'}`;
const PASSPORT_DIR    = '/Volumes/My Passport/yt-downloads';
const DRY_RUN         = process.argv.includes('--dry-run');
const SKIP_PUBLISH    = process.argv.includes('--skip-publish') || DRY_RUN;

// Blotato account IDs for social posting
const BLOTATO_ACCOUNTS = {
  twitter:   process.env.BLOTATO_TWITTER_ID   || '571',
  linkedin:  process.env.BLOTATO_LINKEDIN_ID  || '835',  // set actual LI account ID
  instagram: process.env.BLOTATO_INSTAGRAM_ID || '807',
  tiktok:    process.env.BLOTATO_TIKTOK_ID    || '710',
};

// ── Logging ───────────────────────────────────────────────────────────────────
let _currentVideoId = '';
function log(msg) { console.log(`[pipeline:${_currentVideoId}] ${msg}`); }

// ── Shell exec helper ─────────────────────────────────────────────────────────
function run(cmd, opts = {}) {
  const result = execSync(cmd, { stdio: opts.silent ? 'pipe' : 'inherit', ...opts });
  return result ? result.toString().trim() : '';
}

// ── Supabase helper ───────────────────────────────────────────────────────────
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
    signal: AbortSignal.timeout(30000),
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
  } catch { /* non-fatal */ }
}

// ── Step 1+2: Download video + extract audio ──────────────────────────────────
async function downloadAndExtract(videoId, videoUrl) {
  const videoDir = path.join(PASSPORT_DIR, videoId);
  fs.mkdirSync(videoDir, { recursive: true });

  const videoFile  = path.join(videoDir, 'video.mp4');
  const audioFile  = path.join(videoDir, 'audio.m4a');
  const framesDir  = path.join(videoDir, 'frames');
  fs.mkdirSync(framesDir, { recursive: true });

  // Download best video (max 1080p to save space)
  if (!fs.existsSync(videoFile)) {
    log('Downloading video with yt-dlp...');
    // Use Chrome cookies for auth; prefer legacy combined mp4 formats to avoid YouTube SABR 403s
    const useCookies = fs.existsSync(`${process.env.HOME}/Library/Application Support/Google/Chrome/Default/Cookies`);
    const dlCmd = [
      '/opt/homebrew/bin/yt-dlp',
      useCookies ? '--cookies-from-browser chrome' : '',
      '--no-playlist',
      '--retries 5',
      '--fragment-retries 5',
      // Format priority: legacy 720p combined → legacy 360p combined → any mp4 → best available
      '-f "22/18/bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=720]+bestaudio/best"',
      '--merge-output-format mp4',
      `-o "${videoFile}"`,
      `"${videoUrl}"`,
    ].filter(Boolean).join(' ');
    run(dlCmd);
    log(`Download complete: ${(fs.statSync(videoFile).size / 1024 / 1024).toFixed(1)}MB`);
  } else {
    log('Using cached video file');
  }

  // Extract audio
  if (!fs.existsSync(audioFile)) {
    log('Extracting audio...');
    run(`/opt/homebrew/bin/ffmpeg -i "${videoFile}" -vn -acodec copy "${audioFile}" -y -loglevel error`);
  }

  return { videoDir, videoFile, audioFile, framesDir };
}

// ── Step 3: Whisper transcription ─────────────────────────────────────────────
async function transcribeAudio(audioFile) {
  if (!OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY for Whisper');
  log('Transcribing with OpenAI Whisper...');

  const audioStat = fs.statSync(audioFile);
  const audioSizeMB = audioStat.size / 1024 / 1024;

  // Whisper has 25MB limit. If larger, compress first.
  let transcribeFile = audioFile;
  if (audioSizeMB > 24) {
    log(`Audio is ${audioSizeMB.toFixed(1)}MB — compressing for Whisper...`);
    const compressedFile = audioFile.replace('.m4a', '-compressed.mp3');
    run(`/opt/homebrew/bin/ffmpeg -i "${audioFile}" -ar 16000 -ac 1 -b:a 64k "${compressedFile}" -y -loglevel error`);
    transcribeFile = compressedFile;
  }

  const audioBuffer = fs.readFileSync(transcribeFile);
  const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
  const formData = new FormData();
  formData.append('file', blob, path.basename(transcribeFile));
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'verbose_json');
  formData.append('language', 'en');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
    body: formData,
    signal: AbortSignal.timeout(300000), // 5 min for long videos
  });
  if (!res.ok) throw new Error(`Whisper: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const text = data.text || (data.segments || []).map(s => s.text).join(' ');
  log(`Transcript: ${text.length} chars, ~${Math.round(text.split(' ').length)} words`);
  return text;
}

// ── Step 4: Extract keyframes ──────────────────────────────────────────────────
async function extractKeyframes(videoFile, framesDir, count = 8) {
  log(`Extracting ${count} keyframes...`);
  // Get video duration first
  const durationStr = run(`/opt/homebrew/bin/ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoFile}"`, { silent: true });
  const duration = parseFloat(durationStr) || 60;

  const frames = [];
  for (let i = 0; i < count; i++) {
    const t = Math.round((duration / (count + 1)) * (i + 1));
    const frameFile = path.join(framesDir, `frame_${String(i).padStart(2, '0')}.jpg`);
    if (!fs.existsSync(frameFile)) {
      run(`/opt/homebrew/bin/ffmpeg -ss ${t} -i "${videoFile}" -vframes 1 -q:v 3 -vf "scale=1280:-1" "${frameFile}" -y -loglevel error`);
    }
    if (fs.existsSync(frameFile)) frames.push(frameFile);
  }
  log(`Extracted ${frames.length} frames`);
  return frames;
}

// ── Step 5: Claude vision frame analysis ─────────────────────────────────────
async function analyseFrames(framePaths) {
  if (!framePaths.length) return null;
  log(`Analysing ${framePaths.length} frames with Claude vision...`);

  const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });
  const imageContent = framePaths.slice(0, 6).map(fp => ({
    type: 'image',
    source: {
      type: 'base64',
      media_type: 'image/jpeg',
      data: fs.readFileSync(fp).toString('base64'),
    },
  }));

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',  // Haiku for vision — cheaper
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: [
        ...imageContent,
        { type: 'text', text: buildFrameAnalysisPrompt(framePaths.length) },
      ],
    }],
  });
  const analysis = response.content[0].text;
  log(`Frame analysis: ${analysis.length} chars`);
  return analysis;
}

// ── Attachment parser (delimiter-based, JSON-free) ────────────────────────────
function parseAttachments(text) {
  const extract = (startTag, endTag) => {
    const s = text.indexOf(startTag);
    const e = text.indexOf(endTag);
    if (s === -1 || e === -1) return null;
    return text.slice(s + startTag.length, e).trim();
  };
  return {
    attachment_summary:   extract('===SUMMARY_START===', '===SUMMARY_END==='),
    attachment_lessons:   extract('===LESSONS_START===', '===LESSONS_END==='),
    attachment_resources: extract('===RESOURCES_START===', '===RESOURCES_END==='),
  };
}

// ── Claude text calls ─────────────────────────────────────────────────────────
function parseClaudeJson(text, label) {
  // Strip all markdown fences
  const stripped = text.replace(/```(?:json)?/g, '').trim();

  // Try direct parse first
  const m = stripped.match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`No JSON in Claude response (${label}): ${text.slice(0, 200)}`);
  try { return JSON.parse(m[0]); } catch { /* fall through to repair */ }

  // Repair: extract each field individually using regex
  // This handles cases where HTML/text values contain unescaped double quotes
  const result = {};
  const fieldRe = /"(\w+)"\s*:\s*"([\s\S]*?)(?<!\\)"(?=\s*[,}])/g;
  let match;
  while ((match = fieldRe.exec(m[0])) !== null) {
    result[match[1]] = match[2].replace(/\\n/g, '\n').replace(/\\"/g, '"');
  }
  // Also pick up array/object fields
  const arrRe = /"(\w+)"\s*:\s*(\[[\s\S]*?\]|\{[\s\S]*?\})(?=\s*[,}])/g;
  while ((match = arrRe.exec(m[0])) !== null) {
    try { result[match[1]] = JSON.parse(match[2]); } catch { /* skip */ }
  }
  if (Object.keys(result).length > 0) return result;
  throw new Error(`Invalid JSON from ${label} — could not repair`);
}

async function claudeCall(model, prompt, maxTokens = 4096) {
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });
  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });
  return response.content[0].text;
}

// ── DALL-E feature image ───────────────────────────────────────────────────────
async function generateImage(prompt) {
  if (!OPENAI_API_KEY) return null;
  try {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ model: 'dall-e-3', prompt, n: 1, size: '1024x1024', quality: 'standard', style: 'vivid' }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) { log(`DALL-E failed: ${res.status}`); return null; }
    return (await res.json()).data?.[0]?.url || null;
  } catch (e) { log(`DALL-E error: ${e.message}`); return null; }
}

// ── Upload image to Supabase Storage ──────────────────────────────────────────
async function uploadImageToStorage(imageUrl, videoId) {
  if (!imageUrl) return null;
  try {
    const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(60000) });
    if (!imgRes.ok) return null;
    const imgBuf = Buffer.from(await imgRes.arrayBuffer());
    const fileName = `yt-content/${videoId}.png`;
    const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/yt-content/${videoId}.png`, {
      method: 'POST',
      headers: {
        'Content-Type': 'image/png',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
      body: imgBuf,
      signal: AbortSignal.timeout(60000),
    });
    if (!uploadRes.ok) {
      log(`Storage upload: ${uploadRes.status} — using direct DALL-E URL`);
      return imageUrl; // fall back to direct URL (expires in 1h, good enough to publish)
    }
    return `${SUPABASE_URL}/storage/v1/object/public/yt-content/${videoId}.png`;
  } catch (e) { log(`Image upload error: ${e.message}`); return imageUrl; }
}

// ── Publish to Medium ─────────────────────────────────────────────────────────
async function publishToMedium({ title, subtitle, html, tags, imageUrl }) {
  const bodyHtml = imageUrl ? `<figure><img src="${imageUrl}" alt="${title}"/></figure>\n${html}` : html;
  const res = await fetch(`${MEDIUM_BASE}/api/medium/posts/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, subtitle, body: bodyHtml, tags: tags?.slice(0, 5) || [], publishImmediately: true }),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error(`Medium: ${res.status} ${await res.text()}`);
  return res.json();
}

// ── Publish to social via Blotato ─────────────────────────────────────────────
// Schema (verified 2026-03-07):
//   POST /v2/posts { post: { accountId, target: { targetType, ...platformFields }, content: { platform, text, mediaUrls?, title? } } }
//   Response: { postSubmissionId }
async function publishToBlotato({ platform, accountId, text, imageUrl, title }) {
  if (!BLOTATO_KEY) { log(`No BLOTATO_API_KEY — skipping ${platform}`); return null; }
  try {
    // Upload media to Blotato CDN if image URL provided
    let blotatoMediaUrl = null;
    if (imageUrl) {
      const mediaRes = await fetch('https://backend.blotato.com/v2/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'blotato-api-key': BLOTATO_KEY },
        body: JSON.stringify({ url: imageUrl }),
        signal: AbortSignal.timeout(30000),
      });
      if (mediaRes.ok) {
        const mediaData = await mediaRes.json();
        blotatoMediaUrl = mediaData.url; // CDN URL from Blotato
      }
    }

    const content = {
      platform,
      text,
      ...(blotatoMediaUrl ? { mediaUrls: [blotatoMediaUrl] } : {}),
    };
    const target = { targetType: platform };

    if (platform === 'youtube') {
      const videoTitle = title ?? text.slice(0, 100);
      target.title = videoTitle;
      target.privacyStatus = 'public';
      target.shouldNotifySubscribers = true;
      content.title = videoTitle;
    }
    if (platform === 'instagram') {
      target.mediaType = 'reel';
      content.mediaType = 'reel';
    }
    if (platform === 'tiktok') {
      target.privacyLevel = 'PUBLIC_TO_EVERYONE';
      target.disabledComments = false;
      target.isAiGenerated = false;
    }

    const postBody = { post: { accountId: Number(accountId), target, content } };
    const postRes = await fetch('https://backend.blotato.com/v2/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'blotato-api-key': BLOTATO_KEY },
      body: JSON.stringify(postBody),
      signal: AbortSignal.timeout(30000),
    });
    if (!postRes.ok) { log(`Blotato ${platform}: ${postRes.status}`); return null; }
    return await postRes.json();
  } catch (e) { log(`Blotato ${platform} error: ${e.message}`); return null; }
}

// ── Cleanup video files ───────────────────────────────────────────────────────
function cleanupVideoDir(videoDir) {
  try {
    fs.rmSync(videoDir, { recursive: true, force: true });
    log(`Cleaned up: ${videoDir}`);
  } catch (e) { log(`Cleanup warning: ${e.message}`); }
}

// ── Main pipeline ─────────────────────────────────────────────────────────────
export async function runPipeline(video) {
  const { id: videoId, title, channel, url, playlist_id } = video;
  _currentVideoId = videoId;
  log(`Starting: "${title}"`);

  if (!DRY_RUN) {
    await supabase('PATCH', 'yt_content_queue', { status: 'processing' }, `?id=eq.${videoId}`);
  }

  let videoDir = null;
  const publishedPlatforms = [];

  try {
    // ── Steps 1+2: Download + extract ──
    let transcriptText;
    let visualInsights = null;

    // Check for cached transcript
    try {
      const cached = await supabase('GET', 'yt_content_packages', undefined,
        `?video_id=eq.${videoId}&select=transcript_text`
      );
      if (cached?.[0]?.transcript_text) {
        log('Using cached transcript from Supabase');
        transcriptText = cached[0].transcript_text;
      }
    } catch { /* ignore */ }

    if (!transcriptText) {
      const { videoFile, audioFile, framesDir, videoDir: vd } = await downloadAndExtract(videoId, url);
      videoDir = vd;

      // ── Step 3: Whisper ──
      transcriptText = await transcribeAudio(audioFile);

      // ── Step 4+5: Keyframes + vision ──
      try {
        const frames = await extractKeyframes(videoFile, framesDir, 8);
        visualInsights = await analyseFrames(frames);
      } catch (e) {
        log(`Frame analysis failed (non-fatal): ${e.message}`);
      }
    }

    // ── Call 1: Structured extract ──
    log('Claude Call 1: extract insights + structure...');
    const prompt1 = buildExtractPrompt({ title, channel, url, transcriptText, visualInsights });
    const text1 = await claudeCall('claude-sonnet-4-6', prompt1, 4096);
    const extract = parseClaudeJson(text1, 'extract');
    log(`Extracted: ${extract.resources?.length || 0} resources, ${extract.suggested_tags?.length || 0} tags`);

    // Save extract immediately (crash-resilient)
    if (!DRY_RUN) {
      await supabase('POST', 'yt_content_packages', {
        video_id: videoId, playlist_id, title, channel, url,
        transcript_text: transcriptText,
        insights: extract.insights,
        learning_lessons: extract.learning_lessons,
        key_takeaways: extract.key_takeaways,
        resources: extract.resources,
        claude_skill: extract.claude_skill,
        voice_track: extract.voice_track,
      });
    }

    // ── Call 2: Content package ──
    log('Claude Call 2: content package...');
    const prompt2 = buildContentPackagePrompt({
      title, channel, url,
      insights: extract.insights,
      learning_lessons: extract.learning_lessons,
      key_takeaways: extract.key_takeaways,
      resources: extract.resources,
      topic_summary: extract.topic_summary,
    });
    const text2 = await claudeCall('claude-sonnet-4-6', prompt2, 6000);
    const content = parseClaudeJson(text2, 'content-package');
    log(`Content: blog ${content.medium_post_html?.length || 0}c, newsletter, tweets, LinkedIn`);

    // ── Call 3: Attachments ──
    log('Claude Call 3: attachments...');
    let attachments = {};
    try {
      const prompt3 = buildAttachmentsPrompt({
        title, channel, url,
        insights: extract.insights,
        learning_lessons: extract.learning_lessons,
        key_takeaways: extract.key_takeaways,
        resources: extract.resources,
        topic_summary: extract.topic_summary,
      });
      const text3 = await claudeCall('claude-haiku-4-5-20251001', prompt3, 3000);
      attachments = parseAttachments(text3);
      log('Attachments generated');
    } catch (e) { log(`Attachments failed (non-fatal): ${e.message}`); }

    // ── Feature image ──
    log('Generating feature image...');
    let imageUrl = null;
    if (!DRY_RUN) {
      const dalleUrl = await generateImage(buildImagePrompt(extract.key_takeaways, title));
      if (dalleUrl) imageUrl = await uploadImageToStorage(dalleUrl, videoId);
    }
    log(`Image: ${imageUrl ? 'ready' : 'skipped'}`);

    // ── Publish: Medium ──
    let mediumPostUrl = null;
    let mediumPostId  = null;
    if (!SKIP_PUBLISH) {
      log('Publishing to Medium...');
      try {
        const medResult = await publishToMedium({
          title:    content.medium_title || title,
          subtitle: content.medium_subtitle,
          html:     content.medium_post_html,
          tags:     extract.suggested_tags,
          imageUrl,
        });
        mediumPostUrl = medResult.url || medResult.postUrl || medResult.data?.url;
        mediumPostId  = medResult.id  || medResult.postId  || medResult.data?.id;
        publishedPlatforms.push(`Medium: ${mediumPostUrl}`);
        log(`Medium: ${mediumPostUrl}`);
      } catch (e) { log(`Medium failed (non-fatal): ${e.message}`); }
    }

    // Substitute Medium URL into social content
    if (mediumPostUrl) {
      content.newsletter_text = (content.newsletter_text || '').replace('[MEDIUM_URL]', mediumPostUrl);
      content.tweet_thread    = (content.tweet_thread    || '').replace('[MEDIUM_URL]', mediumPostUrl);
    }

    // ── Publish: Social via Blotato ──
    if (!SKIP_PUBLISH && BLOTATO_KEY) {
      // Twitter: first tweet of thread
      const firstTweet = (content.tweet_thread || '').split('\n').find(l => /^1\//.test(l.trim()))?.replace(/^1\/\s*/, '').trim();
      if (firstTweet) {
        log('Publishing to Twitter...');
        const twRes = await publishToBlotato({ platform: 'twitter', accountId: BLOTATO_ACCOUNTS.twitter, text: firstTweet, imageUrl });
        if (twRes) publishedPlatforms.push('Twitter');
      }

      // LinkedIn post
      if (content.linkedin_post) {
        log('Publishing to LinkedIn...');
        const liRes = await publishToBlotato({ platform: 'linkedin', accountId: BLOTATO_ACCOUNTS.linkedin, text: content.linkedin_post, imageUrl });
        if (liRes) publishedPlatforms.push('LinkedIn');
      }

      // Instagram: community post excerpt (shorter)
      const igText = (content.community_post || '').slice(0, 2000);
      if (igText && imageUrl) {
        log('Publishing to Instagram...');
        const igRes = await publishToBlotato({ platform: 'instagram', accountId: BLOTATO_ACCOUNTS.instagram, text: igText, imageUrl });
        if (igRes) publishedPlatforms.push('Instagram');
      }
    } else if (!SKIP_PUBLISH) {
      log('No BLOTATO_API_KEY — skipping social publishing');
    }

    // ── Upsert complete record to Supabase ──
    const fullRecord = {
      video_id:             videoId,
      playlist_id,
      title,
      channel,
      url,
      transcript_text:      transcriptText,
      insights:             extract.insights,
      learning_lessons:     extract.learning_lessons,
      key_takeaways:        extract.key_takeaways,
      resources:            extract.resources,
      claude_skill:         extract.claude_skill,
      voice_track:          extract.voice_track,
      medium_post_html:     content.medium_post_html,
      newsletter_text:      content.newsletter_text,
      community_post:       content.community_post,
      tweet_thread:         content.tweet_thread,
      pinterest_caption:    content.pinterest_caption,
      linkedin_post:        content.linkedin_post,
      attachment_summary:   attachments.attachment_summary,
      attachment_lessons:   attachments.attachment_lessons,
      attachment_resources: attachments.attachment_resources,
      image_url:            imageUrl,
      medium_post_id:       mediumPostId,
      medium_post_url:      mediumPostUrl,
      published_at:         publishedPlatforms.length ? new Date().toISOString() : null,
    };

    if (!DRY_RUN) {
      await supabase('POST', 'yt_content_packages', fullRecord);
      await supabase('PATCH', 'yt_content_queue',
        { status: 'done', processed_at: new Date().toISOString() },
        `?id=eq.${videoId}`
      );
      log(`Saved to Supabase. Published: ${publishedPlatforms.join(', ') || 'none'}`);
    } else {
      log('[dry-run] Would upsert record and mark done');
      log(`[dry-run] Content preview:\n  blog: ${(content.medium_title || '').slice(0, 80)}\n  takeaways: ${(extract.key_takeaways || '').slice(0, 120)}`);
    }

    // ── Telegram notification ──
    const tweetCount = (content.tweet_thread || '').split('\n').filter(l => /^\d+\//.test(l.trim())).length;
    const firstTakeaway = (extract.key_takeaways || '').split('\n').find(l => l.trim())?.replace(/^[→•\-]+\s*/, '') || '';
    await sendTelegram([
      `New content published from YouTube`,
      ``,
      `Video: ${title}`,
      `Channel: ${channel}`,
      mediumPostUrl ? `Medium: ${mediumPostUrl}` : '',
      ``,
      firstTakeaway ? `Takeaway: ${firstTakeaway}` : '',
      ``,
      `Published to: ${publishedPlatforms.join(', ') || 'Supabase only'}`,
      ``,
      `Content created:`,
      `• Blog post (Medium)`,
      `• Newsletter draft`,
      tweetCount ? `• ${tweetCount} tweets` : '',
      `• LinkedIn post`,
      `• Community post`,
      `• Voice track script`,
      `• 3 downloadable attachments`,
      `• Claude skill exported`,
    ].filter(Boolean).join('\n'));

    // ── Cleanup: delete video from Passport drive ──
    if (videoDir && publishedPlatforms.length > 0 && !DRY_RUN) {
      log('All platforms published successfully — cleaning up Passport drive...');
      cleanupVideoDir(videoDir);
    } else if (videoDir && !DRY_RUN) {
      log('Keeping video files (no platforms published yet). Delete manually when ready.');
    }

    return fullRecord;

  } catch (e) {
    log(`Pipeline error: ${e.message}`);
    if (!DRY_RUN) {
      await supabase('PATCH', 'yt_content_queue',
        { status: 'error', error_msg: e.message },
        `?id=eq.${videoId}`
      ).catch(() => {});
    }
    // Don't delete video on error — keep for retry
    throw e;
  }
}

// ── CLI mode ──────────────────────────────────────────────────────────────────
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const videoIdx = process.argv.indexOf('--video-id');
  if (videoIdx === -1 || !process.argv[videoIdx + 1]) {
    console.error('Usage: node youtube-content-pipeline.js --video-id <id> [--dry-run] [--skip-publish]');
    process.exit(1);
  }
  const videoId = process.argv[videoIdx + 1];
  const getArg  = (name, fb = '') => { const i = process.argv.indexOf(name); return i !== -1 && process.argv[i+1] ? process.argv[i+1] : fb; };

  async function main() {
    let video;
    try {
      const rows = await supabase('GET', 'yt_content_queue', undefined, `?id=eq.${videoId}`);
      video = rows?.[0];
    } catch { /* use CLI args */ }
    if (!video) {
      video = {
        id:          videoId,
        title:       getArg('--title', `Video ${videoId}`),
        channel:     getArg('--channel', 'Unknown Channel'),
        url:         getArg('--url', `https://www.youtube.com/watch?v=${videoId}`),
        playlist_id: getArg('--playlist-id', null),
      };
    }
    await runPipeline(video);
    console.log('\nPipeline complete.');
  }
  main().catch(e => { console.error('Pipeline error:', e.message); process.exit(1); });
}
