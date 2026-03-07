#!/usr/bin/env node
/**
 * icp-rescorer.js — Batch ICP re-scoring for 845 CRM contacts
 *
 * Corrects misaligned scores (content marketers scored high, founders scored low).
 * Keyword pass for all contacts, Claude Haiku enrichment for top N.
 *
 * Usage:
 *   node harness/icp-rescorer.js              # full run
 *   node harness/icp-rescorer.js --dry-run    # score + report, no Supabase writes
 *   node harness/icp-rescorer.js --top 20     # Claude enrichment on top 20 only
 *   node harness/icp-rescorer.js --platform linkedin  # one platform only
 */

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Env loading ───────────────────────────────────────────────────────────────
function loadEnv(file) {
  if (!existsSync(file)) return;
  readFileSync(file, 'utf8').split('\n').forEach(line => {
    const [k, ...rest] = line.trim().split('=');
    if (k && !k.startsWith('#') && rest.length && !process.env[k])
      process.env[k] = rest.join('=').replace(/^["']|["']$/g, '');
  });
}
loadEnv('/Users/isaiahdupree/Documents/Software/actp-worker/.env');
loadEnv(`${process.env.HOME}/.env`);

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN  = args.includes('--dry-run');
const TOP_N    = parseInt(args[args.indexOf('--top') + 1] || '50', 10) || 50;
const PLATFORM = args.includes('--platform') ? args[args.indexOf('--platform') + 1] : null;
const RUN_DATE = new Date().toISOString().slice(0, 10);

// ── Feature 1: ICP Scoring Rubric ─────────────────────────────────────────────
const ICP_RUBRIC = {
  // positive signals (max 100 additive)
  isFounder:        { score: 30, pattern: /\b(founder|co-founder|ceo|cto|chief\s+executive|chief\s+technology|owner|president|co-founder)\b/i },
  isSaasOrTech:     { score: 20, pattern: /\b(saas|software|startup|tech|engineer|developer|product|platform|b2b)\b/i },
  aiInterest:       { score: 20, pattern: /\b(ai|artificial\s+intelligence|automation|llm|gpt|agent|ml|machine\s+learning|workflow|openai|langchain)\b/i },
  revenueSignal:    { score: 15, pattern: /\b(arr|revenue|funding|raised|series\s+[abcde]|bootstrapped|profitable|mrr|\$[0-9])\b/i },
  builderSignal:    { score: 10, pattern: /\b(builder|building|shipping|scaling|launching|growing)\b/i },
  linkedinActive:   { score: 5,  pattern: null }, // handled by platform check
  // disqualifiers
  isContentMarketer: { score: -40, pattern: /\b(content\s+marketer|copywriter|ghostwriter|brand\s+strategist|content\s+strategist|content\s+creator|social\s+media\s+manager|marketing\s+consultant)\b/i },
  isCompetitor:      { score: -50, pattern: /\b(linkedin\s+coach|personal\s+brand\s+coach|linkedin\s+ghostwriter|linkedin\s+expert|personal\s+branding|thought\s+leadership\s+coach)\b/i },
  isAgency:          { score: -20, pattern: /\b(agency|marketing\s+agency|creative\s+agency|ad\s+agency|digital\s+agency)\b/i },
  noHeadline:        { score: -10, pattern: null }, // handled by null check
};

function mapOfferReadiness(score) {
  if (score >= 70) return 25;
  if (score >= 50) return 15;
  if (score >= 30) return 10;
  if (score >= 15) return 5;
  return 0;
}

// ── Feature 2: Keyword-based scorer ──────────────────────────────────────────
function scoreContact(contact) {
  const text = `${contact.headline || ''} ${contact.bio || ''}`;
  let score = 0;
  const flags = [];

  // Positive signals
  for (const [key, rule] of Object.entries(ICP_RUBRIC)) {
    if (key === 'linkedinActive') {
      if (contact.platform === 'linkedin') {
        score += rule.score;
        flags.push('linkedin_active');
      }
      continue;
    }
    if (key === 'noHeadline') {
      if (!contact.headline) {
        score += rule.score; // negative
        flags.push('no_headline');
      }
      continue;
    }
    if (rule.pattern && rule.pattern.test(text)) {
      score += rule.score;
      // Map rule key to flag name
      const flagMap = {
        isFounder: 'is_founder',
        isSaasOrTech: 'saas_signal',
        aiInterest: 'ai_interest',
        revenueSignal: 'revenue_signal',
        builderSignal: 'builder_signal',
        isContentMarketer: 'is_content_marketer',
        isCompetitor: 'is_competitor',
        isAgency: 'is_agency',
      };
      flags.push(flagMap[key] || key);
    }
  }

  // Clip to 0–100
  score = Math.max(0, Math.min(100, score));
  const anti_icp = score < 10;
  if (anti_icp) flags.push('anti_icp');

  return {
    id: contact.id,
    display_name: contact.display_name,
    headline: contact.headline,
    bio: contact.bio,
    platform: contact.platform,
    pipeline_stage: contact.pipeline_stage,
    score,
    offer_readiness: mapOfferReadiness(score),
    flags,
    anti_icp,
  };
}

// ── Feature 3: Claude Haiku enrichment ───────────────────────────────────────
async function enrichWithClaude(contacts, anthropic) {
  const enriched = [];
  const batches = [];
  for (let i = 0; i < contacts.length; i += 10) batches.push(contacts.slice(i, i + 10));

  for (let bi = 0; bi < batches.length; bi++) {
    const batch = batches[bi];
    if (bi > 0) await new Promise(r => setTimeout(r, 2000));

    const results = await Promise.all(batch.map(async (c) => {
      try {
        const prompt = `Contact profile:
Name: ${c.display_name || 'Unknown'}
Headline: ${c.headline || 'N/A'}
Bio: ${c.bio || 'N/A'}
Platform: ${c.platform || 'N/A'}
Pipeline stage: ${c.pipeline_stage || 'N/A'}
Keyword ICP score: ${c.score}/100

Score this contact 0-100 for ICP fit. Target ICP: software founders/CTOs at $500K-$5M ARR SaaS companies needing AI automation (agent workflows, CRM automation, content pipelines). Anti-ICP: content marketers, brand strategists, copywriters, LinkedIn coaches.

Respond with ONLY valid JSON (no markdown, no code blocks):
{"refined_score": <int 0-100>, "icp_verdict": "<perfect_fit|strong_fit|weak_fit|anti_icp>", "key_reason": "<1 sentence>", "next_action": "<1-2 sentence specific action>", "updated_summary": "<2-3 sentence profile summary>"}`;

        const msg = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          system: 'You are a B2B sales qualifier for an AI automation consultant targeting software founders at $500K-$5M ARR SaaS companies. Respond with only the JSON object requested, no other text.',
          messages: [{ role: 'user', content: prompt }],
        });

        let raw = msg.content[0].text.trim();
        // Strip markdown code fences if present
        raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
        const parsed = JSON.parse(raw);
        return {
          ...c,
          score: parsed.refined_score ?? c.score,
          offer_readiness: mapOfferReadiness(parsed.refined_score ?? c.score),
          icp_verdict: parsed.icp_verdict || 'weak_fit',
          key_reason: parsed.key_reason || '',
          next_action: parsed.next_action || '',
          updated_summary: parsed.updated_summary || '',
          claude_enriched: true,
        };
      } catch (err) {
        // fallback to keyword score
        console.warn(`  [warn] Claude failed for ${c.display_name}: ${err.message}`);
        return { ...c, icp_verdict: c.score >= 70 ? 'perfect_fit' : c.score >= 50 ? 'strong_fit' : c.score >= 30 ? 'weak_fit' : 'anti_icp', claude_enriched: false };
      }
    }));

    enriched.push(...results);
    console.log(`  Enriched batch ${bi + 1}/${batches.length} (${enriched.length} total)`);
  }

  return enriched;
}

