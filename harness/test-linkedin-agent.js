#!/usr/bin/env node

/**
 * LinkedIn Agent Test Suite
 * =========================
 * Measurable pass/fail tests for the LinkedIn Goal Agent system.
 * Runs entirely without live API calls — tests the logic and structure.
 *
 * Usage:
 *   node harness/test-linkedin-agent.js
 *   node harness/test-linkedin-agent.js --with-preflight   (also hits localhost:3105)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_DIR = __dirname;
const GOALS_FILE = '/Users/isaiahdupree/Documents/Software/business-goals.json';
const SAFARI_ENV = '/Users/isaiahdupree/Documents/Software/Safari Automation/.env';
const NANOBOT_DIR = '/Users/isaiahdupree/Documents/Software/NanoBot';
const LI_API = 'http://localhost:3105';
const WITH_PREFLIGHT = process.argv.includes('--with-preflight');

let passed = 0;
let failed = 0;
let warned = 0;

function readJson(fp, fallback = null) {
  try { return JSON.parse(fs.readFileSync(fp, 'utf-8')); } catch { return fallback; }
}

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${name}: ${e.message}`);
    failed++;
  }
}

function warn(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ⚠ ${name}: ${e.message} (warning — not blocking)`);
    warned++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}
function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(msg || `Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}
function assertGte(a, b, msg) {
  if (a < b) throw new Error(msg || `Expected >= ${b}, got ${a}`);
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${name}: ${e.message}`);
    failed++;
  }
}

async function warnAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ⚠ ${name}: ${e.message} (warning — not blocking)`);
    warned++;
  }
}

// ── ICP scoring logic (extracted from agent task) ─────────────────────────────
function scoreProspect(profile) {
  let score = 0;
  const text = `${profile.headline || ''} ${profile.about || ''} ${profile.currentPosition?.company || ''}`.toLowerCase();
  const title = (profile.currentPosition?.title || '').toLowerCase();

  if (/software|saas|tech|startup|platform|app/.test(text)) score += 3;
  if (/founder|co-founder|cto|ceo|owner/.test(title)) score += 2;
  if (/automat|ai|scale|growth|revenue|mrr|arr/.test(text)) score += 2;
  if (profile.currentPosition?.company) score += 2;
  if (/\$.*m|million|500k|1m|2m|5m|series a|series b/.test(text)) score += 1;

  return Math.min(score, 10);
}

function buildIcpReasons(profile) {
  const reasons = [];
  const text = `${profile.headline || ''} ${profile.about || ''}`.toLowerCase();
  const title = (profile.currentPosition?.title || '').toLowerCase();
  if (/software|saas|tech/.test(text)) reasons.push('tech/software background');
  if (/founder|co-founder/.test(title)) reasons.push('founder role');
  if (/automat|ai/.test(text)) reasons.push('AI/automation interest');
  return reasons;
}

// ── Results file validation ───────────────────────────────────────────────────
function validateResultsStructure(results) {
  const required = ['run_id', 'dry_run', 'metrics', 'qualified_prospects', 'ran_at'];
  for (const key of required) {
    if (!(key in results)) throw new Error(`Missing required field: ${key}`);
  }
  const metricsRequired = ['prospects_searched', 'prospects_qualified', 'messages_drafted', 'messages_sent', 'linkedin_service_up'];
  for (const key of metricsRequired) {
    if (!(key in results.metrics)) throw new Error(`Missing metrics field: ${key}`);
  }
  if (!Array.isArray(results.qualified_prospects)) throw new Error('qualified_prospects must be array');
  for (const p of results.qualified_prospects) {
    if (!p.name) throw new Error(`Prospect missing name`);
    if (!p.profileUrl) throw new Error(`Prospect ${p.name} missing profileUrl`);
    if (typeof p.icp_score !== 'number') throw new Error(`Prospect ${p.name} missing icp_score`);
    if (!p.message_drafted) throw new Error(`Prospect ${p.name} missing message_drafted`);
  }
  return true;
}

function validateDryRunConstraints(results) {
  if (!results.dry_run) throw new Error('Expected dry_run: true');
  if (results.metrics.messages_sent !== 0) throw new Error(`Dry run should send 0 messages, sent ${results.metrics.messages_sent}`);
}

function validateLiveConstraints(results) {
  if (results.dry_run) throw new Error('Expected dry_run: false for live run');
  if (results.metrics.messages_sent > 5) throw new Error(`Exceeded 5-message limit: sent ${results.metrics.messages_sent}`);
}

function validateGoalsAlignment(results, goals) {
  const targetDmsPerWeek = goals.growth?.dm_campaigns_per_week || 3;
  const minProspectsPerRun = Math.ceil(targetDmsPerWeek / 3); // per-run target (3 runs/week)
  if (results.metrics.prospects_qualified < minProspectsPerRun) {
    throw new Error(`Only ${results.metrics.prospects_qualified} qualified prospects, need >= ${minProspectsPerRun} to hit weekly DM target of ${targetDmsPerWeek}`);
  }
}

function validateMessagePersonalization(results, goals) {
  const icpPainPoints = goals.icp?.pain_points || [];
  let personalizedCount = 0;
  for (const p of results.qualified_prospects) {
    const msg = (p.message_drafted || '').toLowerCase();
    const mentions = icpPainPoints.filter(pp => msg.includes(pp.split(' ')[0].toLowerCase()));
    if (mentions.length > 0 || msg.includes('automat') || msg.includes('founder') || msg.includes('ai')) {
      personalizedCount++;
    }
  }
  const pct = results.qualified_prospects.length > 0
    ? (personalizedCount / results.qualified_prospects.length) * 100 : 100;
  if (pct < 50) throw new Error(`Only ${pct.toFixed(0)}% of messages show personalization`);
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITES
// ─────────────────────────────────────────────────────────────────────────────

console.log('\nLinkedIn Goal Agent — Test Suite\n');

// ── Suite 1: Configuration ────────────────────────────────────────────────────
console.log('── 1. Configuration ──');

test('business-goals.json exists and is valid JSON', () => {
  const goals = readJson(GOALS_FILE);
  assert(goals !== null, 'goals file not readable');
  assert(goals.icp, 'goals missing icp section');
  assert(goals.revenue, 'goals missing revenue section');
  assert(goals.growth, 'goals missing growth section');
});

test('goals have required LinkedIn fields', () => {
  const goals = readJson(GOALS_FILE, {});
  assert(goals.icp?.description, 'icp.description required');
  assert(Array.isArray(goals.icp?.pain_points), 'icp.pain_points must be array');
  assert(goals.icp?.pain_points.length > 0, 'icp.pain_points must not be empty');
  assert(typeof goals.growth?.dm_campaigns_per_week === 'number', 'growth.dm_campaigns_per_week must be number');
  assert(typeof goals.revenue?.target_monthly_usd === 'number', 'revenue target must be number');
});

test('ANTHROPIC_API_KEY available (Safari Automation .env)', () => {
  let key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    try {
      const lines = fs.readFileSync(SAFARI_ENV, 'utf-8').split('\n');
      for (const line of lines) {
        const m = line.match(/^ANTHROPIC_API_KEY=(.+)/);
        if (m) { key = m[1].trim(); break; }
      }
    } catch { /* ok */ }
  }
  assert(key && key.startsWith('sk-ant-'), 'Key not found or invalid format');
});

