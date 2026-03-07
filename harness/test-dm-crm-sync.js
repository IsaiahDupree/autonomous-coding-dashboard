#!/usr/bin/env node

/**
 * dm-crm-sync.js — normalizeQueue + patchRawEntry Tests
 * =======================================================
 * normalizeQueue() bridges two completely different queue formats:
 *   - LinkedIn: top-level array of {id, status, prospect:{...}, crm_synced}
 *   - Standard: {queue: [{platform, username, status, ...}]}
 *
 * A bug here means DMs get re-sent, CRM contacts duplicated, or synced=false stuck forever.
 *
 * Run:
 *   node harness/test-dm-crm-sync.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeQueue, patchRawEntry } from './dm-crm-sync.js';

// ── normalizeQueue — null / empty input ───────────────────────────────────────
describe('normalizeQueue — null/empty input', () => {
  it('returns null for null input', () => {
    assert.equal(normalizeQueue('instagram', null), null);
  });

  it('returns null for undefined input', () => {
    assert.equal(normalizeQueue('instagram', undefined), null);
  });

  it('returns empty array for empty array input (LinkedIn)', () => {
    const result = normalizeQueue('linkedin', []);
    assert.deepEqual(result, []);
  });

  it('returns empty array for {queue:[]} standard format', () => {
    const result = normalizeQueue('instagram', { queue: [] });
    assert.deepEqual(result, []);
  });
});

// ── normalizeQueue — LinkedIn format (top-level array) ────────────────────────
describe('normalizeQueue — LinkedIn array format', () => {
  function makeLinkedInEntry(overrides = {}) {
    return {
      id: 'li-001',
      status: 'pending_approval',
      prospect: {
        name: 'Jane Doe',
        profileUrl: 'https://linkedin.com/in/janedoe',
        icp_score: 8,
        icp_reasons: ['saas_founder', 'uses_ai'],
      },
      drafted_message: 'Hey Jane!',
      sent_at: null,
      queued_at: '2026-03-01T10:00:00Z',
      crm_synced: false,
      crm_id: null,
      crm_fail_count: 0,
      ...overrides,
    };
  }

  it('handles top-level array (LinkedIn format)', () => {
    const raw = [makeLinkedInEntry()];
    const result = normalizeQueue('linkedin', raw);
    assert.ok(Array.isArray(result));
    assert.equal(result.length, 1);
  });

  it('maps id correctly', () => {
    const raw = [makeLinkedInEntry({ id: 'li-999' })];
    const [entry] = normalizeQueue('linkedin', raw);
    assert.equal(entry.id, 'li-999');
  });

  it('maps prospect.name to username', () => {
    const raw = [makeLinkedInEntry()];
    const [entry] = normalizeQueue('linkedin', raw);
    assert.equal(entry.username, 'Jane Doe');
  });

  it('maps prospect.profileUrl to profileUrl', () => {
    const raw = [makeLinkedInEntry()];
    const [entry] = normalizeQueue('linkedin', raw);
    assert.equal(entry.profileUrl, 'https://linkedin.com/in/janedoe');
  });

  it('maps icp_score to score', () => {
    const raw = [makeLinkedInEntry()];
    const [entry] = normalizeQueue('linkedin', raw);
    assert.equal(entry.score, 8);
  });

  it('maps icp_reasons to signals', () => {
    const raw = [makeLinkedInEntry()];
    const [entry] = normalizeQueue('linkedin', raw);
    assert.deepEqual(entry.signals, ['saas_founder', 'uses_ai']);
  });

  it('maps drafted_message to message', () => {
    const raw = [makeLinkedInEntry({ drafted_message: 'Hello!' })];
    const [entry] = normalizeQueue('linkedin', raw);
    assert.equal(entry.message, 'Hello!');
  });

  it('normalises status: pending_approval → pending', () => {
    const raw = [makeLinkedInEntry({ status: 'pending_approval' })];
    const [entry] = normalizeQueue('linkedin', raw);
    assert.equal(entry.status, 'pending');
  });

  it('passes through non-pending_approval status unchanged', () => {
    for (const status of ['sent', 'approved', 'connection_requested']) {
      const raw = [makeLinkedInEntry({ status })];
      const [entry] = normalizeQueue('linkedin', raw);
      assert.equal(entry.status, status, `status "${status}" should pass through`);
    }
  });

  it('maps crm_synced to crmlite_synced', () => {
    const raw = [makeLinkedInEntry({ crm_synced: true })];
    const [entry] = normalizeQueue('linkedin', raw);
    assert.equal(entry.crmlite_synced, true);
  });

  it('maps crm_id to crmlite_contact_id', () => {
    const raw = [makeLinkedInEntry({ crm_id: 'contact-42' })];
    const [entry] = normalizeQueue('linkedin', raw);
    assert.equal(entry.crmlite_contact_id, 'contact-42');
  });

  it('crmlite_synced defaults to false when crm_synced is falsy', () => {
    const raw = [makeLinkedInEntry({ crm_synced: undefined })];
    const [entry] = normalizeQueue('linkedin', raw);
    assert.equal(entry.crmlite_synced, false);
  });

  it('crmlite_fail_count defaults to 0', () => {
    const raw = [makeLinkedInEntry({ crm_fail_count: undefined })];
    const [entry] = normalizeQueue('linkedin', raw);
    assert.equal(entry.crmlite_fail_count, 0);
  });

  it('preserves _raw reference to original entry', () => {
    const original = makeLinkedInEntry();
    const [entry] = normalizeQueue('linkedin', [original]);
    assert.strictEqual(entry._raw, original);
  });

  it('sets platform to "linkedin"', () => {
    const raw = [makeLinkedInEntry()];
    const [entry] = normalizeQueue('linkedin', raw);
    assert.equal(entry.platform, 'linkedin');
  });

  it('handles missing prospect gracefully (no crash)', () => {
    const raw = [{ id: 'li-bare', status: 'pending_approval' }];
    assert.doesNotThrow(() => normalizeQueue('linkedin', raw));
    const [entry] = normalizeQueue('linkedin', raw);
    assert.equal(entry.id, 'li-bare');
  });

  it('normalises multiple entries', () => {
    const raw = [makeLinkedInEntry({ id: 'a' }), makeLinkedInEntry({ id: 'b' }), makeLinkedInEntry({ id: 'c' })];
    const result = normalizeQueue('linkedin', raw);
    assert.equal(result.length, 3);
    assert.deepEqual(result.map(e => e.id), ['a', 'b', 'c']);
  });
});

// ── normalizeQueue — standard format ({queue: [...]}) ─────────────────────────
describe('normalizeQueue — standard {queue:[]} format', () => {
  function makeStandardEntry(overrides = {}) {
    return {
      platform: 'instagram',
      username: 'saraheashley',
      status: 'pending',
      message: 'Hey!',
      crmlite_synced: false,
      ...overrides,
    };
  }

  it('reads from queue array', () => {
    const raw = { queue: [makeStandardEntry()] };
    const result = normalizeQueue('instagram', raw);
    assert.equal(result.length, 1);
  });

  it('spreads entry fields into normalized entry', () => {
    const raw = { queue: [makeStandardEntry({ username: 'alice' })] };
    const [entry] = normalizeQueue('instagram', raw);
    assert.equal(entry.username, 'alice');
  });

  it('preserves _raw reference', () => {
    const original = makeStandardEntry();
    const raw = { queue: [original] };
    const [entry] = normalizeQueue('instagram', raw);
    assert.strictEqual(entry._raw, original);
  });

  it('handles missing queue key (no crash)', () => {
    const result = normalizeQueue('instagram', {});
    assert.deepEqual(result, []);
  });

  it('handles multiple standard entries', () => {
    const raw = { queue: [makeStandardEntry({ username: 'a' }), makeStandardEntry({ username: 'b' })] };
    const result = normalizeQueue('instagram', raw);
    assert.equal(result.length, 2);
  });
});

// ── patchRawEntry ─────────────────────────────────────────────────────────────
describe('patchRawEntry — LinkedIn format', () => {
  it('maps crmlite_synced → crm_synced on LinkedIn entries', () => {
    const rawEntry = { crm_synced: false, crm_id: null };
    patchRawEntry('linkedin', rawEntry, { crmlite_synced: true });
    assert.equal(rawEntry.crm_synced, true);
  });

  it('maps crmlite_contact_id → crm_id', () => {
    const rawEntry = { crm_synced: false, crm_id: null };
    patchRawEntry('linkedin', rawEntry, { crmlite_contact_id: 'contact-99' });
    assert.equal(rawEntry.crm_id, 'contact-99');
  });

  it('maps crmlite_synced_at → crm_synced_at', () => {
    const rawEntry = {};
    const ts = '2026-03-07T00:00:00Z';
    patchRawEntry('linkedin', rawEntry, { crmlite_synced_at: ts });
    assert.equal(rawEntry.crm_synced_at, ts);
  });

  it('maps crmlite_fail_count → crm_fail_count', () => {
    const rawEntry = { crm_fail_count: 0 };
    patchRawEntry('linkedin', rawEntry, { crmlite_fail_count: 3 });
    assert.equal(rawEntry.crm_fail_count, 3);
  });

  it('does not leak unknown normalized fields onto raw entry', () => {
    const rawEntry = {};
    patchRawEntry('linkedin', rawEntry, { crmlite_synced: true, someOtherField: 'x' });
    assert.ok(!('someOtherField' in rawEntry), 'unknown fields should not be written to LinkedIn raw entry');
  });
});

describe('patchRawEntry — standard platforms', () => {
  it('Object.assigns all updates for non-linkedin platforms', () => {
    const rawEntry = { username: 'alice', status: 'pending', crmlite_synced: false };
    patchRawEntry('instagram', rawEntry, { crmlite_synced: true, crmlite_contact_id: 'c-1' });
    assert.equal(rawEntry.crmlite_synced, true);
    assert.equal(rawEntry.crmlite_contact_id, 'c-1');
  });

  it('works for twitter, tiktok, threads too', () => {
    for (const platform of ['twitter', 'tiktok', 'threads']) {
      const rawEntry = { crmlite_synced: false };
      patchRawEntry(platform, rawEntry, { crmlite_synced: true });
      assert.equal(rawEntry.crmlite_synced, true, `${platform} patch failed`);
    }
  });
});

console.log('\n✅ dm-crm-sync (normalizeQueue, patchRawEntry) tests complete.\n');
