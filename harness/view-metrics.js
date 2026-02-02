#!/usr/bin/env node

/**
 * View Target Metrics
 * ===================
 * 
 * CLI tool to view per-target metrics from the database.
 * Run: node view-metrics.js [--target=<id>] [--costs] [--daily]
 */

import {
  testConnection,
  getAllTargetSummaries,
  getTargetSummary,
  getCostByTarget,
  getCostByDate,
  getSessionsByTarget,
  closePool,
} from './metrics-db.js';

const args = process.argv.slice(2);
const targetId = args.find(a => a.startsWith('--target='))?.split('=')[1];
const showCosts = args.includes('--costs');
const showDaily = args.includes('--daily');
const showSessions = args.includes('--sessions');

function formatCost(cost) {
  return `$${parseFloat(cost || 0).toFixed(4)}`;
}

function formatTokens(tokens) {
  const num = parseInt(tokens || 0);
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

async function main() {
  console.log('\n========================================');
  console.log('ACD Target Metrics');
  console.log('========================================\n');

  try {
    await testConnection();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('\nMake sure the metrics database is running:');
    console.log('  docker-compose -f docker-compose.metrics.yml up -d\n');
    process.exit(1);
  }

  if (targetId) {
    // Show single target details
    const summary = await getTargetSummary(targetId);
    if (!summary) {
      console.log(`❌ Target not found: ${targetId}`);
      process.exit(1);
    }

    console.log(`📊 Target: ${summary.name} (${summary.target_id})`);
    console.log('─'.repeat(50));
    console.log(`Sessions:      ${summary.total_sessions} total (${summary.successful_sessions} success, ${summary.failed_sessions} failed)`);
    console.log(`Features:      ${summary.total_features_completed} completed`);
    console.log(`Commits:       ${summary.total_commits}`);
    console.log(`Tokens:        ${formatTokens(summary.total_input_tokens)} in / ${formatTokens(summary.total_output_tokens)} out`);
    console.log(`Cost:          ${formatCost(summary.total_cost_usd)}`);
    console.log(`Avg Duration:  ${Math.round((summary.avg_session_duration_ms || 0) / 1000 / 60)} min`);
    console.log(`Last Session:  ${summary.last_session_at || 'N/A'}`);

    if (showSessions) {
      console.log('\n📋 Recent Sessions:');
      console.log('─'.repeat(50));
      const sessions = await getSessionsByTarget(targetId, 10);
      for (const s of sessions) {
        const duration = Math.round((s.duration_ms || 0) / 1000 / 60);
        console.log(`  #${s.session_number} | ${s.status.padEnd(10)} | ${duration}min | +${s.features_completed} features | ${formatCost(s.cost_usd)}`);
      }
    }
  } else if (showCosts) {
    // Show cost breakdown
    console.log('💰 Cost by Target:');
    console.log('─'.repeat(60));
    const costs = await getCostByTarget();
    console.log('Target'.padEnd(25) + 'Cost'.padStart(12) + 'Sessions'.padStart(10) + 'Input'.padStart(10) + 'Output'.padStart(10));
    console.log('─'.repeat(60));
    let totalCost = 0;
    for (const c of costs) {
      console.log(
        c.target_id.padEnd(25) +
        formatCost(c.total_cost).padStart(12) +
        c.sessions.toString().padStart(10) +
        formatTokens(c.total_input).padStart(10) +
        formatTokens(c.total_output).padStart(10)
      );
      totalCost += parseFloat(c.total_cost || 0);
    }
    console.log('─'.repeat(60));
    console.log('TOTAL'.padEnd(25) + formatCost(totalCost).padStart(12));

    if (showDaily) {
      console.log('\n📅 Cost by Day (Last 30 days):');
      console.log('─'.repeat(50));
      const daily = await getCostByDate(30);
      for (const d of daily) {
        console.log(`  ${d.date} | ${formatCost(d.total_cost).padStart(10)} | ${d.sessions} sessions`);
      }
    }
  } else {
    // Show all targets summary
    console.log('📊 All Targets Summary:');
    console.log('─'.repeat(80));
    console.log(
      'Target'.padEnd(20) +
      'Sessions'.padStart(10) +
      'Features'.padStart(10) +
      'Cost'.padStart(12) +
      'Tokens (In/Out)'.padStart(18) +
      'Last Run'.padStart(12)
    );
    console.log('─'.repeat(80));

    const summaries = await getAllTargetSummaries();
    let totalCost = 0;
    let totalSessions = 0;
    let totalFeatures = 0;

    for (const s of summaries) {
      const lastRun = s.last_session_at ? new Date(s.last_session_at).toLocaleDateString() : 'N/A';
      console.log(
        (s.name || s.target_id).substring(0, 19).padEnd(20) +
        (s.total_sessions || 0).toString().padStart(10) +
        (s.total_features_completed || 0).toString().padStart(10) +
        formatCost(s.total_cost_usd).padStart(12) +
        `${formatTokens(s.total_input_tokens)}/${formatTokens(s.total_output_tokens)}`.padStart(18) +
        lastRun.padStart(12)
      );
      totalCost += parseFloat(s.total_cost_usd || 0);
      totalSessions += parseInt(s.total_sessions || 0);
      totalFeatures += parseInt(s.total_features_completed || 0);
    }

    console.log('─'.repeat(80));
    console.log(
      'TOTAL'.padEnd(20) +
      totalSessions.toString().padStart(10) +
      totalFeatures.toString().padStart(10) +
      formatCost(totalCost).padStart(12)
    );
  }

  console.log('\n');
  await closePool();
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
