#!/usr/bin/env node

/**
 * ACD Task Agent
 * ==============
 * Spawns a Claude Code agent (via claude CLI / Agents SDK) to implement a
 * specific feature or task in any repo, then:
 *   1. Runs the repo's test command to verify correctness
 *   2. Marks the feature as passing in the feature list JSON
 *   3. Commits the changes (if tests pass)
 *   4. Puts the code back into commission
 *
 * Usage (standalone):
 *   node task-agent.js --repo cloud-sync-mcp \
 *     --task "Add rate-limiting middleware to all API routes" \
 *     --feature-id CSM-012 \
 *     --test "npm test"
 *
 * Programmatic:
 *   import { runTaskAgent } from './task-agent.js';
 *   const result = await runTaskAgent({
 *     repoId:    'cloud-sync-mcp',
 *     task:      'Add rate-limiting middleware',
 *     featureId: 'CSM-012',
 *     testCmd:   'npm test',
 *   });
 */

import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────────────
const TASK_LOG_FILE      = path.join(__dirname, 'logs', 'task-agent.log');
const TASK_RESULT_FILE   = path.join(__dirname, 'task-agent-result.json');
const REPO_QUEUE_FILE    = path.join(__dirname, 'repo-queue.json');
const TASK_TIMEOUT_MS    = 15 * 60 * 1000; // 15 min — tasks take longer than doctor
const MAX_TURNS          = 30;

function log(msg) {
  const line = `${new Date().toISOString()} [task-agent] ${msg}`;
  console.log(line);
  try {
    fs.mkdirSync(path.join(__dirname, 'logs'), { recursive: true });
    fs.appendFileSync(TASK_LOG_FILE, line + '\n');
  } catch { /* non-fatal */ }
}

// ── Repo resolver ─────────────────────────────────────────────────────────────
function resolveRepo(repoId) {
  try {
    const rq = JSON.parse(fs.readFileSync(REPO_QUEUE_FILE, 'utf-8'));
    return rq.repos?.find(r => r.id === repoId) || null;
  } catch { return null; }
}

function findFeatureListPath(repoId, repoEntry) {
  const candidates = [
    repoEntry?.featureList,
    path.join(__dirname, 'features', `${repoId}.json`),
    path.join(__dirname, `${repoId}-features.json`),
    repoEntry?.path ? path.join(repoEntry.path, 'feature_list.json') : null,
  ].filter(Boolean);
  return candidates.find(p => fs.existsSync(p)) || null;
}

// ── Context builder ───────────────────────────────────────────────────────────
function buildTaskContext(options) {
  const { repoId, task, featureId, testCmd } = options;
  const ctx = {
    repoId,
    task,
    featureId: featureId || null,
    testCmd:   testCmd || null,
    ts: new Date().toISOString(),
  };

  // Resolve repo from queue
  const repoEntry = resolveRepo(repoId);
  if (repoEntry) {
    ctx.repoPath    = repoEntry.path;
    ctx.repoName    = repoEntry.name;
    ctx.repoPRD     = repoEntry.prd || null;
    ctx.repoFocus   = repoEntry.focus || null;
    ctx.complexity  = repoEntry.complexity || 'medium';
    ctx.promptFile  = repoEntry.prompt ? path.join(__dirname, repoEntry.prompt) : null;
  }

  // If testCmd not provided, try to infer from repo
  if (!ctx.testCmd && ctx.repoPath) {
    const pkgPath = path.join(ctx.repoPath, 'package.json');
    const pyPath  = path.join(ctx.repoPath, 'pytest.ini');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        if (pkg.scripts?.test) ctx.testCmd = 'npm test';
        else if (pkg.scripts?.['test:ci']) ctx.testCmd = 'npm run test:ci';
      } catch { /* ok */ }
    } else if (fs.existsSync(pyPath)) {
      ctx.testCmd = 'python3 -m pytest -x -q';
    }
  }

  // Read feature list
  const featureListPath = findFeatureListPath(repoId, repoEntry);
  if (featureListPath) {
    ctx.featureListPath = featureListPath;
    try {
      const raw = JSON.parse(fs.readFileSync(featureListPath, 'utf-8'));
      ctx.features = raw.features || raw;
      // Find the specific feature if featureId given
      if (featureId && Array.isArray(ctx.features)) {
        ctx.targetFeature = ctx.features.find(
          f => f.id === featureId || f.id?.toLowerCase() === featureId?.toLowerCase()
        );
      }
    } catch { /* ok */ }
  }

  // Read harness prompt for additional context
  if (ctx.promptFile && fs.existsSync(ctx.promptFile)) {
    try {
      const promptText = fs.readFileSync(ctx.promptFile, 'utf-8');
      ctx.promptContext = promptText.substring(0, 2000); // First 2k chars
    } catch { /* ok */ }
  }

  // Read PRD if present in repo dir
  if (ctx.repoPath) {
    for (const prdName of ['PRD.md', 'prd.md', 'README.md']) {
      const p = path.join(ctx.repoPath, prdName);
      if (fs.existsSync(p)) {
        try {
          const text = fs.readFileSync(p, 'utf-8');
          ctx.prdContent = text.substring(0, 3000); // First 3k chars
          ctx.prdFile = p;
          break;
        } catch { /* ok */ }
      }
    }
  }

  // Read harness-status to understand current state
  if (ctx.repoPath) {
    const statusPath = path.join(ctx.repoPath, 'harness-status.json');
    if (fs.existsSync(statusPath)) {
      try { ctx.harnessStatus = JSON.parse(fs.readFileSync(statusPath, 'utf-8')); } catch { /* ok */ }
    }
  }

  return ctx;
}

