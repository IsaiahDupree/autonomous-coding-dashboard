#!/usr/bin/env node

/**
 * prd-extractor.js — extractFeaturesFromPRD, loadPRDFile, saveFeatureList Tests
 * ===============================================================================
 * Parses PRD markdown → structured feature list with IDs, categories, acceptance criteria.
 * Bad extraction = agents building the wrong things. Critical for ACD dispatch quality.
 *
 * Run:
 *   node harness/test-prd-extractor.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { extractFeaturesFromPRD, loadPRDFile, saveFeatureList } from './prd-extractor.js';

// ── extractFeaturesFromPRD — return shape ─────────────────────────────────────
describe('extractFeaturesFromPRD — return shape', () => {
  it('returns an object with project, description, total_features, created_at, features', () => {
    const result = extractFeaturesFromPRD('# MyPRD\n- Build a login page\n');
    assert.ok('project' in result, 'missing project');
    assert.ok('description' in result, 'missing description');
    assert.ok('total_features' in result, 'missing total_features');
    assert.ok('created_at' in result, 'missing created_at');
    assert.ok('features' in result, 'missing features');
    assert.ok(Array.isArray(result.features), 'features must be array');
  });

  it('created_at is a valid ISO string', () => {
    const result = extractFeaturesFromPRD('# Test\n- do something\n');
    assert.ok(!isNaN(Date.parse(result.created_at)), `invalid ISO: ${result.created_at}`);
  });

  it('total_features matches features.length', () => {
    const result = extractFeaturesFromPRD('# App\n- Feature A\n- Feature B\n- Feature C\n');
    assert.equal(result.total_features, result.features.length);
  });

  it('uses custom projectName when provided', () => {
    const result = extractFeaturesFromPRD('# App\n- Feature A\n', { projectName: 'My Custom App' });
    assert.equal(result.project, 'My Custom App');
  });

  it('defaults projectName to "Extracted from PRD"', () => {
    const result = extractFeaturesFromPRD('# App\n- Feature A\n');
    assert.equal(result.project, 'Extracted from PRD');
  });
});

// ── extractFeaturesFromPRD — feature shape ────────────────────────────────────
describe('extractFeaturesFromPRD — feature entry shape', () => {
  it('each feature has id, description, category, priority, passes', () => {
    const result = extractFeaturesFromPRD('# App\n- Add user login form\n');
    assert.ok(result.features.length >= 1, 'expected at least 1 feature');
    const [f] = result.features;
    assert.ok('id' in f, 'missing id');
    assert.ok('description' in f, 'missing description');
    assert.ok('category' in f, 'missing category');
    assert.ok('priority' in f, 'missing priority');
    assert.ok('passes' in f, 'missing passes');
  });

  it('passes is false by default (untested)', () => {
    const result = extractFeaturesFromPRD('# App\n- Build dashboard\n');
    assert.ok(result.features.every(f => f.passes === false), 'all features should start with passes=false');
  });

  it('id follows feat-NNN pattern', () => {
    const result = extractFeaturesFromPRD('# App\n- Feature one\n');
    assert.ok(/^feat-\d{3}$/.test(result.features[0].id), `unexpected id format: ${result.features[0].id}`);
  });

  it('startingId shifts feature IDs', () => {
    const result = extractFeaturesFromPRD('# App\n- Feature one\n', { startingId: 50 });
    assert.equal(result.features[0].id, 'feat-050');
  });

  it('IDs are sequential', () => {
    const md = '# App\n- Item one\n- Item two\n- Item three\n';
    const result = extractFeaturesFromPRD(md);
    const ids = result.features.map(f => parseInt(f.id.replace('feat-', ''), 10));
    for (let i = 1; i < ids.length; i++) {
      assert.equal(ids[i], ids[i - 1] + 1, `IDs should be sequential: ${ids}`);
    }
  });

  it('feature has acceptance_criteria array', () => {
    const result = extractFeaturesFromPRD('# App\n- Add a login form\n');
    const [f] = result.features;
    assert.ok('acceptance_criteria' in f, 'missing acceptance_criteria');
    assert.ok(Array.isArray(f.acceptance_criteria), 'acceptance_criteria must be array');
    assert.ok(f.acceptance_criteria.length > 0, 'acceptance_criteria should not be empty');
  });
});

// ── extractFeaturesFromPRD — bullet extraction ────────────────────────────────
describe('extractFeaturesFromPRD — bullet extraction', () => {
  it('extracts bullet points marked with -', () => {
    const md = '# App\n- Feature Alpha\n- Feature Beta\n';
    const result = extractFeaturesFromPRD(md);
    const descs = result.features.map(f => f.description);
    assert.ok(descs.some(d => d.includes('Feature Alpha')), 'Feature Alpha missing');
    assert.ok(descs.some(d => d.includes('Feature Beta')), 'Feature Beta missing');
  });

  it('extracts bullet points marked with *', () => {
    const md = '# App\n* Star bullet item\n';
    const result = extractFeaturesFromPRD(md);
    assert.ok(result.features.some(f => f.description.includes('Star bullet item')));
  });

  it('skips items shorter than 5 characters', () => {
    const md = '# App\n- AB\n- A valid feature description\n';
    const result = extractFeaturesFromPRD(md);
    assert.ok(!result.features.some(f => f.description === 'AB'), 'too-short items should be skipped');
    assert.ok(result.features.some(f => f.description.includes('valid feature')));
  });

  it('deduplicates identical descriptions', () => {
    const md = '# App\n- Duplicate feature item\n- Duplicate feature item\n';
    const result = extractFeaturesFromPRD(md);
    const matching = result.features.filter(f => f.description === 'Duplicate feature item');
    assert.ok(matching.length <= 1, 'duplicate features should be deduplicated');
  });

  it('extracts features from subsections (## headings)', () => {
    const md = '# App\n## Authentication\n- User login via password\n- User logout\n';
    const result = extractFeaturesFromPRD(md);
    assert.ok(result.features.some(f => f.description.includes('login')));
    assert.ok(result.features.some(f => f.description.includes('logout')));
  });
});

// ── extractFeaturesFromPRD — skip sections ────────────────────────────────────
describe('extractFeaturesFromPRD — skip sections', () => {
  it('skips the "overview" section', () => {
    const md = '# Overview\n- This item should be skipped\n# Features\n- This item should appear\n';
    const result = extractFeaturesFromPRD(md);
    const descs = result.features.map(f => f.description);
    assert.ok(!descs.some(d => d.includes('should be skipped')), 'overview section should be skipped');
    assert.ok(descs.some(d => d.includes('should appear')), 'Features section should be included');
  });

  it('skips the "introduction" section', () => {
    const md = '# Introduction\n- Intro bullet\n# Implementation\n- Implement auth\n';
    const result = extractFeaturesFromPRD(md);
    assert.ok(!result.features.some(f => f.description.includes('Intro bullet')));
  });

  it('returns empty features for a PRD with only skipped sections', () => {
    const md = '# Overview\n- some item\n# Goals\n- another item\n';
    const result = extractFeaturesFromPRD(md);
    assert.equal(result.features.length, 0);
  });
});

// ── extractFeaturesFromPRD — category inference ───────────────────────────────
describe('extractFeaturesFromPRD — category inference', () => {
  it('infers "ui" category from display/interface keywords', () => {
    const md = '# App\n- Display user dashboard with responsive layout\n';
    const result = extractFeaturesFromPRD(md);
    const [f] = result.features;
    assert.ok(['ui', 'general'].includes(f.category), `unexpected category: ${f.category}`);
  });

  it('infers "api" category from API/endpoint keywords', () => {
    const md = '# App\n- Build REST API endpoint for user data\n';
    const result = extractFeaturesFromPRD(md);
    const apiFeature = result.features.find(f => f.description.includes('endpoint'));
    assert.ok(apiFeature, 'feature not found');
    assert.equal(apiFeature.category, 'api');
  });

  it('infers "auth" category from authentication keywords', () => {
    const md = '# App\n- Implement JWT authentication and login flow\n';
    const result = extractFeaturesFromPRD(md);
    const authFeature = result.features.find(f => f.description.includes('authentication'));
    assert.ok(authFeature, 'feature not found');
    assert.equal(authFeature.category, 'auth');
  });

  it('defaults to "general" for unrecognized descriptions', () => {
    const md = '# App\n- Just a plain old random task description here\n';
    const result = extractFeaturesFromPRD(md);
    const [f] = result.features;
    assert.equal(f.category, 'general');
  });
});

// ── loadPRDFile ───────────────────────────────────────────────────────────────
describe('loadPRDFile', () => {
  it('returns file contents as a string', () => {
    const tmpFile = path.join(os.tmpdir(), `prd-test-${Date.now()}.md`);
    fs.writeFileSync(tmpFile, '# My PRD\n- Feature one\n');
    const content = loadPRDFile(tmpFile);
    assert.ok(typeof content === 'string', 'expected string');
    assert.ok(content.includes('Feature one'));
    fs.unlinkSync(tmpFile);
  });

  it('throws when file does not exist', () => {
    assert.throws(
      () => loadPRDFile('/tmp/nonexistent-prd-xyz-abc-12345.md'),
      /not found/i
    );
  });
});

// ── saveFeatureList ───────────────────────────────────────────────────────────
describe('saveFeatureList', () => {
  it('writes valid JSON to the output path', () => {
    const tmpFile = path.join(os.tmpdir(), `features-test-${Date.now()}.json`);
    const featureList = { project: 'Test', features: [{ id: 'feat-001', description: 'Do stuff' }] };
    saveFeatureList(featureList, tmpFile);
    const loaded = JSON.parse(fs.readFileSync(tmpFile, 'utf-8'));
    assert.equal(loaded.project, 'Test');
    assert.equal(loaded.features[0].id, 'feat-001');
    fs.unlinkSync(tmpFile);
  });

  it('creates parent directories if they do not exist', () => {
    const tmpDir = path.join(os.tmpdir(), `prd-test-dir-${Date.now()}`);
    const tmpFile = path.join(tmpDir, 'features.json');
    saveFeatureList({ project: 'Test', features: [] }, tmpFile);
    assert.ok(fs.existsSync(tmpFile), 'file should exist after save');
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('round-trips feature list data unchanged', () => {
    const tmpFile = path.join(os.tmpdir(), `fl-rt-${Date.now()}.json`);
    const md = '# App\n- Build user auth\n- Display dashboard metrics\n';
    const featureList = extractFeaturesFromPRD(md, { projectName: 'RT Test' });
    saveFeatureList(featureList, tmpFile);
    const loaded = JSON.parse(fs.readFileSync(tmpFile, 'utf-8'));
    assert.equal(loaded.project, 'RT Test');
    assert.equal(loaded.total_features, featureList.total_features);
    fs.unlinkSync(tmpFile);
  });
});

console.log('\n✅ prd-extractor (extractFeaturesFromPRD, loadPRDFile, saveFeatureList) tests complete.\n');
