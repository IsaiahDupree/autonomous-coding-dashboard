/**
 * youtube-publisher.js
 *
 * Handles the full post-render pipeline:
 *  1. Upload video to Supabase Storage (sora-videos bucket)
 *  2. Upload to Blotato media endpoint
 *  3. Publish to YouTube via Blotato (account ID from env: YOUTUBE_ACCOUNT_ID)
 *  4. Store all metadata in `trend_video_posts` Supabase table
 *
 * Also exports `refreshEngagement()` to poll YouTube Data API v3 for updated metrics.
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Env ────────────────────────────────────────────────────────────────────

const ENV_FILE = path.join(__dirname, '../../actp-worker/.env');
const env = loadEnv(ENV_FILE);

const SUPABASE_URL         = env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const BLOTATO_API_KEY      = env.BLOTATO_API_KEY;
const BLOTATO_BASE         = 'https://backend.blotato.com/v2';
const YOUTUBE_ACCOUNT_ID   = env.YOUTUBE_ACCOUNT_ID || '228';
const YOUTUBE_API_KEY      = env.YOUTUBE_API_KEY;
const YOUTUBE_REFRESH_TOKEN = env.YOUTUBE_REFRESH_TOKEN;
const YOUTUBE_CLIENT_ID    = env.YOUTUBE_CLIENT_ID;
const YOUTUBE_CLIENT_SECRET = env.YOUTUBE_CLIENT_SECRET;

// ─── Main export ────────────────────────────────────────────────────────────

/**
 * Publish a rendered trend video to YouTube and persist all metadata.
 *
 * @param {object} opts
 * @param {string} opts.localPath  - absolute path to the rendered MP4
 * @param {import('./twitter-trend-agent.js').TrendBrief} opts.brief
 * @param {string} opts.format     - 'youtube' | 'shorts' | 'linkedin'
 * @param {string} opts.compositionId - e.g. 'TrendVideo-YouTube'
 * @returns {Promise<{postId: string, youtubeUrl: string, dbId: string}>}
 */
export async function publishToYouTube({ localPath, brief, format, compositionId }) {
  if (!fs.existsSync(localPath)) throw new Error(`Video not found: ${localPath}`);
  if (!BLOTATO_API_KEY) throw new Error('BLOTATO_API_KEY not set in .env');
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) throw new Error('SUPABASE env vars not set');

  // 1. Generate YouTube-optimised title + description
  const meta = generateYouTubeMeta(brief, format);

  // 2. Upload to Supabase Storage → get public URL
  console.log('  [pub] Uploading to Supabase Storage...');
  const { storagePath, storageUrl } = await uploadToSupabaseStorage(localPath, format);

  // 3. Persist initial record (status=uploading)
  const dbId = await insertPost({
    topic: brief.topic,
    format,
    compositionId,
    title: meta.title,
    description: meta.description,
    hashtags: brief.hashtags || [],
    tags: meta.tags,
    briefJson: brief,
    script: brief.script,
    hook: brief.hook,
    insights: brief.insights,
    localVideoPath: localPath,
    storagePath,
    storageUrl,
    platformStatus: 'uploading',
  });

  try {
    // 4. Upload to Blotato media endpoint
    console.log('  [pub] Registering with Blotato...');
    const blotatoMediaUrl = await uploadToBlotato(storageUrl);

    // 5. Publish to YouTube via Blotato
    console.log(`  [pub] Publishing to YouTube (account ${YOUTUBE_ACCOUNT_ID})...`);
    const postResult = await publishViaBlotato({
      mediaUrl: blotatoMediaUrl,
      title: meta.title,
      description: meta.description,
      format,
    });

    const blotatoPostId = postResult.postSubmissionId || postResult.id || '';
    const youtubeVideoId = postResult.videoId || postResult.youtube_video_id || '';
    const youtubeUrl = youtubeVideoId
      ? `https://www.youtube.com/watch?v=${youtubeVideoId}`
      : `https://www.youtube.com/channel/${env.YOUTUBE_CHANNEL_ID || ''}`;

    // 6. Update DB record with publish info
    await updatePost(dbId, {
      blotatoMediaUrl,
      blotatoPostId,
      youtubeVideoId,
      youtubeUrl,
      platformStatus: 'published',
      publishedAt: new Date().toISOString(),
    });

    console.log(`  [pub] Published! ${youtubeUrl}`);
    return { postId: blotatoPostId, youtubeUrl, dbId };

  } catch (err) {
    await updatePost(dbId, {
      platformStatus: 'failed',
      errorMessage: err.message,
    });
    throw err;
  }
}

