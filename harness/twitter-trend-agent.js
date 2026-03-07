#!/usr/bin/env node
/**
 * twitter-trend-agent.js
 *
 * Full pipeline:
 *  1. Discover trending topics via market-research API (:3106) or Twitter scrape
 *  2. Research the chosen trend — compile top posts, context, stats
 *  3. Write an informative + entertaining script via Claude
 *  4. Take scrolling screenshots of top tweets via Playwright
 *  5. Generate F5-TTS voiceover (NOT ElevenLabs)
 *  6. Render Remotion compositions (YouTube, Shorts, LinkedIn)
 *  7. Send final videos to Telegram
 *
 * Usage:
 *   node harness/twitter-trend-agent.js [--topic "AI Coding"] [--dry-run] [--format youtube|shorts|all]
 *   node harness/twitter-trend-agent.js --list-trends
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Config ────────────────────────────────────────────────────────────────

const ENV_FILE = path.join(__dirname, '../../actp-worker/.env');
const env = loadEnv(ENV_FILE);

const REMOTION_DIR = path.join(__dirname, '../../Remotion');
const OUTPUT_BASE  = '/Volumes/My Passport/GeneratedMedia/trends';
const SCREENSHOTS_DIR = path.join(OUTPUT_BASE, 'screenshots');
const BRIEFS_DIR      = path.join(OUTPUT_BASE, 'briefs');
const VIDEOS_DIR      = path.join(OUTPUT_BASE, 'videos');
const VOICEOVERS_DIR  = path.join(OUTPUT_BASE, 'voiceovers');

const MARKET_RESEARCH_PORT = 3106;
const TWITTER_COMMENTS_PORT = 3007;

// Arg parsing
const args = process.argv.slice(2);
const ARG_TOPIC    = getArg('--topic');
const ARG_FORMAT   = getArg('--format') || 'all';
const DRY_RUN      = args.includes('--dry-run');
const LIST_TRENDS  = args.includes('--list-trends');
const SEND_TELEGRAM = !args.includes('--no-telegram');
const MAX_TWEETS   = parseInt(getArg('--max-tweets') || '6', 10);

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  ensureDirs();

  if (LIST_TRENDS) {
    const trends = await fetchTrends();
    console.log('\nTop trends on X/Twitter right now:');
    trends.forEach((t, i) => console.log(`  ${i+1}. ${t.name} (${t.volume || 'N/A'} tweets)`));
    return;
  }

  console.log('\n=== Twitter Trend Video Pipeline ===\n');

  // Step 1: Pick trend
  const topic = await pickTopic();
  console.log(`[1/7] Topic: "${topic}"\n`);

  // Step 2: Research — top posts + context
  console.log('[2/7] Researching top posts...');
  const research = await researchTopic(topic);
  console.log(`      Found ${research.posts.length} top posts\n`);

  // Step 3: Write script with Claude
  console.log('[3/7] Writing script...');
  const scriptData = await writeScript(topic, research);
  console.log('      Script ready\n');

  if (DRY_RUN) {
    console.log('--- DRY RUN: Script ---');
    console.log(scriptData.script);
    console.log('\n--- Insights ---');
    scriptData.insights.forEach(i => console.log('  •', i));
    console.log('\n[dry-run] Stopping here. Remove --dry-run to continue.\n');
    return;
  }

  // Step 4: Screenshots
  console.log('[4/7] Taking tweet screenshots...');
  const tweetData = await captureTweetScreenshots(research.posts.slice(0, MAX_TWEETS), topic);
  console.log(`      Captured ${tweetData.length} screenshots\n`);

  // Step 5: Voiceover
  console.log('[5/7] Generating voiceover...');
  const voicePath = await generateVoiceover(scriptData.script, topic);
  console.log(`      Saved: ${voicePath}\n`);

  // Step 6: Build brief + render
  console.log('[6/7] Rendering video(s)...');
  const brief = buildBrief(topic, scriptData, tweetData, voicePath);
  saveBrief(brief, topic);

  const renderedPaths = await renderVideos(brief, topic);
  console.log(`      Rendered: ${renderedPaths.join(', ')}\n`);

  // Step 7: Send to Telegram
  if (SEND_TELEGRAM) {
    console.log('[7/7] Sending to Telegram...');
    for (const videoPath of renderedPaths) {
      await sendToTelegram(videoPath, topic, brief);
    }
    console.log('      Sent!\n');
  } else {
    console.log('[7/7] Skipped Telegram (--no-telegram)\n');
  }

  console.log('=== Done ===');
  console.log('Videos:', renderedPaths.join('\n        '));
}

// ─── Step 1: Trend Discovery ────────────────────────────────────────────────

async function pickTopic() {
  if (ARG_TOPIC) return ARG_TOPIC;
  const trends = await fetchTrends();
  if (!trends.length) {
    console.warn('      No trends found, using default topic');
    return "AI and Automation — What's Hot This Week";
  }
  return trends[0].name;
}

async function fetchTrends() {
  try {
    const res = await apiCall(`http://localhost:${MARKET_RESEARCH_PORT}/api/research/trends`, {
      method: 'POST',
      body: JSON.stringify({ platform: 'twitter', limit: 10 }),
    });
    if (res.trends && res.trends.length) return res.trends;
  } catch (e) { /* fall through */ }

  try {
    const res = await apiCall(`http://localhost:${TWITTER_COMMENTS_PORT}/api/trending`, { method: 'GET' });
    if (res.trends) return res.trends;
    if (Array.isArray(res)) return res;
  } catch (e) { /* fall through */ }

  return [];
}

