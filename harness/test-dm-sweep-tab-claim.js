#!/usr/bin/env node
/**
 * test-dm-sweep-tab-claim.js
 * ==========================
 * Verifies that all three DM sweep daemons correctly:
 *   1. Abort early when POST /api/session/ensure returns ok:false (no tab claimed)
 *   2. Proceed past the tab-claim step when ok:true (tab claimed)
 *
 * Uses in-process mock HTTP servers — no real Safari services required.
 *
 * Run:
 *   node harness/test-dm-sweep-tab-claim.js
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCK_FILE = '/tmp/safari-comment-sweep.lock';

// Use high ports to avoid colliding with real Safari services
const PORTS = { ig: 19100, tw: 19003, tk: 19102, tkComments: 19006 };

// ── Mock HTTP server ──────────────────────────────────────────────────────────
// routes: { 'METHOD /path': { statusCode?, body } }
// Returns { server, called: Set<string>, close() }
function createMockServer(port, routes) {
  const called = new Set();
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', c => { raw += c; });
    req.on('end', () => {
      const key = `${req.method} ${req.url.split('?')[0]}`;
      called.add(key);
      const route = routes[key] || routes['*'];
      if (route) {
        res.writeHead(route.statusCode ?? 200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(route.body));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `No mock route: ${key}` }));
      }
    });
  });
  return new Promise((resolve, reject) => {
    server.listen(port, '127.0.0.1', () => resolve({
      server, called,
      close: () => new Promise(r => server.close(r)),
    }));
    server.on('error', reject);
  });
}

// ── Run a sweep file in --once mode, capture stdout ──────────────────────────
// Uses async spawn so the event loop stays free to serve mock HTTP requests.
function runSweep(file, extraEnv = {}, extraArgs = [], timeoutMs = 20_000) {
  return new Promise((resolve, reject) => {
    // Do NOT set NOHUP — log() only prints when NOHUP is unset or stdout is TTY
    const child = spawn(
      process.execPath,
      [path.join(__dirname, file), '--once', ...extraArgs],
      { env: { ...process.env, ...extraEnv } },
    );
    let stdout = '', stderr = '';
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr += d; });
    child.on('close', code => resolve({ stdout, stderr, code }));
    child.on('error', reject);
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`Sweep subprocess timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    child.on('close', () => clearTimeout(timer));
  });
}

function clearLock() {
  try { fs.unlinkSync(LOCK_FILE); } catch { /* not present — ok */ }
}

// ── Instagram DM Sweep ────────────────────────────────────────────────────────
describe('instagram-dm-sweep: session/ensure tab claim', () => {
  beforeEach(() => clearLock());

  it('aborts early when session/ensure returns ok:false', { timeout: 15_000 }, async () => {
    const mock = await createMockServer(PORTS.ig, {
      'GET /health':                     { body: { status: 'ok' } },
      'POST /api/session/ensure':        { body: { ok: false, error: 'no tab claimed' } },
      // These must NOT be called:
      'POST /api/prospect/run-pipeline': { body: { scheduled: [] } },
    });
    try {
      const { stdout } = await runSweep('instagram-dm-sweep.js', {
        INSTAGRAM_DM_URL: `http://127.0.0.1:${PORTS.ig}`,
        IG_DM_DAILY_CAP: '999',
      });

      assert.ok(
        stdout.includes('Safari tab not available'),
        `Expected "Safari tab not available" in output, got:\n${stdout}`,
      );
      assert.ok(
        !mock.called.has('POST /api/prospect/run-pipeline'),
        'Prospect pipeline must NOT be called when tab is not claimed',
      );
    } finally {
      await mock.close();
    }
  });

  it('proceeds past tab claim when session/ensure returns ok:true', { timeout: 15_000 }, async () => {
    const mock = await createMockServer(PORTS.ig, {
      'GET /health':                       { body: { status: 'ok' } },
      'POST /api/session/ensure':          { body: { ok: true, tabIndex: 1 } },
      'POST /api/prospect/run-pipeline':   { body: { scheduled: [] } },
      'POST /api/prospect/schedule-batch': { body: { scheduled: [] } },
    });
    try {
      const { stdout } = await runSweep('instagram-dm-sweep.js', {
        INSTAGRAM_DM_URL: `http://127.0.0.1:${PORTS.ig}`,
        IG_DM_DAILY_CAP: '999',
      }, ['--dry-run']);

      assert.ok(
        stdout.includes('Safari tab claimed'),
        `Expected "Safari tab claimed" in output, got:\n${stdout}`,
      );
      assert.ok(
        !stdout.includes('Safari tab not available'),
        'Should NOT see abort message when tab is claimed',
      );
      assert.ok(
        mock.called.has('POST /api/session/ensure'),
        'session/ensure endpoint must be called',
      );
      assert.ok(
        mock.called.has('POST /api/prospect/run-pipeline'),
        'Prospect pipeline MUST be called when tab is claimed',
      );
    } finally {
      await mock.close();
    }
  });
});

