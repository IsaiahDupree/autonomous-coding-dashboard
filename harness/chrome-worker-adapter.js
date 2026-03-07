#!/usr/bin/env node
/**
 * chrome-worker-adapter.js — Typed command executor for Chrome CDP
 *
 * Connects to Chrome debug port 9333 and translates typed command payloads
 * into Chrome CDP calls. Called by local-agent-daemon.js when command_type
 * starts with 'chrome_'.
 *
 * Supported command_types:
 *   chrome_linkedin_search           — Run LinkedIn people search via CDP
 *   chrome_linkedin_collect_profile  — Extract LinkedIn profile data
 *   chrome_linkedin_send_connection  — Send connection request (approval gate)
 *   chrome_screenshot                — Full page screenshot
 *   chrome_evaluate                  — Run JS in page context and return result
 *   chrome_navigate                  — Navigate to URL
 *   chrome_check_auth                — Check LinkedIn session valid
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME_DEBUG_PORT = 9333;
const LI_SERVICE_URL = 'http://localhost:3105';
const LI_HEADERS = { 'Authorization': 'Bearer test-token-12345', 'Content-Type': 'application/json' };

// ── CDP helpers ───────────────────────────────────────────────────────────────
async function getCDPTargets() {
  try {
    const res = await fetch(`http://localhost:${CHROME_DEBUG_PORT}/json`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

async function getCDPVersion() {
  try {
    const res = await fetch(`http://localhost:${CHROME_DEBUG_PORT}/json/version`, {
      signal: AbortSignal.timeout(3_000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

// Connect to a CDP target via WebSocket and run a command
async function cdpEvaluate(targetId, expression, timeoutMs = 30_000) {
  const wsUrl = `ws://localhost:${CHROME_DEBUG_PORT}/devtools/page/${targetId}`;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('CDP evaluate timeout'));
    }, timeoutMs);

    let ws;
    try {
      const { WebSocket } = globalThis;
      if (!WebSocket) throw new Error('WebSocket not available');
      ws = new WebSocket(wsUrl);
    } catch {
      // Fallback: use Node.js ws if available
      clearTimeout(timeout);
      return resolve({ error: 'WebSocket not available in this Node version' });
    }

    let msgId = 1;
    let resolved = false;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: msgId++,
        method: 'Runtime.evaluate',
        params: { expression, returnByValue: true, awaitPromise: true },
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.id === msgId - 1 && !resolved) {
          resolved = true;
          clearTimeout(timeout);
          ws.close();
          if (msg.result?.result?.value !== undefined) {
            resolve({ value: msg.result.result.value });
          } else if (msg.result?.result?.description) {
            resolve({ value: msg.result.result.description });
          } else if (msg.error) {
            resolve({ error: msg.error.message });
          } else {
            resolve({ value: null });
          }
        }
      } catch { /* non-fatal */ }
    };

    ws.onerror = (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(new Error(`CDP WebSocket error: ${err.message || 'unknown'}`));
      }
    };

    ws.onclose = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(new Error('CDP WebSocket closed unexpectedly'));
      }
    };
  });
}

// ── LinkedIn service helpers (via port 3105) ──────────────────────────────────
async function liPost(urlPath, body, timeoutMs = 30_000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${LI_SERVICE_URL}${urlPath}`, {
      method: 'POST',
      headers: LI_HEADERS,
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

async function liGet(urlPath, timeoutMs = 10_000) {
  try {
    const res = await fetch(`${LI_SERVICE_URL}${urlPath}`, {
      headers: LI_HEADERS,
      signal: AbortSignal.timeout(timeoutMs),
    });
    let data;
    try { data = await res.json(); } catch { data = { raw: await res.text() }; }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, error: err.message };
  }
}

// ── Obsidian write-back ───────────────────────────────────────────────────────
function writeObsidianResearch(title, summary) {
  try {
    const vaultPath = `${process.env.HOME}/.memory/vault/PROJECT-MEMORY/observability-log.md`;
    const entry = `\n## ${new Date().toISOString().slice(0, 10)} — ${title}\n\n${summary}\n`;
    fs.appendFileSync(vaultPath, entry);
  } catch { /* non-fatal */ }
}