/**
 * Refresh engagement metrics for all published videos.
 * Polls YouTube Data API v3 for views/likes/comments/watch time.
 * Updates `trend_video_posts` table.
 *
 * @returns {Promise<{updated: number, errors: number}>}
 */
export async function refreshEngagement() {
  const rows = await supabaseFetch(
    `${SUPABASE_URL}/rest/v1/trend_video_posts?platform_status=eq.published&youtube_video_id=not.is.null&select=id,youtube_video_id,topic,format,script,hook,insights`,
    { method: 'GET' }
  );

  let updated = 0;
  let errors  = 0;

  for (const row of rows) {
    try {
      const metrics = await fetchYouTubeMetrics(row.youtube_video_id);
      const engagementRate = metrics.views > 0
        ? ((metrics.likes + metrics.comments) / metrics.views) * 100
        : 0;

      await updatePost(row.id, {
        views: metrics.views,
        likes: metrics.likes,
        comments: metrics.comments,
        watchTimeSeconds: metrics.watch_time_seconds,
        avgViewDurationPct: metrics.avg_view_duration_pct,
        ctr: metrics.ctr,
        impressions: metrics.impressions,
        engagementRate,
        engagementLastChecked: new Date().toISOString(),
        improvementNotes: metrics.views > 100
          ? await generateImprovementNotes(row, metrics)
          : null,
      });

      updated++;
    } catch (e) {
      console.warn(`  [engage] Failed for ${row.youtube_video_id}: ${e.message}`);
      errors++;
    }
  }

  return { updated, errors };
}

/**
 * Get all posts with engagement data for analysis.
 */
export async function getEngagementReport() {
  return supabaseFetch(
    `${SUPABASE_URL}/rest/v1/trend_video_posts?platform_status=eq.published&order=created_at.desc&select=*`,
    { method: 'GET' }
  );
}

// ─── Internal: Supabase Storage upload ──────────────────────────────────────

async function uploadToSupabaseStorage(localPath, format) {
  const filename = path.basename(localPath);
  const storagePath = `trend-videos/${format}/${filename}`;
  const fileBuffer = fs.readFileSync(localPath);

  await supabaseFetch(
    `${SUPABASE_URL}/storage/v1/object/sora-videos/${storagePath}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'video/mp4', 'x-upsert': 'true' },
      bodyBuffer: fileBuffer,
    }
  );

  const storageUrl = `${SUPABASE_URL}/storage/v1/object/public/sora-videos/${storagePath}`;
  return { storagePath, storageUrl };
}

// ─── Internal: Blotato ───────────────────────────────────────────────────────

async function uploadToBlotato(publicUrl) {
  const res = await blotatoFetch('/media', {
    method: 'POST',
    body: JSON.stringify({ url: publicUrl }),
  });
  if (!res.url) throw new Error('Blotato media upload returned no URL: ' + JSON.stringify(res));
  return res.url;
}

async function publishViaBlotato({ mediaUrl, title, description, format }) {
  // YouTube Shorts need to be <= 60s and can use the regular YouTube target
  // Blotato differentiates Shorts via title prefix "#Shorts" — we handle this in meta generation
  const body = {
    accountId: String(YOUTUBE_ACCOUNT_ID),
    post: {
      platform: 'youtube',
      text: description,
      mediaUrls: [mediaUrl],
      target: {
        targetType: 'youtube',
        title,
        privacyStatus: 'public',
        shouldNotifySubscribers: true,
        isMadeForKids: false,
        containsSyntheticMedia: true,
      },
    },
  };

  const res = await blotatoFetch('/posts', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return res;
}

// ─── Internal: YouTube Data API v3 ──────────────────────────────────────────

async function getYouTubeAccessToken() {
  if (!YOUTUBE_REFRESH_TOKEN || !YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET) {
    return null;
  }

  const body = new URLSearchParams({
    client_id: YOUTUBE_CLIENT_ID,
    client_secret: YOUTUBE_CLIENT_SECRET,
    refresh_token: YOUTUBE_REFRESH_TOKEN,
    grant_type: 'refresh_token',
  }).toString();

  const data = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });

  return data.access_token || null;
}

async function fetchYouTubeMetrics(videoId) {
  const accessToken = await getYouTubeAccessToken();
  const apiKey = YOUTUBE_API_KEY;
  if (!accessToken && !apiKey) {
    return { views: 0, likes: 0, comments: 0, watch_time_seconds: 0, avg_view_duration_pct: 0, ctr: 0, impressions: 0 };
  }

  // Basic stats (public API or OAuth)
  const statsUrl = accessToken
    ? `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}`
    : `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${apiKey}`;

  const statsData = await httpsGet(statsUrl, accessToken ? { Authorization: `Bearer ${accessToken}` } : {});
  const stats = statsData.items?.[0]?.statistics || {};

  const views    = parseInt(stats.viewCount || '0', 10);
  const likes    = parseInt(stats.likeCount || '0', 10);
  const comments = parseInt(stats.commentCount || '0', 10);

  // Analytics (requires OAuth + YouTube Analytics API)
  let watchTimeSeconds = 0;
  let avgViewDurationPct = 0;
  let ctr = 0;
  let impressions = 0;

  if (accessToken) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 90 * 864e5).toISOString().split('T')[0];
      const analyticsUrl = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${startDate}&endDate=${today}&metrics=estimatedMinutesWatched,averageViewPercentage,impressions,impressionClickThroughRate&filters=video==${videoId}&dimensions=video`;

      const analyticsData = await httpsGet(analyticsUrl, { Authorization: `Bearer ${accessToken}` });
      const row = analyticsData.rows?.[0];
      if (row) {
        const [minutesWatched, avgViewPct, imp, ctrVal] = row;
        watchTimeSeconds = Math.round((minutesWatched || 0) * 60);
        avgViewDurationPct = avgViewPct || 0;
        impressions = imp || 0;
        ctr = ctrVal || 0;
      }
    } catch (e) {
      // Analytics API may not be enabled — non-fatal
    }
  }

  return { views, likes, comments, watch_time_seconds: watchTimeSeconds, avg_view_duration_pct: avgViewDurationPct, ctr, impressions };
}

