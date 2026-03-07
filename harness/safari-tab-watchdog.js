#!/usr/bin/env node

/**
 * Safari Tab Watchdog
 * ===================
 * Runs every 3 minutes. Checks whether each platform has an active Safari tab
 * claim. If any platform's tab is missing (returns "No Safari tab available"),
 * it calls safari-tab-coordinator.js --open to auto-recover the missing tabs.
 *
 * This makes the system self-healing: Safari can restart or tabs can close and
 * the whole automation pipeline recovers automatically without manual intervention.
 *
 * Usage:
 *   node harness/safari-tab-watchdog.js           # run 24/7 (3-min check cycle)
 *   node harness/safari-tab-watchdog.js --once    # single check, then exit
 *   node harness/safari-tab-watchdog.js --test    # report current tab status only
 */

import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_DIR = __dirname;

const ACTP_ENV    = '/Users/isaiahdupree/Documents/Software/actp-worker/.env';
const SAFARI_ENV  = '/Users/isaiahdupree/Documents/Software/Safari Automation/.env';
const HOME_ENV    = `${process.env.HOME}/.env`;
const LOG_FILE    = path.join(HARNESS_DIR, 'logs', 'safari-tab-watchdog.log');
const STATE_FILE  = path.join(HARNESS_DIR, 'safari-tab-watchdog-state.json');

function loadEnvFile(fp) {
  try {
    for (const line of fs.readFileSync(fp, 'utf-8').split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {}
}
loadEnvFile(HOME_ENV);
loadEnvFile(SAFARI_ENV);
loadEnvFile(ACTP_ENV);

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT  = process.env.TELEGRAM_CHAT_ID   || '';

const CHECK_INTERVAL_MS = 3 * 60 * 1000;   // 3 minutes
const RECOVERY_COOLDOWN_MS = 5 * 60 * 1000; // 5 min between recovery attempts

const args = process.argv.slice(2);
const MODE = args.includes('--once') ? 'once' : args.includes('--test') ? 'test' : 'daemon';

// ── Platforms to monitor ─────────────────────────────────────────────────────
const PLATFORMS = [
  { id: 'ig',  name: 'Instagram', port: 3100, urlPattern: 'instagram.com' },
  { id: 'tw',  name: 'Twitter',   port: 3003, urlPattern: 'x.com'         },
  { id: 'tt',  name: 'TikTok',    port: 3102, urlPattern: 'tiktok.com'    },
  { id: 'li',  name: 'LinkedIn',  port: 3105, urlPattern: 'linkedin.com'  },
  { id: 'th',  name: 'Threads',   port: 3004, urlPattern: 'threads'       },
];

// ── Logging ──────────────────────────────────────────────────────────────────
function log(msg) {
  const line = `${new Date().toISOString()} [safari-tab-watchdog] ${msg}`;
  console.log(line);
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch {}
}

// ── State ────────────────────────────────────────────────────────────────────
function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')); } catch {}
  return { checkCount: 0, recoveryCount: 0, lastRecoveryAt: null, platformStatus: {} };
}
function saveState(s) {
  try { fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2)); } catch {}
}

// ── Telegram notification ────────────────────────────────────────────────────
async function tgSend(text) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT) return;
  try {
    await fetch(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT, text, parse_mode: 'HTML' }),
        signal: AbortSignal.timeout(8000) }
    );
  } catch {}
}

// ── Get current tab claims from coordinator's state file ─────────────────────
function getClaimedPlatforms() {
  try {
    const layout = JSON.parse(
      fs.readFileSync(path.join(HARNESS_DIR, 'safari-tab-layout.json'), 'utf-8')
    );
    // layout is { ig: { windowIndex, tabIndex, claimed, url }, ... }
    return layout;
  } catch { return {}; }
}

// ── Check a single platform's service health ─────────────────────────────────
async function checkPlatform(platform) {
  // 1. Check the service is up
  try {
    const res = await fetch(`http://localhost:${platform.port}/health`, {
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) {
      return { ok: false, reason: 'service_error', detail: `HTTP ${res.status}` };
    }
  } catch (e) {
    return { ok: false, reason: 'service_down', detail: e.message };
  }

  // 2. Check if this platform has a live tab claim in the layout state
  const layout = getClaimedPlatforms();
  const claim = layout[platform.id];

  if (!claim || !claim.windowIndex) {
    return { ok: false, reason: 'no_tab', detail: 'No tab claim in safari-tab-layout.json' };
  }

  // 3. Verify the claimed tab is actually open in Safari right now
  // (use osascript — quick check without spawning a full coordinator run)
  try {
    const { windowIndex, tabIndex } = claim;
    const script = `tell application "Safari" to get URL of tab ${tabIndex} of window ${windowIndex}`;
    const url = execSync(`osascript -e '${script}'`, { timeout: 5000, encoding: 'utf-8' }).trim();
    if (!url || !url.includes(platform.urlPattern)) {
      return { ok: false, reason: 'no_tab', detail: `Tab ${windowIndex}:${tabIndex} URL mismatch — got: ${url.slice(0,60)}` };
    }
    return { ok: true };
  } catch {
    // osascript failed — Safari closed or tab gone
    return { ok: false, reason: 'no_tab', detail: 'Safari tab not reachable via AppleScript' };
  }
}

// ── Run safari-tab-coordinator --open to recover missing tabs ─────────────────
function runCoordinator() {
  return new Promise((resolve) => {
    log('Running safari-tab-coordinator --reset --open ...');
    const coord = path.join(HARNESS_DIR, 'safari-tab-coordinator.js');
    const child = spawn(process.execPath, [coord, '--reset', '--open'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 60000,
    });
    let out = '';
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { out += d; });
    const timer = setTimeout(() => { child.kill(); resolve({ ok: false, out: 'timeout' }); }, 60000);
    child.on('close', (code) => {
      clearTimeout(timer);
      log(`Coordinator exited (code=${code}): ${out.slice(0, 200)}`);
      resolve({ ok: code === 0, out });
    });
  });
}