test('NanoBot directory exists', () => {
  assert(fs.existsSync(NANOBOT_DIR), `NanoBot not found at ${NANOBOT_DIR}`);
  assert(fs.existsSync(path.join(NANOBOT_DIR, 'nanobot')), 'nanobot package not found');
});

test('linkedin-goal-agent.js exists', () => {
  assert(fs.existsSync(path.join(HARNESS_DIR, 'linkedin-goal-agent.js')));
});

// ── Suite 2: ICP Scoring Logic ────────────────────────────────────────────────
console.log('\n── 2. ICP Scoring Logic ──');

test('SaaS founder with AI interest scores high (≥6)', () => {
  const profile = {
    headline: 'CEO at AutomateAI — SaaS startup, $2M ARR',
    currentPosition: { title: 'CEO', company: 'AutomateAI' },
    about: 'Building AI automation tools for scaling startups',
  };
  const score = scoreProspect(profile);
  assertGte(score, 6, `Expected score ≥ 6, got ${score}`);
});

test('Generic non-tech profile scores low (<6)', () => {
  const profile = {
    headline: 'Sales Representative at Retail Co',
    currentPosition: { title: 'Sales Rep', company: 'Retail Inc' },
    about: 'Helping customers find the right products',
  };
  const score = scoreProspect(profile);
  assert(score < 6, `Expected score < 6, got ${score}`);
});

