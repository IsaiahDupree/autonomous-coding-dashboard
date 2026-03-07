#!/usr/bin/env node
/**
 * Self-Improving Automation Loop (PRD-084)
 * =========================================
 * Reads live KPIs, uses Claude Haiku to identify bottlenecks,
 * auto-executes high-confidence improvements, routes low-confidence ones to Telegram.
 *
 * Features:
 * - IL-001: KPI collector
 * - IL-002: Claude Haiku analysis
 * - IL-003: Auto-executor
 * - IL-004: Approval queue + Telegram
 * - IL-007: Improvement log
 * - IL-008: Daemon mode (6h interval)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const H = __dirname;

// ── Helpers ───────────────────────────────────────────────────────────────────

function readJson(fp, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf-8'));
  } catch {
    return fallback;
  }
}

function writeJson(fp, data) {
  fs.writeFileSync(fp, JSON.stringify(data, null, 2));
}

function appendNdjson(fp, obj) {
  fs.appendFileSync(fp, JSON.stringify(obj) + '\n');
}

function log(...args) {
  console.log('[improvement-loop]', new Date().toISOString(), ...args);
}

// ── IL-001: KPI Collector ─────────────────────────────────────────────────────

/**
 * Collects live KPIs from state files and CRMLite API.
 * Returns: { connections_today, dms_sent, upwork_submitted, reply_rate, revenue_gap }
 */
async function collectKPIs() {
  log('Collecting KPIs...');

  // Read state files
  const linkedinState = readJson(path.join(H, 'linkedin-daemon-state.json'), {});
  const dmOutreachState = readJson(path.join(H, 'dm-outreach-state.json'), {});
  const upworkQueue = readJson(path.join(H, 'upwork-queue.json'), []);
  const businessGoals = readJson('/Users/isaiahdupree/Documents/Software/business-goals.json', {});

  // Today's date for filtering
  const today = new Date().toISOString().slice(0, 10);

  // LinkedIn connections today
  const linkedinLog = path.join(H, 'linkedin-connection-log.ndjson');
  let connectionsToday = 0;
  if (fs.existsSync(linkedinLog)) {
    const lines = fs.readFileSync(linkedinLog, 'utf-8').trim().split('\n').filter(Boolean);
    connectionsToday = lines.filter(l => {
      try {
        const obj = JSON.parse(l);
        return obj.ts?.startsWith(today) && obj.result === 'success';
      } catch { return false; }
    }).length;
  }

  // DMs sent today (all platforms)
  const dailyCounts = dmOutreachState.dailyCounts || {};
  const dmsSentToday = ['ig', 'tw', 'tt'].reduce((sum, platform) => {
    const pc = dailyCounts[platform];
    return sum + (pc?.date === today ? pc.sent : 0);
  }, 0);

  // Upwork proposals submitted today
  const upworkSubmittedToday = Array.isArray(upworkQueue)
    ? upworkQueue.filter(p => p.status === 'submitted' && p.submitted_at?.startsWith(today)).length
    : 0;

  // Reply rate (from CRMLite or DM queue)
  const linkedinDmQueue = readJson(path.join(H, 'linkedin-dm-queue.json'), []);
  const totalSent = Array.isArray(linkedinDmQueue)
    ? linkedinDmQueue.filter(i => i.status === 'sent').length
    : 0;
  const totalReplied = Array.isArray(linkedinDmQueue)
    ? linkedinDmQueue.filter(i => i.status === 'replied').length
    : 0;
  const replyRate = totalSent > 0 ? (totalReplied / totalSent) * 100 : 0;

  // Revenue gap
  const targetRevenue = businessGoals.revenue?.target_monthly_usd || 5000;
  const currentRevenue = businessGoals.revenue?.current_monthly_usd || 0;
  const revenueGap = targetRevenue - currentRevenue;

  // Weekly targets from business-goals.json
  const weeklyTargets = businessGoals.weekly_targets || {};

  const kpis = {
    connections_today: connectionsToday,
    dms_sent: dmsSentToday,
    upwork_submitted: upworkSubmittedToday,
    reply_rate: Math.round(replyRate * 10) / 10,
    revenue_gap: revenueGap,
    targets: {
      dm_sends_weekly: weeklyTargets.dm_sends || 50,
      upwork_proposals_weekly: weeklyTargets.upwork_proposals || 5,
      new_crm_contacts_weekly: weeklyTargets.new_crm_contacts || 30,
    },
    state: {
      linkedin_cycle_count: linkedinState.cycleCount || 0,
      linkedin_strategy_cursor: linkedinState.strategyCursor || 0,
      linkedin_total_prospects: linkedinState.totalProspectsFound || 0,
      dm_total_sent: dmOutreachState.totalSent || 0,
      dm_total_failed: dmOutreachState.totalFailed || 0,
    },
  };

  log('KPIs collected:', JSON.stringify(kpis, null, 2));
  return kpis;
}