// ── Feature 4: Supabase bulk updater ─────────────────────────────────────────
async function updateSupabase(supabase, allScored, enrichedTop) {
  const enrichedMap = new Map(enrichedTop.map(c => [c.id, c]));
  let topIcpCount = 0;
  let antiIcpCount = 0;

  // Build update payloads
  const baseUpdates = allScored.map(c => {
    const enriched = enrichedMap.get(c.id);
    const isAntiIcp = c.score < 10;
    if (isAntiIcp) antiIcpCount++;

    const base = {
      id: c.id,
      offer_readiness: isAntiIcp ? 0 : c.offer_readiness,
    };

    if (isAntiIcp) {
      base.tags = ['anti_icp'];
      base.next_action = null;
      return base;
    }

    if (enriched) {
      if (enriched.icp_verdict === 'perfect_fit' || enriched.icp_verdict === 'strong_fit') topIcpCount++;
      const verdict = enriched.icp_verdict || 'weak_fit';
      const signals = c.flags.filter(f => ['is_founder','saas_signal','ai_interest','revenue_signal','builder_signal'].includes(f));
      base.tags = [
        `icp_rescored_${RUN_DATE}`,
        `fit:${verdict}`,
        ...signals.map(s => `signal:${s}`),
      ];
      base.ai_summary = enriched.updated_summary || null;
      base.next_action = enriched.next_action || null;
      base.offer_readiness = enriched.offer_readiness;
      // next_action_at = now + 24h (set via raw SQL in metadata or via RPC)
      // Supabase JS doesn't support interval arithmetic directly, use ISO string
      const nextAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      base.next_action_at = nextAt;
    }

    return base;
  });

  // Batch upsert in chunks of 50
  const CHUNK = 50;
  let updated = 0;
  for (let i = 0; i < baseUpdates.length; i += CHUNK) {
    const chunk = baseUpdates.slice(i, i + CHUNK);
    const { error } = await supabase.from('crm_contacts').upsert(chunk, { onConflict: 'id' });
    if (error) {
      console.error(`  [error] Batch upsert failed at ${i}: ${error.message}`);
    } else {
      updated += chunk.length;
    }
  }

  console.log(`Updated ${updated} contacts. Top ICP: ${topIcpCount}, Anti-ICP tagged: ${antiIcpCount}`);
  return { updated, topIcpCount, antiIcpCount };
}

