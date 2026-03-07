#!/usr/bin/env node
/**
 * run-continuous-batched.js
 * Runs the full ACD queue in rolling batches of 3 — parallel within each batch,
 * sequential between batches. Skips completed and currently-running targets.
 *
 * Usage:
 *   node harness/scripts/run-continuous-batched.js [--dry-run] [--batch-size=3] [--start-after=<id>]
 *
 * Completion detection: last log line matches "Sessions: N/N successful" where N >= 2
 * Running detection:    PID file exists AND process is alive (kill -0)
 */

import { spawn, execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, createWriteStream } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ACD_ROOT = resolve(__dirname, '..', '..');
const QUEUE_PATH = join(ACD_ROOT, 'harness', 'repo-queue.json');
const LOGS_DIR  = join(ACD_ROOT, 'harness', 'logs');
const PIDS_DIR  = join(ACD_ROOT, 'harness', 'pids');
const MODEL     = 'claude-sonnet-4-6';
const FALLBACK  = 'claude-haiku-4-5-20251001';

mkdirSync(LOGS_DIR, { recursive: true });
mkdirSync(PIDS_DIR, { recursive: true });

// ─── CLI flags ────────────────────────────────────────────────────────────────
const DRY_RUN     = process.argv.includes('--dry-run');
const BATCH_SIZE  = parseInt(process.argv.find(a => a.startsWith('--batch-size='))?.split('=')[1] || '3');
const START_AFTER = process.argv.find(a => a.startsWith('--start-after='))?.split('=')[1] || null;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isComplete(id) {
  const logFile = join(LOGS_DIR, `${id}.log`);
  if (!existsSync(logFile)) return false;
  const lines = readFileSync(logFile, 'utf8').trim().split('\n');
  const last = lines[lines.length - 1] || '';
  const m = last.match(/Sessions:\s*(\d+)\/(\d+)\s+successful/);
  if (!m) return false;
  const [, done, total] = m.map(Number);
  return done === total && total >= 2; // >=2 means a full run happened
}

function isRunning(id) {
  const pidFile = join(PIDS_DIR, `${id}.pid`);
  if (!existsSync(pidFile)) return false;
  const pid = parseInt(readFileSync(pidFile, 'utf8').trim());
  if (!pid) return false;
  try { execSync(`kill -0 ${pid}`, { stdio: 'ignore' }); return true; }
  catch { return false; }
}

function featureListExists(repo) {
  const fl = repo.featureList;
  if (!fl) return false;
  const abs = fl.startsWith('/') ? fl : join(ACD_ROOT, fl);
  return existsSync(abs);
}

function promptPath(repo) {
  const p = repo.prompt || `prompts/${repo.id}.md`;
  if (p.startsWith('/')) return p;
  if (p.startsWith('harness/')) return join(ACD_ROOT, p);
  return join(ACD_ROOT, 'harness', p);
}

function resolveFeatureList(repo) {
  const fl = repo.featureList;
  if (!fl) return null;
  return fl.startsWith('/') ? fl : join(ACD_ROOT, fl);
}

// ─── Launch single harness ────────────────────────────────────────────────────
function launchAgent(repo) {
  const { id, path: targetPath } = repo;
  const prompt = promptPath(repo);
  const featureList = resolveFeatureList(repo);
  const logFile = join(LOGS_DIR, `${id}.log`);
  const pidFile = join(PIDS_DIR, `${id}.pid`);

  if (!existsSync(prompt)) {
    console.log(`  ⚠️  ${id}: missing prompt (${prompt}), skipping`);
    return null;
  }
  if (!featureList || !existsSync(featureList)) {
    console.log(`  ⚠️  ${id}: missing feature list (${featureList}), skipping`);
    return null;
  }
  if (!existsSync(targetPath)) {
    console.log(`  ⚠️  ${id}: target path not found (${targetPath}), skipping`);
    return null;
  }

  if (DRY_RUN) {
    console.log(`  🔍 [DRY] ${id}  target=${targetPath}`);
    return { id, fakePid: true };
  }

  const logStream = createWriteStream(logFile, { flags: 'a' });
  const proc = spawn('node', [
    join(ACD_ROOT, 'harness', 'run-harness-v2.js'),
    `--path=${targetPath}`,
    `--project=${id}`,
    `--prompt=${prompt}`,
    `--feature-list=${featureList}`,
    `--model=${MODEL}`,
    `--fallback-model=${FALLBACK}`,
    '--max-retries=3',
    '--adaptive-delay',
    '--force-coding',
    '--until-complete',
  ], { stdio: ['ignore', logStream, logStream] });

  writeFileSync(pidFile, String(proc.pid));
  console.log(`  ✅ ${id}  PID=${proc.pid}`);
  return proc;
}

