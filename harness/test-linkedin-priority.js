#!/usr/bin/env node

/**
 * linkedin-connection-sender.js — priorityScore Tests
 * ====================================================
 * priorityScore() determines which LinkedIn prospects get connection requests
 * first. Wrong scores waste the daily quota on low-quality leads.
 *
 * Score breakdown (max ~104):
 *   ICP score (0-10) × 6          = 0–60
 *   Signal reasons (>2) × 3       = 0–15
 *   Source warmth (engager)        = +10
 *   Connection degree (2nd)        = +8
 *   Strategy intent (high/med)     = +8/+4
 *   Recency (<24h/<72h)            = +3/+1
 *
 * Run:
 *   node harness/test-linkedin-priority.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { priorityScore } from './linkedin-connection-sender.js';

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeItem(overrides = {}) {
  return {
    source: 'search',
    strategy: '',
    queued_at: new Date().toISOString(), // fresh
    prospect: {
      icp_score: 5,
      icp_reasons: ['has_saas', 'uses_ai'],
      connectionDegree: '3rd',
    },
    ...overrides,
  };
}

// ── Basic scoring ─────────────────────────────────────────────────────────────
describe('priorityScore — basic', () => {
  it('returns a number', () => {
    assert.equal(typeof priorityScore(makeItem()), 'number');
  });

  it('returns an integer (Math.round applied)', () => {
    const s = priorityScore(makeItem());
    assert.equal(s, Math.round(s));
  });

  it('returns 0 for an empty item (no prospect data)', () => {
    const s = priorityScore({});
    assert.equal(s, 0);
  });

  it('returns non-negative for any valid item', () => {
    const s = priorityScore(makeItem({ prospect: { icp_score: 0 } }));
    assert.ok(s >= 0);
  });
});

// ── ICP score weighting (× 6) ─────────────────────────────────────────────────
describe('ICP score contribution (× 6)', () => {
  it('icp_score 10 contributes 60 points', () => {
    const base = priorityScore(makeItem({ prospect: { icp_score: 0, icp_reasons: [] } }));
    const high = priorityScore(makeItem({ prospect: { icp_score: 10, icp_reasons: [] } }));
    assert.equal(high - base, 60);
  });

  it('icp_score 5 contributes 30 points', () => {
    const base = priorityScore(makeItem({ prospect: { icp_score: 0, icp_reasons: [] } }));
    const mid  = priorityScore(makeItem({ prospect: { icp_score: 5, icp_reasons: [] } }));
    assert.equal(mid - base, 30);
  });

  it('missing icp_score defaults to 0 (no contribution)', () => {
    const s = priorityScore(makeItem({ prospect: { icp_reasons: [] } }));
    assert.ok(s >= 0);
  });

  it('higher icp_score always produces higher score (all else equal)', () => {
    const low = priorityScore(makeItem({ prospect: { icp_score: 3, icp_reasons: [] } }));
    const high = priorityScore(makeItem({ prospect: { icp_score: 8, icp_reasons: [] } }));
    assert.ok(high > low);
  });
});

// ── Signal reasons richness ───────────────────────────────────────────────────
describe('signal reasons richness (+3 per reason beyond 2, max +15)', () => {
  function scoreWithReasons(n) {
    const reasons = Array.from({ length: n }, (_, i) => `reason_${i}`);
    return priorityScore(makeItem({ prospect: { icp_score: 0, icp_reasons: reasons } }));
  }

  it('0 reasons → 0 bonus', () => {
    const s0 = scoreWithReasons(0);
    const s2 = scoreWithReasons(2);
    assert.equal(s0, s2, '0 and 2 reasons both contribute 0 bonus');
  });

  it('3 reasons → +3 bonus', () => {
    assert.equal(scoreWithReasons(3) - scoreWithReasons(2), 3);
  });

  it('4 reasons → +6 bonus', () => {
    assert.equal(scoreWithReasons(4) - scoreWithReasons(2), 6);
  });

  it('7 reasons → max +15 bonus (capped at 5 extra)', () => {
    const s7  = scoreWithReasons(7);
    const s20 = scoreWithReasons(20);
    assert.equal(s7, s20, 'bonus caps at 5 extra reasons (7 reasons = cap)');
    assert.equal(s7 - scoreWithReasons(2), 15);
  });
});

// ── Source warmth ─────────────────────────────────────────────────────────────
describe('source warmth (+10 for engager sources)', () => {
  const WARM_SOURCES = ['post_engagement', 'engagement', 'commenter'];
  const COLD_SOURCES = ['search', 'keyword', '', 'dm_sweep'];

  for (const src of WARM_SOURCES) {
    it(`source="${src}" adds +10`, () => {
      const warm = priorityScore(makeItem({ source: src, prospect: { icp_score: 0, icp_reasons: [] } }));
      const cold = priorityScore(makeItem({ source: 'search', prospect: { icp_score: 0, icp_reasons: [] } }));
      assert.equal(warm - cold, 10);
    });
  }

  for (const src of COLD_SOURCES) {
    it(`source="${src}" adds no warmth bonus`, () => {
      const s = priorityScore(makeItem({ source: src, prospect: { icp_score: 0, icp_reasons: [] } }));
      const base = priorityScore(makeItem({ source: 'search', prospect: { icp_score: 0, icp_reasons: [] } }));
      assert.equal(s, base);
    });
  }
});

// ── Connection degree ─────────────────────────────────────────────────────────
describe('connection degree (+8 for 2nd degree)', () => {
  it('2nd degree adds +8', () => {
    const second = priorityScore(makeItem({ prospect: { icp_score: 0, icp_reasons: [], connectionDegree: '2nd' } }));
    const third  = priorityScore(makeItem({ prospect: { icp_score: 0, icp_reasons: [], connectionDegree: '3rd' } } ));
    assert.equal(second - third, 8);
  });

  it('3rd degree adds no bonus', () => {
    const s = priorityScore(makeItem({ prospect: { icp_score: 0, icp_reasons: [], connectionDegree: '3rd' } }));
    const base = priorityScore(makeItem({ prospect: { icp_score: 0, icp_reasons: [] } }));
    assert.equal(s, base);
  });

  it('missing connectionDegree adds no bonus', () => {
    const s = priorityScore(makeItem({ prospect: { icp_score: 0, icp_reasons: [] } }));
    const base = priorityScore(makeItem({ prospect: { icp_score: 0, icp_reasons: [], connectionDegree: '3rd' } }));
    assert.equal(s, base);
  });
});

// ── Strategy intent ───────────────────────────────────────────────────────────
describe('strategy intent (+8 high, +4 medium, 0 other)', () => {
  const HIGH_INTENT = ['AI SaaS Founders', 'Bootstrapped SaaS', 'App Creation Founders', 'No-Code SaaS Founders', 'AI SaaS Founders 3rd'];
  const MED_INTENT  = ['Agency AI Owners', 'Creator Economy AI', 'Web App Builders', 'App Founders 3rd'];

  for (const strat of HIGH_INTENT) {
    it(`strategy="${strat}" adds +8`, () => {
      const high = priorityScore(makeItem({ strategy: strat, prospect: { icp_score: 0, icp_reasons: [] } }));
      const none = priorityScore(makeItem({ strategy: '', prospect: { icp_score: 0, icp_reasons: [] } }));
      assert.equal(high - none, 8);
    });
  }

  for (const strat of MED_INTENT) {
    it(`strategy="${strat}" adds +4`, () => {
      const med  = priorityScore(makeItem({ strategy: strat, prospect: { icp_score: 0, icp_reasons: [] } }));
      const none = priorityScore(makeItem({ strategy: '', prospect: { icp_score: 0, icp_reasons: [] } }));
      assert.equal(med - none, 4);
    });
  }

  it('unknown strategy adds 0', () => {
    const s    = priorityScore(makeItem({ strategy: 'Random Strategy', prospect: { icp_score: 0, icp_reasons: [] } }));
    const base = priorityScore(makeItem({ strategy: '', prospect: { icp_score: 0, icp_reasons: [] } }));
    assert.equal(s, base);
  });
});

// ── Recency ───────────────────────────────────────────────────────────────────
describe('recency bonus (+3 <24h, +1 <72h, +0 older)', () => {
  function scoreWithAge(hoursAgo) {
    const queued_at = new Date(Date.now() - hoursAgo * 3_600_000).toISOString();
    return priorityScore(makeItem({ queued_at, prospect: { icp_score: 0, icp_reasons: [] } }));
  }

  it('<24h → +3 bonus', () => {
    const fresh = scoreWithAge(1);
    const old   = scoreWithAge(100);
    assert.equal(fresh - old, 3);
  });

  it('24–72h → +1 bonus', () => {
    const mid = scoreWithAge(48);
    const old = scoreWithAge(100);
    assert.equal(mid - old, 1);
  });

  it('>72h → no bonus', () => {
    const stale = scoreWithAge(100);
    const ref   = scoreWithAge(200); // also no bonus
    assert.equal(stale, ref);
  });

  it('missing queued_at treated as very old (no bonus)', () => {
    const s    = priorityScore(makeItem({ queued_at: undefined, prospect: { icp_score: 0, icp_reasons: [] } }));
    const old  = priorityScore(makeItem({ queued_at: new Date(0).toISOString(), prospect: { icp_score: 0, icp_reasons: [] } }));
    assert.equal(s, old);
  });
});

// ── Composite ranking ─────────────────────────────────────────────────────────
describe('composite ranking — high quality beats low quality', () => {
  it('high ICP + warm source + high intent outscores low ICP cold search', () => {
    const ideal = priorityScore({
      source: 'post_engagement',
      strategy: 'AI SaaS Founders',
      queued_at: new Date().toISOString(),
      prospect: { icp_score: 9, icp_reasons: ['a','b','c','d','e'], connectionDegree: '2nd' },
    });
    const poor = priorityScore({
      source: 'search',
      strategy: '',
      queued_at: new Date(Date.now() - 100 * 3_600_000).toISOString(),
      prospect: { icp_score: 2, icp_reasons: ['a'], connectionDegree: '3rd' },
    });
    assert.ok(ideal > poor, `ideal score ${ideal} should beat poor score ${poor}`);
  });

  it('icp_score is the dominant factor — icp=10 beats all other bonuses combined (except reasons)', () => {
    const highIcp = priorityScore(makeItem({ prospect: { icp_score: 10, icp_reasons: [] } })); // 60
    const allBonuses = priorityScore({ // max without icp: 10+8+8+3+15 = 44
      source: 'post_engagement',
      strategy: 'AI SaaS Founders',
      queued_at: new Date().toISOString(),
      prospect: { icp_score: 0, icp_reasons: ['a','b','c','d','e','f','g'], connectionDegree: '2nd' },
    });
    assert.ok(highIcp > allBonuses, `icp=10 (${highIcp}) should beat all bonuses with icp=0 (${allBonuses})`);
  });
});

console.log('\n✅ linkedin-priority (priorityScore) tests complete.\n');