// ── Check if Safari is running at all ────────────────────────────────────────
function isSafariRunning() {
  try {
    const result = execSync('pgrep -x Safari', { stdio: 'pipe', timeout: 3000 }).toString().trim();
    return result.length > 0;
  } catch { return false; }
}

// ── Main check cycle ─────────────────────────────────────────────────────────
async function runCheck(state) {
  state.checkCount = (state.checkCount || 0) + 1;
  log(`Check #${state.checkCount} — scanning ${PLATFORMS.length} platforms`);

  const results = await Promise.all(PLATFORMS.map(async p => ({
    ...p,
    ...(await checkPlatform(p)),
  })));

  const missing = results.filter(r => r.reason === 'no_tab');
  const down    = results.filter(r => r.reason === 'service_down');
  const ok      = results.filter(r => r.ok);

  // Update per-platform status
  for (const r of results) {
    state.platformStatus[r.id] = {
      ok: r.ok,
      reason: r.reason || 'ok',
      checkedAt: new Date().toISOString(),
    };
  }

  log(`Result: ${ok.length} OK | ${missing.length} missing tab | ${down.length} service down`);
  if (MODE === 'test') {
    for (const r of results) {
      log(`  ${r.ok ? '✓' : '✗'} ${r.name} (:${r.port}) — ${r.reason || 'ok'}`);
    }
    return;
  }

  // ── Recovery: tabs missing ────────────────────────────────────────────────
  if (missing.length > 0) {
    const missingNames = missing.map(r => r.name).join(', ');
    log(`Missing tabs: ${missingNames}`);

    // Respect cooldown — don't hammer Safari with open requests
    const cooldownRemaining = state.lastRecoveryAt
      ? RECOVERY_COOLDOWN_MS - (Date.now() - new Date(state.lastRecoveryAt).getTime())
      : 0;

    if (cooldownRemaining > 0) {
      log(`Recovery cooldown active — ${Math.round(cooldownRemaining / 1000)}s remaining`);
      return;
    }

    // Check Safari is actually running before trying to open tabs
    if (!isSafariRunning()) {
      log('Safari is NOT running — cannot open tabs. Sending Telegram alert.');
      await tgSend(
        `⚠️ <b>Safari Tab Watchdog</b>\n\nSafari is not running!\nPlatforms offline: ${missingNames}\n\nPlease open Safari manually.`
      );
      state.lastRecoveryAt = new Date().toISOString();
      return;
    }

    // Run coordinator to recover
    state.lastRecoveryAt = new Date().toISOString();
    state.recoveryCount = (state.recoveryCount || 0) + 1;

    const coordResult = await runCoordinator();

    // Re-check after recovery
    await new Promise(r => setTimeout(r, 3000));
    const recheck = await Promise.all(PLATFORMS.map(async p => ({
      ...p,
      ...(await checkPlatform(p)),
    })));
    const stillMissing = recheck.filter(r => r.reason === 'no_tab');
    const recovered    = missing.filter(m => !stillMissing.find(s => s.id === m.id));

    if (recovered.length > 0) {
      log(`Recovered: ${recovered.map(r => r.name).join(', ')}`);
      await tgSend(
        `✅ <b>Safari Tab Watchdog</b>\n\nAuto-recovered ${recovered.length} tab(s):\n${recovered.map(r => r.name).join(', ')}`
      );
    }
    if (stillMissing.length > 0) {
      log(`Still missing after recovery: ${stillMissing.map(r => r.name).join(', ')}`);
      await tgSend(
        `❌ <b>Safari Tab Watchdog</b>\n\nFailed to recover tabs:\n${stillMissing.map(r => r.name).join(', ')}\n\nManual intervention needed.`
      );
    }
  }

  // ── Alert: services completely down ──────────────────────────────────────
  if (down.length > 0) {
    log(`Services DOWN: ${down.map(r => r.name).join(', ')} — watchdog-safari.sh should restart them`);
    // Don't alert for every check — only log (Safari watchdog handles restarts)
  }
}

// ── Entry point ──────────────────────────────────────────────────────────────
async function main() {
  log(`Starting (mode=${MODE})`);
  const state = loadState();

  if (MODE === 'test' || MODE === 'once') {
    await runCheck(state);
    saveState(state);
    return;
  }

  // Daemon loop
  await runCheck(state);
  saveState(state);

  setInterval(async () => {
    try {
      await runCheck(state);
      saveState(state);
    } catch (e) {
      log(`Check error: ${e.message}`);
    }
  }, CHECK_INTERVAL_MS);

  log(`Running — checking every ${CHECK_INTERVAL_MS / 1000}s`);
}

main().catch(e => {
  log(`Fatal: ${e.message}`);
  process.exit(1);
});
