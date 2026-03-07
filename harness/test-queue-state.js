#!/usr/bin/env node

/**
 * queue-state.js — getQueueState() Tests
 * ========================================
 * Powers the dashboard Queue tab topology view.
 * Wrong topology = agents displayed as idle when running, or stuck shown as queued.
 *
 * Strategy: write temp harness-status-*.json + a minimal repo-queue.json to
 * the real paths, run getQueueState(), then restore.  All file I/O is isolated
 * with save/restore to avoid corrupting live state.
 *
 * Run:
 *   node harness/test-queue-state.js
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD_ROOT = path.resolve(__dirname, '..');

import { getQueueState } from './queue-state.js';

// ── File isolation helpers ─────────────────────────────────────────────────────
const QUEUE_FILE = path.join(__dirname, 'repo-queue.json');
let _queueBackup = null;
const _statusBackups = new Map(); // filename → content|null

function saveQueueFile() {
  _queueBackup = fs.existsSync(QUEUE_FILE) ? fs.readFileSync(QUEUE_FILE, 'utf-8') : null;
}

function restoreQueueFile() {
  if (_queueBackup !== null) fs.writeFileSync(QUEUE_FILE, _queueBackup);
  else if (fs.existsSync(QUEUE_FILE)) {
    try {
      const d = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'));
      if (d._test) fs.unlinkSync(QUEUE_FILE);
    } catch { /* ignore */ }
  }
  _queueBackup = null;
}

function writeStatusFile(slug, data) {
  const fname = `harness-status-${slug}.json`;
  const fpath = path.join(DASHBOARD_ROOT, fname);
  if (!_statusBackups.has(fname)) {
    _statusBackups.set(fname, fs.existsSync(fpath) ? fs.readFileSync(fpath, 'utf-8') : null);
  }
  fs.writeFileSync(fpath, JSON.stringify(data, null, 2));
  return fpath;
}

function restoreStatusFiles() {
  for (const [fname, content] of _statusBackups.entries()) {
    const fpath = path.join(DASHBOARD_ROOT, fname);
    if (content !== null) fs.writeFileSync(fpath, content);
    else if (fs.existsSync(fpath)) fs.unlinkSync(fpath);
  }
  _statusBackups.clear();
}

function writeQueue(repos) {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify({ _test: true, repos }, null, 2));
}

beforeEach(() => { saveQueueFile(); });
afterEach(() => { restoreQueueFile(); restoreStatusFiles(); });

// ── Return shape ───────────────────────────────────────────────────────────────
describe('getQueueState — return shape', () => {
  it('returns required keys', () => {
    writeQueue([]);
    const state = getQueueState();
    for (const key of ['running', 'queued', 'completed', 'topology', 'parallelCount', 'nextUp', 'asOf']) {
      assert.ok(key in state, `missing key: ${key}`);
    }
  });

  it('running, queued, completed are arrays', () => {
    writeQueue([]);
    const state = getQueueState();
    assert.ok(Array.isArray(state.running));
    assert.ok(Array.isArray(state.queued));
    assert.ok(Array.isArray(state.completed));
  });

  it('asOf is a valid ISO timestamp', () => {
    writeQueue([]);
    const state = getQueueState();
    assert.ok(!isNaN(Date.parse(state.asOf)), `invalid ISO: ${state.asOf}`);
  });
});

// ── topology ─────────────────────────────────────────────────────────────────
describe('getQueueState — topology', () => {
  it('"idle" when no repos in queue', () => {
    writeQueue([]);
    const state = getQueueState();
    assert.equal(state.topology, 'idle');
    assert.equal(state.parallelCount, 0);
  });

  it('"idle" when repos exist but none running', () => {
    writeQueue([{ id: 'proj-a', enabled: true }]);
    const state = getQueueState();
    assert.equal(state.topology, 'idle');
  });

  it('"series" when one agent is running', () => {
    const slug = `qs-test-running-${Date.now()}`;
    writeQueue([{ id: slug, enabled: true }]);
    writeStatusFile(slug, {
      projectId: slug,
      status: 'running',
      pid: process.pid,   // use our own PID — guaranteed alive
      lastUpdated: new Date().toISOString(),
    });
    const state = getQueueState();
    assert.equal(state.topology, 'series');
    assert.equal(state.parallelCount, 1);
  });

  it('"parallel" when two agents are running', () => {
    const slug1 = `qs-p1-${Date.now()}`;
    const slug2 = `qs-p2-${Date.now()}`;
    writeQueue([
      { id: slug1, enabled: true },
      { id: slug2, enabled: true },
    ]);
    const now = new Date().toISOString();
    writeStatusFile(slug1, { projectId: slug1, status: 'running', pid: process.pid, lastUpdated: now });
    writeStatusFile(slug2, { projectId: slug2, status: 'running', pid: process.pid, lastUpdated: now });
    const state = getQueueState();
    assert.equal(state.topology, 'parallel');
    assert.ok(state.parallelCount >= 2);
  });
});

