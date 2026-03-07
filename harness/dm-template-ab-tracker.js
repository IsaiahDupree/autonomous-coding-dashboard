#!/usr/bin/env node
/**
 * DM Template A/B Tracker (IL-006)
 * =================================
 * Tracks reply rate per DM template variant.
 * After 20 sends per variant, auto-swaps lowest performer.
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
 * Track a DM send with a specific template variant.
 * @param {string} platform - 'linkedin', 'instagram', 'twitter', etc.
 * @param {string} variant - Template variant ID (e.g., 'v1', 'v2')
 */
export function trackDmSend(platform, variant) {
  const statePath = path.join(__dirname, 'dm-outreach-state.json');
  const state = readJson(statePath, {});

  if (!state.template_ab) {
    state.template_ab = {};
  }

  const key = `${platform}_${variant}`;
  if (!state.template_ab[key]) {
    state.template_ab[key] = {
      platform,
      variant,
      sent: 0,
      replied: 0,
      reply_rate: 0,
      created_at: new Date().toISOString(),
    };
  }

  state.template_ab[key].sent += 1;
  writeJson(statePath, state);
}

/**
 * Track a reply for a specific template variant.
 * @param {string} platform
 * @param {string} variant
 */
export function trackDmReply(platform, variant) {
  const statePath = path.join(__dirname, 'dm-outreach-state.json');
  const state = readJson(statePath, {});

  if (!state.template_ab) return;

  const key = `${platform}_${variant}`;
  if (state.template_ab[key]) {
    state.template_ab[key].replied += 1;
    state.template_ab[key].reply_rate = state.template_ab[key].sent > 0
      ? Math.round((state.template_ab[key].replied / state.template_ab[key].sent) * 100 * 10) / 10
      : 0;
    writeJson(statePath, state);
  }
}

/**
 * Check if we should swap out the lowest-performing variant.
 * After 20 sends per variant, swap the lowest one.
 * @param {string} platform
 */
export function checkAndSwapLowestPerformer(platform) {
  const statePath = path.join(__dirname, 'dm-outreach-state.json');
  const state = readJson(statePath, {});

  if (!state.template_ab) return null;

  const variants = Object.values(state.template_ab)
    .filter(v => v.platform === platform && v.sent >= 20);

  if (variants.length < 2) {
    console.log(`[dm-ab] Not enough data for ${platform} to swap variants`);
    return null;
  }

  // Find lowest performer
  variants.sort((a, b) => a.reply_rate - b.reply_rate);
  const lowestPerformer = variants[0];

  console.log(`[dm-ab] Lowest performer on ${platform}: ${lowestPerformer.variant} (${lowestPerformer.reply_rate}% reply rate)`);

  // Archive the variant and mark for replacement
  if (!state.archived_variants) state.archived_variants = [];
  state.archived_variants.push({
    ...lowestPerformer,
    archived_at: new Date().toISOString(),
    reason: 'low_performance',
  });

  // Remove from active tracking
  delete state.template_ab[`${platform}_${lowestPerformer.variant}`];
  writeJson(statePath, state);

  return {
    platform,
    swapped_out: lowestPerformer.variant,
    reply_rate: lowestPerformer.reply_rate,
    message: `Swap in a new template variant for ${platform}`,
  };
}

/**
 * Get performance summary for a platform.
 */
export function getPerformanceSummary(platform) {
  const statePath = path.join(__dirname, 'dm-outreach-state.json');
  const state = readJson(statePath, {});

  if (!state.template_ab) return [];

  return Object.values(state.template_ab)
    .filter(v => v.platform === platform)
    .sort((a, b) => b.reply_rate - a.reply_rate);
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  if (command === 'send') {
    const [platform, variant] = process.argv.slice(3);
    trackDmSend(platform, variant);
    console.log(`Tracked send: ${platform} ${variant}`);
  } else if (command === 'reply') {
    const [platform, variant] = process.argv.slice(3);
    trackDmReply(platform, variant);
    console.log(`Tracked reply: ${platform} ${variant}`);
  } else if (command === 'check') {
    const platform = process.argv[3];
    const result = checkAndSwapLowestPerformer(platform);
    if (result) {
      console.log('Swap result:', result);
    }
  } else if (command === 'summary') {
    const platform = process.argv[3];
    const summary = getPerformanceSummary(platform);
    console.log(`Summary for ${platform}:`, summary);
  } else {
    console.log('Usage:');
    console.log('  node dm-template-ab-tracker.js send <platform> <variant>');
    console.log('  node dm-template-ab-tracker.js reply <platform> <variant>');
    console.log('  node dm-template-ab-tracker.js check <platform>');
    console.log('  node dm-template-ab-tracker.js summary <platform>');
  }
}