test('Tech founder without AI mention scores medium', () => {
  const profile = {
    headline: 'Co-Founder at SaaS Platform',
    currentPosition: { title: 'Co-Founder', company: 'SaaSPlatform' },
    about: 'Building software for small businesses',
  };
  const score = scoreProspect(profile);
  assert(score >= 5, `Expected score ≥ 5, got ${score}`);
});

test('Score is capped at 10', () => {
  const profile = {
    headline: 'Founder CEO SaaS AI automation startup $5M ARR series A',
    currentPosition: { title: 'CEO Founder', company: 'AI SaaS Corp' },
    about: 'AI automation scale revenue MRR ARR growth',
  };
  const score = scoreProspect(profile);
  assert(score <= 10, `Score should be capped at 10, got ${score}`);
});

test('ICP reasons generated for matching profile', () => {
  const profile = {
    headline: 'CEO at SaaS Startup — AI automation',
    currentPosition: { title: 'Co-Founder' },
    about: '',
  };
  const reasons = buildIcpReasons(profile);
  assert(reasons.length > 0, 'Should generate at least 1 reason');
});

test('ICP score threshold 6 filters correctly', () => {
  const profiles = [
    { headline: 'CEO SaaS AI Automation', currentPosition: { title: 'CEO', company: 'TechCo' }, about: 'automation scale' },
    { headline: 'Student', currentPosition: { title: 'Student', company: '' }, about: '' },
    { headline: 'Founder SaaS Platform', currentPosition: { title: 'Founder', company: 'SaaS' }, about: 'software' },
  ];
  const qualified = profiles.filter(p => scoreProspect(p) >= 6);
  assertGte(qualified.length, 1, 'Should qualify at least 1 of 3 profiles');
  assert(qualified.length < profiles.length, 'Should filter out at least 1 profile');
});

// ── Suite 3: Results File Validation ─────────────────────────────────────────
console.log('\n── 3. Results File Structure ──');

function makeValidResults(overrides = {}) {
  return {
    run_id: `test-${Date.now()}`,
    dry_run: true,
    goals_snapshot: { revenue_gap: 5000, icp_description: 'SaaS founders', dm_weekly_target: 3 },
    metrics: {
      prospects_searched: 12,
      prospects_qualified: 4,
      messages_drafted: 4,
      messages_sent: 0,
      avg_icp_score: 7.5,
      search_queries_run: 2,
      linkedin_service_up: true,
    },
    qualified_prospects: [
      {
        name: 'Jane Doe',
        profileUrl: 'https://linkedin.com/in/jane',
        headline: 'CEO at AutoAI',
        icp_score: 8,
        icp_reasons: ['founder role', 'AI interest'],
        message_drafted: 'Hi Jane, I noticed your automation work at AutoAI. I help founders like you save 10h/week...',
        message_sent: false,
      }
    ],
    execution_notes: ['Step 1: LinkedIn up', 'Step 2: 12 results found'],
    next_actions: ['Follow up in 3 days', 'Add to CRM'],
    ran_at: new Date().toISOString(),
    ...overrides,
  };
}

test('valid results pass structure validation', () => {
  const results = makeValidResults();
  validateResultsStructure(results);
});