// ── Task prompt ───────────────────────────────────────────────────────────────
function buildTaskPrompt(ctx) {
  const featureBlock = ctx.targetFeature
    ? `\n## Target feature\n\`\`\`json\n${JSON.stringify(ctx.targetFeature, null, 2)}\n\`\`\``
    : '';

  const prdBlock = ctx.prdContent
    ? `\n## Project PRD / README (first 3000 chars)\nFile: \`${ctx.prdFile}\`\n\`\`\`\n${ctx.prdContent}\n\`\`\``
    : '';

  const focusBlock = ctx.repoFocus
    ? `\n## Project focus\n${ctx.repoFocus}`
    : '';

  const promptBlock = ctx.promptContext
    ? `\n## Existing harness prompt (context)\n${ctx.promptContext}`
    : '';

  const harnessBlock = ctx.harnessStatus
    ? `\n## Current harness status\n\`\`\`json\n${JSON.stringify(ctx.harnessStatus, null, 2)}\n\`\`\``
    : '';

  const testBlock = ctx.testCmd
    ? `Run tests with: \`${ctx.testCmd}\``
    : 'No test command found — check package.json for test scripts.';

  return `You are the ACD Task Agent — a Claude Code agent that implements new functionality in a repository.

## Your assignment
**Repo:** ${ctx.repoName || ctx.repoId}
**Repo path:** \`${ctx.repoPath || 'unknown'}\`
**Task:** ${ctx.task}
**Feature ID:** ${ctx.featureId || 'n/a'}
**Complexity:** ${ctx.complexity}
**Timestamp:** ${ctx.ts}
${featureBlock}
${focusBlock}
${prdBlock}
${promptBlock}
${harnessBlock}

## Execution protocol

### Phase 1 — Understand (max 3 turns)
1. Read the repo structure: \`ls -la ${ctx.repoPath || '.'}\`
2. Read relevant existing files to understand patterns and conventions
3. Identify exactly what needs to be built and where

### Phase 2 — Implement
4. Write the code — follow existing conventions, patterns, and style
5. Create any new files needed
6. Update imports, exports, routes, and integration points
7. Do NOT break existing functionality

### Phase 3 — Test & commission
8. ${testBlock}
9. Fix any test failures — iterate until tests pass
10. Once tests pass, write the result file (see below)

## Result file
Write this JSON to: \`${TASK_RESULT_FILE}\`

\`\`\`json
{
  "ts": "${ctx.ts}",
  "repoId": "${ctx.repoId}",
  "featureId": "${ctx.featureId || ''}",
  "task": ${JSON.stringify(ctx.task)},
  "success": true,
  "testsPass": true,
  "testCmd": "${ctx.testCmd || ''}",
  "filesChanged": ["list the files you created or modified"],
  "actions": ["summary of what you did"],
  "testOutput": "last few lines of test output",
  "notes": "anything important to know"
}
\`\`\`

Set \`"success": false\` and \`"testsPass": false\` if you could not complete the task or tests are failing.

## Hard rules
- Stay in \`${ctx.repoPath || '.'}\` — never touch other repos
- Do NOT modify the ACD harness (harness/ directory) — only the target repo
- Keep sessions short — implement the task cleanly and efficiently
- Write the result file as your FINAL action before finishing
- If tests fail after 3 attempts, write the result with success=false and explain why
`;
}

