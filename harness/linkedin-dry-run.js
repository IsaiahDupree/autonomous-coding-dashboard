#!/usr/bin/env node

/**
 * LinkedIn Extensive Dry-Run Harness
 * ====================================
 * Calls the LinkedIn API directly (no NanoBot spawning for mechanics).
 * Runs 10 ICP search strategies, enriches top prospects, generates AI messages,
 * scores message quality, and produces a full human-reviewable report.
 *
 * Usage:
 *   node harness/linkedin-dry-run.js                  # full run
 *   node harness/linkedin-dry-run.js --strategies 3   # first N strategies only
 *   node harness/linkedin-dry-run.js --max-prospects 5 # cap enrichment
 *   node harness/linkedin-dry-run.js --no-messages    # skip message generation
 *   node harness/linkedin-dry-run.js --repeat 3       # run N times (1 per minute)
 *
 * Output:
 *   /tmp/linkedin-dry-run-{timestamp}.json   full results
 *   harness/linkedin-dry-run-history.ndjson  run history log
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_DIR = __dirname;
const LOGS_DIR = path.join(HARNESS_DIR, 'logs');
const HISTORY_LOG = path.join(HARNESS_DIR, 'linkedin-dry-run-history.ndjson');
const GOALS_FILE = '/Users/isaiahdupree/Documents/Software/business-goals.json';
const SAFARI_ENV = '/Users/isaiahdupree/Documents/Software/Safari Automation/.env';

const LI = 'http://localhost:3105';
const LI_TOKEN = process.env.LINKEDIN_AUTH_TOKEN || 'test-token-12345';
const HEADERS = { 'Authorization': `Bearer ${LI_TOKEN}`, 'Content-Type': 'application/json' };

// CLI args
const args = process.argv.slice(2);
function getArg(name, fallback) {
  const idx = args.indexOf(name);
  return (idx !== -1 && args[idx + 1] !== undefined) ? args[idx + 1] : String(fallback);
}
const MAX_STRATEGIES = parseInt(getArg('--strategies', '10'), 10);
const MAX_PROSPECTS  = parseInt(getArg('--max-prospects', '20'), 10);
const REPEAT_RUNS    = parseInt(getArg('--repeat', '1'), 10);
const SKIP_MESSAGES  = args.includes('--no-messages');

// ── ICP search strategies ─────────────────────────────────────────────────────
const SEARCH_STRATEGIES = [
  {
    name: 'AI SaaS Founders',
    keywords: 'AI automation SaaS founder',
    title: 'CEO OR Founder OR CTO',
    connectionDegree: '2nd',
    rationale: 'Core ICP — tech founders building with AI',
  },
  {
    name: 'Software Startup CTOs',
    keywords: 'software startup engineering automation',
    title: 'CTO OR VP Engineering OR Technical Co-Founder',
    connectionDegree: '2nd',
    rationale: 'Technical decision-makers needing dev automation',
  },
  {
    name: 'Marketing Tech Operators',
    keywords: 'marketing automation startup growth',
    title: 'CEO OR Founder OR Head of Growth',
    connectionDegree: '2nd',
    rationale: 'MarTech operators who buy automation tools',
  },
  {
    name: 'API Integration Builders',
    keywords: 'API integration developer tools founder',
    title: 'CEO OR Founder OR Product Lead',
    connectionDegree: '2nd',
    rationale: 'Integration-focused founders — direct pain fit',
  },
  {
    name: 'Scale-Up Operators',
    keywords: 'startup scale Series A operations',
    title: 'COO OR VP Operations OR Founder',
    connectionDegree: '2nd',
    rationale: 'Scaling companies needing process automation',
  },
  {
    name: 'No-Code / Low-Code Founders',
    keywords: 'no-code automation platform founder SaaS',
    title: 'CEO OR Founder',
    connectionDegree: '2nd',
    rationale: 'Adjacent ICP — already automation-minded',
  },
  {
    name: 'Digital Agency Owners',
    keywords: 'digital agency AI automation owner',
    title: 'Owner OR Founder OR CEO',
    connectionDegree: '2nd',
    rationale: 'Agency owners who sell automation to clients',
  },
  {
    name: 'Content Creator Tools',
    keywords: 'content creator AI tools solopreneur',
    title: 'Founder OR Creator OR CEO',
    connectionDegree: '2nd',
    rationale: 'Creator-economy ICP needing publishing automation',
  },
  {
    name: 'AI Consultant / Advisor',
    keywords: 'AI consulting advisor automation startup',
    title: 'Consultant OR Advisor OR Founder',
    connectionDegree: '2nd',
    rationale: 'Potential referrals + clients in adjacent space',
  },
  {
    name: 'Bootstrapped SaaS Founders',
    keywords: 'bootstrapped SaaS indie hacker founder',
    title: 'Founder OR CEO OR Solo Founder',
    connectionDegree: '2nd',
    rationale: 'Resource-constrained founders who need automation most',
  },
].slice(0, MAX_STRATEGIES);

// ── Parse role/company from LinkedIn headline ─────────────────────────────────
// Handles: "Role @ Company | ...", "Role at Company", "Company | Role | ..."
function parseHeadline(headline = '') {
  if (!headline) return { role: '', company: '' };
  // Pattern 1: "Role @ Company"
  const atMatch = headline.match(/^([^@|]+?)\s*@\s*([^|]+)/);
  if (atMatch) return { role: atMatch[1].trim(), company: atMatch[2].split('|')[0].trim() };
  // Pattern 2: "Role at Company"
  const atWordMatch = headline.match(/^([^|]+?)\s+at\s+([^|]+)/i);
  if (atWordMatch) return { role: atWordMatch[1].trim(), company: atWordMatch[2].split('|')[0].trim() };
  // Pattern 3: first segment before | is company, second is role (if first is title-case company name)
  const parts = headline.split('|').map(s => s.trim());
  if (parts.length >= 2) return { role: parts[0], company: parts[1] };
  return { role: parts[0] || '', company: '' };
}

// ── ICP scoring rubric ────────────────────────────────────────────────────────
function scoreProspect(profile) {
  let score = 0;
  const reasons = [];
  const text = [
    profile.headline || '',
    profile.about || '',
    profile.currentPosition?.company || '',
    profile.currentPosition?.title || '',
  ].join(' ').toLowerCase();
  const title = (profile.currentPosition?.title || '').toLowerCase();
  const company = (profile.currentPosition?.company || '').toLowerCase();

  if (/software|saas|tech|platform|app|startup/.test(text)) {
    score += 3; reasons.push('tech/software company');
  }
  if (/founder|co-founder|ceo|cto|owner/.test(title)) {
    score += 2; reasons.push('founder/executive role');
  }
  if (/automat|ai\b|artificial intel|machine learn|workflow|integrat/.test(text)) {
    score += 2; reasons.push('AI/automation signal');
  }
  if (company && company.length > 2 && company !== 'self-employed') {
    score += 1; reasons.push('has company');
  }
  if (/\$.*m|million|500k|1m|2m|5m|series|arr|mrr|revenue/.test(text)) {
    score += 1; reasons.push('revenue/growth signal');
  }
  if (/scale|growth|expand|hire/.test(text)) {
    score += 1; reasons.push('scaling signal');
  }

  return { score: Math.min(score, 10), reasons };
}

// ── Message quality scoring ───────────────────────────────────────────────────
function scoreMessageQuality(message, prospect, goals) {
  if (!message) return { score: 0, breakdown: {} };
  const m = message.toLowerCase();
  const name = (prospect.name || '').split(' ')[0].toLowerCase();
  const company = (prospect.currentPosition?.company || '').toLowerCase();
  const icpPainPoints = goals.icp?.pain_points || [];

  const breakdown = {
    mentions_name:      (m.includes(name) && name.length > 1) ? 1 : 0,
    mentions_company:   (company && m.includes(company.split(' ')[0]) && company.length > 3) ? 2 : 0,
    mentions_pain_point: icpPainPoints.some(p => m.includes(p.split(' ')[0].toLowerCase())) ? 2 : 0,
    has_value_prop:     /help|save|reduce|increase|automat|build/.test(m) ? 2 : 0,
    has_cta:            /\?|call|chat|connect|minute|quick/.test(m) ? 1 : 0,
    not_starts_with_i:  !message.startsWith('I ') ? 1 : 0,
    good_length:        (message.length >= 80 && message.length <= 350) ? 1 : 0,
  };

  const score = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return { score: Math.min(score, 10), breakdown };
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────
async function liGet(path, timeoutMs = 8000) {
  try {
    const res = await fetch(`${LI}${path}`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { _raw: text }; }
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, error: e.message };
  }
}

async function liPost(path, body, timeoutMs = 15000) {
  try {
    const res = await fetch(`${LI}${path}`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { _raw: text }; }
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, error: e.message };
  }
}

// ── Logging ───────────────────────────────────────────────────────────────────
function log(msg) {
  const ts = new Date().toISOString();
  const line = `${ts} [dry-run] ${msg}`;
  process.stdout.write(line + '\n');
  try {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
    fs.appendFileSync(path.join(LOGS_DIR, 'linkedin-dry-run.log'), line + '\n');
  } catch { /* non-fatal */ }
}

