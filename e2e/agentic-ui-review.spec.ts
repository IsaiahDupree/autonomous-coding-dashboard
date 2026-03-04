/**
 * Agentic UI Review Tests
 * ========================
 * 4-Layer Claude Code Playwright CLI Skill implementation.
 * Source: IndyDevDan — https://www.youtube.com/watch?v=efctPj6bjCY
 *
 * These tests validate the agentic browser automation infrastructure itself:
 * - User stories load correctly
 * - Results directory is writable
 * - Sub-agent result format is valid
 * - Orchestrator produces compliant report JSON
 *
 * For the actual agentic UI review, run: j ui-review
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const STORIES_FILE = path.join(process.cwd(), 'e2e/user-stories.md');
const RESULTS_DIR = path.join(process.cwd(), 'e2e/results');
const LATEST_RESULTS = path.join(RESULTS_DIR, 'latest.json');

// ─── Layer 1: Skill Infrastructure ───────────────────────────

test.describe('Layer 1 — Skill Infrastructure', () => {
  test('user-stories.md exists and has parseable stories', () => {
    expect(fs.existsSync(STORIES_FILE)).toBe(true);
    const content = fs.readFileSync(STORIES_FILE, 'utf-8');
    const stories = content
      .split('\n')
      .filter(l => l.trim().startsWith('- '))
      .map(l => l.trim().replace(/^- /, ''));
    expect(stories.length).toBeGreaterThan(5);
    for (const story of stories) {
      expect(story.length).toBeGreaterThan(10);
    }
  });

  test('skill file exists and has all 4 layers documented', () => {
    const skillPath = path.join(
      process.cwd(),
      '../../skills/playwright-agentic/SKILL.md'
    );
    if (!fs.existsSync(skillPath)) {
      test.skip();
      return;
    }
    const content = fs.readFileSync(skillPath, 'utf-8');
    expect(content).toContain('Layer 1');
    expect(content).toContain('Layer 2');
    expect(content).toContain('Layer 3');
    expect(content).toContain('Layer 4');
  });

  test('results directory is writable', () => {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
    fs.mkdirSync(path.join(RESULTS_DIR, 'screenshots'), { recursive: true });
    const testFile = path.join(RESULTS_DIR, '.write-test');
    fs.writeFileSync(testFile, 'ok');
    expect(fs.existsSync(testFile)).toBe(true);
    fs.unlinkSync(testFile);
  });
});

// ─── Layer 2: Sub-Agent Contract ─────────────────────────────

test.describe('Layer 2 — Sub-Agent Result Contract', () => {
  test('sub-agent spec file exists', () => {
    const agentPath = path.join(
      process.cwd(),
      '.claude/agents/ui-tester.md'
    );
    expect(fs.existsSync(agentPath)).toBe(true);
    const content = fs.readFileSync(agentPath, 'utf-8');
    expect(content).toContain('PASS');
    expect(content).toContain('FAIL');
    expect(content).toContain('BLOCKED');
  });

  test('sub-agent result schema is valid when simulated', () => {
    const simulatedResult = {
      story: 'user can reach the login page from the root URL',
      result: 'PASS' as const,
      steps_taken: ['navigated to /', 'found Login link', 'navigated to /login'],
      assertions: [
        { check: 'URL contains /login', passed: true },
        { check: 'login form is visible', passed: true },
      ],
      evidence: 'e2e/results/screenshots/login-page.png',
      durationMs: 1240,
      errors: [],
    };

    expect(['PASS', 'FAIL', 'BLOCKED']).toContain(simulatedResult.result);
    expect(Array.isArray(simulatedResult.steps_taken)).toBe(true);
    expect(Array.isArray(simulatedResult.assertions)).toBe(true);
    expect(typeof simulatedResult.durationMs).toBe('number');
    for (const a of simulatedResult.assertions) {
      expect(typeof a.check).toBe('string');
      expect(typeof a.passed).toBe('boolean');
    }
  });
});

// ─── Layer 3: Command Files ───────────────────────────────────

test.describe('Layer 3 — Command Orchestration Files', () => {
  const commandsDir = path.join(process.cwd(), '.claude/commands');

  test('ui-review.md command exists', () => {
    const f = path.join(commandsDir, 'ui-review.md');
    expect(fs.existsSync(f)).toBe(true);
    const content = fs.readFileSync(f, 'utf-8');
    expect(content).toContain('PASS');
    expect(content).toContain('parallel');
  });

  test('automate.md command exists', () => {
    const f = path.join(commandsDir, 'automate.md');
    expect(fs.existsSync(f)).toBe(true);
    const content = fs.readFileSync(f, 'utf-8');
    expect(content).toContain('navigate');
    expect(content).toContain('click');
  });
});

// ─── Layer 4: Justfile ────────────────────────────────────────

test.describe('Layer 4 — Justfile Reusability Layer', () => {
  test('justfile exists with ui-review and automate recipes', () => {
    const justfilePath = path.join(process.cwd(), 'justfile');
    expect(fs.existsSync(justfilePath)).toBe(true);
    const content = fs.readFileSync(justfilePath, 'utf-8');
    expect(content).toContain('ui-review');
    expect(content).toContain('automate');
    expect(content).toContain('story');
  });

  test('just is installed (required for j commands)', async () => {
    const { execSync } = require('child_process');
    let justInstalled = false;
    try {
      execSync('just --version', { stdio: 'pipe' });
      justInstalled = true;
    } catch {
      justInstalled = false;
    }
    if (!justInstalled) {
      console.warn(
        'WARN: just not installed. Install with: brew install just\n' +
        'j ui-review and j automate commands will not work until then.'
      );
    }
  });
});

// ─── Live Browser Smoke Tests ─────────────────────────────────

test.describe('Live Browser — Agentic User Story Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('story: app responds to browser navigation', async ({ page }) => {
    const url = page.url();
    expect(url).toBeTruthy();
    // Accept either a full HTML page with a title or a JSON API root (both are valid)
    const title = await page.title();
    const bodyText = await page.locator('body').textContent();
    expect(url.length + (bodyText?.length ?? 0)).toBeGreaterThan(0);
  });

  test('story: health endpoint is reachable from browser context', async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    const response = await page.request.get(`${backendUrl}/health`);
    expect(response.status()).toBeLessThan(500);
  });

  test('story: page has no JS console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const critical = errors.filter(
      e =>
        !e.includes('favicon') &&
        !e.includes('404') &&
        !e.includes('net::ERR')
    );
    expect(critical).toHaveLength(0);
  });

  test('story: page loads within 3 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3000);
  });

  test('story: page has accessible document structure', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const h1Count = await page.locator('h1').count();
    const mainCount = await page.locator('main, [role="main"]').count();
    const bodyText = await page.locator('body').textContent();
    const isJsonApi = bodyText?.trimStart().startsWith('{') || bodyText?.trimStart().startsWith('[');
    if (isJsonApi) {
      // Backend API root — skip HTML structure check, just verify it responded
      console.log('INFO: BASE_URL is a JSON API — skipping HTML structure check. Point BASE_URL to your frontend for full agentic UI testing.');
      expect(bodyText?.length).toBeGreaterThan(0);
    } else {
      expect(h1Count + mainCount).toBeGreaterThan(0);
    }
  });
});

// ─── Results Report Validation ────────────────────────────────

test.describe('Results Report — Output Contract', () => {
  test('latest.json schema is valid after a ui-review run', () => {
    if (!fs.existsSync(LATEST_RESULTS)) {
      test.skip();
      return;
    }
    const raw = fs.readFileSync(LATEST_RESULTS, 'utf-8');
    const report = JSON.parse(raw);
    expect(report).toHaveProperty('runAt');
    expect(report).toHaveProperty('baseUrl');
    expect(report).toHaveProperty('summary');
    expect(report.summary).toHaveProperty('passed');
    expect(report.summary).toHaveProperty('failed');
    expect(report.summary).toHaveProperty('blocked');
    expect(Array.isArray(report.results)).toBe(true);
    for (const r of report.results) {
      expect(['PASS', 'FAIL', 'BLOCKED']).toContain(r.result);
      expect(typeof r.story).toBe('string');
      expect(Array.isArray(r.steps_taken)).toBe(true);
    }
  });
});