// ─── Internal: AI improvement notes ────────────────────────────────────────

async function generateImprovementNotes(row, metrics) {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const engRate = ((metrics.likes + metrics.comments) / Math.max(metrics.views, 1) * 100).toFixed(2);
  const prompt = `You are analyzing YouTube performance data to suggest improvements for future videos.

Video: "${row.topic}"
Format: ${row.format}
Script hook: "${row.hook || ''}"

Metrics:
- Views: ${metrics.views}
- Likes: ${metrics.likes}
- Comments: ${metrics.comments}
- Engagement rate: ${engRate}%
- Avg view duration: ${metrics.avg_view_duration_pct?.toFixed(1)}%
- CTR: ${metrics.ctr?.toFixed(2)}%

Script excerpt (first 300 chars): "${(row.script || '').slice(0, 300)}"
Insights shown: ${JSON.stringify(row.insights || []).slice(0, 200)}

Write 2-3 specific, actionable improvement notes for the NEXT video on a similar topic.
Focus on: hook strength, content depth, call-to-action, pacing.
Be direct. One sentence per note. No fluff.`;

  const body = JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [{ role: 'user', content: prompt }],
  });

  const data = await new Promise((resolve, reject) => {
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
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });

  return data.content?.[0]?.text?.trim() || null;
}

// ─── Internal: meta generation ──────────────────────────────────────────────

