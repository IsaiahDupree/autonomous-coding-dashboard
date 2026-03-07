#!/usr/bin/env node
/**
 * safari-worker-adapter.js — Typed command executor for Safari services
 *
 * Translates typed command payloads into Safari service API calls.
 * Called by local-agent-daemon.js when command_type starts with 'safari_'.
 *
 * Supported command_types:
 *   safari_collect_profile   — POST to appropriate Safari service /api/collect
 *   safari_send_dm           — POST to DM service (requires_human_approval checked)
 *   safari_open_tab          — safari-tab-coordinator claim
 *   safari_check_auth        — /health endpoint check across all services
 *   safari_screenshot        — Playwright screenshot of tab
 *   safari_search_extract    — Send search query, return results
 *   safari_refresh_session   — Trigger re-auth flow
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Service port map ─────────────────────────────────────────────────────────
const SERVICES = {
  instagram_dm:       { port: 3100, name: 'Instagram DM' },
  twitter_dm:         { port: 3003, name: 'Twitter DM' },
  tiktok_dm:          { port: 3102, name: 'TikTok DM' },
  linkedin_dm:        { port: 3105, name: 'LinkedIn DM' },
  threads:            { port: 3004, name: 'Threads' },
  instagram_comments: { port: 3005, name: 'Instagram Comments' },
  tiktok_comments:    { port: 3006, name: 'TikTok Comments' },
  twitter_comments:   { port: 3007, name: 'Twitter Comments' },
  market_research:    { port: 3106, name: 'Market Research' },
};

const PLATFORM_TO_SERVICE = {
  instagram: 'instagram_comments',
  twitter: 'twitter_comments',
  tiktok: 'tiktok_comments',
  threads: 'threads',
  linkedin: 'linkedin_dm',
};

const DM_SERVICES = {
  instagram: { port: 3100, sendPath: '/api/messages/send-to' },
  twitter:   { port: 3003, sendPath: '/api/twitter/messages/send-to' },
  tiktok:    { port: 3102, sendPath: '/api/tiktok/messages/send-to' },
  linkedin:  { port: 3105, sendPath: '/api/linkedin/messages/send',
               headers: { 'Authorization': 'Bearer test-token-12345' } },
};

// Commands that require human approval
const APPROVAL_REQUIRED = new Set(['safari_send_dm']);

// ── HTTP helpers ─────────────────────────────────────────────────────────────
async function localPost(url, body, extraHeaders = {}, timeoutMs = 60_000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...extraHeaders },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(t);
    let data;
    try { data = await res.json(); } catch { data = { raw: await res.text() }; }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    clearTimeout(t);
    return { ok: false, status: 0, error: err.message };
  }
}

async function localGet(url, timeoutMs = 5_000) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    let data;
    try { data = await res.json(); } catch { data = { raw: await res.text() }; }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, error: err.message };
  }
}

// ── Obsidian write-back for research results ──────────────────────────────────
function writeObsidianResearch(title, summary) {
  try {
    const vaultPath = `${process.env.HOME}/.memory/vault/PROJECT-MEMORY/observability-log.md`;
    const entry = `\n## ${new Date().toISOString().slice(0, 10)} — ${title}\n\n${summary}\n`;
    fs.appendFileSync(vaultPath, entry);
  } catch { /* non-fatal */ }
}

// ── Command handlers ─────────────────────────────────────────────────────────

async function safari_collect_profile(inputs, onProgress) {
  const { platform = 'instagram', username, url: profileUrl } = inputs;
  await onProgress(10, `Collecting ${platform} profile: ${username || profileUrl}`);

  const svcKey = PLATFORM_TO_SERVICE[platform] || platform;
  const svc = SERVICES[svcKey];
  if (!svc) return { ok: false, error: `Unknown platform: ${platform}` };

  await onProgress(30, `Calling ${svc.name} service`);

  const endpoint = `http://localhost:${svc.port}/api/${platform}/profile`;
  const result = await localPost(endpoint, { username, url: profileUrl });

  await onProgress(90, `Profile data received`);

  if (result.ok && result.data) {
    // Write to Obsidian if it looks like research
    if (result.data.bio || result.data.follower_count) {
      writeObsidianResearch(
        `Profile collected: @${username || profileUrl} (${platform})`,
        `Followers: ${result.data.follower_count || 'N/A'} | Bio: ${(result.data.bio || '').slice(0, 200)}`
      );
    }
    result.data.artifact_type = 'structured_data';
  }

  await onProgress(100, 'Done');
  return result;
}

async function safari_send_dm(inputs, onProgress) {
  const { platform = 'instagram', username, text, message, bypass_approval = false } = inputs;
  const msg = text || message;
  if (!bypass_approval) {
    return {
      ok: false,
      error: 'safari_send_dm requires human approval. Set bypass_approval:true after manual review.',
    };
  }

  await onProgress(20, `Sending DM to ${username} on ${platform}`);

  const svc = DM_SERVICES[platform];
  if (!svc) return { ok: false, error: `Unknown DM platform: ${platform}` };

  const body = platform === 'linkedin'
    ? { profileUrl: username, message: msg }
    : { username, text: msg };

  await onProgress(50, `Calling ${platform} DM service`);
  const result = await localPost(
    `http://localhost:${svc.port}${svc.sendPath}`,
    body,
    svc.headers || {}
  );

  await onProgress(100, result.ok ? 'DM sent' : 'DM failed');
  return result;
}

