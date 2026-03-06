#!/usr/bin/env node
/**
 * Safari Tab Coordinator
 * ======================
 * Enforces: 1 Safari window, 1 tab per platform.
 *
 * What it does:
 *   1. Scans all open Safari windows/tabs for platform URLs
 *   2. Opens any missing platform tabs in the target window
 *   3. Registers each platform's tab with its local service via POST /api/tabs/claim
 *   4. Prints a status table showing which tab each service owns
 *
 * Usage:
 *   node harness/safari-tab-coordinator.js             # claim existing tabs
 *   node harness/safari-tab-coordinator.js --open      # open missing tabs, then claim
 *   node harness/safari-tab-coordinator.js --status    # show tab assignments only
 *   node harness/safari-tab-coordinator.js --reset     # clear all claims, re-claim
 *
 * Platform tab layout (window 1):
 *   Tab 1: Instagram DM  — instagram.com/direct/inbox/
 *   Tab 2: Twitter DM    — x.com/messages
 *   Tab 3: TikTok DM     — tiktok.com/messages
 *   Tab 4: LinkedIn DM   — linkedin.com/messaging/
 *   Tab 5: Threads       — threads.net
 */

import { execSync, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Platform definitions ─────────────────────────────────────────────────────
const PLATFORMS = [
  {
    id: 'ig',
    name: 'Instagram DM',
    urlPattern: 'instagram.com',
    preferredUrl: 'instagram.com/direct/inbox',
    openUrl: 'https://www.instagram.com/direct/inbox/',
    servicePort: 3100,
    claimPath: '/api/tabs/claim',
    ensurePath: '/api/session/ensure',
  },
  {
    id: 'tw',
    name: 'Twitter DM',
    urlPattern: 'x.com',
    preferredUrl: 'x.com/messages',
    openUrl: 'https://x.com/messages',
    servicePort: 3003,
    claimPath: '/api/tabs/claim',
    ensurePath: '/api/session/ensure',
  },
  {
    id: 'tt',
    name: 'TikTok DM',
    urlPattern: 'tiktok.com',
    preferredUrl: 'tiktok.com/messages',
    openUrl: 'https://www.tiktok.com/messages',
    servicePort: 3102,
    claimPath: '/api/tabs/claim',
    ensurePath: '/api/session/ensure',
  },
  {
    id: 'li',
    name: 'LinkedIn DM',
    urlPattern: 'linkedin.com',
    preferredUrl: 'linkedin.com/messaging',
    openUrl: 'https://www.linkedin.com/messaging/',
    servicePort: 3105,
    claimPath: '/api/tabs/claim',
    ensurePath: '/api/session/ensure',
    authToken: process.env.LINKEDIN_AUTH_TOKEN || 'test-token-12345',
  },
  {
    id: 'th',
    name: 'Threads',
    urlPattern: 'threads',          // matches both threads.net and threads.com
    preferredUrl: 'threads.com',
    openUrl: 'https://www.threads.com/',
    servicePort: 3004,
    claimPath: '/api/tabs/claim',
    ensurePath: '/api/session/ensure',
  },
];

const COORDINATOR_AGENT_ID = 'safari-tab-coordinator';
const STATE_FILE = path.join(__dirname, 'safari-tab-layout.json');
const LOG_FILE   = path.join(__dirname, 'logs', 'safari-tab-coordinator.log');

const args = process.argv.slice(2);
const MODE_OPEN   = args.includes('--open');
const MODE_STATUS = args.includes('--status');
const MODE_RESET  = args.includes('--reset');

// ── Logging ───────────────────────────────────────────────────────────────────
function log(msg) {
  const line = `${new Date().toISOString()} [tab-coord] ${msg}`;
  console.log(line);
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch { /* non-fatal */ }
}

// ── AppleScript helpers ───────────────────────────────────────────────────────
function runAppleScript(script) {
  try {
    return execSync(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`, {
      timeout: 15000,
      encoding: 'utf-8',
    }).trim();
  } catch (e) {
    return null;
  }
}

async function getSafariTabs() {
  const script = `
tell application "Safari"
  set output to ""
  set wCount to count of windows
  repeat with w from 1 to wCount
    try
      set tCount to count of tabs of window w
      repeat with t from 1 to tCount
        try
          set tabURL to URL of tab t of window w
          if tabURL is missing value then set tabURL to ""
          set output to output & w & "," & t & "," & tabURL & "
"
        end try
      end repeat
    end try
  end repeat
  return output
end tell`;
  const result = runAppleScript(script);
  if (!result) return [];
  return result.trim().split('\n').filter(Boolean).map(line => {
    const parts = line.split(',');
    const w = parseInt(parts[0], 10);
    const t = parseInt(parts[1], 10);
    const url = parts.slice(2).join(',');
    return { windowIndex: w, tabIndex: t, url };
  });
}

function openTabInSafari(url, windowIndex) {
  // Open a new tab in the target window with the given URL
  const script = `
tell application "Safari"
  activate
  tell window ${windowIndex}
    set newTab to make new tab with properties {URL:"${url}"}
    set current tab to newTab
  end tell
  set idx to (count of tabs of window ${windowIndex})
  return idx
end tell`;
  const result = runAppleScript(script);
  return result ? parseInt(result, 10) : null;
}

function openNewWindow(url) {
  const script = `
tell application "Safari"
  activate
  make new window with properties {URL:"${url}"}
  return 1
end tell`;
  const result = runAppleScript(script);
  return result ? 1 : null;
}

function activateTab(windowIndex, tabIndex) {
  runAppleScript(`
tell application "Safari"
  set current tab of window ${windowIndex} to tab ${tabIndex} of window ${windowIndex}
  set index of window ${windowIndex} to 1
end tell`);
}

// ── Service helpers ───────────────────────────────────────────────────────────
async function serviceHealth(port) {
  try {
    const res = await fetch(`http://localhost:${port}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch { return false; }
}

function authHeaders(platform) {
  const h = { 'Content-Type': 'application/json' };
  if (platform.authToken) h['Authorization'] = `Bearer ${platform.authToken}`;
  return h;
}

async function claimTab(platform, windowIndex, tabIndex) {
  try {
    const res = await fetch(`http://localhost:${platform.servicePort}${platform.claimPath}`, {
      method: 'POST',
      headers: authHeaders(platform),
      body: JSON.stringify({ agentId: COORDINATOR_AGENT_ID, windowIndex, tabIndex }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function ensureSession(platform) {
  try {
    const res = await fetch(`http://localhost:${platform.servicePort}${platform.ensurePath}`, {
      method: 'POST',
      headers: authHeaders(platform),
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function clearClaim(platform) {
  try {
    const res = await fetch(`http://localhost:${platform.servicePort}/api/session/clear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch { return false; }
}

// ── Find best tab for a platform ──────────────────────────────────────────────
function findAllTabs(tabs, platform) {
  const matches = tabs.filter(t => t.url.includes(platform.urlPattern));
  // Sort: preferred URL first
  return matches.sort((a, b) => {
    const aPreferred = a.url.includes(platform.preferredUrl) ? 0 : 1;
    const bPreferred = b.url.includes(platform.preferredUrl) ? 0 : 1;
    return aPreferred - bPreferred;
  });
}

function findBestTab(tabs, platform) {
  const all = findAllTabs(tabs, platform);
  return all[0] || null;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  log('Safari Tab Coordinator starting...');

  // 1. Scan current Safari tabs
  log('Scanning Safari windows...');
  const tabs = await getSafariTabs();
  log(`Found ${tabs.length} total tabs across ${[...new Set(tabs.map(t => t.windowIndex))].length} windows`);

  if (tabs.length === 0) {
    log('ERROR: Safari is not running or has no windows. Open Safari first.');
    process.exit(1);
  }

  // Print current layout
  console.log('\nCurrent Safari tabs:');
  tabs.forEach(t => console.log(`  w${t.windowIndex}t${t.tabIndex}: ${t.url}`));
  console.log('');

  if (MODE_STATUS) {
    // Just show what tab each service is currently tracking
    console.log('Service session status:');
    for (const p of PLATFORMS) {
      const up = await serviceHealth(p.servicePort);
      if (!up) { console.log(`  ${p.name} (:${p.servicePort}): DOWN`); continue; }
      try {
        const res = await fetch(`http://localhost:${p.servicePort}/api/session/status`, { signal: AbortSignal.timeout(3000) });
        const data = await res.json().catch(() => ({}));
        const tracked = data.windowIndex ? `w${data.windowIndex}t${data.tabIndex} — ${data.url || '?'}` : 'NOT CLAIMED';
        console.log(`  ${p.name} (:${p.servicePort}): ${tracked}`);
      } catch {
        console.log(`  ${p.name} (:${p.servicePort}): status unavailable`);
      }
    }
    return;
  }

  // 2. Clear existing claims if --reset
  if (MODE_RESET) {
    log('Clearing existing tab claims...');
    for (const p of PLATFORMS) {
      const up = await serviceHealth(p.servicePort);
      if (up) await clearClaim(p);
    }
  }

  // 3. Find or open each platform's tab
  const layout = {}; // platform.id → { windowIndex, tabIndex, url, found }

  for (const p of PLATFORMS) {
    const best = findBestTab(tabs, p);
    if (best) {
      log(`  ${p.name}: found at w${best.windowIndex}t${best.tabIndex} — ${best.url}`);
      layout[p.id] = { ...best, found: true };
    } else {
      log(`  ${p.name}: no tab found`);
      layout[p.id] = { found: false };

      if (MODE_OPEN) {
        // Open in window 1 (the "platform window")
        log(`  Opening ${p.name} in Safari window 1...`);
        const windowCount = Math.max(...tabs.map(t => t.windowIndex));
        // Try window 1 first, or create a new window
        let newTabIndex;
        if (windowCount >= 1) {
          newTabIndex = openTabInSafari(p.openUrl, 1);
        } else {
          openNewWindow(p.openUrl);
          newTabIndex = 1;
        }
        if (newTabIndex) {
          log(`  Opened ${p.name} at w1t${newTabIndex}`);
          layout[p.id] = { windowIndex: 1, tabIndex: newTabIndex, url: p.openUrl, found: true, opened: true };
          // Re-scan tabs after opening
          await new Promise(r => setTimeout(r, 1500));
        }
      }
    }
  }

  // 4. Register each platform's tab with its service
  console.log('\nRegistering tab claims with services:');
  const results = [];

  for (const p of PLATFORMS) {
    const entry = layout[p.id];
    const up = await serviceHealth(p.servicePort);
    const row = { platform: p.name, port: p.servicePort, up, tab: null, claimed: false, error: null };

    if (!up) {
      row.error = 'service DOWN';
      results.push(row);
      continue;
    }

    if (!entry?.found) {
      row.error = `no ${p.urlPattern} tab open in Safari`;
      results.push(row);
      continue;
    }

    // Try all candidate tabs for this platform (first match may be claimed by another service)
    const candidates = findAllTabs(tabs, p);
    let claimed = false;
    for (const candidate of candidates) {
      row.tab = `w${candidate.windowIndex}t${candidate.tabIndex}`;
      const claimResult = await claimTab(p, candidate.windowIndex, candidate.tabIndex);
      if (claimResult.ok) {
        row.claimed = true;
        claimed = true;
        log(`  Claimed ${p.name} → w${candidate.windowIndex}t${candidate.tabIndex}`);
        break;
      }
      const errMsg = claimResult.data?.error || claimResult.error || '';
      if (errMsg.includes('already claimed')) {
        log(`  w${candidate.windowIndex}t${candidate.tabIndex} taken — trying next tab for ${p.name}`);
        continue;
      }
      // Non-conflict error: try auto-discover
      break;
    }

    if (!claimed) {
      // Fallback: session/ensure (auto-discover any unclaimed tab)
      log(`  All candidates taken for ${p.name}, trying auto-discover...`);
      const ensureResult = await ensureSession(p);
      if (ensureResult.ok && ensureResult.data?.ok !== false) {
        row.claimed = true;
        if (ensureResult.data?.windowIndex) {
          row.tab = `w${ensureResult.data.windowIndex}t${ensureResult.data.tabIndex}`;
        }
        log(`  Auto-discovered ${p.name} → ${row.tab}`);
      } else {
        row.error = ensureResult.data?.error || ensureResult.error || 'all tabs claimed by other services';
      }
    }

    results.push(row);
    await new Promise(r => setTimeout(r, 300));
  }

  // 5. Print final status table
  console.log('\n┌────────────────────┬───────┬───────┬──────────┬──────────────────────────────┐');
  console.log('│ Platform           │ Port  │ Up    │ Tab      │ Status                       │');
  console.log('├────────────────────┬───────┬───────┬──────────┼──────────────────────────────┤');
  for (const r of results) {
    const upStr  = r.up      ? 'YES  ' : 'NO   ';
    const tabStr = r.tab     ? r.tab.padEnd(8) : '—       ';
    const status = r.claimed ? 'CLAIMED' : (r.error || 'failed');
    console.log(`│ ${r.platform.padEnd(18)} │ ${String(r.port).padEnd(5)} │ ${upStr} │ ${tabStr} │ ${status.padEnd(28)} │`);
  }
  console.log('└────────────────────┴───────┴───────┴──────────┴──────────────────────────────┘');

  // 6. Save layout to state file
  const savedLayout = {
    coordinatedAt: new Date().toISOString(),
    platforms: results.map(r => ({ ...r })),
    tabMap: layout,
  };
  fs.writeFileSync(STATE_FILE, JSON.stringify(savedLayout, null, 2));
  log(`Layout saved to ${STATE_FILE}`);

  // Activation hint
  const unclaimed = results.filter(r => !r.claimed);
  if (unclaimed.length > 0) {
    console.log('\nUnclaimed platforms:', unclaimed.map(r => r.platform).join(', '));
    if (!MODE_OPEN) {
      console.log('Run with --open to automatically open missing tabs in Safari.');
    } else {
      console.log('Open those platforms in Safari manually, then re-run this script.');
    }
  } else {
    console.log('\nAll platforms claimed. Each service now has its own dedicated Safari tab.');
  }
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