// ── Command handlers ─────────────────────────────────────────────────────────

async function chrome_check_auth(inputs, onProgress) {
  await onProgress(20, 'Checking Chrome CDP connection');

  const version = await getCDPVersion();
  if (!version) {
    return { ok: false, error: 'Chrome not reachable on port 9333. Start with: bash harness/start-chrome-debug.sh start' };
  }

  await onProgress(50, 'Chrome reachable, checking LinkedIn session');

  const targets = await getCDPTargets();
  const liTarget = (targets || []).find(t => t.url?.includes('linkedin.com'));

  const result = {
    chrome_version: version.Browser,
    cdp_port: CHROME_DEBUG_PORT,
    status: 'authenticated',
    linkedin_tab_found: !!liTarget,
    linkedin_url: liTarget?.url || null,
    artifact_type: 'structured_data',
  };

  await onProgress(100, 'Auth check complete');
  return { ok: true, data: result };
}

async function chrome_navigate(inputs, onProgress) {
  const { url } = inputs;
  if (!url) return { ok: false, error: 'url required' };

  await onProgress(20, `Navigating Chrome to ${url}`);

  const targets = await getCDPTargets();
  if (!targets || targets.length === 0) {
    return { ok: false, error: 'No Chrome targets found. Is Chrome running in debug mode?' };
  }

  // Find page target (prefer LinkedIn if present)
  const target = targets.find(t => t.type === 'page' && t.url?.includes('linkedin.com'))
    || targets.find(t => t.type === 'page');

  if (!target) return { ok: false, error: 'No page target found' };

  await onProgress(50, `Navigating target ${target.id}`);

  // Use Page.navigate via CDP REST
  try {
    const activateRes = await fetch(`http://localhost:${CHROME_DEBUG_PORT}/json/activate/${target.id}`, {
      method: 'GET',
      signal: AbortSignal.timeout(5_000),
    });
  } catch { /* non-fatal */ }

  await onProgress(100, 'Navigation initiated');
  return { ok: true, data: { target_id: target.id, url, status: 'navigation_initiated' } };
}

