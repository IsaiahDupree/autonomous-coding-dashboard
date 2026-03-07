#!/usr/bin/env node
/**
 * Strategy Performance Tracker (IL-005)
 * ======================================
 * Extends linkedin-daemon-state.json to track per-strategy stats.
 * Called by linkedin-daemon after each cycle.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

/**
 * Update strategy performance stats.
 * @param {number} strategyIndex - Current strategy cursor
 * @param {boolean} success - Whether the cycle was successful
 * @param {number} qualifiedCount - Number of qualified prospects found
 * @param {number} totalProspects - Total prospects found
 */
export function updateStrategyPerformance(strategyIndex, success, qualifiedCount, totalProspects) {
  const statePath = path.join(__dirname, 'linkedin-daemon-state.json');
  const state = readJson(statePath, {});

  // Initialize strategy_performance if not exists
  if (!state.strategy_performance) {
    state.strategy_performance = {};
  }

  const stratKey = `strategy_${strategyIndex}`;
  if (!state.strategy_performance[stratKey]) {
    state.strategy_performance[stratKey] = {
      attempts: 0,
      successes: 0,
      total_prospects: 0,
      total_qualified: 0,
      qualified_rate: 0,
      last_used: null,
    };
  }

  const perf = state.strategy_performance[stratKey];
  perf.attempts += 1;
  if (success) perf.successes += 1;
  perf.total_prospects += totalProspects;
  perf.total_qualified += qualifiedCount;
  perf.qualified_rate = perf.total_prospects > 0
    ? Math.round((perf.total_qualified / perf.total_prospects) * 100)
    : 0;
  perf.last_used = new Date().toISOString();

  writeJson(statePath, state);
  console.log(`[strategy-perf] Updated strategy_${strategyIndex}: ${perf.qualified_rate}% qualified rate`);
}

/**
 * Get top 3 performing strategies.
 * Returns array of { strategyIndex, qualifiedRate }
 */
export function getTopStrategies() {
  const statePath = path.join(__dirname, 'linkedin-daemon-state.json');
  const state = readJson(statePath, {});

  if (!state.strategy_performance) return [];

  const strategies = Object.entries(state.strategy_performance)
    .map(([key, perf]) => ({
      strategyIndex: parseInt(key.replace('strategy_', ''), 10),
      qualifiedRate: perf.qualified_rate,
      attempts: perf.attempts,
    }))
    .filter(s => s.attempts >= 3) // Only consider strategies with at least 3 attempts
    .sort((a, b) => b.qualifiedRate - a.qualifiedRate)
    .slice(0, 3);

  return strategies;
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  if (command === 'update') {
    const [strategyIndex, success, qualified, total] = process.argv.slice(3).map(Number);
    updateStrategyPerformance(strategyIndex, Boolean(success), qualified, total);
  } else if (command === 'top') {
    const top = getTopStrategies();
    console.log('Top 3 strategies:', top);
  } else {
    console.log('Usage: node strategy-performance-tracker.js update <index> <success> <qualified> <total>');
    console.log('       node strategy-performance-tracker.js top');
  }
}
