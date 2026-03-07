#!/usr/bin/env node

/**
 * browser-session-daemon.js — Pure-function Tests
 * =================================================
 * Tests:
 *   PLATFORM_ROUTES — correct ports for each platform
 *   ACTION_ENDPOINTS — URL construction for each action
 *   formatSessionResult() — Telegram message formatting
 *
 * No Supabase, no HTTP servers, no spawned processes.
 *
 * Run:
 *   node harness/test-browser-session-daemon.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PLATFORM_ROUTES,
  ACTION_ENDPOINTS,
  formatSessionResult,
} from './browser-session-daemon.js';

// ── PLATFORM_ROUTES ───────────────────────────────────────────────────────────
describe('PLATFORM_ROUTES — structure', () => {
  it('is a plain object', () => {
    assert.ok(typeof PLATFORM_ROUTES === 'object' && !Array.isArray(PLATFORM_ROUTES));
  });

  it('covers all 5 social platforms + upwork + market', () => {
    for (const p of ['instagram', 'twitter', 'tiktok', 'threads', 'linkedin', 'upwork', 'market']) {
      assert.ok(p in PLATFORM_ROUTES, `Missing platform: ${p}`);
    }
  });

  it('each entry has port (number), browser (string), healthPath (string)', () => {
    for (const [p, cfg] of Object.entries(PLATFORM_ROUTES)) {
      assert.ok(typeof cfg.port === 'number', `${p}.port must be a number`);
      assert.ok(typeof cfg.browser === 'string', `${p}.browser must be a string`);
      assert.ok(typeof cfg.healthPath === 'string', `${p}.healthPath must be a string`);
    }
  });

  it('safari-based platforms use ports in expected range (3000–3200)', () => {
    for (const [p, cfg] of Object.entries(PLATFORM_ROUTES)) {
      assert.ok(cfg.port >= 3000 && cfg.port <= 3200, `${p} port ${cfg.port} outside expected range`);
    }
  });
});

describe('PLATFORM_ROUTES — port correctness', () => {
  it('instagram → port 3100', () => assert.equal(PLATFORM_ROUTES.instagram.port, 3100));
  it('twitter   → port 3003', () => assert.equal(PLATFORM_ROUTES.twitter.port,   3003));
  it('tiktok    → port 3102', () => assert.equal(PLATFORM_ROUTES.tiktok.port,    3102));
  it('threads   → port 3004', () => assert.equal(PLATFORM_ROUTES.threads.port,   3004));
  it('linkedin  → port 3105', () => assert.equal(PLATFORM_ROUTES.linkedin.port,  3105));
  it('upwork    → port 3104', () => assert.equal(PLATFORM_ROUTES.upwork.port,    3104));
  it('market    → port 3106', () => assert.equal(PLATFORM_ROUTES.market.port,    3106));

  it('linkedin has chromeFallback: 9333', () => {
    assert.equal(PLATFORM_ROUTES.linkedin.chromeFallback, 9333);
  });

  it('healthPath is /health for all platforms', () => {
    for (const [p, cfg] of Object.entries(PLATFORM_ROUTES)) {
      assert.equal(cfg.healthPath, '/health', `${p}.healthPath should be /health`);
    }
  });
});

// ── ACTION_ENDPOINTS ──────────────────────────────────────────────────────────
describe('ACTION_ENDPOINTS — structure', () => {
  it('is a plain object', () => {
    assert.ok(typeof ACTION_ENDPOINTS === 'object' && !Array.isArray(ACTION_ENDPOINTS));
  });

  it('every value is a function', () => {
    for (const [action, fn] of Object.entries(ACTION_ENDPOINTS)) {
      assert.ok(typeof fn === 'function', `ACTION_ENDPOINTS.${action} must be a function`);
    }
  });

  it('covers expected action types', () => {
    for (const action of ['prospect_hunt', 'comment_harvest', 'inbox_check', 'dm_send', 'profile_extract', 'job_scan']) {
      assert.ok(action in ACTION_ENDPOINTS, `Missing action: ${action}`);
    }
  });
});

describe('ACTION_ENDPOINTS — URL construction', () => {
  const IG_PORT  = PLATFORM_ROUTES.instagram.port;
  const TW_PORT  = PLATFORM_ROUTES.twitter.port;
  const LI_PORT  = PLATFORM_ROUTES.linkedin.port;
  const UW_PORT  = PLATFORM_ROUTES.upwork.port;
  const MR_PORT  = 3106; // market-research hub

  it('prospect_hunt routes to market-research :3106 for any platform', () => {
    const url = ACTION_ENDPOINTS.prospect_hunt(IG_PORT, 'instagram');
    assert.ok(url.includes(`localhost:${MR_PORT}`), `prospect_hunt should use port ${MR_PORT}, got: ${url}`);
  });

  it('comment_harvest routes to market-research :3106', () => {
    const url = ACTION_ENDPOINTS.comment_harvest(TW_PORT, 'twitter');
    assert.ok(url.includes(`localhost:${MR_PORT}`), `comment_harvest should use port ${MR_PORT}, got: ${url}`);
  });

  it('inbox_check for twitter uses twitter port + /api/twitter/conversations/unread', () => {
    const url = ACTION_ENDPOINTS.inbox_check(TW_PORT, 'twitter');
    assert.ok(url.includes(String(TW_PORT)), `twitter inbox_check should use port ${TW_PORT}`);
    assert.ok(url.includes('/api/twitter/conversations/unread'), `twitter inbox_check URL incorrect: ${url}`);
  });

  it('inbox_check for linkedin uses linkedin port + /api/linkedin/connections/pending', () => {
    const url = ACTION_ENDPOINTS.inbox_check(LI_PORT, 'linkedin');
    assert.ok(url.includes(String(LI_PORT)), `linkedin inbox_check should use port ${LI_PORT}`);
    assert.ok(url.includes('/api/linkedin/connections/pending'), `linkedin inbox_check URL incorrect: ${url}`);
  });

  it('inbox_check for instagram uses instagram port + /api/conversations/unread', () => {
    const url = ACTION_ENDPOINTS.inbox_check(IG_PORT, 'instagram');
    assert.ok(url.includes(String(IG_PORT)), `instagram inbox_check should use port ${IG_PORT}`);
    assert.ok(url.includes('/api/conversations/unread'), `instagram inbox_check URL incorrect: ${url}`);
  });

  it('dm_send for twitter uses twitter port + /api/twitter/messages/send', () => {
    const url = ACTION_ENDPOINTS.dm_send(TW_PORT, 'twitter');
    assert.ok(url.includes(`localhost:${TW_PORT}`));
    assert.ok(url.includes('/api/twitter/messages/send'), `twitter dm_send URL incorrect: ${url}`);
  });

  it('dm_send for linkedin uses linkedin port + /api/linkedin/messages/send', () => {
    const url = ACTION_ENDPOINTS.dm_send(LI_PORT, 'linkedin');
    assert.ok(url.includes(`localhost:${LI_PORT}`));
    assert.ok(url.includes('/api/linkedin/messages/send'), `linkedin dm_send URL incorrect: ${url}`);
  });

  it('profile_extract for linkedin uses /api/linkedin/profile/extract-current', () => {
    const url = ACTION_ENDPOINTS.profile_extract(LI_PORT, 'linkedin');
    assert.ok(url.includes('/api/linkedin/profile/extract-current'), `linkedin profile URL incorrect: ${url}`);
  });

  it('profile_extract for instagram uses /api/profile/extract', () => {
    const url = ACTION_ENDPOINTS.profile_extract(IG_PORT, 'instagram');
    assert.ok(url.includes('/api/profile/extract'), `instagram profile URL incorrect: ${url}`);
    assert.ok(!url.includes('linkedin'), 'instagram profile URL should not contain linkedin');
  });

  it('job_scan uses upwork port', () => {
    const url = ACTION_ENDPOINTS.job_scan(UW_PORT, 'upwork');
    assert.ok(url.includes(String(UW_PORT)), `job_scan should use port ${UW_PORT}`);
    assert.ok(url.includes('/api/upwork/jobs/search'), `job_scan URL incorrect: ${url}`);
  });

  it('all URL strings start with http://localhost:', () => {
    const calls = [
      ACTION_ENDPOINTS.prospect_hunt(IG_PORT, 'instagram'),
      ACTION_ENDPOINTS.comment_harvest(TW_PORT, 'twitter'),
      ACTION_ENDPOINTS.inbox_check(IG_PORT, 'instagram'),
      ACTION_ENDPOINTS.dm_send(TW_PORT, 'twitter'),
      ACTION_ENDPOINTS.profile_extract(IG_PORT, 'instagram'),
      ACTION_ENDPOINTS.job_scan(UW_PORT, 'upwork'),
    ];
    for (const url of calls) {
      assert.ok(url.startsWith('http://localhost:'), `URL should start with http://localhost:: ${url}`);
    }
  });
});

// ── formatSessionResult ───────────────────────────────────────────────────────
function makeSession(overrides = {}) {
  return { platform: 'instagram', action: 'prospect_hunt', id: '123', ...overrides };
}

describe('formatSessionResult — skipped/null result', () => {
  it('returns skipped message when result is null', () => {
    const msg = formatSessionResult(makeSession(), null);
    assert.ok(msg.includes('⏭️'), 'skipped null should have ⏭️');
    assert.ok(msg.includes('platform busy'), 'skipped message should say platform busy');
  });

  it('returns skipped message when result.skipped is true', () => {
    const msg = formatSessionResult(makeSession(), { skipped: true });
    assert.ok(msg.includes('⏭️'), 'skipped=true should have ⏭️');
  });
});

describe('formatSessionResult — prospect_hunt', () => {
  it('shows count of found profiles', () => {
    const result = { profiles: [{ name: 'Alice' }, { name: 'Bob' }] };
    const msg = formatSessionResult(makeSession(), result);
    assert.ok(msg.includes('2 found'), `Expected "2 found" in: ${msg}`);
    assert.ok(msg.includes('✅'), 'should have ✅');
  });

  it('handles empty profiles array', () => {
    const msg = formatSessionResult(makeSession(), { profiles: [] });
    assert.ok(msg.includes('0 results'), `Expected "0 results" in: ${msg}`);
  });

  it('shows platform:action in bold tag', () => {
    const msg = formatSessionResult(makeSession({ platform: 'twitter', action: 'comment_harvest' }), { profiles: [] });
    assert.ok(msg.includes('<b>twitter:comment_harvest</b>'), `Expected bold tag in: ${msg}`);
  });

  it('shows preview of first 3 names', () => {
    const result = { profiles: [
      { name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }
    ]};
    const msg = formatSessionResult(makeSession(), result);
    assert.ok(msg.includes('A'), 'preview should include first name');
    assert.ok(msg.includes('+1 more') || msg.includes('4 found'), 'should show count or +more');
  });
});

describe('formatSessionResult — inbox_check', () => {
  it('shows unread count when conversations present', () => {
    const result = { conversations: [
      { sender: 'Alice', snippet: 'Hey!' },
      { sender: 'Bob', snippet: 'Hi' },
    ]};
    const msg = formatSessionResult(makeSession({ action: 'inbox_check' }), result);
    assert.ok(msg.includes('📬'), 'should have 📬 icon');
    assert.ok(msg.includes('2 unread'), `Expected "2 unread" in: ${msg}`);
  });

  it('shows "inbox clear" when 0 conversations', () => {
    const msg = formatSessionResult(makeSession({ action: 'inbox_check' }), { conversations: [] });
    assert.ok(msg.includes('inbox clear'), `Expected "inbox clear" in: ${msg}`);
  });

  it('handles result.messages array (alternate key)', () => {
    const msg = formatSessionResult(makeSession({ action: 'inbox_check' }), { messages: [{ sender: 'X', snippet: 'hi' }, { sender: 'Y', snippet: 'hey' }] });
    assert.ok(msg.includes('2 unread'), `Expected "2 unread" in: ${msg}`);
  });
});

describe('formatSessionResult — linkedin_connection_send', () => {
  // result.skipped (truthy number) triggers the top-level platform-busy guard,
  // so tests for the "sent" path must use skipped: 0.
  it('shows sent count when skipped is 0', () => {
    const msg = formatSessionResult(
      makeSession({ platform: 'linkedin', action: 'linkedin_connection_send' }),
      { sent: 5, skipped: 0, failed: 0 }
    );
    assert.ok(msg.includes('🤝'), 'should have 🤝');
    assert.ok(msg.includes('5 sent'), `Expected "5 sent" in: ${msg}`);
  });

  it('truthy result.skipped triggers platform-busy guard before handler', () => {
    const msg = formatSessionResult(
      makeSession({ platform: 'linkedin', action: 'linkedin_connection_send' }),
      { sent: 5, skipped: 2, failed: 0 }
    );
    assert.ok(msg.includes('⏭️'), 'truthy result.skipped short-circuits to platform busy');
  });

  it('shows none-sent message when sent=0 and skipped=0', () => {
    const msg = formatSessionResult(
      makeSession({ platform: 'linkedin', action: 'linkedin_connection_send' }),
      { sent: 0, skipped: 0, failed: 0 }
    );
    assert.ok(msg.includes('⏭️'), 'zero sent should show ⏭️');
  });
});

describe('formatSessionResult — linkedin_dm_send', () => {
  it('shows sent count when skipped is 0', () => {
    const msg = formatSessionResult(
      makeSession({ platform: 'linkedin', action: 'linkedin_dm_send' }),
      { sent: 3, skipped: 0, failed: 0 }
    );
    assert.ok(msg.includes('💬'), 'should have 💬');
    assert.ok(msg.includes('3 sent'), `Expected "3 sent" in: ${msg}`);
  });

  it('shows ⏭️ when 0 DMs sent and 0 skipped', () => {
    const msg = formatSessionResult(
      makeSession({ platform: 'linkedin', action: 'linkedin_dm_send' }),
      { sent: 0, skipped: 0, failed: 0 }
    );
    assert.ok(msg.includes('⏭️'), 'zero DMs should show ⏭️');
  });
});

describe('formatSessionResult — job_scan (Upwork)', () => {
  it('shows job count when jobs found', () => {
    const result = { jobs: [{ title: 'React Dev' }, { title: 'API Build' }] };
    const msg = formatSessionResult(makeSession({ platform: 'upwork', action: 'job_scan' }), result);
    assert.ok(msg.includes('✅'), 'should have ✅');
    assert.ok(msg.includes('2 jobs found'), `Expected "2 jobs found" in: ${msg}`);
  });

  it('shows no new jobs when empty', () => {
    const msg = formatSessionResult(makeSession({ platform: 'upwork', action: 'job_scan' }), { jobs: [] });
    assert.ok(msg.includes('no new jobs'), `Expected "no new jobs" in: ${msg}`);
  });
});

describe('formatSessionResult — async job started', () => {
  it('shows 🔄 when result has jobId + status=running', () => {
    const result = { jobId: 'job_abc', status: 'running' };
    const msg = formatSessionResult(makeSession(), result);
    assert.ok(msg.includes('🔄'), `Expected 🔄 for running job in: ${msg}`);
  });
});

console.log('\n✅ browser-session-daemon (PLATFORM_ROUTES, ACTION_ENDPOINTS, formatSessionResult) tests complete.\n');