// ── IL-002: Claude Haiku Analysis ────────────────────────────────────────────

/**
 * Sends metrics to Claude Haiku, gets structured analysis.
 * Returns: { bottleneck, recommended_action, action_params, confidence, reasoning }
 */
async function analyzeWithHaiku(kpis) {
  log('Analyzing with Claude Haiku...');

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const prompt = `You are a business automation analyst. Analyze these KPIs and recommend ONE specific action to improve performance.

Current KPIs:
- Connections today: ${kpis.connections_today}
- DMs sent today: ${kpis.dms_sent}
- Upwork submitted today: ${kpis.upwork_submitted}
- Reply rate: ${kpis.reply_rate}%
- Revenue gap: $${kpis.revenue_gap}

Weekly targets:
- DM sends: ${kpis.targets.dm_sends_weekly} (daily ~${Math.round(kpis.targets.dm_sends_weekly / 7)})
- Upwork proposals: ${kpis.targets.upwork_proposals_weekly}
- New CRM contacts: ${kpis.targets.new_crm_contacts_weekly}

State:
- LinkedIn cycles: ${kpis.state.linkedin_cycle_count}
- Strategy cursor: ${kpis.state.linkedin_strategy_cursor}
- Total prospects found: ${kpis.state.linkedin_total_prospects}
- DM success rate: ${kpis.state.dm_total_sent > 0 ? Math.round((kpis.state.dm_total_sent - kpis.state.dm_total_failed) / kpis.state.dm_total_sent * 100) : 0}%

Identify the BIGGEST bottleneck and recommend ONE action from this allowlist:
- adjust_icp_threshold (if not enough qualified prospects)
- swap_search_strategy (if LinkedIn search yields low-quality leads)
- update_message_template (if reply rate < 5%)
- change_daily_limit (if we're hitting limits too early)

Respond with JSON:
{
  "bottleneck": "brief diagnosis",
  "recommended_action": "action_name",
  "action_params": { "key": "value" },
  "confidence": 0.0-1.0,
  "reasoning": "why this action"
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = message.content[0].text;
    log('Haiku response:', responseText);

    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Haiku response');
    }

    const analysis = JSON.parse(jsonMatch[0]);
    log('Analysis:', JSON.stringify(analysis, null, 2));

    return analysis;
  } catch (error) {
    log('ERROR analyzing with Haiku:', error.message);
    return {
      bottleneck: 'analysis_failed',
      recommended_action: null,
      action_params: {},
      confidence: 0,
      reasoning: error.message,
    };
  }
}

// ── IL-003: Auto-Executor ─────────────────────────────────────────────────────

const ALLOWLIST = [
  'adjust_icp_threshold',
  'swap_search_strategy',
  'update_message_template',
  'change_daily_limit',
];

/**
 * If confidence > 0.9 AND action in allowlist → execute immediately.
 * Returns: { executed: boolean, result: any }
 */
async function autoExecute(analysis) {
  const { recommended_action, action_params, confidence } = analysis;

  if (confidence <= 0.9) {
    log('Confidence too low:', confidence, '→ sending to approval queue');
    return { executed: false, reason: 'low_confidence' };
  }

  if (!ALLOWLIST.includes(recommended_action)) {
    log('Action not in allowlist:', recommended_action);
    return { executed: false, reason: 'not_in_allowlist' };
  }

  log(`AUTO-EXECUTING: ${recommended_action} with params:`, action_params);

  try {
    let result = null;

    switch (recommended_action) {
      case 'adjust_icp_threshold':
        result = adjustIcpThreshold(action_params);
        break;
      case 'swap_search_strategy':
        result = swapSearchStrategy(action_params);
        break;
      case 'update_message_template':
        result = updateMessageTemplate(action_params);
        break;
      case 'change_daily_limit':
        result = changeDailyLimit(action_params);
        break;
      default:
        throw new Error(`Unknown action: ${recommended_action}`);
    }

    log('Execution result:', result);
    return { executed: true, result };
  } catch (error) {
    log('ERROR executing action:', error.message);
    return { executed: false, reason: 'execution_error', error: error.message };
  }
}

// ── Action implementations ────────────────────────────────────────────────────

function adjustIcpThreshold(params) {
  const linkedinState = readJson(path.join(H, 'linkedin-daemon-state.json'), {});
  const newThreshold = params.threshold || 0.6;
  linkedinState.icpThreshold = newThreshold;
  writeJson(path.join(H, 'linkedin-daemon-state.json'), linkedinState);
  return { action: 'adjust_icp_threshold', new_threshold: newThreshold };
}

function swapSearchStrategy(params) {
  const linkedinState = readJson(path.join(H, 'linkedin-daemon-state.json'), {});
  const newCursor = params.strategy_cursor !== undefined ? params.strategy_cursor : (linkedinState.strategyCursor + 1) % 14;
  linkedinState.strategyCursor = newCursor;
  writeJson(path.join(H, 'linkedin-daemon-state.json'), linkedinState);
  return { action: 'swap_search_strategy', new_cursor: newCursor };
}

function updateMessageTemplate(params) {
  const templatesPath = path.join(H, 'dm-templates.json');
  let templates = readJson(templatesPath, { linkedin: [], instagram: [], twitter: [] });

  // Add new template variant if provided
  if (params.platform && params.template) {
    if (!templates[params.platform]) templates[params.platform] = [];
    templates[params.platform].push({
      text: params.template,
      variant: `v${templates[params.platform].length + 1}`,
      added_at: new Date().toISOString(),
    });
    writeJson(templatesPath, templates);
    return { action: 'update_message_template', platform: params.platform, variant_count: templates[params.platform].length };
  }

  return { action: 'update_message_template', result: 'no_changes' };
}

function changeDailyLimit(params) {
  const dmState = readJson(path.join(H, 'dm-outreach-state.json'), {});
  if (params.platform && params.new_limit) {
    if (!dmState.limits) dmState.limits = {};
    dmState.limits[params.platform] = params.new_limit;
    writeJson(path.join(H, 'dm-outreach-state.json'), dmState);
    return { action: 'change_daily_limit', platform: params.platform, new_limit: params.new_limit };
  }
  return { action: 'change_daily_limit', result: 'no_changes' };
}

// ── IL-004: Approval Queue + Telegram ─────────────────────────────────────────

/**
 * Appends low-confidence action to pending queue, sends Telegram notification.
 */
async function queueForApproval(analysis) {
  log('Queueing for approval...');

  const pendingPath = path.join(H, 'improvement-pending.json');
  const pending = readJson(pendingPath, []);

  const id = `il_${Date.now()}`;
  const item = {
    id,
    ts: new Date().toISOString(),
    bottleneck: analysis.bottleneck,
    action: analysis.recommended_action,
    params: analysis.action_params,
    confidence: analysis.confidence,
    reasoning: analysis.reasoning,
    status: 'pending',
  };

  pending.push(item);
  writeJson(pendingPath, pending);

  // Send Telegram notification
  await sendTelegramNotification(item);

  return { queued: true, id };
}

async function sendTelegramNotification(item) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    log('WARN: Telegram not configured (missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID)');
    return;
  }

  const message = `🔧 *Improvement Suggestion*

*Bottleneck:* ${item.bottleneck}
*Action:* \`${item.action}\`
*Confidence:* ${Math.round(item.confidence * 100)}%
*Reasoning:* ${item.reasoning}

Params: \`${JSON.stringify(item.params)}\`

/il_approve_${item.id} | /il_skip_${item.id}`;

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });
    log('Telegram notification sent:', item.id);
  } catch (error) {
    log('ERROR sending Telegram:', error.message);
  }
}

