#!/usr/bin/env node

/**
 * LinkedIn Goal Agent
 * ===================
 * Reads business goals from local file or cloud → spawns a NanoBot agent
 * that searches LinkedIn for ICP prospects, scores them, drafts personalized
 * outreach messages, and (optionally) sends them.
 *
 * Modes:
 *   --dry-run  (default) Plan only — no sends. Measures planning quality.
 *   --live               Actually sends DMs. Measures execution outcomes.
 *   --test               Pre-flight only — no NanoBot call.
 *
 * Output:
 *   /tmp/linkedin-agent-results.json   ← agent writes this
 *   harness/linkedin-agent-results.ndjson  ← run history log
 *
 * Usage:
 *   node harness/linkedin-goal-agent.js
 *   node harness/linkedin-goal-agent.js --live
 *   node harness/linkedin-goal-agent.js --test
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_DIR = __dirname;
const LOGS_DIR = path.join(HARNESS_DIR, 'logs');
const RESULTS_LOG = path.join(HARNESS_DIR, 'linkedin-agent-results.ndjson');
const RESULTS_TMP = '/tmp/linkedin-agent-results.json';

const GOALS_FILE = '/Users/isaiahdupree/Documents/Software/business-goals.json';
const NANOBOT_DIR = '/Users/isaiahdupree/Documents/Software/NanoBot';
const SAFARI_ENV = '/Users/isaiahdupree/Documents/Software/Safari Automation/.env';
const LI_API = 'http://localhost:3105';
const LI_AUTH_TOKEN = process.env.LINKEDIN_AUTH_TOKEN || 'test-token-12345';

const MODE = process.argv.includes('--live') ? 'live'
           : process.argv.includes('--test') ? 'test'
           : 'dry-run';

// ── Bootstrap API key ──────────────────────────────────────────────────────────
if (!process.env.ANTHROPIC_API_KEY) {
  try {
    const lines = fs.readFileSync(SAFARI_ENV, 'utf-8').split('\n');
    for (const line of lines) {
      const m = line.match(/^ANTHROPIC_API_KEY=(.+)/);
      if (m) { process.env.ANTHROPIC_API_KEY = m[1].trim(); break; }
    }
  } catch { /* non-fatal */ }
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function log(msg) {
  const ts = new Date().toISOString();
  console.log(`${ts} [linkedin-agent] ${msg}`);
  try {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
    fs.appendFileSync(path.join(LOGS_DIR, 'linkedin-agent.log'), `${ts} ${msg}\n`);
  } catch { /* non-fatal */ }
}

function readJson(fp, fallback = null) {
  try { return JSON.parse(fs.readFileSync(fp, 'utf-8')); } catch { return fallback; }
}

async function fetchWithTimeout(url, opts = {}, ms = 3000) {
  try {
    const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(ms) });
    return res;
  } catch { return null; }
}

// ── Load goals (local or cloud) ────────────────────────────────────────────────
async function loadGoals() {
  // 1. Try local file first
  const local = readJson(GOALS_FILE);
  if (local) return { source: 'local', goals: local };

  // 2. Fallback: CRMLite cloud
  const res = await fetchWithTimeout(
    'https://crmlite-isaiahduprees-projects.vercel.app/api/goals',
    {}, 5000
  );
  if (res?.ok) {
    const data = await res.json();
    return { source: 'crmlite-cloud', goals: data };
  }

  throw new Error('Could not load business goals from local file or cloud');
}

// ── LinkedIn service health check ──────────────────────────────────────────────
async function checkLinkedInHealth() {
  const res = await fetchWithTimeout(`${LI_API}/health`);
  return res?.ok === true;
}

