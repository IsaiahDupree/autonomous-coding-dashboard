#!/usr/bin/env node

/**
 * ACD Task Agent — Tests
 * ======================
 * Uses Node.js built-in `node:test` (Node 18+).
 *
 * Run:
 *   node harness/test-task-agent.js
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import {
  markFeaturePassing,
  commitChanges,
  runTaskAgent,
  dispatchTasks,
} from './task-agent.js';

// ── markFeaturePassing ────────────────────────────────────────────────────────
describe('markFeaturePassing', () => {
  let tmpDir;
  let featureListPath;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'acd-task-test-'));
    featureListPath = path.join(tmpDir, 'features.json');
  });

  it('returns false for null featureId', () => {
    assert.equal(markFeaturePassing(null, '/some/path'), false);
  });

  it('returns false for missing file', () => {
    assert.equal(markFeaturePassing('F-001', '/nonexistent/features.json'), false);
  });

  it('increments passes on a matching feature (wrapped format)', () => {
    const data = {
      features: [
        { id: 'F-001', name: 'Feature one', passes: 0 },
        { id: 'F-002', name: 'Feature two', passes: 2 },
      ],
    };
    fs.writeFileSync(featureListPath, JSON.stringify(data));

    const result = markFeaturePassing('F-001', featureListPath);
    assert.equal(result, true);

    const updated = JSON.parse(fs.readFileSync(featureListPath, 'utf-8'));
    assert.equal(updated.features[0].passes, 1);
    assert.equal(updated.features[1].passes, 2); // unchanged
  });

  it('sets lastPass and lastPassBy fields', () => {
    const data = { features: [{ id: 'F-003', name: 'Feature three', passes: 0 }] };
    fs.writeFileSync(featureListPath, JSON.stringify(data));

    markFeaturePassing('F-003', featureListPath);

    const updated = JSON.parse(fs.readFileSync(featureListPath, 'utf-8'));
    assert.ok(updated.features[0].lastPass, 'should set lastPass');
    assert.equal(updated.features[0].lastPassBy, 'task-agent');
  });

  it('increments on top of existing passes count', () => {
    const data = { features: [{ id: 'F-004', name: 'Feature four', passes: 5 }] };
    fs.writeFileSync(featureListPath, JSON.stringify(data));

    markFeaturePassing('F-004', featureListPath);

    const updated = JSON.parse(fs.readFileSync(featureListPath, 'utf-8'));
    assert.equal(updated.features[0].passes, 6);
  });

  it('returns false when featureId not found in list', () => {
    const data = { features: [{ id: 'F-100', name: 'Other feature', passes: 0 }] };
    fs.writeFileSync(featureListPath, JSON.stringify(data));

    const result = markFeaturePassing('NONEXISTENT', featureListPath);
    assert.equal(result, false);

    // Original should be unchanged
    const unchanged = JSON.parse(fs.readFileSync(featureListPath, 'utf-8'));
    assert.equal(unchanged.features[0].passes, 0);
  });

  it('handles bare array feature list (unwrapped format)', () => {
    const data = [
      { id: 'F-010', name: 'Bare array feature', passes: 0 },
    ];
    fs.writeFileSync(featureListPath, JSON.stringify(data));

    const result = markFeaturePassing('F-010', featureListPath);
    assert.equal(result, true);
  });

  it('is case-insensitive for feature ID matching', () => {
    const data = { features: [{ id: 'F-020', name: 'Mixed case', passes: 0 }] };
    fs.writeFileSync(featureListPath, JSON.stringify(data));

    const result = markFeaturePassing('f-020', featureListPath);
    assert.equal(result, true);
  });

  it('handles malformed JSON gracefully (returns false, does not throw)', () => {
    fs.writeFileSync(featureListPath, '{ bad json }}}');
    const result = markFeaturePassing('F-001', featureListPath);
    assert.equal(result, false);
  });
});

// ── commitChanges ─────────────────────────────────────────────────────────────
describe('commitChanges', () => {
  let tmpRepo;

  before(() => {
    tmpRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'acd-task-git-'));
  });

  it('returns null for null repoPath', () => {
    const result = commitChanges(null, 'test message');
    assert.equal(result, null);
  });

  it('returns null for non-existent repoPath (graceful)', () => {
    const result = commitChanges('/nonexistent/path/xyz', 'test message');
    assert.equal(result, null);
  });
});

// ── runTaskAgent — contract/shape tests (no real Claude spawn) ────────────────
describe('runTaskAgent', () => {
  it('throws when repoId is missing', async () => {
    await assert.rejects(
      () => runTaskAgent({ task: 'Do something' }),
      /repoId is required/
    );
  });

  it('throws when task is missing', async () => {
    await assert.rejects(
      () => runTaskAgent({ repoId: 'some-repo' }),
      /task is required/
    );
  });

  it('returns error result for unknown repo (not in queue)', async () => {
    const result = await runTaskAgent({
      repoId: 'totally-nonexistent-repo-xyz',
      task: 'Do something',
      featureId: 'TEST-001',
    });
    assert.equal(result.success, false);
    assert.ok(result.error, 'should have error field');
    assert.ok(typeof result.actions !== 'undefined', 'should have actions field');
  });

  it('result always contains required fields', async () => {
    const result = await runTaskAgent({
      repoId: 'nonexistent-xyz',
      task: 'Test task',
    });
    assert.ok('success' in result, 'missing success');
    assert.ok('repoId' in result, 'missing repoId');
    assert.ok('task' in result, 'missing task');
    assert.ok('actions' in result, 'missing actions');
  });
});

// ── dispatchTasks ─────────────────────────────────────────────────────────────
describe('dispatchTasks', () => {
  it('returns empty array for empty task list', async () => {
    const results = await dispatchTasks([]);
    assert.deepEqual(results, []);
  });

  it('returns array with error results for all-unknown repos (series mode)', async () => {
    const tasks = [
      { repoId: 'ghost-repo-a', task: 'Task A' },
      { repoId: 'ghost-repo-b', task: 'Task B' },
    ];
    const results = await dispatchTasks(tasks, { parallel: false });
    assert.equal(results.length, 2);
    assert.equal(results[0].success, false);
    assert.equal(results[1].success, false);
  });

  it('runs in parallel and returns all results', async () => {
    const tasks = [
      { repoId: 'ghost-1', task: 'Task 1' },
      { repoId: 'ghost-2', task: 'Task 2' },
      { repoId: 'ghost-3', task: 'Task 3' },
    ];
    const start = Date.now();
    const results = await dispatchTasks(tasks, { parallel: true });
    const elapsed = Date.now() - start;

    assert.equal(results.length, 3);
    // Parallel should be faster than sequential for quick-failing tasks
    // (all fail immediately for unknown repos)
    assert.ok(elapsed < 3000, `Parallel dispatch took too long: ${elapsed}ms`);
  });

  it('series mode processes tasks sequentially (each repoId appears in result)', async () => {
    const tasks = [
      { repoId: 'seq-a', task: 'Task A' },
      { repoId: 'seq-b', task: 'Task B' },
    ];
    const results = await dispatchTasks(tasks, { parallel: false });
    // Both fail fast (unknown repos) but repoId is always echoed back
    assert.equal(results[0].repoId, 'seq-a', 'first result should echo repoId seq-a');
    assert.equal(results[1].repoId, 'seq-b', 'second result should echo repoId seq-b');
  });
});

// ── dispatch file format ──────────────────────────────────────────────────────
describe('Dispatch file format', () => {
  it('tasks.json schema has required fields', () => {
    const exampleTask = {
      repoId: 'cloud-sync-mcp',
      task: 'Add rate limiting middleware to all API routes',
      featureId: 'CSM-012',
      testCmd: 'npm test',
    };
    assert.ok(exampleTask.repoId, 'needs repoId');
    assert.ok(exampleTask.task, 'needs task');
    // featureId and testCmd are optional
  });

  it('minimal task only needs repoId + task', () => {
    const minimal = { repoId: 'some-repo', task: 'Add feature X' };
    assert.ok(minimal.repoId);
    assert.ok(minimal.task);
  });
});

// ── Result shape ──────────────────────────────────────────────────────────────
describe('Result shape contract', () => {
  const validResult = {
    ts: new Date().toISOString(),
    repoId: 'my-repo',
    featureId: 'F-001',
    task: 'Implement feature X',
    success: true,
    testsPass: true,
    testsSkipped: false,
    testOutput: 'All tests passed',
    featureMarked: true,
    commitHash: 'abc1234',
    claudeExitCode: 0,
    actions: ['Created src/middleware/rateLimit.ts', 'Updated src/app.ts'],
    filesChanged: ['src/middleware/rateLimit.ts', 'src/app.ts'],
    notes: null,
  };

  it('success result has all expected fields', () => {
    const required = ['ts', 'repoId', 'featureId', 'task', 'success',
      'testsPass', 'featureMarked', 'commitHash', 'actions', 'filesChanged'];
    for (const field of required) {
      assert.ok(field in validResult, `missing field: ${field}`);
    }
  });

  it('business rule: success=true is consistent with testsPass=true', () => {
    // Valid commissioned result
    const passing = { ...validResult, success: true, testsPass: true, testsSkipped: false };
    assert.ok(!passing.success || passing.testsPass || passing.testsSkipped,
      'commissioned result: success=true must have testsPass=true or testsSkipped=true');

    // Valid skipped-tests result (e.g. no test command)
    const skipped = { ...validResult, success: true, testsPass: null, testsSkipped: true };
    assert.ok(!skipped.success || skipped.testsPass || skipped.testsSkipped,
      'skipped-tests result should satisfy the rule');

    // Failed result — success=false, tests failed
    const failed = { ...validResult, success: false, testsPass: false, testsSkipped: false };
    assert.ok(!failed.success || failed.testsPass || failed.testsSkipped,
      'failed result should satisfy the rule (success=false satisfies !success)');
  });
});

// ── markFeaturePassing idempotency ────────────────────────────────────────────
describe('markFeaturePassing — idempotency', () => {
  let tmpDir;
  let featureListPath;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'acd-idem-test-'));
    featureListPath = path.join(tmpDir, 'features.json');
  });

  it('calling twice increments passes by 2 (not idempotent — each call counts)', () => {
    const data = { features: [{ id: 'F-IDEM', name: 'Idem test', passes: 0 }] };
    fs.writeFileSync(featureListPath, JSON.stringify(data));

    markFeaturePassing('F-IDEM', featureListPath);
    markFeaturePassing('F-IDEM', featureListPath);

    const updated = JSON.parse(fs.readFileSync(featureListPath, 'utf-8'));
    assert.equal(updated.features[0].passes, 2);
  });
});

console.log('\n✅ All ACD Task Agent tests complete.\n');