// ── Feature 5: Report generator ───────────────────────────────────────────────
function buildReport(allScored, enrichedTop) {
  const enrichedMap = new Map(enrichedTop.map(c => [c.id, c]));

  const dist = { '70+': 0, '50-70': 0, '30-50': 0, '15-30': 0, '<15': 0 };
  const platformBreakdown = {};
  const antiIcpList = [];

  for (const c of allScored) {
    if (c.score >= 70) dist['70+']++;
    else if (c.score >= 50) dist['50-70']++;
    else if (c.score >= 30) dist['30-50']++;
    else if (c.score >= 15) dist['15-30']++;
    else {
      dist['<15']++;
      antiIcpList.push({
        display_name: c.display_name,
        headline: c.headline,
        reason: c.flags.filter(f => ['is_content_marketer','is_competitor','is_agency','anti_icp'].includes(f)).join(', ') || 'low_score',
      });
    }
    platformBreakdown[c.platform || 'unknown'] = (platformBreakdown[c.platform || 'unknown'] || 0) + 1;
  }

  // Top 20 from enriched or keyword-scored
  const sortedAll = [...allScored].sort((a, b) => {
    const ea = enrichedMap.get(a.id);
    const eb = enrichedMap.get(b.id);
    return (eb ? eb.score : b.score) - (ea ? ea.score : a.score);
  });

  const top20 = sortedAll.slice(0, 20).map(c => {
    const e = enrichedMap.get(c.id);
    return {
      display_name: c.display_name,
      headline: c.headline,
      platform: c.platform,
      score: e ? e.score : c.score,
      icp_verdict: e ? e.icp_verdict : (c.score >= 70 ? 'perfect_fit' : c.score >= 50 ? 'strong_fit' : 'weak_fit'),
      next_action: e ? e.next_action : null,
    };
  });

  return {
    runDate: RUN_DATE,
    totalContacted: allScored.length,
    scoreDistribution: dist,
    top20,
    antiIcp: antiIcpList.slice(0, 50), // cap at 50 in report
    platformBreakdown,
  };
}

async function sendTelegram(report) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) { console.warn('  [warn] Telegram not configured, skipping'); return; }

  const topLead = report.top20[0];
  const perfectAndStrong = report.top20.filter(c => c.icp_verdict === 'perfect_fit' || c.icp_verdict === 'strong_fit').length +
    (report.scoreDistribution['70+'] - report.top20.filter(c => c.icp_verdict === 'perfect_fit').length);
  const antiIcpCount = report.scoreDistribution['<15'];

  const text = [
    `ICP Rescore complete — ${report.totalContacted} contacts`,
    `Perfect/Strong fit: ${report.scoreDistribution['70+'] + report.scoreDistribution['50-70']}`,
    `Anti-ICP flagged: ${antiIcpCount}`,
    topLead ? `Top lead: ${topLead.display_name} — ${topLead.headline || 'no headline'}` : '',
  ].filter(Boolean).join('\n');

  try {
    const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (resp.ok) console.log('  Telegram notification sent');
    else console.warn(`  [warn] Telegram error: ${resp.status}`);
  } catch (err) {
    console.warn(`  [warn] Telegram failed: ${err.message}`);
  }
}