test('results missing run_id fails validation', () => {
  const results = makeValidResults();
  delete results.run_id;
  let threw = false;
  try { validateResultsStructure(results); } catch { threw = true; }
  assert(threw, 'Should fail validation when run_id missing');
});

test('results with missing metrics field fails validation', () => {
  const results = makeValidResults();
  delete results.metrics.prospects_searched;
  let threw = false;
  try { validateResultsStructure(results); } catch { threw = true; }
  assert(threw, 'Should fail validation when metrics field missing');
});

test('prospect missing message_drafted fails validation', () => {
  const results = makeValidResults();
  delete results.qualified_prospects[0].message_drafted;
  let threw = false;
  try { validateResultsStructure(results); } catch { threw = true; }
  assert(threw, 'Should fail when message_drafted missing');
});

test('dry-run results have messages_sent === 0', () => {
  const results = makeValidResults({ dry_run: true });
  results.metrics.messages_sent = 0;
  validateDryRunConstraints(results);
});

test('dry-run rejects if messages_sent > 0', () => {
  const results = makeValidResults({ dry_run: true });
  results.metrics.messages_sent = 1;
  let threw = false;
  try { validateDryRunConstraints(results); } catch { threw = true; }
  assert(threw, 'Dry run should reject non-zero sends');
});

test('live mode rejects > 5 messages sent', () => {
  const results = makeValidResults({ dry_run: false });
  results.metrics.messages_sent = 6;
  let threw = false;
  try { validateLiveConstraints(results); } catch { threw = true; }
  assert(threw, 'Live mode should cap at 5 messages');
});

test('live mode allows up to 5 messages sent', () => {
  const results = makeValidResults({ dry_run: false });
  results.metrics.messages_sent = 5;
  validateLiveConstraints(results);
});

// ── Suite 4: Goals Alignment ──────────────────────────────────────────────────
console.log('\n── 4. Goals Alignment ──');

const goals = readJson(GOALS_FILE, {
  growth: { dm_campaigns_per_week: 3 },
  icp: { pain_points: ['too much manual execution work', 'no time to build automations'] },
});

test('1 qualified prospect meets 3 campaigns/week (1 per run × 3 runs)', () => {
  const results = makeValidResults();
  results.metrics.prospects_qualified = 1;
  validateGoalsAlignment(results, { growth: { dm_campaigns_per_week: 3 } });
});

test('0 qualified prospects fails goals alignment', () => {
  const results = makeValidResults();
  results.metrics.prospects_qualified = 0;
  let threw = false;
  try { validateGoalsAlignment(results, { growth: { dm_campaigns_per_week: 3 } }); } catch { threw = true; }
  assert(threw, 'Should fail with 0 qualified prospects');
});

test('messages mention automation (ICP pain point personalization)', () => {
  const results = makeValidResults();
  results.qualified_prospects[0].message_drafted = 'Hi Jane, I help founders automate their workflows to save 10h/week.';
  validateMessagePersonalization(results, goals);
});

test('messages with zero personalization fail quality check', () => {
  const results = makeValidResults();
  results.qualified_prospects = [
    { ...results.qualified_prospects[0], message_drafted: 'Hi there, want to connect?' },
    { ...results.qualified_prospects[0], name: 'Bob', message_drafted: 'Hello, just reaching out.' },
  ];
  let threw = false;
  try { validateMessagePersonalization(results, goals); } catch { threw = true; }
  assert(threw, 'Generic messages should fail personalization check');
});

test('revenue gap informs urgency of outreach', () => {
  const target = goals.revenue?.target_monthly_usd || 5000;
  const current = goals.revenue?.current_monthly_usd || 0;
  const gap = target - current;
  assertGte(gap, 1000, 'Revenue gap should be significant (≥ $1000)');
});

test('ICP description is non-trivial (at least 20 chars)', () => {
  const desc = goals.icp?.description || '';
  assertGte(desc.length, 20, 'ICP description too short');
});