// ── Twitter DM Sweep ──────────────────────────────────────────────────────────
describe('twitter-dm-sweep: session/ensure tab claim', () => {
  beforeEach(() => clearLock());

  it('aborts early when session/ensure returns ok:false', { timeout: 15_000 }, async () => {
    const mock = await createMockServer(PORTS.tw, {
      'GET /health':                         { body: { status: 'ok' } },
      'POST /api/session/ensure':            { body: { ok: false } },
      // Must NOT be called:
      'POST /api/twitter/prospect/discover': { body: { prospects: [] } },
    });
    try {
      const { stdout } = await runSweep('twitter-dm-sweep.js', {
        TWITTER_DM_URL: `http://127.0.0.1:${PORTS.tw}`,
        TW_DM_DAILY_CAP: '999',
      });

      assert.ok(
        stdout.includes('Safari tab not available'),
        `Expected "Safari tab not available" in output, got:\n${stdout}`,
      );
      assert.ok(
        !mock.called.has('POST /api/twitter/prospect/discover'),
        'Prospect discover must NOT be called when tab is not claimed',
      );
    } finally {
      await mock.close();
    }
  });

  it('proceeds past tab claim when session/ensure returns ok:true', { timeout: 15_000 }, async () => {
    const mock = await createMockServer(PORTS.tw, {
      'GET /health':                         { body: { status: 'ok' } },
      'POST /api/session/ensure':            { body: { ok: true, tabIndex: 2 } },
      'POST /api/twitter/prospect/discover': { body: { prospects: [] } },
    });
    try {
      const { stdout } = await runSweep('twitter-dm-sweep.js', {
        TWITTER_DM_URL: `http://127.0.0.1:${PORTS.tw}`,
        TW_DM_DAILY_CAP: '999',
      }, ['--dry-run']);

      assert.ok(
        stdout.includes('Safari tab claimed'),
        `Expected "Safari tab claimed" in output, got:\n${stdout}`,
      );
      assert.ok(
        !stdout.includes('Safari tab not available'),
        'Should NOT see abort message when tab is claimed',
      );
      assert.ok(
        mock.called.has('POST /api/twitter/prospect/discover'),
        'Prospect discover MUST be called when tab is claimed',
      );
    } finally {
      await mock.close();
    }
  });
});

// ── TikTok DM Sweep ───────────────────────────────────────────────────────────
// TikTok loops over keywords with a 2s inter-keyword delay.
// Return 4 unique authors per search-cards response so the loop breaks
// after the first keyword call (candidates.length >= runMax*4 = 4 with MAX_PER_RUN=1).
const TK_VIDEOS = [
  { author: 'founderA', description: 'ai automation saas' },
  { author: 'founderB', description: 'ai automation startup' },
  { author: 'founderC', description: 'saas automation tools' },
  { author: 'founderD', description: 'ai tools for founders' },
];

describe('tiktok-dm-sweep: session/ensure tab claim', () => {
  beforeEach(() => clearLock());

  it('aborts early when session/ensure returns ok:false', { timeout: 15_000 }, async () => {
    const [mockDm, mockComments] = await Promise.all([
      createMockServer(PORTS.tk, {
        'GET /health':              { body: { status: 'ok' } },
        'POST /api/session/ensure': { body: { ok: false } },
      }),
      createMockServer(PORTS.tkComments, {
        'GET /health':                          { body: { status: 'ok' } },
        // Must NOT be called:
        'POST /api/tiktok/search-cards':        { body: { videos: TK_VIDEOS } },
        'POST /api/tiktok/hashtag-prospects':   { body: { candidates: [] } },
      }),
    ]);
    try {
      const { stdout } = await runSweep('tiktok-dm-sweep.js', {
        TIKTOK_DM_URL: `http://127.0.0.1:${PORTS.tk}`,
        TIKTOK_COMMENTS_URL: `http://127.0.0.1:${PORTS.tkComments}`,
        TK_DM_DAILY_CAP: '999',
        TK_DM_MAX_PER_RUN: '1',
      });

      assert.ok(
        stdout.includes('Safari tab not available'),
        `Expected "Safari tab not available" in output, got:\n${stdout}`,
      );
      assert.ok(
        !mockComments.called.has('POST /api/tiktok/search-cards'),
        'search-cards must NOT be called when tab is not claimed',
      );
    } finally {
      await Promise.all([mockDm.close(), mockComments.close()]);
    }
  });

  it('proceeds past tab claim when session/ensure returns ok:true', { timeout: 20_000 }, async () => {
    const [mockDm, mockComments] = await Promise.all([
      createMockServer(PORTS.tk, {
        'GET /health':                  { body: { status: 'ok' } },
        'POST /api/session/ensure':     { body: { ok: true, tabIndex: 3 } },
        'POST /api/tiktok/ai/generate': { body: { message: 'Hey, saw your work on AI automation!' } },
      }),
      createMockServer(PORTS.tkComments, {
        'GET /health':                        { body: { status: 'ok' } },
        'POST /api/tiktok/hashtag-prospects': { body: { candidates: [], count: 0, success: true } },
        'POST /api/tiktok/search-cards':      { body: { videos: TK_VIDEOS } },
      }),
    ]);
    try {
      const { stdout } = await runSweep('tiktok-dm-sweep.js', {
        TIKTOK_DM_URL: `http://127.0.0.1:${PORTS.tk}`,
        TIKTOK_COMMENTS_URL: `http://127.0.0.1:${PORTS.tkComments}`,
        TK_DM_DAILY_CAP: '999',
        TK_DM_MAX_PER_RUN: '1',
      }, ['--dry-run']);

      assert.ok(
        stdout.includes('Safari tab claimed'),
        `Expected "Safari tab claimed" in output, got:\n${stdout}`,
      );
      assert.ok(
        !stdout.includes('Safari tab not available'),
        'Should NOT see abort message when tab is claimed',
      );
      // hashtag-prospects is the primary discovery call after tab is claimed
      assert.ok(
        mockComments.called.has('POST /api/tiktok/hashtag-prospects'),
        'hashtag-prospects MUST be called when tab is claimed',
      );
    } finally {
      await Promise.all([mockDm.close(), mockComments.close()]);
    }
  });
});
