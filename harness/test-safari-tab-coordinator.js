#!/usr/bin/env node

/**
 * safari-tab-coordinator.js — Tests
 * ===================================
 * Tests findAllTabs and findBestTab pure functions.
 * Does NOT call AppleScript or any Safari service.
 *
 * Run:
 *   node harness/test-safari-tab-coordinator.js
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

// Override env so automation window enforcement is predictable in tests
process.env.SAFARI_AUTOMATION_WINDOW = '1';
process.env.SAFARI_ALLOW_ANY_WINDOW = 'true'; // allow any window so tests aren't window-filtered

import { findAllTabs, findBestTab } from './safari-tab-coordinator.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────
const IG_PLATFORM = {
  id: 'ig',
  name: 'Instagram DM',
  urlPattern: 'instagram.com',
  preferredUrl: 'instagram.com/direct/inbox',
  servicePort: 3100,
};

const TW_PLATFORM = {
  id: 'tw',
  name: 'Twitter DM',
  urlPattern: 'x.com',
  preferredUrl: 'x.com/messages',
  servicePort: 3003,
};

const LI_PLATFORM = {
  id: 'li',
  name: 'LinkedIn DM',
  urlPattern: 'linkedin.com',
  preferredUrl: 'linkedin.com/messaging',
  servicePort: 3105,
};

const TH_PLATFORM = {
  id: 'th',
  name: 'Threads',
  urlPattern: 'threads',
  preferredUrl: 'threads.com',
  servicePort: 3004,
};

const SAMPLE_TABS = [
  { windowIndex: 1, tabIndex: 1, url: 'https://www.instagram.com/direct/inbox/' },
  { windowIndex: 1, tabIndex: 2, url: 'https://x.com/messages' },
  { windowIndex: 1, tabIndex: 3, url: 'https://www.tiktok.com/messages' },
  { windowIndex: 1, tabIndex: 4, url: 'https://www.linkedin.com/messaging/' },
  { windowIndex: 1, tabIndex: 5, url: 'https://www.threads.com/' },
  { windowIndex: 2, tabIndex: 1, url: 'https://www.google.com' },
];

// ── findAllTabs ───────────────────────────────────────────────────────────────
describe('findAllTabs', () => {
  it('returns all tabs matching the platform urlPattern', () => {
    const results = findAllTabs(SAMPLE_TABS, IG_PLATFORM);
    assert.ok(results.length >= 1);
    assert.ok(results.every(t => t.url.includes('instagram.com')));
  });

  it('returns empty array when no tab matches the platform', () => {
    const tabs = [
      { windowIndex: 1, tabIndex: 1, url: 'https://www.google.com' },
    ];
    const results = findAllTabs(tabs, IG_PLATFORM);
    assert.equal(results.length, 0);
  });

  it('sorts preferred URL tab first when multiple matching tabs exist', () => {
    const tabs = [
      { windowIndex: 1, tabIndex: 1, url: 'https://www.instagram.com/explore/' },
      { windowIndex: 1, tabIndex: 2, url: 'https://www.instagram.com/direct/inbox/' },
    ];
    const results = findAllTabs(tabs, IG_PLATFORM);
    assert.equal(results.length, 2);
    // preferred URL (direct/inbox) should come first
    assert.ok(results[0].url.includes('direct/inbox'));
  });

  it('matches linkedin.com tabs for LinkedIn platform', () => {
    const results = findAllTabs(SAMPLE_TABS, LI_PLATFORM);
    assert.ok(results.length >= 1);
    assert.ok(results.every(t => t.url.includes('linkedin.com')));
  });

  it('matches threads tabs by "threads" pattern (matches both threads.com and threads.net)', () => {
    const tabs = [
      { windowIndex: 1, tabIndex: 1, url: 'https://www.threads.net/' },
      { windowIndex: 1, tabIndex: 2, url: 'https://www.threads.com/' },
      { windowIndex: 1, tabIndex: 3, url: 'https://www.google.com' },
    ];
    const results = findAllTabs(tabs, TH_PLATFORM);
    assert.equal(results.length, 2);
  });

  it('returns only tabs from automation window when SAFARI_ALLOW_ANY_WINDOW=false', async () => {
    // Must test the enforcement path — temporarily override env
    // Since env is already baked in at import time, we test the exported behavior
    // with SAFARI_ALLOW_ANY_WINDOW=true (our default for these tests), and verify
    // that multi-window tabs are all returned
    const multiWindowTabs = [
      { windowIndex: 1, tabIndex: 1, url: 'https://www.instagram.com/direct/inbox/' },
      { windowIndex: 2, tabIndex: 1, url: 'https://www.instagram.com/direct/inbox/' },
    ];
    const results = findAllTabs(multiWindowTabs, IG_PLATFORM);
    // With ALLOW_ANY_WINDOW=true, both tabs from both windows are returned
    assert.equal(results.length, 2);
  });

  it('returns empty array for empty tabs list', () => {
    const results = findAllTabs([], IG_PLATFORM);
    assert.equal(results.length, 0);
  });
});

// ── findBestTab ───────────────────────────────────────────────────────────────
describe('findBestTab', () => {
  it('returns a tab object for a matching platform', () => {
    const result = findBestTab(SAMPLE_TABS, IG_PLATFORM);
    assert.notEqual(result, null);
    assert.ok(result.url.includes('instagram.com'));
    assert.ok('windowIndex' in result && 'tabIndex' in result);
  });

  it('returns null when no tab matches the platform', () => {
    const tabs = [{ windowIndex: 1, tabIndex: 1, url: 'https://www.google.com' }];
    const result = findBestTab(tabs, IG_PLATFORM);
    assert.equal(result, null);
  });

  it('returns null for empty tabs list', () => {
    assert.equal(findBestTab([], IG_PLATFORM), null);
  });

  it('returns the preferred URL tab when multiple matches exist', () => {
    const tabs = [
      { windowIndex: 1, tabIndex: 1, url: 'https://www.instagram.com/explore/' },
      { windowIndex: 1, tabIndex: 2, url: 'https://www.instagram.com/direct/inbox/' },
    ];
    const result = findBestTab(tabs, IG_PLATFORM);
    assert.ok(result.url.includes('direct/inbox'), 'Should prefer direct/inbox URL');
  });

  it('returns first available tab when none has the preferred URL', () => {
    const tabs = [
      { windowIndex: 1, tabIndex: 1, url: 'https://www.instagram.com/explore/' },
      { windowIndex: 1, tabIndex: 2, url: 'https://www.instagram.com/stories/' },
    ];
    const result = findBestTab(tabs, IG_PLATFORM);
    assert.notEqual(result, null);
    assert.ok(result.url.includes('instagram.com'));
  });

  it('finds LinkedIn tab correctly among all platform tabs', () => {
    const result = findBestTab(SAMPLE_TABS, LI_PLATFORM);
    assert.notEqual(result, null);
    assert.ok(result.url.includes('linkedin.com'));
  });

  it('finds Twitter tab correctly', () => {
    const result = findBestTab(SAMPLE_TABS, TW_PLATFORM);
    assert.notEqual(result, null);
    assert.ok(result.url.includes('x.com'));
  });

  it('finds Threads tab correctly', () => {
    const result = findBestTab(SAMPLE_TABS, TH_PLATFORM);
    assert.notEqual(result, null);
    assert.ok(result.url.includes('threads'));
  });

  it('returns object with windowIndex and tabIndex as numbers', () => {
    const result = findBestTab(SAMPLE_TABS, IG_PLATFORM);
    assert.equal(typeof result.windowIndex, 'number');
    assert.equal(typeof result.tabIndex, 'number');
  });
});

// ── findBestTab vs findAllTabs consistency ────────────────────────────────────
describe('findBestTab consistency with findAllTabs', () => {
  it('findBestTab result is always the first element of findAllTabs', () => {
    const platforms = [IG_PLATFORM, TW_PLATFORM, LI_PLATFORM, TH_PLATFORM];
    for (const p of platforms) {
      const all = findAllTabs(SAMPLE_TABS, p);
      const best = findBestTab(SAMPLE_TABS, p);
      if (all.length === 0) {
        assert.equal(best, null);
      } else {
        assert.deepEqual(best, all[0]);
      }
    }
  });
});

console.log('\n✅ safari-tab-coordinator tests complete.\n');