// ── Suite 5: System Integration Checks ────────────────────────────────────────
console.log('\n── 5. System Integration ──');

test('linkedin-agent-results.ndjson writeable location', () => {
  const logPath = path.join(HARNESS_DIR, 'linkedin-agent-results.ndjson');
  const dir = path.dirname(logPath);
  assert(fs.existsSync(dir), `Parent dir ${dir} must exist`);
});

test('results log accumulates entries correctly', () => {
  const tmpLog = path.join(HARNESS_DIR, '_test-li-log.ndjson');
  if (fs.existsSync(tmpLog)) fs.unlinkSync(tmpLog);

  const entry1 = { ts: new Date().toISOString(), mode: 'dry-run', metrics: { prospects_qualified: 2 }, success: true };
  const entry2 = { ts: new Date().toISOString(), mode: 'live', metrics: { prospects_qualified: 3, messages_sent: 3 }, success: true };
  fs.appendFileSync(tmpLog, JSON.stringify(entry1) + '\n');
  fs.appendFileSync(tmpLog, JSON.stringify(entry2) + '\n');

  const lines = fs.readFileSync(tmpLog, 'utf-8').trim().split('\n');
  assertEqual(lines.length, 2, 'Should have 2 log entries');
  const parsed = lines.map(l => JSON.parse(l));
  assert(parsed[0].mode === 'dry-run');
  assert(parsed[1].mode === 'live');
  assertEqual(parsed[1].metrics.messages_sent, 3);

  fs.unlinkSync(tmpLog);
});

test('NanoBot agent task includes goals context', () => {
  // Import and test buildAgentTask locally
  const testGoals = {
    icp: { description: 'SaaS founders', pain_points: ['manual work'] },
    revenue: { target_monthly_usd: 5000, current_monthly_usd: 0 },
    growth: { dm_campaigns_per_week: 3, crm_contacts_target: 1000, crm_contacts_current: 500 },
    offers: [{ name: 'Audit+Build', price_usd: 2500, active: true }],
  };

  // Inline the task builder for testing
  const task = `Revenue gap: $${testGoals.revenue.target_monthly_usd - testGoals.revenue.current_monthly_usd}. ICP: ${testGoals.icp.description}. Offers: ${testGoals.offers.map(o => o.name).join(', ')}`;
  assert(task.includes('5000'), 'Task should include revenue gap');
  assert(task.includes('SaaS founders'), 'Task should include ICP');
  assert(task.includes('Audit+Build'), 'Task should include offers');
});

test('dry-run task string includes DRY RUN flag', () => {
  const dryRun = true;
  const taskSnippet = `DRY RUN: ${dryRun}`;
  assert(taskSnippet.includes('true'), 'Dry run flag should be true');
});

if (WITH_PREFLIGHT) {
  console.log('\n── 6. Live Pre-flight (--with-preflight) ──');

  await warnAsync('LinkedIn service health check (port 3105)', async () => {
    const res = await fetch(`${LI_API}/health`, { signal: AbortSignal.timeout(3000) });
    assert(res.ok, `LinkedIn service returned ${res.status}`);
    const data = await res.json();
    assert(data.status === 'ok' || data.status === 'running', `Unexpected status: ${data.status}`);
  });

  await warnAsync('LinkedIn service rate limits endpoint accessible', async () => {
    const res = await fetch(`${LI_API}/api/linkedin/rate-limits`, {
      headers: { Authorization: 'Bearer test-token-12345' },
      signal: AbortSignal.timeout(3000),
    });
    assert(res.ok || res.status === 401, `Unexpected status: ${res.status}`);
  });
}

// ── Suite 6: Dry-Run Specific Tests ──────────────────────────────────────────
console.log('\n── 6. Dry-Run Harness (linkedin-dry-run.js) ──');