// ─── Step 2: Research ───────────────────────────────────────────────────────

async function researchTopic(topic) {
  let posts = [];

  try {
    const res = await apiCall(`http://localhost:${TWITTER_COMMENTS_PORT}/api/search`, {
      method: 'POST',
      body: JSON.stringify({ query: topic, limit: 20, sort: 'top' }),
    });
    posts = res.posts || res.results || [];
  } catch (e) { /* fall through */ }

  if (!posts.length) {
    try {
      const res = await apiCall(`http://localhost:${MARKET_RESEARCH_PORT}/api/research`, {
        method: 'POST',
        body: JSON.stringify({ query: topic, platform: 'twitter', limit: 20 }),
      });
      posts = res.results || res.posts || [];
    } catch (e) { /* fall through */ }
  }

  return { topic, posts };
}

// ─── Step 3: Script via Claude ──────────────────────────────────────────────

async function writeScript(topic, research) {
  const postsContext = research.posts.slice(0, 10).map((p, i) =>
    `Post ${i+1}: @${p.author || p.handle || 'unknown'} — "${p.text || p.content || ''}" (${p.likes || '?'} likes)`
  ).join('\n');

  const prompt = `You are writing an informative yet entertaining narrated script for a YouTube video about a trending Twitter/X topic.

Topic: "${topic}"

Top posts from the community:
${postsContext || '(No posts available — use your knowledge of this topic)'}

Write a script that:
1. Opens with a hook that grabs attention in the first 5 seconds
2. Explains WHAT is happening and WHY it matters (factual, not hype)
3. Highlights the most interesting community reactions and insights
4. Gives 3-5 concrete takeaways the viewer can act on
5. Closes with a CTA to follow for more AI/tech trends
6. Total length: 90-120 seconds when read aloud (~200-250 words)
7. Tone: smart, direct, slightly punchy — like a well-read tech friend, NOT a news anchor

Respond with valid JSON only:
{
  "hook": "One punchy opening sentence (under 15 words)",
  "summary": "2-3 sentence context paragraph",
  "script": "Full narrated script as one block of text",
  "insights": ["Takeaway 1", "Takeaway 2", "Takeaway 3", "Takeaway 4"],
  "hashtags": ["AI", "Tech", "Twitter"],
  "cta": "Follow @isaiahdupree for daily AI + tech trends"
}`;

  const response = await callClaude(prompt);
  try {
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.warn('      Script parse failed, using fallback structure');
    return {
      hook: `Here's what's happening with ${topic}`,
      summary: `${topic} is trending right now on X. Here's what the community is saying and why it matters.`,
      script: response,
      insights: [
        `${topic} is generating serious discussion`,
        'The community is divided on the implications',
        'Early adopters are already putting this to work',
      ],
      hashtags: ['AI', 'Tech', 'Trending'],
      cta: 'Follow @isaiahdupree for daily AI + tech trends',
    };
  }
}

async function callClaude(prompt) {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const body = JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data).content?.[0]?.text || ''); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─── Step 4: Tweet Screenshots ──────────────────────────────────────────────

async function captureTweetScreenshots(posts, topic) {
  const safeSlug = topic.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 40);
  const screenshotSubdir = path.join(SCREENSHOTS_DIR, safeSlug);
  fs.mkdirSync(screenshotSubdir, { recursive: true });

  const playwrightScript = path.join(__dirname, 'twitter-screenshot-runner.js');
  if (fs.existsSync(playwrightScript) && posts.length) {
    try {
      const out = execSync(
        `/bin/zsh -l -c "node '${playwrightScript}' --posts '${JSON.stringify(posts).replace(/'/g, "\\'")}' --outdir '${screenshotSubdir}'"`,
        { timeout: 120000 }
      ).toString().trim();
      const lastLine = out.split('\n').pop();
      return JSON.parse(lastLine);
    } catch (e) {
      console.warn('      Playwright runner failed, using post metadata only');
    }
  }

  // Fallback: metadata only
  return posts.map(post => ({
    screenshotPath: '',
    author: post.author || post.name || 'X User',
    handle: post.handle || post.username || 'unknown',
    text: post.text || post.content || '',
    likes: formatCount(post.likes || post.like_count || 0),
    retweets: formatCount(post.retweets || post.retweet_count || 0),
    replies: formatCount(post.replies || post.reply_count || 0),
    views: post.views ? formatCount(post.views) : undefined,
  }));
}

// ─── Step 5: Voiceover via F5-TTS ───────────────────────────────────────────