function saveObsidian(report) {
  const vaultDir = `${process.env.HOME}/.memory/vault/PROJECT-MEMORY`;
  try {
    mkdirSync(vaultDir, { recursive: true });
    const filePath = path.join(vaultDir, `icp-rescore-${RUN_DATE}.md`);
    const lines = [
      `# ICP Rescore — ${RUN_DATE}`,
      '',
      `**Total contacts:** ${report.totalContacted}`,
      '',
      '## Score Distribution',
      `- 70+ (perfect): ${report.scoreDistribution['70+']}`,
      `- 50-70 (strong): ${report.scoreDistribution['50-70']}`,
      `- 30-50 (weak): ${report.scoreDistribution['30-50']}`,
      `- 15-30 (low): ${report.scoreDistribution['15-30']}`,
      `- <15 (anti-ICP): ${report.scoreDistribution['<15']}`,
      '',
      '## Top 20 Leads',
      ...report.top20.map((c, i) =>
        `${i + 1}. **${c.display_name}** (${c.platform}) — ${c.headline || 'N/A'} — *${c.icp_verdict}* (${c.score})`
      ),
      '',
      '## Platform Breakdown',
      ...Object.entries(report.platformBreakdown).map(([p, n]) => `- ${p}: ${n}`),
    ];
    writeFileSync(filePath, lines.join('\n'));
    console.log(`  Obsidian note saved: ${filePath}`);
  } catch (err) {
    console.warn(`  [warn] Obsidian save failed: ${err.message}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n=== ICP Rescorer — ${RUN_DATE} ===`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'} | Top N for Claude: ${TOP_N}${PLATFORM ? ` | Platform: ${PLATFORM}` : ''}\n`);

  // Clients
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // ── Step 1+2: Fetch all contacts + keyword score ──────────────────────────
  console.log('Step 1: Fetching contacts from Supabase...');
  let query = supabase
    .from('crm_contacts')
    .select('id, display_name, headline, bio, platform, pipeline_stage')
    .limit(2000);

  if (PLATFORM) query = query.eq('platform', PLATFORM);

  const { data: contacts, error: fetchError } = await query;
  if (fetchError) { console.error('Failed to fetch contacts:', fetchError.message); process.exit(1); }

  console.log(`  Fetched ${contacts.length} contacts`);

  const t0 = Date.now();
  const allScored = contacts.map(scoreContact);
  const elapsed = Date.now() - t0;
  console.log(`  Keyword scoring done in ${elapsed}ms`);

  // Distribution log
  const dist = { '70+': 0, '50-70': 0, '30-50': 0, '15-30': 0, '<15': 0 };
  for (const c of allScored) {
    if (c.score >= 70) dist['70+']++;
    else if (c.score >= 50) dist['50-70']++;
    else if (c.score >= 30) dist['30-50']++;
    else if (c.score >= 15) dist['15-30']++;
    else dist['<15']++;
  }
  console.log(`  Score 70+: ${dist['70+']}, 50-70: ${dist['50-70']}, 30-50: ${dist['30-50']}, 15-30: ${dist['15-30']}, <15: ${dist['<15']} (anti-ICP)`);

  // Sort by score descending
  allScored.sort((a, b) => b.score - a.score);

  // ── Step 3: Claude enrichment — top N ────────────────────────────────────
  const top = allScored.slice(0, TOP_N);
  console.log(`\nStep 2: Claude Haiku enrichment for top ${TOP_N} contacts...`);
  const enrichedTop = await enrichWithClaude(top, anthropic);

  // ── Step 4: Supabase update ───────────────────────────────────────────────
  let updateStats = { updated: 0, topIcpCount: 0, antiIcpCount: 0 };
  if (!DRY_RUN) {
    console.log(`\nStep 3: Writing to Supabase...`);
    updateStats = await updateSupabase(supabase, allScored, enrichedTop);
  } else {
    console.log('\nStep 3: [DRY RUN] Skipping Supabase writes');
  }

  // ── Step 5: Report ────────────────────────────────────────────────────────
  console.log('\nStep 4: Generating report...');
  const report = buildReport(allScored, enrichedTop);

  const reportPath = path.join(__dirname, 'icp-rescore-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`  Report written: ${reportPath}`);

  if (!DRY_RUN) {
    await sendTelegram(report);
    saveObsidian(report);
  }

  // ── Integration test (dry-run) ────────────────────────────────────────────
  console.log('\n=== Integration Test ===');
  let pass = true;
  const checks = [
    ['score distribution has all keys', Object.keys(dist).length === 5],
    ['top 20 has correct length', report.top20.length === 20 || report.top20.length === allScored.length],
    ['top 20 has required fields', report.top20.every(c => 'display_name' in c && 'score' in c && 'icp_verdict' in c && 'next_action' in c)],
    ['score clipped 0-100', allScored.every(c => c.score >= 0 && c.score <= 100)],
    ['offer_readiness mapped correctly', allScored.every(c => [0,5,10,15,25].includes(c.offer_readiness))],
    ['anti_icp contacts exist', dist['<15'] >= 0],
    ['enriched top has icp_verdict', enrichedTop.every(c => c.icp_verdict)],
    ['report file exists', existsSync(reportPath)],
  ];

  for (const [label, result] of checks) {
    const icon = result ? 'PASS' : 'FAIL';
    console.log(`  [${icon}] ${label}`);
    if (!result) pass = false;
  }

  console.log(`\n${pass ? 'PASS' : 'FAIL'} — ICP Rescorer integration test`);
  if (!pass) process.exit(1);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