// ── IL-007: Improvement Log ───────────────────────────────────────────────────

function logImprovement(kpis, analysis, execution) {
  const logPath = path.join(H, 'improvement-log.ndjson');
  const entry = {
    ts: new Date().toISOString(),
    metrics_snapshot: kpis,
    bottleneck: analysis.bottleneck,
    action_taken: analysis.recommended_action,
    confidence: analysis.confidence,
    auto_applied: execution.executed || false,
    outcome: execution.result || execution.reason || 'pending_approval',
  };
  appendNdjson(logPath, entry);
  log('Logged improvement cycle');
}

// ── IL-008: Run Cycle ─────────────────────────────────────────────────────────

export async function runCycle() {
  log('=== Starting improvement cycle ===');

  try {
    // 1. Collect KPIs
    const kpis = await collectKPIs();

    // 2. Analyze with Haiku
    const analysis = await analyzeWithHaiku(kpis);

    // 3. Auto-execute or queue for approval
    let execution = { executed: false, reason: 'no_action' };
    if (analysis.recommended_action) {
      execution = await autoExecute(analysis);

      if (!execution.executed && analysis.confidence > 0) {
        await queueForApproval(analysis);
      }
    }

    // 4. Log to NDJSON
    logImprovement(kpis, analysis, execution);

    log('=== Cycle complete ===');
    return { success: true, kpis, analysis, execution };
  } catch (error) {
    log('ERROR in cycle:', error.message);
    return { success: false, error: error.message };
  }
}