async function generateVoiceover(script, topic) {
  const modalUrl = env.MODAL_VOICE_CLONE_URL;
  if (!modalUrl) throw new Error('MODAL_VOICE_CLONE_URL not set in .env');

  const refAudioPath = path.join(REMOTION_DIR, 'public/assets/voices/isaiah.wav');
  if (!fs.existsSync(refAudioPath)) {
    throw new Error(`Reference audio not found at ${refAudioPath}`);
  }

  const refAudioB64 = fs.readFileSync(refAudioPath).toString('base64');
  const safeSlug = topic.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 40);
  const outPath = path.join(VOICEOVERS_DIR, `${safeSlug}-${Date.now()}.wav`);

  const body = JSON.stringify({
    text: script,
    reference_audio_base64: refAudioB64,
    ref_text: '',
    speaker_name: 'isaiah',
    speed: 1.0,
  });

  const audioB64 = await new Promise((resolve, reject) => {
    const urlObj = new URL(modalUrl);
    const reqFn = urlObj.protocol === 'https:' ? https.request : http.request;
    const req = reqFn({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data).audio || ''); }
        catch (e) { reject(new Error('Bad voiceover response: ' + data.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });

  fs.writeFileSync(outPath, Buffer.from(audioB64, 'base64'));
  return outPath;
}

// ─── Step 6: Build brief + render ──────────────────────────────────────────

function buildBrief(topic, scriptData, tweetData, voicePath) {
  return {
    topic,
    hook: scriptData.hook || topic,
    summary: scriptData.summary || '',
    script: scriptData.script || '',
    insights: scriptData.insights || [],
    tweets: tweetData,
    voiceover_path: voicePath,
    hashtags: scriptData.hashtags || ['AI', 'Tech'],
    cta: scriptData.cta || 'Follow @isaiahdupree for daily AI + tech trends',
  };
}

function saveBrief(brief, topic) {
  const safeSlug = topic.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 40);
  const briefPath = path.join(BRIEFS_DIR, `${safeSlug}-${Date.now()}.json`);
  fs.writeFileSync(briefPath, JSON.stringify(brief, null, 2));
  console.log(`      Brief saved: ${briefPath}`);
  return briefPath;
}

async function renderVideos(brief, topic) {
  const safeSlug = topic.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 40);
  const timestamp = Date.now();

  const formats = ARG_FORMAT === 'all'
    ? ['TrendVideo-YouTube', 'TrendVideo-Shorts', 'TrendVideo-LinkedIn']
    : [`TrendVideo-${ARG_FORMAT.charAt(0).toUpperCase() + ARG_FORMAT.slice(1)}`];

  const rendered = [];
  for (const compositionId of formats) {
    const suffix = compositionId.split('-').pop().toLowerCase();
    const outPath = path.join(VIDEOS_DIR, `${safeSlug}-${suffix}-${timestamp}.mp4`);
    console.log(`      Rendering ${compositionId}...`);

    try {
      const propsJson = JSON.stringify({ brief }).replace(/'/g, "'\\''");
      execSync(
        `/bin/zsh -l -c "cd '${REMOTION_DIR}' && npx remotion render ${compositionId} '${outPath}' --concurrency=4 --props='${propsJson}' 2>&1 | tail -3"`,
        { timeout: 600000, stdio: 'pipe' }
      );
      rendered.push(outPath);
      console.log(`      ✓ ${path.basename(outPath)}`);
    } catch (e) {
      console.error(`      ✗ ${compositionId} failed: ${e.message?.slice(0, 200)}`);
    }
  }
  return rendered;
}

// ─── Step 7: Send to Telegram ──────────────────────────────────────────────

async function sendToTelegram(videoPath, topic, brief) {
  const token  = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) { console.warn('      Telegram credentials missing, skipping'); return; }

  const caption = `Trending: ${topic}\n\n${brief.insights.slice(0, 2).map((ins, n) => `${n+1}. ${ins}`).join('\n')}\n\n${brief.cta}`;
  try {
    execSync(
      `curl -s -X POST "https://api.telegram.org/bot${token}/sendVideo" ` +
      `-F "chat_id=${chatId}" -F "video=@${videoPath}" ` +
      `-F "caption=${caption.replace(/"/g, '\\"')}"`,
      { timeout: 120000 }
    );
  } catch (e) {
    console.error('      Telegram send failed:', e.message?.slice(0, 100));
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function ensureDirs() {
  [OUTPUT_BASE, SCREENSHOTS_DIR, BRIEFS_DIR, VIDEOS_DIR, VOICEOVERS_DIR].forEach(d =>
    fs.mkdirSync(d, { recursive: true })
  );
}

function loadEnv(envPath) {
  const result = {};
  if (!fs.existsSync(envPath)) return result;
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) result[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
  return result;
}

function getArg(flag) {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
}

function formatCount(n) {
  const num = typeof n === 'string' ? parseFloat(n.replace(/[^0-9.]/g, '')) : n;
  if (isNaN(num)) return String(n);
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return String(Math.round(num));
}

function apiCall(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const mod = urlObj.protocol === 'https:' ? https : http;
    const body = options.body;
    const req = mod.request({
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
      },
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve({ raw: data }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
    if (body) req.write(body);
    req.end();
  });
}

main().catch(e => {
  console.error('Pipeline failed:', e.message);
  process.exit(1);
});