// ─── Run one batch in parallel, wait for all to exit ─────────────────────────
async function runBatch(repos, batchNum, total) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(` Batch ${batchNum}/${total}  (${repos.map(r => r.id).join(' | ')})`);
  console.log(`${'═'.repeat(60)}`);

  if (DRY_RUN) {
    repos.forEach(r => launchAgent(r));
    return;
  }

  const launched = repos.map(repo => {
    const proc = launchAgent(repo);
    return proc ? { repo, proc } : null;
  }).filter(Boolean);

  await Promise.all(launched.map(({ repo, proc }) =>
    new Promise(res => {
      proc.on('exit', code => {
        const status = code === 0 ? '✅' : `⚠️ (code=${code})`;
        console.log(`  ${status} ${repo.id} done`);
        res();
      });
      proc.on('error', err => {
        console.log(`  ❌ ${repo.id} error: ${err.message}`);
        res();
      });
    })
  ));
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function waitForRunningAgents() {
  if (!existsSync(PIDS_DIR)) return;
  const { readdirSync } = await import('fs');
  const pidFiles = readdirSync(PIDS_DIR).filter(f => f.endsWith('.pid'));
  if (pidFiles.length === 0) return;

  const alive = pidFiles.filter(f => {
    const pid = parseInt(readFileSync(join(PIDS_DIR, f), 'utf8').trim());
    try { execSync(`kill -0 ${pid}`, { stdio: 'ignore' }); return true; }
    catch { return false; }
  });

  if (alive.length === 0) return;

  const names = alive.map(f => f.replace('.pid', ''));
  console.log(`\n⏳ Waiting for ${alive.length} running agent(s): ${names.join(', ')}`);

  await Promise.all(alive.map(f => new Promise(res => {
    const pidFile = join(PIDS_DIR, f);
    const check = setInterval(() => {
      const pid = parseInt(readFileSync(pidFile, 'utf8').trim());
      try { execSync(`kill -0 ${pid}`, { stdio: 'ignore' }); }
      catch { clearInterval(check); console.log(`  ✅ ${f.replace('.pid','')} finished`); res(); }
    }, 10000);
  })));
  console.log('  All prior agents done. Starting next batch...\n');
}

async function main() {
  const queue = JSON.parse(readFileSync(QUEUE_PATH, 'utf8'));

  // Sort all enabled repos by priority (most negative = highest)
  const all = queue.repos
    .filter(r => r.enabled !== false)
    .sort((a, b) => (a.priority || 0) - (b.priority || 0));

  if (!DRY_RUN) await waitForRunningAgents();

  // Apply --start-after filter
  let skip = !!START_AFTER;
  const pending = all.filter(r => {
    if (skip) { if (r.id === START_AFTER) skip = false; return false; }
    if (isComplete(r.id)) { console.log(`  ✓ skip (complete): ${r.id}`); return false; }
    if (isRunning(r.id))  { console.log(`  ⟳ skip (running):  ${r.id}`); return false; }
    if (!featureListExists(r)) { console.log(`  ⚠️ skip (no feat):  ${r.id}`); return false; }
    return true;
  });

  // Group into batches
  const batches = [];
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    batches.push(pending.slice(i, i + BATCH_SIZE));
  }

  console.log(`\n📋 Queue: ${all.length} total → ${pending.length} pending → ${batches.length} batches of ${BATCH_SIZE}`);
  if (DRY_RUN) console.log('   [DRY RUN — no processes will be spawned]\n');

  for (let i = 0; i < batches.length; i++) {
    await runBatch(batches[i], i + 1, batches.length);
    if (!DRY_RUN && i < batches.length - 1) {
      console.log(`\n  ⏳ Batch ${i + 1} complete. Starting batch ${i + 2} in 5s...`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(DRY_RUN ? ' DRY RUN complete' : ' ✨ All batches complete!');
  console.log(`${'═'.repeat(60)}\n`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