// ── Build NanoBot mission task ─────────────────────────────────────────────────
function buildAgentTask(goals, dryRun) {
  const icp = goals.icp || {};
  const revenue = goals.revenue || {};
  const growth = goals.growth || {};
  const offers = (goals.offers || []).filter(o => o.active);
  const targetGap = (revenue.target_monthly_usd || 5000) - (revenue.current_monthly_usd || 0);

  return `You are a LinkedIn growth agent for Isaiah's AI consulting business.

MISSION: Find SaaS founders who need AI automation, score them as prospects, draft personalized outreach, ${dryRun ? 'and write a plan (DRY RUN — do NOT send messages)' : 'and SEND the messages'}.

BUSINESS CONTEXT:
- Revenue target: $${revenue.target_monthly_usd || 5000}/month
- Revenue gap: $${targetGap} (current: $${revenue.current_monthly_usd || 0})
- ICP: ${icp.description || 'SaaS founders $500K-$5M ARR needing AI automation'}
- ICP pain points: ${(icp.pain_points || []).join(', ')}
- Active offers: ${offers.map(o => `${o.name} ($${o.price_usd})`).join(', ')}
- DM target: ${growth.dm_campaigns_per_week || 3} campaigns/week
- CRM target: ${growth.crm_contacts_target || 1000} contacts (current: ${growth.crm_contacts_current || 0})

LINKEDIN API: ${LI_API}
Auth header: Authorization: Bearer ${LI_AUTH_TOKEN}
DRY RUN: ${dryRun}

STEP-BY-STEP EXECUTION:
1. Verify LinkedIn service: GET ${LI_API}/health
   - If not {"status":"ok"} → write error to results file and stop

2. Search for ICP prospects (try 2 searches):
   a. POST ${LI_API}/api/linkedin/search/people
      body: {"keywords":["AI automation SaaS founder"],"title":"CEO OR Founder OR CTO","connectionDegree":"2nd"}
   b. POST ${LI_API}/api/linkedin/search/people
      body: {"keywords":["software startup founder AI"],"title":"Founder OR Co-Founder","connectionDegree":"2nd"}
   Combine results, deduplicate by profileUrl.

3. For each unique prospect (up to 10), score against ICP:
   - Use the headline and location to score 1-10
   - Score criteria: software/tech company (+3), founder/CTO role (+2), mentions automation/AI/scale (+2), has company with employees (+2), $500K-$5M ARR signal (+1)
   - Keep prospects with score >= 6

4. For each qualified prospect (score >= 6), generate a personalized message:
   POST ${LI_API}/api/linkedin/ai/generate-message
   body: {"profile": {the prospect profile}, "purpose": "intro", "tone": "professional", "context": "AI automation consulting, $2500 audit+build offer"}
   If that endpoint fails, draft a message yourself using this template:
   "Hi [Name], I noticed [specific thing from profile]. I help [similar founders] [outcome]. Would a quick call to explore [specific pain point] be worthwhile? - Isaiah"

5. ${dryRun ? 'DRY RUN: Do NOT send any messages.' : `LIVE: For each qualified prospect with a drafted message, send the DM:
   POST ${LI_API}/api/linkedin/messages/send-to
   body: {"profileUrl": prospect.profileUrl, "text": drafted_message}
   Record: {profileUrl, name, success, error}`}

6. Write final results to ${RESULTS_TMP} — IMPORTANT: this file MUST be valid JSON:
{
  "run_id": "<timestamp-based id>",
  "dry_run": ${dryRun},
  "goals_snapshot": {
    "revenue_gap": <number>,
    "icp_description": "<string>",
    "dm_weekly_target": <number>
  },
  "metrics": {
    "prospects_searched": <total from searches>,
    "prospects_qualified": <count with score >= 6>,
    "messages_drafted": <count>,
    "messages_sent": <count, 0 if dry run>,
    "avg_icp_score": <average score of qualified prospects>,
    "search_queries_run": <number>,
    "linkedin_service_up": <true/false>
  },
  "qualified_prospects": [
    {
      "name": "<string>",
      "profileUrl": "<string>",
      "headline": "<string>",
      "icp_score": <number>,
      "icp_reasons": ["<reason1>", ...],
      "message_drafted": "<the drafted message>",
      "message_sent": <true/false/null>
    }
  ],
  "execution_notes": ["<step results and any errors>"],
  "next_actions": ["<what to do next>"],
  "ran_at": "<ISO timestamp>"
}

IMPORTANT RULES:
- Always write the results file even if steps fail (write what you have)
- Never send more than ${dryRun ? 0 : 5} messages in one run
- If LinkedIn returns 429 (rate limited), stop sending and note it in results
- All curl commands: add -H "Authorization: Bearer ${LI_AUTH_TOKEN}" -H "Content-Type: application/json"
- If a search returns 0 results, try different keywords before giving up`;
}

// ── Spawn NanoBot ──────────────────────────────────────────────────────────────
async function spawnNanobot(task) {
  return new Promise((resolve, reject) => {
    log('Spawning NanoBot agent...');

    // Delete stale results file
    try { fs.unlinkSync(RESULTS_TMP); } catch { /* ok */ }

    const child = spawn(
      'python3', ['-m', 'nanobot', 'agent', '-m', task],
      {
        cwd: NANOBOT_DIR,
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', d => {
      const chunk = d.toString();
      stdout += chunk;
      process.stdout.write(chunk);
    });

    child.stderr.on('data', d => {
      stderr += d.toString();
    });

    child.on('close', code => {
      log(`NanoBot exited with code ${code}`);
      resolve({ code, stdout, stderr });
    });

    child.on('error', reject);

    // Timeout: 5 minutes
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('NanoBot timed out after 5 minutes'));
    }, 5 * 60 * 1000);

    child.on('close', () => clearTimeout(timer));
  });
}