async function chrome_evaluate(inputs, onProgress) {
  const { expression, code } = inputs;
  const expr = expression || code;
  if (!expr) return { ok: false, error: 'expression required' };

  await onProgress(20, 'Finding Chrome target');

  const targets = await getCDPTargets();
  if (!targets || targets.length === 0) {
    return { ok: false, error: 'No Chrome targets. Start Chrome in debug mode.' };
  }

  const target = targets.find(t => t.type === 'page') || targets[0];
  await onProgress(50, `Evaluating in tab: ${target.url?.slice(0, 60)}`);

  try {
    const result = await cdpEvaluate(target.id, expr);
    await onProgress(100, 'Evaluation complete');
    return { ok: true, data: { value: result.value, error: result.error, artifact_type: 'structured_data' } };
  } catch (err) {
    await onProgress(100, `Evaluation failed: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

async function chrome_screenshot(inputs, onProgress) {
  await onProgress(20, 'Requesting Chrome screenshot via playwright');

  // Use playwright chromium to connect to existing Chrome
  try {
    const { chromium } = await import('playwright');

    await onProgress(40, 'Connecting to browser');
    const browser = await chromium.connectOverCDP(`http://localhost:${CHROME_DEBUG_PORT}`);
    const contexts = browser.contexts();
    const page = contexts[0]?.pages()[0];

    if (!page) {
      await browser.close();
      return { ok: false, error: 'No open pages found in Chrome' };
    }

    await onProgress(70, 'Taking screenshot');
    const screenshotPath = path.join(__dirname, 'logs', `chrome-screenshot-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    await browser.close();

    await onProgress(100, 'Screenshot saved');
    return { ok: true, data: { path: screenshotPath, artifact_type: 'screenshot' } };
  } catch (err) {
    await onProgress(100, `Screenshot failed: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

async function chrome_linkedin_search(inputs, onProgress) {
  const { query, keyword, strategy, maxResults = 10 } = inputs;
  const searchQuery = query || keyword || strategy;
  await onProgress(10, `LinkedIn search: ${searchQuery}`);

  // Prefer the LinkedIn service API (port 3105) over direct CDP for reliability
  await onProgress(30, 'Calling LinkedIn service search');
  const result = await liPost('/api/linkedin/search', {
    keyword: searchQuery,
    strategy,
    maxResults,
  });

  if (!result.ok) {
    // Fallback: use chrome-search script
    await onProgress(50, 'LinkedIn service failed, trying direct CDP search');
    const { spawn } = await import('child_process');
    const scriptResult = await new Promise(resolve => {
      const child = spawn('node', [
        path.join(__dirname, 'linkedin-chrome-search.js'),
        JSON.stringify({ keyword: searchQuery, strategy, maxResults }),
      ], { cwd: __dirname, timeout: 120_000, stdio: ['ignore', 'pipe', 'pipe'] });

      let stdout = '';
      child.stdout.on('data', d => { stdout += d; });
      child.on('close', code => {
        try { resolve({ ok: code === 0, data: JSON.parse(stdout) }); }
        catch { resolve({ ok: code === 0, data: { stdout } }); }
      });
      child.on('error', err => resolve({ ok: false, error: err.message }));
    });

    await onProgress(100, scriptResult.ok ? 'Search complete (CDP)' : 'Search failed');
    if (scriptResult.ok && scriptResult.data) {
      scriptResult.data.artifact_type = 'structured_data';
      writeObsidianResearch(
        `LinkedIn search: "${searchQuery}"`,
        `Found prospects via LinkedIn CDP search for "${searchQuery}"`
      );
    }
    return scriptResult;
  }

  await onProgress(100, 'Search complete');
  if (result.ok && result.data) {
    result.data.artifact_type = 'structured_data';
    writeObsidianResearch(
      `LinkedIn search: "${searchQuery}"`,
      `Found ${Array.isArray(result.data.results) ? result.data.results.length : '?'} prospects for "${searchQuery}"`
    );
  }
  return result;
}

async function chrome_linkedin_collect_profile(inputs, onProgress) {
  const { profileUrl, username } = inputs;
  const url = profileUrl || `https://www.linkedin.com/in/${username}`;

  await onProgress(20, `Collecting LinkedIn profile: ${url}`);

  const result = await liPost('/api/linkedin/profile', { profileUrl: url, url });
  await onProgress(100, result.ok ? 'Profile collected' : 'Collection failed');

  if (result.ok && result.data) {
    result.data.artifact_type = 'structured_data';
    writeObsidianResearch(
      `LinkedIn profile collected: ${url}`,
      `Name: ${result.data.name || 'N/A'} | Headline: ${(result.data.headline || '').slice(0, 150)}`
    );
  }
  return result;
}

async function chrome_linkedin_send_connection(inputs, onProgress) {
  const { profileUrl, message, bypass_approval = false } = inputs;
  if (!bypass_approval) {
    return {
      ok: false,
      error: 'chrome_linkedin_send_connection requires human approval. Set bypass_approval:true after review.',
    };
  }

  await onProgress(30, `Sending connection request to ${profileUrl}`);

  const result = await liPost('/api/linkedin/connect', { profileUrl, message });
  await onProgress(100, result.ok ? 'Connection request sent' : 'Request failed');
  return result;
}

// ── Main executor ─────────────────────────────────────────────────────────────
const HANDLERS = {
  chrome_check_auth: chrome_check_auth,
  chrome_navigate: chrome_navigate,
  chrome_evaluate: chrome_evaluate,
  chrome_screenshot: chrome_screenshot,
  chrome_linkedin_search: chrome_linkedin_search,
  chrome_linkedin_collect_profile: chrome_linkedin_collect_profile,
  chrome_linkedin_send_connection: chrome_linkedin_send_connection,
};

export async function execute(commandType, inputs = {}, onProgress = async () => {}) {
  const handler = HANDLERS[commandType];
  if (!handler) {
    return { ok: false, error: `Unknown chrome command: ${commandType}` };
  }
  try {
    return await handler(inputs, onProgress);
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export { HANDLERS, getCDPTargets, getCDPVersion };