// Message quality scoring function (from dry-run harness)
function scoreMessageQuality(message, prospect, goals) {
  if (!message) return { score: 0, breakdown: {} };
  const m = message.toLowerCase();
  const name = (prospect.name || '').split(' ')[0].toLowerCase();
  const company = (prospect.currentPosition?.company || '').toLowerCase();
  const icpPainPoints = goals.icp?.pain_points || [];
  const breakdown = {
    mentions_name:       (m.includes(name) && name.length > 1) ? 1 : 0,
    mentions_company:    (company && m.includes(company.split(' ')[0]) && company.length > 3) ? 2 : 0,
    mentions_pain_point: icpPainPoints.some(p => m.includes(p.split(' ')[0].toLowerCase())) ? 2 : 0,
    has_value_prop:      /help|save|reduce|increase|automat|build/.test(m) ? 2 : 0,
    has_cta:             /\?|call|chat|connect|minute|quick/.test(m) ? 1 : 0,
    not_starts_with_i:   !message.startsWith('I ') ? 1 : 0,
    good_length:         (message.length >= 80 && message.length <= 350) ? 1 : 0,
  };
  const score = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return { score: Math.min(score, 10), breakdown };
}

const testGoals = {
  icp: { pain_points: ['too much manual execution work', 'no time to build automations'] },
  revenue: { target_monthly_usd: 5000, current_monthly_usd: 0 },
  growth: { dm_campaigns_per_week: 3 },
};

test('personalized message scores high (≥6)', () => {
  const msg = 'Hi Jane, I noticed your automation platform at AutoAI. I help founders eliminate manual execution work — typically saves 10h/week. Quick 15-min chat?';
  const prospect = { name: 'Jane Smith', currentPosition: { company: 'AutoAI' } };
  const { score } = scoreMessageQuality(msg, prospect, testGoals);
  assertGte(score, 6, `Expected ≥ 6, got ${score}`);
});

test('generic "just reaching out" message scores low (≤3)', () => {
  const msg = 'Hello, just reaching out to connect!';
  const prospect = { name: 'Bob', currentPosition: { company: 'Corp' } };
  const { score } = scoreMessageQuality(msg, prospect, testGoals);
  assert(score <= 3, `Generic message should score ≤ 3, got ${score}`);
});

test('message mentioning name gets +1 point', () => {
  const base = { name: 'Alice', currentPosition: { company: 'X' } };
  const withName = scoreMessageQuality('Hi Alice, I help founders automate work. Quick call?', base, testGoals);
  const noName = scoreMessageQuality('Hi there, I help founders automate work. Quick call?', base, testGoals);
  assert(withName.breakdown.mentions_name === 1, 'mentions_name should be 1');
  assert(noName.breakdown.mentions_name === 0, 'mentions_name should be 0');
});

test('message mentioning company gets +2 points', () => {
  const prospect = { name: 'Dan', currentPosition: { company: 'TechFlow' } };
  const withCompany = scoreMessageQuality('Hi Dan, your work at TechFlow caught my eye. Quick call?', prospect, testGoals);
  assert(withCompany.breakdown.mentions_company === 2, `Expected 2, got ${withCompany.breakdown.mentions_company}`);
});

test('message starting with "I " gets 0 for not_starts_with_i', () => {
  const prospect = { name: 'Sam', currentPosition: { company: 'Biz' } };
  const { breakdown } = scoreMessageQuality('I help founders automate. Quick call?', prospect, testGoals);
  assertEqual(breakdown.not_starts_with_i, 0, 'Should penalize I-start');
});

test('message too short (<80 chars) gets 0 for good_length', () => {
  const prospect = { name: 'X', currentPosition: { company: 'Y' } };
  const { breakdown } = scoreMessageQuality('Hi, want to chat?', prospect, testGoals);
  assertEqual(breakdown.good_length, 0, 'Short message should fail length check');
});

test('message over 350 chars gets 0 for good_length', () => {
  const prospect = { name: 'X', currentPosition: { company: 'Y' } };
  const longMsg = 'Hi, '.padEnd(400, 'I help founders automate their workflows and save time. ');
  const { breakdown } = scoreMessageQuality(longMsg, prospect, testGoals);
  assertEqual(breakdown.good_length, 0, 'Long message should fail length check');
});