// ── Read and validate results ──────────────────────────────────────────────────
function readResults() {
  const data = readJson(RESULTS_TMP);
  if (!data) return null;

  // Validate required fields
  const required = ['run_id', 'dry_run', 'metrics', 'qualified_prospects', 'ran_at'];
  const missing = required.filter(k => !(k in data));
  if (missing.length > 0) {
    log(`Results missing fields: ${missing.join(', ')}`);
  }
  return data;
}

// ── Log results to NDJSON history ─────────────────────────────────────────────
function appendResultsLog(results, goalsSource) {
  const entry = {
    ts: new Date().toISOString(),
    mode: MODE,
    goals_source: goalsSource,
    run_id: results?.run_id || null,
    metrics: results?.metrics || null,
    success: !!results,
  };
  try {
    fs.appendFileSync(RESULTS_LOG, JSON.stringify(entry) + '\n');
  } catch { /* non-fatal */ }
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  log(`Starting LinkedIn Goal Agent (mode: ${MODE})`);

  // 1. Load goals
  let goalsSource = 'unknown';
  let goals;
  try {
    const { source, goals: g } = await loadGoals();
    goals = g;
    goalsSource = source;
    log(`Goals loaded from: ${goalsSource}`);
  } catch (e) {
    log(`FATAL: ${e.message}`);
    process.exit(1);
  }

  // 2. LinkedIn health check
  const liUp = await checkLinkedInHealth();
  log(`LinkedIn service (${LI_API}): ${liUp ? 'UP' : 'DOWN'}`);

  if (MODE === 'test') {
    // Pre-flight test only
    const results = {
      preflight: {
        goals_loaded: !!goals,
        goals_source: goalsSource,
        linkedin_service_up: liUp,
        anthropic_key_set: !!process.env.ANTHROPIC_API_KEY,
        nanobot_dir_exists: fs.existsSync(NANOBOT_DIR),
      }
    };
    console.log('\nPre-flight results:');
    console.log(JSON.stringify(results, null, 2));
    fs.writeFileSync(RESULTS_TMP, JSON.stringify(results, null, 2));
    return results;
  }

  if (!liUp) {
    log('WARNING: LinkedIn service is DOWN. Agent will note this in results.');
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    log('FATAL: ANTHROPIC_API_KEY not set');
    process.exit(1);
  }

  // 3. Build and run agent
  const dryRun = MODE !== 'live';
  const task = buildAgentTask(goals, dryRun);

  log(`Agent task built (${dryRun ? 'DRY RUN' : 'LIVE'}, ${task.length} chars)`);

  const { code } = await spawnNanobot(task);

  // 4. Read results
  const results = readResults();
  if (!results) {
    log('ERROR: Agent did not write results file');
    appendResultsLog(null, goalsSource);
    process.exit(1);
  }

  appendResultsLog(results, goalsSource);

  // 5. Print summary
  const m = results.metrics || {};
  console.log('\n═══ LinkedIn Agent Run Summary ═══');
  console.log(`Mode:               ${MODE}`);
  console.log(`Goals source:       ${goalsSource}`);
  console.log(`LinkedIn service:   ${m.linkedin_service_up ? 'UP' : 'DOWN'}`);
  console.log(`Prospects searched: ${m.prospects_searched ?? '—'}`);
  console.log(`ICP qualified:      ${m.prospects_qualified ?? '—'} (score ≥ 6)`);
  console.log(`Messages drafted:   ${m.messages_drafted ?? '—'}`);
  console.log(`Messages sent:      ${m.messages_sent ?? 0}`);
  console.log(`Avg ICP score:      ${m.avg_icp_score ?? '—'}`);
  console.log(`NanoBot exit code:  ${code}`);
  console.log(`Results file:       ${RESULTS_TMP}`);
  console.log(`History log:        ${RESULTS_LOG}`);
  console.log('══════════════════════════════════\n');

  if (results.qualified_prospects?.length > 0) {
    console.log('Top prospects:');
    results.qualified_prospects.slice(0, 3).forEach(p => {
      console.log(`  • ${p.name} (score: ${p.icp_score}) — ${p.headline?.slice(0, 60)}`);
      if (p.message_drafted) {
        console.log(`    Draft: ${p.message_drafted.slice(0, 80)}...`);
      }
    });
  }

  return results;
}

main().catch(e => {
  console.error(`Fatal error: ${e.message}`);
  process.exit(1);
});
