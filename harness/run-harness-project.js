#!/usr/bin/env node
/**
 * run-harness-project.js
 * Runs the ACD harness against an external project (not the ACD dashboard itself).
 *
 * Usage:
 *   node harness/run-harness-project.js \
 *     --slug safari-decoupled-push-arch \
 *     --path "/Users/isaiahdupree/Documents/Software/Safari Automation" \
 *     --features harness/safari-decoupled-push-arch-features.json \
 *     --prompt harness/prompts/safari-decoupled-push-arch.md \
 *     [--continuous]
 */
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ACD_ROOT = path.resolve(__dirname, '..');

// ─── Parse args ───────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
function getArg(flag) {
  const i = argv.findIndex(a => a === flag);
  return i >= 0 ? argv[i + 1] : null;
}
const slug        = getArg('--slug') || 'unknown';
const projectPath = getArg('--path') || ACD_ROOT;
const featuresArg = getArg('--features');
const promptArg   = getArg('--prompt');
const continuous  = argv.includes('--continuous');
const maxSessions = parseInt(getArg('--max') || '50');

const featuresFile = featuresArg
  ? path.resolve(ACD_ROOT, featuresArg)
  : path.join(projectPath, 'feature_list.json');

const promptFile = promptArg
  ? path.resolve(ACD_ROOT, promptArg)
  : path.join(__dirname, 'prompts', 'coding.md');

const logFile = path.join(ACD_ROOT, 'harness', 'logs', `${slug}.log`);
const statusFile = path.join(ACD_ROOT, `harness-status-${slug}.json`);

fs.mkdirSync(path.join(ACD_ROOT, 'harness', 'logs'), { recursive: true });

// ─── Helpers ──────────────────────────────────────────────────────────────────
function log(msg) {
  const line = `${new Date().toISOString()} ${msg}`;
  console.log(line);
  fs.appendFileSync(logFile, line + '\n');
}

function getStats() {
  if (!fs.existsSync(featuresFile)) return { passing: 0, total: 0, pct: '0%' };
  const data = JSON.parse(fs.readFileSync(featuresFile, 'utf-8'));
  const features = data.features || (Array.isArray(data) ? data : []);
  const passing = features.filter(f => f.passes).length;
  return { passing, total: features.length, pct: `${Math.round(passing / (features.length || 1) * 100)}%` };
}

function allDone() {
  const s = getStats();
  return s.total > 0 && s.passing >= s.total;
}

function updateStatus(phase, state) {
  const s = getStats();
  fs.writeFileSync(statusFile, JSON.stringify({
    slug, phase, state, projectPath, featuresFile,
    progress: s, updatedAt: new Date().toISOString()
  }, null, 2));
}

// ─── Session runner ───────────────────────────────────────────────────────────
function runSession(sessionNum) {
  return new Promise((resolve, reject) => {
    const s = getStats();
    log(`Session #${sessionNum} | ${s.passing}/${s.total} (${s.pct})`);
    updateStatus('coding', 'running');

    const prompt = fs.readFileSync(promptFile, 'utf-8');
    const featuresContent = fs.readFileSync(featuresFile, 'utf-8');

    const fullPrompt = `${prompt}

## Current Feature List (${featuresFile})
\`\`\`json
${featuresContent}
\`\`\`

Work through features in order. Find the first with "passes": false, implement it, verify it works, then update "passes": true in ${featuresFile}. Commit after each feature.`;

    const args = [
      '-p', fullPrompt,
      '--allowedTools', 'Edit', 'Bash', 'Read', 'Write', 'Glob', 'Grep',
      'mcp__supabase__apply_migration', 'mcp__supabase__execute_sql',
      '--output-format', 'stream-json',
      '--verbose',
    ];

    const env = { ...process.env };
    delete env.CLAUDE_CODE_OAUTH_TOKEN;
    delete env.ANTHROPIC_API_KEY;
    delete env.CLAUDECODE; // allow nested Claude Code sessions

    const claude = spawn('claude', args, {
      cwd: projectPath,
      env,
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    let out = '';
    claude.stdout.on('data', d => { out += d; process.stdout.write(d); });
    claude.stderr.on('data', d => process.stderr.write(d));
    claude.on('error', err => { log(`ERROR: ${err.message}`); updateStatus('coding', 'error'); reject(err); });
    claude.on('close', code => {
      const after = getStats();
      const gained = after.passing - s.passing;
      log(`Session #${sessionNum} done (exit ${code}) | +${gained} features | ${after.passing}/${after.total}`);
      updateStatus('coding', code === 0 ? 'idle' : 'error');
      resolve({ code, gained });
    });
  });
}

// ─── Main loop ────────────────────────────────────────────────────────────────
async function main() {
  log(`Starting harness for: ${slug}`);
  log(`  Project: ${projectPath}`);
  log(`  Features: ${featuresFile}`);
  log(`  Prompt: ${promptFile}`);

  if (!fs.existsSync(featuresFile)) {
    log(`ERROR: Features file not found: ${featuresFile}`);
    process.exit(1);
  }
  if (!fs.existsSync(promptFile)) {
    log(`ERROR: Prompt file not found: ${promptFile}`);
    process.exit(1);
  }

  let session = 1;
  do {
    if (allDone()) { log('All features passing — done!'); break; }
    if (session > maxSessions) { log(`Max sessions (${maxSessions}) reached`); break; }
    await runSession(session++);
    if (!allDone()) await new Promise(r => setTimeout(r, 5000));
  } while (continuous || session <= 1);

  const s = getStats();
  log(`Final: ${s.passing}/${s.total} features passing`);
}

main().catch(e => { console.error(e); process.exit(1); });