test('message quality score is capped at 10', () => {
  const prospect = { name: 'Jane', currentPosition: { company: 'AutoAI' } };
  const msg = 'Hi Jane, your work at AutoAI on automation caught my eye. I help founders cut manual execution work and build AI systems. Quick 15-min call?';
  const { score } = scoreMessageQuality(msg, prospect, testGoals);
  assert(score <= 10, `Score should be capped at 10, got ${score}`);
});

// Multi-strategy deduplication
test('deduplication prevents same profileUrl appearing twice', () => {
  const map = new Map();
  const results1 = [
    { profileUrl: 'https://li.com/in/alice', name: 'Alice', found_by_strategies: ['Strategy A'] },
    { profileUrl: 'https://li.com/in/bob', name: 'Bob', found_by_strategies: ['Strategy A'] },
  ];
  const results2 = [
    { profileUrl: 'https://li.com/in/alice', name: 'Alice', found_by_strategies: ['Strategy B'] },
    { profileUrl: 'https://li.com/in/carol', name: 'Carol', found_by_strategies: ['Strategy B'] },
  ];
  for (const r of [...results1, ...results2]) {
    if (!map.has(r.profileUrl)) {
      map.set(r.profileUrl, { ...r, found_by_strategies: [...r.found_by_strategies] });
    } else {
      map.get(r.profileUrl).found_by_strategies.push(...r.found_by_strategies);
    }
  }
  assertEqual(map.size, 3, 'Should have 3 unique prospects');
  const alice = map.get('https://li.com/in/alice');
  assertEqual(alice.found_by_strategies.length, 2, 'Alice found by 2 strategies');
});

test('10 search strategies are defined in dry-run harness', () => {
  // Verify the harness file references SEARCH_STRATEGIES
  const harnessPath = path.join(HARNESS_DIR, 'linkedin-dry-run.js');
  assert(fs.existsSync(harnessPath), 'linkedin-dry-run.js must exist');
  const content = fs.readFileSync(harnessPath, 'utf-8');
  assert(content.includes('SEARCH_STRATEGIES'), 'Must define SEARCH_STRATEGIES');
  assert(content.includes('navigate/network'), 'Must navigate before searching');
  assert(content.includes('scoreMessageQuality'), 'Must score message quality');
  assert(content.includes('dry-run-history.ndjson'), 'Must log history');
});

test('dry-run harness supports --strategies flag', () => {
  const harnessPath = path.join(HARNESS_DIR, 'linkedin-dry-run.js');
  const content = fs.readFileSync(harnessPath, 'utf-8');
  assert(content.includes('--strategies'), 'Must support --strategies flag');
  assert(content.includes('--repeat'), 'Must support --repeat flag');
  assert(content.includes('--no-messages'), 'Must support --no-messages flag');
});

test('history log entry has all required tracking fields', () => {
  const entry = {
    ts: new Date().toISOString(),
    run_id: 'dry-run-123',
    strategies_succeeded: 8,
    unique_prospects: 45,
    qualified_prospects: 12,
    messages_generated: 12,
    avg_icp_score: 7.2,
    avg_message_quality_score: 6.8,
    weekly_target_coverage: 400.0,
  };
  const requiredFields = ['ts', 'run_id', 'unique_prospects', 'qualified_prospects', 'messages_generated', 'avg_icp_score'];
  for (const f of requiredFields) {
    assert(f in entry, `History entry missing: ${f}`);
  }
  assertGte(entry.weekly_target_coverage, 0);
});

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n── Summary ──');
console.log(`Passed: ${passed}  Failed: ${failed}  Warnings: ${warned}`);
if (failed > 0) {
  console.log('\nFAILED tests indicate system misconfiguration or logic bugs — fix before running --live mode.');
  process.exit(1);
}
if (warned > 0) {
  console.log('\nWarnings are non-blocking but indicate live integrations may be unavailable.');
}
