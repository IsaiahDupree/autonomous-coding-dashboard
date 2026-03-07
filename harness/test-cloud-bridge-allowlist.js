#!/usr/bin/env node

/**
 * cloud-bridge.js — Allowlist + Route Consistency Tests
 * =======================================================
 * The COMMAND_ALLOWLIST and ROUTES must be kept in sync.
 * A command in ALLOWLIST with no ROUTE entry silently fails after being claimed.
 * A ROUTE entry not in ALLOWLIST is dead code that can never be reached.
 * A missing DM command breaks cloud-triggered outreach.
 *
 * Run:
 *   node harness/test-cloud-bridge-allowlist.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { COMMAND_ALLOWLIST, ROUTES } from './cloud-bridge.js';

// ── Allowlist completeness ────────────────────────────────────────────────────
describe('COMMAND_ALLOWLIST completeness', () => {
  it('is a Set', () => {
    assert.ok(COMMAND_ALLOWLIST instanceof Set);
  });

  it('has entries for all four active platforms', () => {
    const platforms = ['instagram', 'twitter', 'tiktok', 'threads', 'linkedin'];
    for (const p of platforms) {
      const platformCmds = [...COMMAND_ALLOWLIST].filter(c => c.startsWith(p + ':'));
      assert.ok(platformCmds.length > 0, `No commands for platform: ${p}`);
    }
  });

  it('includes DM commands for IG, TW, TK (cloud-triggered outreach)', () => {
    assert.ok(COMMAND_ALLOWLIST.has('instagram:dm'), 'instagram:dm must be allowed');
    assert.ok(COMMAND_ALLOWLIST.has('twitter:dm'),   'twitter:dm must be allowed');
    assert.ok(COMMAND_ALLOWLIST.has('tiktok:dm'),    'tiktok:dm must be allowed');
  });

  it('includes instagram:scrape (alias for enrich — was missing, caused rejections)', () => {
    assert.ok(COMMAND_ALLOWLIST.has('instagram:scrape'), 'instagram:scrape must be in allowlist');
  });

  it('includes instagram:enrich', () => {
    assert.ok(COMMAND_ALLOWLIST.has('instagram:enrich'));
  });

  it('includes linkedin:search and linkedin:profile', () => {
    assert.ok(COMMAND_ALLOWLIST.has('linkedin:search'));
    assert.ok(COMMAND_ALLOWLIST.has('linkedin:profile'));
  });

  it('does NOT include unknown/test commands', () => {
    assert.ok(!COMMAND_ALLOWLIST.has('instagram:hack'));
    assert.ok(!COMMAND_ALLOWLIST.has('*'));
    assert.ok(!COMMAND_ALLOWLIST.has(''));
    assert.ok(!COMMAND_ALLOWLIST.has('all'));
  });
});

// ── ROUTES completeness ───────────────────────────────────────────────────────
describe('ROUTES completeness', () => {
  it('is a plain object', () => {
    assert.ok(typeof ROUTES === 'object' && ROUTES !== null);
    assert.ok(!Array.isArray(ROUTES));
  });

  it('every ROUTES key is a function', () => {
    for (const [key, handler] of Object.entries(ROUTES)) {
      assert.ok(typeof handler === 'function', `ROUTES["${key}"] should be a function`);
    }
  });

  it('every ROUTES key exists in COMMAND_ALLOWLIST', () => {
    for (const key of Object.keys(ROUTES)) {
      assert.ok(
        COMMAND_ALLOWLIST.has(key),
        `ROUTES["${key}"] has no matching COMMAND_ALLOWLIST entry — unreachable dead code`
      );
    }
  });

  it('every COMMAND_ALLOWLIST entry has a matching ROUTES handler', () => {
    for (const cmd of COMMAND_ALLOWLIST) {
      assert.ok(
        cmd in ROUTES,
        `COMMAND_ALLOWLIST has "${cmd}" but no ROUTES handler — command will fail after being claimed`
      );
    }
  });
});

// ── ALLOWLIST ↔ ROUTES bidirectional consistency ──────────────────────────────
describe('ALLOWLIST ↔ ROUTES bidirectional consistency', () => {
  it('ALLOWLIST size equals ROUTES size (no asymmetry)', () => {
    const allowlistSize = COMMAND_ALLOWLIST.size;
    const routesSize = Object.keys(ROUTES).length;
    assert.equal(
      allowlistSize,
      routesSize,
      `ALLOWLIST has ${allowlistSize} entries but ROUTES has ${routesSize} handlers — they must match exactly`
    );
  });

  it('all commands follow platform:action format', () => {
    for (const cmd of COMMAND_ALLOWLIST) {
      assert.ok(
        /^[a-z]+:[a-z_]+$/.test(cmd),
        `Command "${cmd}" should follow platform:action format (lowercase, no spaces)`
      );
    }
  });

  it('platform prefixes in allowlist are from the known set', () => {
    const KNOWN_PLATFORMS = new Set(['instagram', 'twitter', 'tiktok', 'threads', 'linkedin']);
    for (const cmd of COMMAND_ALLOWLIST) {
      const platform = cmd.split(':')[0];
      assert.ok(KNOWN_PLATFORMS.has(platform), `Unknown platform prefix: "${platform}" in command "${cmd}"`);
    }
  });
});

// ── DM route port correctness ─────────────────────────────────────────────────
// These ports are tied to specific Safari services. Wrong port = DM sent to wrong service.
describe('DM route port correctness', () => {
  it('instagram:dm routes to port 3100 (IG DM service)', () => {
    // Check the handler is a function and would call the right port
    // We do this by calling the handler with a fake fetch-intercepting param
    // and verifying the URL it would call (via toString inspection)
    const handler = ROUTES['instagram:dm'];
    const handlerStr = handler.toString();
    assert.ok(handlerStr.includes('3100'), 'instagram:dm should target port 3100');
  });

  it('twitter:dm routes to port 3003 (TW DM service)', () => {
    const handlerStr = ROUTES['twitter:dm'].toString();
    assert.ok(handlerStr.includes('3003'), 'twitter:dm should target port 3003');
  });

  it('tiktok:dm routes to port 3102 (TK DM service)', () => {
    const handlerStr = ROUTES['tiktok:dm'].toString();
    assert.ok(handlerStr.includes('3102'), 'tiktok:dm should target port 3102');
  });

  it('instagram:search/profile/enrich route to port 3005 (IG comments service)', () => {
    for (const cmd of ['instagram:search', 'instagram:profile', 'instagram:enrich', 'instagram:scrape']) {
      const handlerStr = ROUTES[cmd].toString();
      assert.ok(handlerStr.includes('3005'), `${cmd} should target port 3005`);
    }
  });

  it('twitter:search/profile route to port 3003', () => {
    for (const cmd of ['twitter:search', 'twitter:profile']) {
      const handlerStr = ROUTES[cmd].toString();
      assert.ok(handlerStr.includes('3003'), `${cmd} should target port 3003`);
    }
  });

  it('threads:search/profile route to port 3004 (Threads service)', () => {
    for (const cmd of ['threads:search', 'threads:profile']) {
      const handlerStr = ROUTES[cmd].toString();
      assert.ok(handlerStr.includes('3004'), `${cmd} should target port 3004`);
    }
  });
});

console.log('\n✅ cloud-bridge allowlist tests complete.\n');