function step(n, name) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  STEP ${n}: ${name}`);
  console.log('─'.repeat(60));
}

// ── One full dry run ──────────────────────────────────────────────────────────
async function runOnce(goals, runIndex) {
  const runId = `dry-run-${Date.now()}-${runIndex}`;
  const startedAt = new Date().toISOString();
  const notes = [];
  const strategyResults = [];

  // ── Step 1: Pre-flight ─────────────────────────────────────────────────────
  step(1, 'Pre-flight checks');

  const health = await liGet('/health', 3000);
  const liUp = health.ok;
  notes.push(`LinkedIn service: ${liUp ? 'UP' : 'DOWN'} (${JSON.stringify(health.data || health.error)})`);
  log(`LinkedIn: ${liUp ? 'UP' : `DOWN (${health.error || health.status})`}`);

  if (!liUp) {
    notes.push('Aborting — LinkedIn service is not reachable');
    return buildResults(runId, startedAt, goals, strategyResults, [], notes, false);
  }

  const rateLimitsRes = await liGet('/api/linkedin/rate-limits');
  if (rateLimitsRes.ok) {
    const rl = rateLimitsRes.data;
    notes.push(`Rate limits: ${rl.searchesPerHour || '?'} searches/hr, ${rl.messagesPerDay || '?'} msgs/day, active hours ${rl.activeHoursStart || '?'}-${rl.activeHoursEnd || '?'}`);
    log(`Active hours: ${rl.activeHoursStart}:00–${rl.activeHoursEnd}:00, searches/hr: ${rl.searchesPerHour}`);
  }

  // ── Step 2: Wake up Safari / navigate to LinkedIn ──────────────────────────
  step(2, 'Navigate to LinkedIn (wake Safari session)');

  const navRes = await liPost('/api/linkedin/navigate/network', {}, 12000);
  if (navRes.ok && navRes.data?.success) {
    notes.push(`Navigation to LinkedIn network page: OK (${navRes.data.currentUrl})`);
    log(`Navigated to: ${navRes.data.currentUrl}`);
  } else {
    notes.push(`Navigation attempt: ${JSON.stringify(navRes.data || navRes.error)} — continuing anyway`);
    log(`Navigation result: ${JSON.stringify(navRes.data || navRes.error)}`);
  }

  // Brief pause after navigation
  await new Promise(r => setTimeout(r, 3000));

  // ── Step 3: Run all search strategies ─────────────────────────────────────
  step(3, `Running ${SEARCH_STRATEGIES.length} search strategies`);

  const allProspects = new Map(); // profileUrl → prospect (deduped)

  for (const [i, strategy] of SEARCH_STRATEGIES.entries()) {
    log(`[${i + 1}/${SEARCH_STRATEGIES.length}] "${strategy.name}": keywords="${strategy.keywords}" title="${strategy.title}"`);

    const body = {
      keywords: [strategy.keywords],  // API expects string[], not string
      title: strategy.title,
      connectionDegree: strategy.connectionDegree,
    };

    // Browser automation can be slow — retry once on failure
    let res = await liPost('/api/linkedin/search/people', body, 45000);
    if (!res.ok && res.status === 0) {
      log(`  → retry after 5s...`);
      await new Promise(r => setTimeout(r, 5000));
      res = await liPost('/api/linkedin/search/people', body, 45000);
    }

    const stratResult = {
      strategy: strategy.name,
      rationale: strategy.rationale,
      keywords: strategy.keywords,
      title: strategy.title,
      status: res.ok ? 'ok' : 'error',
      http_status: res.status,
      raw_results: 0,
      new_unique: 0,
      error: res.error || (!res.ok ? JSON.stringify(res.data) : null),
    };

    if (res.ok && Array.isArray(res.data?.results)) {
      const results = res.data.results;
      stratResult.raw_results = results.length;
      let newCount = 0;
      for (const r of results) {
        if (r.profileUrl && !allProspects.has(r.profileUrl)) {
          allProspects.set(r.profileUrl, { ...r, found_by_strategies: [strategy.name] });
          newCount++;
        } else if (r.profileUrl && allProspects.has(r.profileUrl)) {
          allProspects.get(r.profileUrl).found_by_strategies.push(strategy.name);
        }
      }
      stratResult.new_unique = newCount;
      log(`  → ${results.length} results, ${newCount} new unique`);
    } else {
      log(`  → error: ${stratResult.error?.slice(0, 80)}`);
    }

    notes.push(`Strategy "${strategy.name}": ${stratResult.raw_results} raw, ${stratResult.new_unique} new (${stratResult.status})`);
    strategyResults.push(stratResult);

    // Give browser time to settle between navigations
    if (i < SEARCH_STRATEGIES.length - 1) {
      await new Promise(r => setTimeout(r, 4000));
    }
  }

  log(`Total unique prospects: ${allProspects.size}`);

  // ── Step 4: ICP scoring ────────────────────────────────────────────────────
  step(4, `Scoring ${allProspects.size} unique prospects against ICP`);

  const scoredProspects = [];
  for (const [, p] of allProspects) {
    const { score, reasons } = scoreProspect(p);
    scoredProspects.push({ ...p, icp_score: score, icp_reasons: reasons });
  }

  scoredProspects.sort((a, b) => b.icp_score - a.icp_score);

  const qualified = scoredProspects.filter(p => p.icp_score >= 6);
  const borderline = scoredProspects.filter(p => p.icp_score >= 4 && p.icp_score < 6);

  log(`Qualified (≥6): ${qualified.length}  Borderline (4-5): ${borderline.length}  Below threshold: ${scoredProspects.length - qualified.length - borderline.length}`);
  notes.push(`ICP scoring: ${qualified.length} qualified, ${borderline.length} borderline, ${scoredProspects.length} total`);

  // Show top 5
  if (qualified.length > 0) {
    console.log('\nTop qualified prospects:');
    qualified.slice(0, 5).forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name} (${p.icp_score}/10) — ${(p.headline || '').slice(0, 70)}`);
      console.log(`     Reasons: ${p.icp_reasons.join(', ')}`);
    });
  }

  // ── Step 5: Message generation ─────────────────────────────────────────────
  const toMessage = qualified.slice(0, MAX_PROSPECTS);

  if (SKIP_MESSAGES || toMessage.length === 0) {
    if (SKIP_MESSAGES) notes.push('Message generation skipped (--no-messages)');
    if (toMessage.length === 0) notes.push('No qualified prospects to message');
    return buildResults(runId, startedAt, goals, strategyResults, scoredProspects, notes, true);
  }

  step(5, `Generating AI messages for ${toMessage.length} qualified prospects`);

  const offers = (goals.offers || []).filter(o => o.active);
  const offerContext = offers.map(o => `${o.name} ($${o.price_usd})`).join(', ');
  const targetGap = (goals.revenue?.target_monthly_usd || 5000) - (goals.revenue?.current_monthly_usd || 0);

  let msgGenSuccesses = 0;
  let msgGenFails = 0;

  for (const [i, prospect] of toMessage.entries()) {
    log(`[${i + 1}/${toMessage.length}] Generating message for ${prospect.name}...`);

    const body = {
      profile: {
        name: prospect.name,
        headline: prospect.headline,
        location: prospect.location,
        currentPosition: prospect.currentPosition,
        connectionDegree: prospect.connectionDegree,
        about: prospect.about || '',
      },
      purpose: 'intro',
      tone: 'professional',
      context: `AI automation consulting. Offers: ${offerContext}. Revenue gap: $${targetGap}. ICP pain points: ${(goals.icp?.pain_points || []).join(', ')}.`,
    };

    const res = await liPost('/api/linkedin/ai/generate-message', body, 15000);

    if (res.ok && (res.data?.message || res.data?.text)) {
      prospect.message_drafted = res.data.message || res.data.text;
      prospect.message_source = 'ai-endpoint';
      msgGenSuccesses++;
    } else {
      // Fallback: craft message manually from prospect data (parse headline for role/company)
      const firstName = prospect.name?.split(' ')[0] || 'there';
      const parsed = parseHeadline(prospect.headline);
      const company = prospect.currentPosition?.company || parsed.company || '';
      const role = prospect.currentPosition?.title || parsed.role || '';
      const painPoint = (goals.icp?.pain_points || ['manual execution work'])[0];
      const contextLine = role && company ? `your work as ${role} at ${company}`
                        : role ? `your work as ${role}`
                        : company ? `what you're building at ${company}`
                        : 'your background in AI automation';

      prospect.message_drafted = `Hi ${firstName}, I noticed ${contextLine}. I help founders cut the ${painPoint} by building custom AI automations — typically saves 8-15 hours/week. Would a quick 15-min chat make sense? — Isaiah`;
      prospect.message_source = 'fallback-template';
      msgGenFails++;
      log(`  → AI failed (${res.status || res.error?.slice(0, 40)}), used fallback`);
    }

    // Score message quality
    const quality = scoreMessageQuality(prospect.message_drafted, prospect, goals);
    prospect.message_quality_score = quality.score;
    prospect.message_quality_breakdown = quality.breakdown;

    // Delay between message gen calls
    if (i < toMessage.length - 1) await new Promise(r => setTimeout(r, 1000));
  }

  notes.push(`Message generation: ${msgGenSuccesses} AI, ${msgGenFails} fallback`);
  log(`Messages generated: ${msgGenSuccesses} via AI, ${msgGenFails} fallback`);

  return buildResults(runId, startedAt, goals, strategyResults, scoredProspects, notes, true);
}