// ── Test runner ───────────────────────────────────────────────────────────────
function runTests(testCmd, repoPath) {
  if (!testCmd) return { pass: null, output: 'No test command configured', skipped: true };
  log(`Running tests: ${testCmd}`);
  try {
    const output = execSync(testCmd, {
      cwd: repoPath,
      timeout: 5 * 60 * 1000,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    log('Tests passed ✅');
    return { pass: true, output: output.slice(-2000) };
  } catch (e) {
    const output = (e.stdout || '') + (e.stderr || '');
    log(`Tests failed ❌ — ${output.slice(0, 200)}`);
    return { pass: false, output: output.slice(-2000) };
  }
}

// ── Feature list updater ──────────────────────────────────────────────────────
export function markFeaturePassing(featureId, featureListPath) {
  if (!featureId || !featureListPath || !fs.existsSync(featureListPath)) return false;
  try {
    const raw  = JSON.parse(fs.readFileSync(featureListPath, 'utf-8'));
    const arr  = raw.features || raw;
    const feat = arr.find(f => f.id === featureId || f.id?.toLowerCase() === featureId?.toLowerCase());
    if (!feat) { log(`Feature ${featureId} not found in feature list`); return false; }

    const wasPasses = feat.passes || 0;
    feat.passes     = (feat.passes || 0) + 1;
    feat.lastPass   = new Date().toISOString();
    feat.lastPassBy = 'task-agent';

    // Write back
    if (raw.features) raw.features = arr;
    fs.writeFileSync(featureListPath, JSON.stringify(raw, null, 2));
    log(`Marked ${featureId} as passing (passes: ${wasPasses} → ${feat.passes})`);
    return true;
  } catch (e) {
    log(`Failed to mark feature passing: ${e.message}`);
    return false;
  }
}

// ── Git commit ────────────────────────────────────────────────────────────────
export function commitChanges(repoPath, message) {
  if (!repoPath) return null;
  try {
    execSync('git add -A', { cwd: repoPath, stdio: 'ignore' });
    const status = execSync('git status --short', { cwd: repoPath, encoding: 'utf-8' }).trim();
    if (!status) { log('No changes to commit'); return null; }
    execSync(`git commit -m ${JSON.stringify(message)}`, { cwd: repoPath, stdio: 'ignore' });
    const hash = execSync('git rev-parse --short HEAD', { cwd: repoPath, encoding: 'utf-8' }).trim();
    log(`Committed: ${hash} — "${message}"`);
    return hash;
  } catch (e) {
    log(`Git commit failed: ${e.message}`);
    return null;
  }
}

// ── Main task agent ───────────────────────────────────────────────────────────
export async function runTaskAgent(options = {}) {
  const { repoId, task, featureId, testCmd, skipCommit = false } = options;

  if (!repoId) throw new Error('runTaskAgent: repoId is required');
  if (!task)   throw new Error('runTaskAgent: task is required');

  log(`Starting task agent — repo: "${repoId}", feature: "${featureId || 'none'}", task: "${task.substring(0, 60)}..."`);

  const ctx    = buildTaskContext(options);
  const prompt = buildTaskPrompt(ctx);

  if (!ctx.repoPath) {
    log(`Repo "${repoId}" not found in repo-queue.json`);
    return { success: false, repoId, task, featureId: featureId || null, error: `Repo "${repoId}" not found in queue`, actions: [], filesChanged: [], testsPass: null, testsSkipped: false, featureMarked: false, commitHash: null };
  }

  // Clear previous result
  try { fs.unlinkSync(TASK_RESULT_FILE); } catch { /* ok */ }

  const claudeArgs = [
    '-p', prompt,
    '--model', 'claude-opus-4-5',
    '--allowedTools', 'Read', 'Edit', 'MultiEdit', 'Write', 'Bash', 'LS',
    '--max-turns', String(MAX_TURNS),
    '--output-format', 'stream-json',
  ];

  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY; // Force OAuth

  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      log('Task agent timed out after 15 min');
      claude.kill('SIGTERM');
      resolve({
        success: false,
        repoId,
        featureId,
        error: 'timeout',
        testsPass: false,
        actions: ['Task agent timed out'],
      });
    }, TASK_TIMEOUT_MS);

    const claude = spawn('claude', claudeArgs, {
      cwd: ctx.repoPath,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    claude.stdout.on('data', d => {
      const text = d.toString();
      try { fs.appendFileSync(TASK_LOG_FILE, text); } catch { /* ok */ }
    });
    claude.stderr.on('data', d => {
      const text = d.toString();
      try { fs.appendFileSync(TASK_LOG_FILE, text); } catch { /* ok */ }
    });

    claude.on('error', err => {
      clearTimeout(timeoutId);
      log(`Claude spawn error: ${err.message}`);
      resolve({ success: false, repoId, featureId, error: `spawn: ${err.message}`, actions: [] });
    });

    claude.on('close', code => {
      clearTimeout(timeoutId);
      log(`Claude session exited (code ${code})`);

      // Read result written by the agent
      let agentResult = null;
      if (fs.existsSync(TASK_RESULT_FILE)) {
        try {
          agentResult = JSON.parse(fs.readFileSync(TASK_RESULT_FILE, 'utf-8'));
          log(`Agent result: success=${agentResult.success}, testsPass=${agentResult.testsPass}`);
        } catch (e) {
          log(`Could not parse task result file: ${e.message}`);
        }
      }

      // Run tests independently to confirm (source of truth)
      const testResult = runTests(ctx.testCmd, ctx.repoPath);
      const testsPass  = testResult.pass === true || testResult.skipped === true;

      // Commission: mark feature passing + commit if tests pass
      let featureMarked = false;
      let commitHash    = null;

      if (testsPass && !testResult.skipped) {
        if (featureId && ctx.featureListPath) {
          featureMarked = markFeaturePassing(featureId, ctx.featureListPath);
        }
        if (!skipCommit) {
          const commitMsg = featureId
            ? `feat(${repoId}): ${featureId} — ${task.substring(0, 60)}`
            : `feat(${repoId}): ${task.substring(0, 72)}`;
          commitHash = commitChanges(ctx.repoPath, commitMsg);
        }
        log(`✅ Task commissioned — featureMarked=${featureMarked}, commit=${commitHash || 'skipped'}`);
      } else if (!testResult.skipped) {
        log('❌ Tests failed — not committing, feature not marked');
      }

      const result = {
        ts:            new Date().toISOString(),
        repoId,
        featureId:     featureId || null,
        task,
        success:       testsPass,
        testsPass:     testResult.pass,
        testsSkipped:  testResult.skipped || false,
        testOutput:    testResult.output?.slice(-1000),
        featureMarked,
        commitHash,
        claudeExitCode: code,
        actions:       agentResult?.actions || [],
        filesChanged:  agentResult?.filesChanged || [],
        notes:         agentResult?.notes || null,
      };

      // Write final result
      try { fs.writeFileSync(TASK_RESULT_FILE, JSON.stringify(result, null, 2)); } catch { /* ok */ }

      resolve(result);
    });
  });
}

