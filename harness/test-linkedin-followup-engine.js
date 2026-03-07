#!/usr/bin/env node

/**
 * linkedin-followup-engine.js — needsFollowup, generateMessage, getLinkedInUsername Tests
 * ==========================================================================================
 * needsFollowup() is the stage-gate for the entire LinkedIn follow-up pipeline.
 * Wrong timing/stage logic = follow-ups sent too early, too late, or never.
 * generateMessage() personalises the outreach — bugs here = generic/wrong messages.
 *
 * Run:
 *   node harness/test-linkedin-followup-engine.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { needsFollowup, generateMessage, getLinkedInUsername } from './linkedin-followup-engine.js';

// ── Helpers ───────────────────────────────────────────────────────────────────
function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

function makeContact(overrides = {}) {
  return {
    pipeline_stage: 'first_touch',
    tags: ['linkedin', 'connected'],
    last_touched_at: daysAgo(5),
    created_at: daysAgo(10),
    display_name: 'Jane Doe',
    notes: 'Company: Acme SaaS',
    crm_platform_accounts: [{ platform: 'linkedin', username: 'janedoe-li' }],
    ...overrides,
  };
}

// ── needsFollowup — first_touch stage ─────────────────────────────────────────
describe('needsFollowup — first_touch stage', () => {
  it('returns { messageType: "value" } after 3+ days connected', () => {
    const c = makeContact({ pipeline_stage: 'first_touch', tags: ['linkedin', 'connected'], last_touched_at: daysAgo(4) });
    const result = needsFollowup(c);
    assert.ok(result !== null, 'expected follow-up needed');
    assert.equal(result.messageType, 'value');
    assert.equal(result.nextStage, 'value_sent');
  });

  it('returns null when only 1 day has passed (too early)', () => {
    const c = makeContact({ pipeline_stage: 'first_touch', tags: ['linkedin', 'connected'], last_touched_at: daysAgo(1) });
    assert.equal(needsFollowup(c), null);
  });

  it('returns null when exactly 2 days have passed (still too early)', () => {
    const c = makeContact({ pipeline_stage: 'first_touch', tags: ['linkedin', 'connected'], last_touched_at: daysAgo(2) });
    assert.equal(needsFollowup(c), null);
  });

  it('returns null when "connected" tag is missing (not yet connected)', () => {
    const c = makeContact({ pipeline_stage: 'first_touch', tags: ['linkedin'], last_touched_at: daysAgo(5) });
    assert.equal(needsFollowup(c), null);
  });

  it('returns null when "linkedin" tag is missing', () => {
    const c = makeContact({ pipeline_stage: 'first_touch', tags: ['connected'], last_touched_at: daysAgo(5) });
    assert.equal(needsFollowup(c), null);
  });

  it('returns null when tags is empty', () => {
    const c = makeContact({ pipeline_stage: 'first_touch', tags: [], last_touched_at: daysAgo(5) });
    assert.equal(needsFollowup(c), null);
  });

  it('uses created_at when last_touched_at is null', () => {
    const c = makeContact({
      pipeline_stage: 'first_touch',
      tags: ['linkedin', 'connected'],
      last_touched_at: null,
      created_at: daysAgo(10),
    });
    const result = needsFollowup(c);
    assert.ok(result !== null, 'should use created_at fallback for timing');
    assert.equal(result.messageType, 'value');
  });
});

// ── needsFollowup — value_sent stage ─────────────────────────────────────────
describe('needsFollowup — value_sent stage', () => {
  it('returns { messageType: "offer" } after 7+ days', () => {
    const c = makeContact({ pipeline_stage: 'value_sent', tags: ['linkedin'], last_touched_at: daysAgo(8) });
    const result = needsFollowup(c);
    assert.ok(result !== null);
    assert.equal(result.messageType, 'offer');
    assert.equal(result.nextStage, 'offer_sent');
  });

  it('returns null when only 5 days have passed (< 7)', () => {
    const c = makeContact({ pipeline_stage: 'value_sent', tags: ['linkedin'], last_touched_at: daysAgo(5) });
    assert.equal(needsFollowup(c), null);
  });

  it('offer follow-up does not require "connected" tag', () => {
    const c = makeContact({ pipeline_stage: 'value_sent', tags: ['linkedin'], last_touched_at: daysAgo(8) });
    const result = needsFollowup(c);
    assert.ok(result !== null);
    assert.equal(result.messageType, 'offer');
  });
});

// ── needsFollowup — other stages ─────────────────────────────────────────────
describe('needsFollowup — stages with no follow-up rule', () => {
  for (const stage of ['offer_sent', 'replied', 'closed', 'prospect', 'unknown']) {
    it(`returns null for stage "${stage}"`, () => {
      const c = makeContact({ pipeline_stage: stage, last_touched_at: daysAgo(30) });
      assert.equal(needsFollowup(c), null, `stage "${stage}" should not trigger follow-up`);
    });
  }
});

// ── generateMessage — value type ──────────────────────────────────────────────
describe('generateMessage — value messageType', () => {
  it('returns a non-empty string', () => {
    const msg = generateMessage(makeContact(), 'value');
    assert.ok(typeof msg === 'string' && msg.length > 0);
  });

  it('includes the first name from display_name', () => {
    const msg = generateMessage(makeContact({ display_name: 'Alice Smith' }), 'value');
    assert.ok(msg.includes('Alice'), `expected "Alice" in: ${msg}`);
  });

  it('includes company name from notes', () => {
    const msg = generateMessage(makeContact({ notes: 'Company: CloudBuild' }), 'value');
    assert.ok(msg.includes('CloudBuild'), `expected "CloudBuild" in: ${msg}`);
  });

  it('falls back to "your company" when notes has no Company: line', () => {
    const msg = generateMessage(makeContact({ notes: 'random notes' }), 'value');
    assert.ok(msg.includes('your company'), `expected "your company" fallback: ${msg}`);
  });

  it('uses "there" when display_name is empty', () => {
    const msg = generateMessage(makeContact({ display_name: '' }), 'value');
    assert.ok(msg.includes('there'), `expected "there" fallback: ${msg}`);
  });
});

// ── generateMessage — offer type ──────────────────────────────────────────────
describe('generateMessage — offer messageType', () => {
  it('returns a non-empty string', () => {
    const msg = generateMessage(makeContact(), 'offer');
    assert.ok(typeof msg === 'string' && msg.length > 0);
  });

  it('includes the first name', () => {
    const msg = generateMessage(makeContact({ display_name: 'Bob Johnson' }), 'offer');
    assert.ok(msg.includes('Bob'), `expected "Bob" in: ${msg}`);
  });

  it('references "AI Automation Audit"', () => {
    const msg = generateMessage(makeContact(), 'offer');
    assert.ok(msg.toLowerCase().includes('ai automation audit'), `expected audit reference: ${msg}`);
  });
});

// ── generateMessage — unknown type ────────────────────────────────────────────
describe('generateMessage — unknown messageType', () => {
  it('returns empty string for unknown type', () => {
    const msg = generateMessage(makeContact(), 'unknown_type');
    assert.equal(msg, '');
  });
});

// ── getLinkedInUsername ───────────────────────────────────────────────────────
describe('getLinkedInUsername', () => {
  it('extracts username from crm_platform_accounts', () => {
    const c = makeContact({
      crm_platform_accounts: [{ platform: 'linkedin', username: 'li-user-123' }],
    });
    assert.equal(getLinkedInUsername(c), 'li-user-123');
  });

  it('falls back to platform_accounts field', () => {
    const c = {
      platform_accounts: [{ platform: 'linkedin', username: 'li-fallback' }],
    };
    assert.equal(getLinkedInUsername(c), 'li-fallback');
  });

  it('returns null when no linkedin account exists', () => {
    const c = makeContact({
      crm_platform_accounts: [{ platform: 'instagram', username: 'ig-user' }],
    });
    assert.equal(getLinkedInUsername(c), null);
  });

  it('returns null when accounts array is empty', () => {
    const c = makeContact({ crm_platform_accounts: [] });
    assert.equal(getLinkedInUsername(c), null);
  });

  it('returns null when accounts fields are missing', () => {
    assert.equal(getLinkedInUsername({}), null);
  });
});

console.log('\n✅ linkedin-followup-engine (needsFollowup, generateMessage, getLinkedInUsername) tests complete.\n');