// ── Daemon Mode ───────────────────────────────────────────────────────────────

let intervalHandle = null;
let businessGoalsWatcher = null;

function hotReloadBusinessGoals() {
  const goalsPath = '/Users/isaiahdupree/Documents/Software/business-goals.json';
  if (businessGoalsWatcher) {
    businessGoalsWatcher.close();
  }
  businessGoalsWatcher = fs.watch(goalsPath, (event) => {
    if (event === 'change') {
      log('business-goals.json changed, reloading...');
    }
  });
}

export function startDaemon() {
  log('Starting daemon mode (6h interval)...');

  // Hot-reload business goals on file change
  hotReloadBusinessGoals();

  // Run immediately
  runCycle();

  // Then every 6 hours
  intervalHandle = setInterval(runCycle, 6 * 60 * 60 * 1000);

  log('Daemon started. Next cycle in 6 hours.');
}

export function stopDaemon() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  if (businessGoalsWatcher) {
    businessGoalsWatcher.close();
    businessGoalsWatcher = null;
  }
  log('Daemon stopped');
}

// ── CLI ───────────────────────────────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2] || 'once';

  if (command === 'daemon') {
    startDaemon();
  } else if (command === 'once') {
    runCycle().then(() => {
      log('Single cycle complete');
      process.exit(0);
    });
  } else {
    console.log('Usage: node improvement-loop.js [once|daemon]');
    process.exit(1);
  }
}