// ── Build result object ───────────────────────────────────────────────────────
function buildResults(runId, startedAt, goals, strategyResults, allScored, notes, fullRun) {
  const qualified = allScored.filter(p => p.icp_score >= 6);
  const messaged = qualified.filter(p => p.message_drafted);
  const avgScore = qualified.length > 0
    ? +(qualified.reduce((s, p) => s + p.icp_score, 0) / qualified.length).toFixed(1)
    : null;
  const avgMsgQuality = messaged.length > 0
    ? +(messaged.reduce((s, p) => s + (p.message_quality_score || 0), 0) / messaged.length).toFixed(1)
    : null;

  const totalRaw = strategyResults.reduce((s, r) => s + (r.raw_results || 0), 0);
  const strategiesSucceeded = strategyResults.filter(r => r.status === 'ok').length;
  const goalsDmTarget = goals.growth?.dm_campaigns_per_week || 3;

  return {
    run_id: runId,
    dry_run: true,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    full_run: fullRun,
    goals_snapshot: {
      revenue_target: goals.revenue?.target_monthly_usd || 5000,
      revenue_current: goals.revenue?.current_monthly_usd || 0,
      revenue_gap: (goals.revenue?.target_monthly_usd || 5000) - (goals.revenue?.current_monthly_usd || 0),
      icp_description: goals.icp?.description || '',
      dm_weekly_target: goalsDmTarget,
    },
    metrics: {
      strategies_attempted: strategyResults.length,
      strategies_succeeded: strategiesSucceeded,
      total_raw_prospects: totalRaw,
      unique_prospects: allScored.length,
      qualified_prospects: qualified.length,
      borderline_prospects: allScored.filter(p => p.icp_score >= 4 && p.icp_score < 6).length,
      messages_generated: messaged.length,
      messages_sent: 0,
      avg_icp_score: avgScore,
      avg_message_quality_score: avgMsgQuality,
      icp_qualification_rate: allScored.length > 0
        ? +(qualified.length / allScored.length * 100).toFixed(1)
        : 0,
      weekly_dm_target_coverage: goalsDmTarget > 0
        ? +(qualified.length / goalsDmTarget * 100).toFixed(1)
        : 0,
    },
    strategy_breakdown: strategyResults,
    qualified_prospects: qualified.map(p => ({
      name: p.name,
      profileUrl: p.profileUrl,
      headline: (p.headline || '').slice(0, 100),
      location: p.location || null,
      connection_degree: p.connectionDegree || null,
      current_title: p.currentPosition?.title || null,
      current_company: p.currentPosition?.company || null,
      icp_score: p.icp_score,
      icp_reasons: p.icp_reasons,
      found_by_strategies: p.found_by_strategies || [],
      message_drafted: p.message_drafted || null,
      message_source: p.message_source || null,
      message_quality_score: p.message_quality_score || null,
      message_quality_breakdown: p.message_quality_breakdown || null,
    })),
    execution_notes: notes,
  };
}