function generateYouTubeMeta(brief, format) {
  const isShorts = format === 'shorts';
  const shortsPrefix = isShorts ? '#Shorts ' : '';

  // Title: punchy, SEO-friendly, under 100 chars
  const title = `${shortsPrefix}${brief.topic} — What X Is Actually Saying`.slice(0, 100);

  // Description: structured for YouTube SEO
  const hashtagLine = (brief.hashtags || ['AI', 'Tech'])
    .map(h => `#${h.replace(/^#/, '')}`).join(' ');

  const insightLines = (brief.insights || [])
    .slice(0, 4)
    .map((ins, i) => `${i + 1}. ${ins}`)
    .join('\n');

  const description = [
    brief.hook || brief.topic,
    '',
    '📌 Key Takeaways:',
    insightLines,
    '',
    '🔥 Trending on X/Twitter — researched and scripted by AI, reviewed and published by @isaiahdupree',
    '',
    '─────────────────────────',
    '▶ Subscribe for daily AI + tech trend breakdowns',
    '📲 Follow on X: @isaiahdupree',
    '─────────────────────────',
    '',
    hashtagLine,
  ].join('\n');

  // Tags for YouTube (separate from hashtags in description)
  const tags = [
    ...(brief.hashtags || []),
    'twitter trends', 'x trending', 'ai news', 'tech news',
    brief.topic.split(' ').slice(0, 3).join(' '),
  ].map(t => t.replace(/^#/, '')).slice(0, 15);

  return { title, description, tags };
}

// ─── Internal: Supabase DB ──────────────────────────────────────────────────

async function insertPost(data) {
  const body = JSON.stringify({
    topic: data.topic,
    format: data.format,
    composition_id: data.compositionId,
    title: data.title,
    description: data.description,
    hashtags: data.hashtags,
    tags: data.tags,
    brief_json: data.briefJson,
    script: data.script,
    hook: data.hook,
    insights: data.insights,
    local_video_path: data.localVideoPath,
    storage_path: data.storagePath,
    storage_url: data.storageUrl,
    platform_status: data.platformStatus,
  });

  const res = await supabaseFetch(`${SUPABASE_URL}/rest/v1/trend_video_posts`, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body,
  });

  return Array.isArray(res) ? res[0]?.id : res?.id;
}

async function updatePost(id, data) {
  const update = {};
  if (data.blotatoMediaUrl   !== undefined) update.blotato_media_url   = data.blotatoMediaUrl;
  if (data.blotatoPostId     !== undefined) update.blotato_post_id     = data.blotatoPostId;
  if (data.youtubeVideoId    !== undefined) update.youtube_video_id    = data.youtubeVideoId;
  if (data.youtubeUrl        !== undefined) update.youtube_url         = data.youtubeUrl;
  if (data.platformStatus    !== undefined) update.platform_status     = data.platformStatus;
  if (data.publishedAt       !== undefined) update.published_at        = data.publishedAt;
  if (data.errorMessage      !== undefined) update.error_message       = data.errorMessage;
  if (data.views             !== undefined) update.views               = data.views;
  if (data.likes             !== undefined) update.likes               = data.likes;
  if (data.comments          !== undefined) update.comments            = data.comments;
  if (data.watchTimeSeconds  !== undefined) update.watch_time_seconds  = data.watchTimeSeconds;
  if (data.avgViewDurationPct !== undefined) update.avg_view_duration_pct = data.avgViewDurationPct;
  if (data.ctr               !== undefined) update.ctr                 = data.ctr;
  if (data.impressions       !== undefined) update.impressions         = data.impressions;
  if (data.engagementRate    !== undefined) update.engagement_rate     = data.engagementRate;
  if (data.engagementLastChecked !== undefined) update.engagement_last_checked = data.engagementLastChecked;
  if (data.improvementNotes  !== undefined) update.improvement_notes   = data.improvementNotes;
  if (data.dropOffScene      !== undefined) update.drop_off_scene      = data.dropOffScene;

  await supabaseFetch(`${SUPABASE_URL}/rest/v1/trend_video_posts?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify(update),
  });
}

// ─── HTTP helpers ────────────────────────────────────────────────────────────

function supabaseFetch(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const body = opts.bodyBuffer || (opts.body ? Buffer.from(opts.body) : null);
    const headers = {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': opts.headers?.['Content-Type'] || 'application/json',
      ...(opts.headers || {}),
    };
    if (body) headers['Content-Length'] = body.length;

    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: opts.method || 'GET',
      headers,
    }, (res) => {
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        try { resolve(JSON.parse(raw)); }
        catch (e) { resolve({ raw }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function blotatoFetch(path, opts = {}) {
  return new Promise((resolve, reject) => {
    const body = opts.body ? Buffer.from(opts.body) : null;
    const req = https.request({
      hostname: 'backend.blotato.com',
      path: `/v2${path}`,
      method: opts.method || 'GET',
      headers: {
        'blotato-api-key': BLOTATO_API_KEY,
        'Content-Type': 'application/json',
        ...(body ? { 'Content-Length': body.length } : {}),
      },
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch (e) { resolve({ raw: d }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = https.request({ hostname: urlObj.hostname, path: urlObj.pathname + urlObj.search, method: 'GET', headers }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.end();
  });
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
