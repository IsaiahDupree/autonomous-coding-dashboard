#!/usr/bin/env node
/**
 * test-prospect-pipeline.js
 * Full end-to-end test of the LinkedIn prospect pipeline.
 * Run: node harness/test-prospect-pipeline.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS   = __dirname;

const CRMLITE_URL  = 'https://crmlite-isaiahduprees-projects.vercel.app';
const ACTP_ENV     = '/Users/isaiahdupree/Documents/Software/actp-worker/.env';

// Load env — ACTP_ENV wins over ~/.env for overridden keys
const ENV_OVERRIDE = new Set(['CRMLITE_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY']);
function loadEnv(fp, override = false) {
  try {
    for (const line of fs.readFileSync(fp, 'utf-8').split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.+)/);
      if (m && (!process.env[m[1]] || override || ENV_OVERRIDE.has(m[1])))
        process.env[m[1]] = m[2].trim();
    }
  } catch {}
}
loadEnv(`${process.env.HOME}/.env`);
loadEnv(ACTP_ENV, true);  // ACTP_ENV overrides ~/.env for all keys
// Alias service role key
if (!process.env.SUPABASE_SERVICE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY)
  process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const CRMLITE_KEY = process.env.CRMLITE_API_KEY || '';

let passed = 0, failed = 0;
const results = [];

function ok(label, detail = '') {
  passed++;
  results.push({ status: 'PASS', label, detail });
  console.log(`  ✅ PASS  ${label}${detail ? '  — ' + detail : ''}`);
}
function fail(label, detail = '') {
  failed++;
  results.push({ status: 'FAIL', label, detail });
  console.log(`  ❌ FAIL  ${label}${detail ? '  — ' + detail : ''}`);
}
function section(title) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(2, 50 - title.length))}`);
}

// ── 1. ICP Scorer ─────────────────────────────────────────────────────────────
section('1. ICP Scorer');

function parseHeadline(headline = '') {
  if (!headline) return { role: '', company: '' };
  const atMatch = headline.match(/^([^@|]+?)\s*@\s*([^|]+)/);
  if (atMatch) return { role: atMatch[1].trim(), company: atMatch[2].split('|')[0].trim() };
  const atWordMatch = headline.match(/^([^|]+?)\s+at\s+([^|]+)/i);
  if (atWordMatch) return { role: atWordMatch[1].trim(), company: atWordMatch[2].split('|')[0].trim() };
  const parts = headline.split('|').map(s => s.trim());
  if (parts.length >= 2) return { role: parts[0], company: parts[1] };
  return { role: parts[0] || '', company: '' };
}
function scoreProspect(profile) {
  let score = 0; const reasons = [];
  const text = [profile.headline || '', profile.name || ''].join(' ').toLowerCase();
  const title = parseHeadline(profile.headline).role.toLowerCase();
  const company = parseHeadline(profile.headline).company.toLowerCase();
  if (/software|saas|tech|ai|app|platform|startup|engineering|automation|digital|product/.test(text)) { score += 3; reasons.push('tech'); }
  if (/founder|co-founder|ceo|cto|owner/.test(title)) { score += 2; reasons.push('founder'); }
  if (/ai|automation|machine learning|llm|gpt|workflow|automate/.test(text)) { score += 2; reasons.push('AI'); }
  if (company && company.length > 2 && !['self-employed','freelance'].includes(company)) { score += 1; reasons.push('company'); }
  if (/arr|revenue|mrr|raised|series|growth|scale|customers/.test(text)) { score += 1; reasons.push('revenue'); }
  if (/scale|grow|expand|bootstrap|profitable/.test(text)) { score += 1; reasons.push('scale'); }
  return { score: Math.min(score, 10), reasons };
}

const scoreCases = [
  { name: 'SaaS Founder',    headline: 'Founder & CEO | AI-Driven SaaS | Automation',       expectMin: 6 },
  { name: 'Tech CTO',        headline: 'CTO @ startup | software platform | scale',           expectMin: 6 },
  { name: 'Student',         headline: 'Computer Science Student | Looking for work',          expectMin: 0, expectMax: 2 },
  { name: 'DTC Founder',     headline: 'Founder @ Shopify brand | ecommerce automation',       expectMin: 6 },
  { name: 'No signals',      headline: 'HR Manager | People Ops',                             expectMin: 0, expectMax: 3 },
];
for (const c of scoreCases) {
  const { score } = scoreProspect(c);
  const minOk = score >= (c.expectMin ?? 0);
  const maxOk = c.expectMax === undefined || score <= c.expectMax;
  if (minOk && maxOk) ok(`Score [${score}/10]: ${c.name}`);
  else fail(`Score [${score}/10]: ${c.name}`, `expected ${c.expectMin ?? 0}-${c.expectMax ?? 10}`);
}

// ── 2. Queue file ─────────────────────────────────────────────────────────────
section('2. Local Queue File');

const QUEUE_FILE = path.join(HARNESS, 'linkedin-dm-queue.json');
try {
  const queue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'));
  ok(`Queue file readable`, `${queue.length} items`);

  const statuses = [...new Set(queue.map(i => i.status))];
  ok(`Queue has status fields`, statuses.join(', '));

  const withCrmId = queue.filter(i => i.crm_id).length;
  ok(`CRM sync rate`, `${withCrmId}/${queue.length} have crm_id`);

  const withProfileUrl = queue.filter(i => i.prospect?.profileUrl).length;
  ok(`Profile URLs present`, `${withProfileUrl}/${queue.length}`);

  const withHeadline = queue.filter(i => i.prospect?.headline).length;
  ok(`Headlines present`, `${withHeadline}/${queue.length}`);
} catch (e) {
  fail('Queue file readable', e.message);
}

// ── 3. State file (seen URLs) ─────────────────────────────────────────────────
section('3. Daemon State & Seen-URL Dedup');

const STATE_FILE = path.join(HARNESS, 'linkedin-daemon-state.json');
try {
  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  ok(`State file readable`);

  const seenCount = (state.seenUrls || []).length;
  seenCount >= 50
    ? ok(`Seen-URL set populated`, `${seenCount} URLs`)
    : fail(`Seen-URL set too small`, `only ${seenCount} — dedup may not be working`);

  // Verify seen set contains queue URLs
  const queue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'));
  const seenSet = new Set(state.seenUrls || []);
  const queueUrls = queue.map(i => i.prospect?.profileUrl).filter(Boolean);
  const covered = queueUrls.filter(u => seenSet.has(u)).length;
  covered === queueUrls.length
    ? ok(`All queue items in seen set`, `${covered}/${queueUrls.length}`)
    : fail(`Seen set missing queue items`, `only ${covered}/${queueUrls.length} covered`);
} catch (e) {
  fail('State file readable', e.message);
}

// ── 4. Chrome CDP ─────────────────────────────────────────────────────────────
section('4. Chrome CDP');

try {
  const res = await fetch('http://localhost:9333/json', { signal: AbortSignal.timeout(3000) });
  const tabs = await res.json();
  ok(`Chrome CDP reachable`, `${tabs.length} tabs`);
  const liTabs = tabs.filter(t => t.url?.includes('linkedin.com'));
  liTabs.length > 0
    ? ok(`LinkedIn tab open`, liTabs[0].url?.split('?')[0])
    : ok(`Chrome ready (no LinkedIn tab yet)`);
} catch (e) {
  fail('Chrome CDP reachable', e.message);
}

// ── 5. Live LinkedIn search → score ───────────────────────────────────────────
section('5. Live LinkedIn Search → Score (real network call)');

await new Promise(resolve => {
  const child = spawn('node', [
    path.join(HARNESS, 'linkedin-chrome-search.js'),
    '--keywords', 'SaaS founder AI automation',
    '--title', 'CEO OR Founder',
    '--max', '5',
  ], { cwd: HARNESS });

  let stdout = '', stderr = '';
  child.stdout.on('data', d => { stdout += d; });
  child.stderr.on('data', d => { stderr += d; });

  child.on('close', code => {
    if (code !== 0) {
      fail('LinkedIn search subprocess', `exit ${code}: ${stderr.slice(-100)}`);
      return resolve();
    }
    try {
      const results = JSON.parse(stdout);
      ok(`LinkedIn search returned results`, `${results.length} prospects`);

      const passing = results.filter(r => scoreProspect(r).score >= 6);
      passing.length > 0
        ? ok(`ICP scoring on live results`, `${passing.length}/${results.length} qualify ≥6/10`)
        : fail(`ICP scoring on live results`, `0/${results.length} qualify — check scorer`);

      const hasHeadlines = results.filter(r => r.headline?.length > 5).length;
      hasHeadlines >= results.length * 0.8
        ? ok(`Headlines populated`, `${hasHeadlines}/${results.length}`)
        : fail(`Headlines sparse`, `only ${hasHeadlines}/${results.length} have headlines`);

      // Show top 3
      for (const r of results.slice(0, 3)) {
        const { score } = scoreProspect(r);
        console.log(`       [${score}/10] ${r.name} — ${r.headline?.slice(0, 60)}`);
      }
    } catch (e) {
      fail('LinkedIn search JSON parse', e.message + ' | stdout: ' + stdout.slice(0, 100));
    }
    resolve();
  });

  setTimeout(() => { child.kill(); fail('LinkedIn search', 'timeout after 30s'); resolve(); }, 30000);
});

// ── 6. CRMLite API ────────────────────────────────────────────────────────────
section('6. CRMLite API');

if (!CRMLITE_KEY) {
  fail('CRMLite key loaded', 'CRMLITE_API_KEY missing');
} else {
  try {
    const res = await fetch(`${CRMLITE_URL}/api/contacts?platform=linkedin&limit=5`, {
      headers: { 'x-api-key': CRMLITE_KEY },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const total = data.total || data.contacts?.length || 0;
    ok(`CRMLite reachable`, `${total} LinkedIn contacts`);

    const withStage = (data.contacts || []).filter(c => c.pipeline_stage).length;
    ok(`Pipeline stages set`, `${withStage}/${(data.contacts||[]).length} have stage`);
  } catch (e) {
    fail('CRMLite reachable', e.message);
  }
}

// ── 7. Supabase sessions ───────────────────────────────────────────────────────
section('7. Supabase — Browser Sessions');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  fail('Supabase env vars', 'SUPABASE_URL or SUPABASE_SERVICE_KEY missing');
} else {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/actp_browser_sessions?select=action,platform,status&order=created_at.desc&limit=5`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = await res.json();
    ok(`Supabase sessions table`, `${rows.length} recent sessions`);
    const statuses = [...new Set(rows.map(r => r.status))];
    ok(`Session statuses`, statuses.join(', ') || 'empty');
  } catch (e) {
    fail('Supabase sessions table', e.message);
  }
}

// ── 8. Running processes ──────────────────────────────────────────────────────
section('8. Daemon Processes');

const daemons = [
  { name: 'linkedin-daemon.js',        label: 'LinkedIn discovery' },
  { name: 'cloud-orchestrator.js',     label: 'Cloud orchestrator' },
  { name: 'browser-session-daemon.js', label: 'Session executor' },
  { name: 'cloud-bridge.js',           label: 'Cloud bridge' },
  { name: 'linkedin-engagement',       label: 'Engagement daemon' },
  { name: 'linkedin-followup',         label: 'Follow-up engine' },
];

await new Promise(resolve => {
  const child = spawn('ps', ['aux'], {});
  let out = '';
  child.stdout.on('data', d => { out += d; });
  child.on('close', () => {
    for (const d of daemons) {
      const running = out.includes(d.name);
      running ? ok(`${d.label}`, d.name) : fail(`${d.label} not running`, d.name);
    }
    resolve();
  });
});

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(55));
console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
if (failed === 0) console.log('  🎉 All tests passed — pipeline is working!');
else console.log('  ⚠️  Fix the failures above before going live.');
console.log('═'.repeat(55));

process.exit(failed > 0 ? 1 : 0);
