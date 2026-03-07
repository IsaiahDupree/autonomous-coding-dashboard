#!/usr/bin/env node

/**
 * cloud-orchestrator.js — Pure-function Tests
 * =============================================
 * Tests: calculateGaps(), PLATFORM_DAILY_LIMITS, GOAL_SESSION_TEMPLATES
 * booking deduplication, platform limit enforcement, session template coverage.
 *
 * All tests are pure (no Supabase, no HTTP). Only the exported logic is tested.
 *
 * Run:
 *   node harness/test-cloud-orchestrator.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateGaps,
  PLATFORM_DAILY_LIMITS,
  GOAL_SESSION_TEMPLATES,
} from './cloud-orchestrator.js';

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeGoals(overrides = {}) {
  return {
    revenue: { current_monthly_usd: 0, target_monthly_usd: 5000 },
    growth:  { crm_contacts_target: 1000 },
    ...overrides,
  };
}

function makeMetrics(overrides = {}) {
  return {
    crm_contacts: 100,
    linkedin_prospects: 0,
    today_sessions: {},
    today_sessions_raw: [],
    sessions_today_total: 0,
    ...overrides,
  };
}

// ── PLATFORM_DAILY_LIMITS ─────────────────────────────────────────────────────
describe('PLATFORM_DAILY_LIMITS', () => {
  it('is a plain object', () => {
    assert.ok(typeof PLATFORM_DAILY_LIMITS === 'object' && PLATFORM_DAILY_LIMITS !== null);
  });

  it('covers all 5 active platforms', () => {
    for (const p of ['instagram', 'twitter', 'tiktok', 'threads', 'linkedin', 'upwork']) {
      assert.ok(p in PLATFORM_DAILY_LIMITS, `Missing platform: ${p}`);
    }
  });

  it('all limits are positive integers', () => {
    for (const [p, limit] of Object.entries(PLATFORM_DAILY_LIMITS)) {
      assert.ok(Number.isInteger(limit) && limit > 0, `${p} limit must be a positive integer, got ${limit}`);
    }
  });

  it('linkedin limit is reasonable (≤ 15 connections/day)', () => {
    assert.ok(PLATFORM_DAILY_LIMITS.linkedin <= 15, 'LinkedIn limit should be conservative');
  });
});

// ── GOAL_SESSION_TEMPLATES ────────────────────────────────────────────────────
describe('GOAL_SESSION_TEMPLATES', () => {
  it('covers all three goal categories', () => {
    assert.ok('revenue' in GOAL_SESSION_TEMPLATES, 'Missing revenue goal templates');
    assert.ok('audience' in GOAL_SESSION_TEMPLATES, 'Missing audience goal templates');
    assert.ok('engagement' in GOAL_SESSION_TEMPLATES, 'Missing engagement goal templates');
  });

  it('every template has platform, action, priority, goal_tag', () => {
    for (const [goal, templates] of Object.entries(GOAL_SESSION_TEMPLATES)) {
      for (const t of templates) {
        assert.ok(t.platform, `${goal} template missing platform`);
        assert.ok(t.action,   `${goal} template missing action`);
        assert.ok(typeof t.priority === 'number', `${goal} template priority must be a number`);
        assert.ok(t.goal_tag,  `${goal} template missing goal_tag`);
      }
    }
  });

  it('every template platform is in PLATFORM_DAILY_LIMITS', () => {
    for (const [goal, templates] of Object.entries(GOAL_SESSION_TEMPLATES)) {
      for (const t of templates) {
        assert.ok(
          t.platform in PLATFORM_DAILY_LIMITS,
          `${goal}:${t.platform} platform not in PLATFORM_DAILY_LIMITS`
        );
      }
    }
  });

  it('revenue templates include linkedin connection and DM sends', () => {
    const revActions = GOAL_SESSION_TEMPLATES.revenue.map(t => t.action);
    assert.ok(revActions.includes('linkedin_connection_send'), 'Missing linkedin_connection_send in revenue');
    assert.ok(revActions.includes('linkedin_dm_send'),         'Missing linkedin_dm_send in revenue');
  });

  it('engagement templates include inbox_check for key platforms', () => {
    const engTemplates = GOAL_SESSION_TEMPLATES.engagement;
    const platforms = engTemplates.filter(t => t.action === 'inbox_check').map(t => t.platform);
    assert.ok(platforms.includes('instagram'), 'Missing instagram inbox_check');
    assert.ok(platforms.includes('linkedin'),  'Missing linkedin inbox_check');
  });

  it('once_daily templates are only in revenue (not audience/engagement)', () => {
    for (const [goal, templates] of Object.entries(GOAL_SESSION_TEMPLATES)) {
      for (const t of templates) {
        if (t.schedule === 'once_daily') {
          assert.equal(goal, 'revenue', `once_daily should only be on revenue, found on ${goal}`);
        }
      }
    }
  });
});

// ── calculateGaps ─────────────────────────────────────────────────────────────
describe('calculateGaps — return shape', () => {
  it('returns an array', () => {
    const gaps = calculateGaps(makeGoals(), makeMetrics());
    assert.ok(Array.isArray(gaps));
  });

  it('always includes engagement gap (inbox check)', () => {
    const gaps = calculateGaps(makeGoals(), makeMetrics());
    assert.ok(gaps.some(g => g.goal === 'engagement'), 'engagement gap always present');
  });

  it('each gap has goal, urgency (number), label (string)', () => {
    const gaps = calculateGaps(makeGoals(), makeMetrics());
    for (const g of gaps) {
      assert.ok(typeof g.goal === 'string',   'gap.goal must be a string');
      assert.ok(typeof g.urgency === 'number', 'gap.urgency must be a number');
      assert.ok(typeof g.label === 'string',   'gap.label must be a string');
    }
  });

  it('gaps are sorted by urgency descending', () => {
    const gaps = calculateGaps(makeGoals(), makeMetrics());
    for (let i = 0; i < gaps.length - 1; i++) {
      assert.ok(gaps[i].urgency >= gaps[i + 1].urgency,
        `gap[${i}].urgency ${gaps[i].urgency} < gap[${i+1}].urgency ${gaps[i + 1].urgency}`);
    }
  });
});

describe('calculateGaps — revenue urgency', () => {
  it('includes revenue gap when current << target', () => {
    const gaps = calculateGaps(
      makeGoals({ revenue: { current_monthly_usd: 0, target_monthly_usd: 5000 } }),
      makeMetrics()
    );
    assert.ok(gaps.some(g => g.goal === 'revenue'), 'revenue gap should appear at $0/$5K');
  });

  it('omits revenue gap when current is ≥ 90% of target', () => {
    const gaps = calculateGaps(
      makeGoals({ revenue: { current_monthly_usd: 4600, target_monthly_usd: 5000 } }),
      makeMetrics()
    );
    assert.ok(!gaps.some(g => g.goal === 'revenue'), 'revenue gap should not appear at 92% of target');
  });

  it('higher revenue shortfall → higher urgency', () => {
    const bigGap = calculateGaps(
      makeGoals({ revenue: { current_monthly_usd: 0, target_monthly_usd: 5000 } }),
      makeMetrics()
    );
    const smallGap = calculateGaps(
      makeGoals({ revenue: { current_monthly_usd: 3000, target_monthly_usd: 5000 } }),
      makeMetrics()
    );
    const bigRevUrgency   = bigGap.find(g => g.goal === 'revenue')?.urgency ?? 0;
    const smallRevUrgency = smallGap.find(g => g.goal === 'revenue')?.urgency ?? 0;
    assert.ok(bigRevUrgency > smallRevUrgency,
      `urgency at $0/$5K (${bigRevUrgency}) should be > urgency at $3K/$5K (${smallRevUrgency})`);
  });

  it('revenue gap label includes current and target amounts', () => {
    const gaps = calculateGaps(
      makeGoals({ revenue: { current_monthly_usd: 1000, target_monthly_usd: 5000 } }),
      makeMetrics()
    );
    const rev = gaps.find(g => g.goal === 'revenue');
    assert.ok(rev, 'revenue gap must exist');
    assert.ok(rev.label.includes('1000'), 'label should include current amount');
    assert.ok(rev.label.includes('5000'), 'label should include target amount');
  });
});

describe('calculateGaps — CRM audience urgency', () => {
  it('includes audience gap when CRM contacts << target', () => {
    const gaps = calculateGaps(
      makeGoals(),
      makeMetrics({ crm_contacts: 10 })
    );
    assert.ok(gaps.some(g => g.goal === 'audience'), 'audience gap should appear when CRM is low');
  });

  it('omits audience gap when CRM is ≥ 95% of target', () => {
    const gaps = calculateGaps(
      makeGoals({ growth: { crm_contacts_target: 1000 } }),
      makeMetrics({ crm_contacts: 960 })
    );
    assert.ok(!gaps.some(g => g.goal === 'audience'), 'audience gap should not appear at 96% of CRM target');
  });

  it('audience urgency scales with CRM shortfall', () => {
    const largeShortfall = calculateGaps(makeGoals(), makeMetrics({ crm_contacts: 0 }));
    const smallShortfall = calculateGaps(makeGoals(), makeMetrics({ crm_contacts: 800 }));
    const large = largeShortfall.find(g => g.goal === 'audience')?.urgency ?? 0;
    const small = smallShortfall.find(g => g.goal === 'audience')?.urgency ?? 0;
    assert.ok(large > small, `CRM=0 urgency (${large}) should be > CRM=800 urgency (${small})`);
  });
});

describe('calculateGaps — all goals present in output', () => {
  it('at most 3 distinct goal types appear', () => {
    const gaps = calculateGaps(makeGoals(), makeMetrics());
    const goalTypes = new Set(gaps.map(g => g.goal));
    assert.ok(goalTypes.size <= 3, `Expected at most 3 goal types, got ${goalTypes.size}: ${[...goalTypes]}`);
  });

  it('all gap goal values are known types', () => {
    const KNOWN = new Set(['revenue', 'audience', 'engagement']);
    const gaps = calculateGaps(makeGoals(), makeMetrics());
    for (const g of gaps) {
      assert.ok(KNOWN.has(g.goal), `Unknown goal type: "${g.goal}"`);
    }
  });

  it('urgency values are between 0 and 1.5 (reasonable range)', () => {
    const gaps = calculateGaps(makeGoals(), makeMetrics());
    for (const g of gaps) {
      assert.ok(g.urgency >= 0, `urgency must be non-negative, got ${g.urgency}`);
      assert.ok(g.urgency <= 1.5, `urgency seems too high: ${g.urgency}`);
    }
  });
});

console.log('\n✅ cloud-orchestrator (calculateGaps + templates) tests complete.\n');