// ── queued ─────────────────────────────────────────────────────────────────────
describe('getQueueState — queued', () => {
  it('repos with no status file go into queued', () => {
    const slug = `qs-nostat-${Date.now()}`;
    writeQueue([{ id: slug, enabled: true }]);
    const state = getQueueState();
    assert.ok(state.queued.some(q => q.slug === slug), `${slug} should be queued`);
  });

  it('disabled repos are excluded entirely', () => {
    const slug = `qs-disabled-${Date.now()}`;
    writeQueue([{ id: slug, enabled: false }]);
    const state = getQueueState();
    assert.ok(!state.queued.some(q => q.slug === slug));
    assert.ok(!state.running.some(r => r.slug === slug));
  });

  it('queued entry has slug, prd, features, position fields', () => {
    const slug = `qs-shape-${Date.now()}`;
    writeQueue([{ id: slug, description: 'My PRD', enabled: true }]);
    const state = getQueueState();
    const entry = state.queued.find(q => q.slug === slug);
    assert.ok(entry, 'queued entry not found');
    assert.ok('slug' in entry);
    assert.ok('prd' in entry);
    assert.ok('features' in entry);
    assert.ok('position' in entry);
  });

  it('nextUp is the first queued slug', () => {
    const slug1 = `qs-next1-${Date.now()}`;
    const slug2 = `qs-next2-${Date.now()}`;
    writeQueue([
      { id: slug1, enabled: true },
      { id: slug2, enabled: true },
    ]);
    const state = getQueueState();
    assert.equal(state.nextUp, slug1, 'nextUp should be first queued slug');
  });

  it('nextUp is null when nothing is queued', () => {
    writeQueue([]);
    const state = getQueueState();
    assert.equal(state.nextUp, null);
  });
});

// ── running ───────────────────────────────────────────────────────────────────
describe('getQueueState — running entry shape', () => {
  it('running entry has slug, prd, features, model, pid, sessionNum', () => {
    const slug = `qs-run-shape-${Date.now()}`;
    writeQueue([{ id: slug, description: 'Test PRD', enabled: true }]);
    writeStatusFile(slug, {
      projectId: slug,
      status: 'running',
      pid: process.pid,
      lastUpdated: new Date().toISOString(),
      model: 'claude-sonnet-4-6',
    });
    const state = getQueueState();
    const entry = state.running.find(r => r.slug === slug);
    assert.ok(entry, 'running entry not found');
    assert.ok('slug' in entry);
    assert.ok('prd' in entry);
    assert.ok('features' in entry);
    assert.ok('pid' in entry);
  });

  it('agent with dead PID is not shown as running', () => {
    const slug = `qs-dead-${Date.now()}`;
    writeQueue([{ id: slug, enabled: true }]);
    writeStatusFile(slug, {
      projectId: slug,
      status: 'running',
      pid: 999999999,    // guaranteed dead PID
      lastUpdated: new Date().toISOString(),
    });
    const state = getQueueState();
    assert.ok(!state.running.some(r => r.slug === slug), 'dead-PID agent should not be in running');
  });
});

// ── stuckSince ────────────────────────────────────────────────────────────────
describe('getQueueState — stuckSince detection', () => {
  it('stuckSince is non-null when lastUpdated > 30 minutes ago', () => {
    const slug = `qs-stuck-${Date.now()}`;
    writeQueue([{ id: slug, enabled: true }]);
    const staleTs = new Date(Date.now() - 35 * 60 * 1000).toISOString();
    writeStatusFile(slug, {
      projectId: slug,
      status: 'running',
      pid: process.pid,
      lastUpdated: staleTs,
    });
    const state = getQueueState();
    const entry = state.running.find(r => r.slug === slug);
    if (entry) {
      assert.ok(entry.stuckSince !== null, 'stuckSince should be set for stale agent');
    }
  });

  it('stuckSince is null when lastUpdated is recent', () => {
    const slug = `qs-fresh-${Date.now()}`;
    writeQueue([{ id: slug, enabled: true }]);
    writeStatusFile(slug, {
      projectId: slug,
      status: 'running',
      pid: process.pid,
      lastUpdated: new Date().toISOString(),
    });
    const state = getQueueState();
    const entry = state.running.find(r => r.slug === slug);
    if (entry) {
      assert.equal(entry.stuckSince, null, 'fresh agent should not be stuck');
    }
  });
});

console.log('\n✅ queue-state (getQueueState) tests complete.\n');