// ── Dispatch multiple tasks in parallel ───────────────────────────────────────
export async function dispatchTasks(tasks = [], { parallel = false } = {}) {
  log(`Dispatching ${tasks.length} tasks (mode: ${parallel ? 'PARALLEL' : 'SERIES'})`);
  if (parallel) {
    return Promise.all(tasks.map(t => runTaskAgent(t)));
  }
  const results = [];
  for (const t of tasks) {
    results.push(await runTaskAgent(t));
  }
  return results;
}

// ── Standalone CLI ────────────────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const cliArgs = process.argv.slice(2);
  const getArg = name => {
    const eq = cliArgs.find(a => a.startsWith(`${name}=`));
    if (eq) return eq.split('=').slice(1).join('=');
    const idx = cliArgs.indexOf(name);
    return (idx !== -1 && idx + 1 < cliArgs.length) ? cliArgs[idx + 1] : null;
  };

  // dispatch-file mode: node task-agent.js --dispatch tasks.json [--parallel]
  const dispatchFile = getArg('--dispatch');
  if (dispatchFile) {
    const tasks    = JSON.parse(fs.readFileSync(dispatchFile, 'utf-8'));
    const parallel = cliArgs.includes('--parallel');
    log(`Dispatching ${tasks.length} tasks from ${dispatchFile} (parallel=${parallel})`);
    dispatchTasks(tasks, { parallel })
      .then(results => {
        console.log(JSON.stringify(results, null, 2));
        const failed = results.filter(r => !r.success).length;
        process.exit(failed > 0 ? 1 : 0);
      })
      .catch(e => { console.error(e.message); process.exit(1); });
  } else {
    const repoId    = getArg('--repo');
    const task      = getArg('--task');
    const featureId = getArg('--feature-id') || getArg('--feature');
    const testCmd   = getArg('--test');
    const skipCommit = cliArgs.includes('--no-commit');

    if (!repoId || !task) {
      console.error('Usage: node task-agent.js --repo <id> --task "<description>" [--feature-id <id>] [--test "<cmd>"] [--no-commit]');
      console.error('       node task-agent.js --dispatch tasks.json [--parallel]');
      process.exit(1);
    }

    log('ACD Task Agent — standalone mode');
    runTaskAgent({ repoId, task, featureId, testCmd, skipCommit })
      .then(result => {
        console.log('\n── Task Result ──');
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.success ? 0 : 1);
      })
      .catch(e => { console.error(`Fatal: ${e.message}`); process.exit(1); });
  }
}