// ── Print human-readable report ───────────────────────────────────────────────
function printReport(results) {
  const m = results.metrics;
  const line = '═'.repeat(62);

  console.log('\n' + line);
  console.log('  LINKEDIN DRY-RUN REPORT');
  console.log(line);
  console.log(`  Run ID:              ${results.run_id}`);
  console.log(`  Goals source:        local business-goals.json`);
  console.log(`  Revenue gap:         $${results.goals_snapshot.revenue_gap}`);
  console.log(`  DM weekly target:    ${results.goals_snapshot.dm_weekly_target} campaigns`);
  console.log('');
  console.log('  ── Search Performance ──');
  console.log(`  Strategies run:      ${m.strategies_attempted} (${m.strategies_succeeded} succeeded)`);
  console.log(`  Raw prospects:       ${m.total_raw_prospects}`);
  console.log(`  Unique prospects:    ${m.unique_prospects}`);
  console.log(`  ICP qualified (≥6):  ${m.qualified_prospects} (${m.icp_qualification_rate}% of unique)`);
  console.log(`  Borderline (4-5):    ${m.borderline_prospects}`);
  console.log(`  Avg ICP score:       ${m.avg_icp_score ?? '—'}`);
  console.log('');
  console.log('  ── Outreach Readiness ──');
  console.log(`  Messages generated:  ${m.messages_generated}`);
  console.log(`  Avg msg quality:     ${m.avg_message_quality_score ?? '—'}/10`);
  console.log(`  Weekly target cover: ${m.weekly_dm_target_coverage}%`);
  console.log('');

  if (results.strategy_breakdown.length > 0) {
    console.log('  ── Strategy Breakdown ──');
    results.strategy_breakdown.forEach(s => {
      const status = s.status === 'ok' ? '✓' : '✗';
      console.log(`  ${status} ${(s.strategy || s.name || '?').padEnd(30)} ${String(s.raw_results).padStart(3)} raw, ${String(s.new_unique).padStart(3)} new`);
      if (s.error) console.log(`    ↳ ${s.error.slice(0, 80)}`);
    });
    console.log('');
  }

  if (results.qualified_prospects.length > 0) {
    console.log('  ── Top Qualified Prospects ──');
    results.qualified_prospects.slice(0, 10).forEach((p, i) => {
      console.log(`\n  ${i + 1}. ${p.name} (ICP ${p.icp_score}/10, Msg quality ${p.message_quality_score ?? '—'}/10)`);
      console.log(`     Role:    ${p.current_title || '?'} @ ${p.current_company || '?'}`);
      console.log(`     Why ICP: ${p.icp_reasons.join(', ')}`);
      if (p.message_drafted) {
        console.log(`     Draft:   "${p.message_drafted.slice(0, 120)}${p.message_drafted.length > 120 ? '…' : ''}"`);
      }
    });
    console.log('');
  }

  console.log('  ── Execution Notes ──');
  results.execution_notes.slice(0, 8).forEach(n => console.log(`  • ${n}`));
  console.log(line + '\n');
}