async function safari_open_tab(inputs, onProgress) {
  const { agentId, windowIndex, tabIndex, platform } = inputs;
  await onProgress(30, `Claiming Safari tab for ${platform || agentId}`);

  const result = await localPost('http://localhost:3105/api/tabs/claim', {
    agentId: agentId || `safari-worker-${Date.now()}`,
    windowIndex: windowIndex ?? 0,
    tabIndex: tabIndex ?? 0,
    platform,
  });

  await onProgress(100, result.ok ? 'Tab claimed' : 'Tab claim failed');
  return result;
}

async function safari_check_auth(inputs, onProgress) {
  await onProgress(10, 'Checking all Safari service health endpoints');

  const checks = await Promise.all(
    Object.entries(SERVICES).map(async ([key, svc]) => {
      const result = await localGet(`http://localhost:${svc.port}/health`);
      return { service: key, name: svc.name, port: svc.port, up: result.ok, status: result.status };
    })
  );

  await onProgress(90, 'Health checks complete');

  const up = checks.filter(c => c.up).length;
  const down = checks.filter(c => !c.up).length;

  const summary = { services_up: up, services_down: down, checks, artifact_type: 'structured_data' };
  await onProgress(100, `${up}/${checks.length} services up`);

  return { ok: up > 0, data: summary };
}

async function safari_screenshot(inputs, onProgress) {
  const { platform = 'instagram', url: targetUrl } = inputs;
  await onProgress(20, `Requesting screenshot for ${platform}`);

  // Use playwright if available
  try {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    if (targetUrl) await page.goto(targetUrl, { timeout: 15_000 });

    await onProgress(60, 'Taking screenshot');
    const screenshotPath = path.join(__dirname, 'logs', `screenshot-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    await browser.close();

    await onProgress(100, 'Screenshot saved');
    return { ok: true, data: { path: screenshotPath, artifact_type: 'screenshot' } };
  } catch (err) {
    await onProgress(100, `Screenshot failed: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

async function safari_search_extract(inputs, onProgress) {
  const { platform = 'instagram', query, keyword, niche, maxResults = 10 } = inputs;
  const searchQuery = query || keyword;
  await onProgress(20, `Searching ${platform} for: ${searchQuery}`);

  const routes = {
    instagram: { port: 3005, path: '/api/instagram/search/hashtag' },
    twitter:   { port: 3007, path: '/api/twitter/search' },
    tiktok:    { port: 3006, path: '/api/tiktok/search/keyword' },
    threads:   { port: 3004, path: '/api/threads/search' },
  };

  const route = routes[platform];
  if (!route) return { ok: false, error: `No search route for platform: ${platform}` };

  await onProgress(40, `Calling ${platform} search API`);
  const result = await localPost(
    `http://localhost:${route.port}${route.path}`,
    { keyword: searchQuery, niche, maxResults, maxPosts: maxResults }
  );

  await onProgress(100, result.ok ? `Got ${Array.isArray(result.data?.results) ? result.data.results.length : '?'} results` : 'Search failed');

  if (result.ok && result.data) {
    result.data.artifact_type = 'structured_data';
    // Write research insight to Obsidian
    writeObsidianResearch(
      `Search extracted: ${platform} — "${searchQuery}"`,
      `Found ${Array.isArray(result.data.results) ? result.data.results.length : '?'} results for query "${searchQuery}" on ${platform}`
    );
  }

  return result;
}

async function safari_refresh_session(inputs, onProgress) {
  const { platform = 'instagram' } = inputs;
  await onProgress(30, `Refreshing ${platform} session`);

  const svc = SERVICES[PLATFORM_TO_SERVICE[platform]];
  if (!svc) return { ok: false, error: `Unknown platform: ${platform}` };

  // Call re-auth or navigate endpoint
  const result = await localPost(`http://localhost:${svc.port}/api/${platform}/navigate`, {
    url: `https://www.${platform}.com`,
  });

  await onProgress(100, result.ok ? 'Session refreshed' : 'Refresh failed');
  return result;
}

// ── Main executor (called by local-agent-daemon) ─────────────────────────────
const HANDLERS = {
  safari_collect_profile: safari_collect_profile,
  safari_send_dm: safari_send_dm,
  safari_open_tab: safari_open_tab,
  safari_check_auth: safari_check_auth,
  safari_screenshot: safari_screenshot,
  safari_search_extract: safari_search_extract,
  safari_refresh_session: safari_refresh_session,
};

export async function execute(commandType, inputs = {}, onProgress = async () => {}) {
  const handler = HANDLERS[commandType];
  if (!handler) {
    return { ok: false, error: `Unknown safari command: ${commandType}` };
  }
  try {
    return await handler(inputs, onProgress);
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export { SERVICES, HANDLERS };