// ── Append to history log ─────────────────────────────────────────────────────
function appendHistory(results) {
  const entry = {
    ts: results.started_at,
    run_id: results.run_id,
    strategies_succeeded: results.metrics.strategies_succeeded,
    unique_prospects: results.metrics.unique_prospects,
    qualified_prospects: results.metrics.qualified_prospects,
    messages_generated: results.metrics.messages_generated,
    avg_icp_score: results.metrics.avg_icp_score,
    avg_message_quality_score: results.metrics.avg_message_quality_score,
    weekly_target_coverage: results.metrics.weekly_dm_target_coverage,
  };
  try { fs.appendFileSync(HISTORY_LOG, JSON.stringify(entry) + '\n'); } catch { /* non-fatal */ }
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  fs.mkdirSync(LOGS_DIR, { recursive: true });

  // Bootstrap API key
  if (!process.env.ANTHROPIC_API_KEY) {
    try {
      const lines = fs.readFileSync(SAFARI_ENV, 'utf-8').split('\n');
      for (const l of lines) {
        const m = l.match(/^ANTHROPIC_API_KEY=(.+)/);
        if (m) { process.env.ANTHROPIC_API_KEY = m[1].trim(); break; }
      }
    } catch { /* non-fatal */ }
  }

  // Load goals
  let goals;
  try {
    goals = JSON.parse(fs.readFileSync(GOALS_FILE, 'utf-8'));
    log(`Goals loaded: $${goals.revenue?.target_monthly_usd}/mo target, ${SEARCH_STRATEGIES.length} strategies, max ${MAX_PROSPECTS} prospects to message`);
  } catch (e) {
    console.error(`Cannot load goals: ${e.message}`);
    process.exit(1);
  }

  const allRuns = [];

  for (let i = 0; i < REPEAT_RUNS; i++) {
    if (i > 0) {
      log(`Waiting 60s before run ${i + 1}/${REPEAT_RUNS}...`);
      await new Promise(r => setTimeout(r, 60000));
    }

    if (REPEAT_RUNS > 1) console.log(`\n${'█'.repeat(62)}\n  RUN ${i + 1} of ${REPEAT_RUNS}\n${'█'.repeat(62)}`);

    const results = await runOnce(goals, i + 1);

    // Write per-run results file
    const outFile = `/tmp/linkedin-dry-run-${results.run_id}.json`;
    try {
      fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
      log(`Results written: ${outFile}`);
    } catch (e) {
      log(`Failed to write results: ${e.message}`);
    }

    printReport(results);
    appendHistory(results);
    allRuns.push(results);
  }

  // Multi-run summary
  if (REPEAT_RUNS > 1) {
    console.log('\n' + '═'.repeat(62));
    console.log('  MULTI-RUN SUMMARY');
    console.log('═'.repeat(62));
    allRuns.forEach((r, i) => {
      console.log(`  Run ${i + 1}: ${r.metrics.qualified_prospects} qualified, ${r.metrics.messages_generated} messages, avg ICP ${r.metrics.avg_icp_score}`);
    });
    const totalUnique = new Set(allRuns.flatMap(r => r.qualified_prospects.map(p => p.profileUrl))).size;
    console.log(`  Total unique qualified across all runs: ${totalUnique}`);
    console.log('═'.repeat(62) + '\n');
  }

  console.log(`History log: ${HISTORY_LOG}`);
  console.log('Done.\n');
  return allRuns;
}

main().catch(e => {
  console.error(`Fatal: ${e.message}`);
  process.exit(1);
});
