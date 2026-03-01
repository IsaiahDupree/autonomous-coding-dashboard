/**
 * Playwright E2E Test Configuration
 * ==================================
 *
 * AUTH-WC-011: Playwright auth tests
 * AUTH-WC-012: Playwright CRUD tests
 * AUTH-WC-013: Playwright settings tests
 * AUTH-WC-014: Playwright breakpoint tests
 * AUTH-WC-015: Playwright error/edge tests
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ...(process.env.CI ? [['github' as const]] : []),
  ],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // AUTH-WC-011: Auth tests
    {
      name: 'auth',
      testMatch: /auth\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // AUTH-WC-012: CRUD tests
    {
      name: 'crud',
      testMatch: /crud\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // AUTH-WC-013: Settings tests
    {
      name: 'settings',
      testMatch: /settings\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // AUTH-WC-014: Responsive breakpoint tests
    {
      name: 'mobile',
      testMatch: /breakpoint\.spec\.ts/,
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'tablet',
      testMatch: /breakpoint\.spec\.ts/,
      use: { ...devices['iPad (gen 7)'] },
    },

    // AUTH-WC-015: Error/edge case tests
    {
      name: 'edge-cases',
      testMatch: /edge\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // AUTH-WC-021: Screenshot comparison
    {
      name: 'visual',
      testMatch: /visual\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },

    // CF-WC-016, CF-WC-017: Content Factory performance tests
    {
      name: 'cf-performance',
      testMatch: /cf-performance\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // CF-WC-018: Content Factory DB performance
    {
      name: 'cf-db-performance',
      testMatch: /cf-db-performance\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // CF-WC-019: Content Factory load testing
    {
      name: 'cf-load-testing',
      testMatch: /cf-load-testing\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // CF-WC-020: Content Factory accessibility
    {
      name: 'cf-accessibility',
      testMatch: /cf-accessibility\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // CF-WC-021: Content Factory visual regression
    {
      name: 'cf-visual-regression',
      testMatch: /cf-visual-regression\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },

    // CF-WC-022: Content Factory API contracts
    {
      name: 'cf-api-contracts',
      testMatch: /cf-api-contracts\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // CF-WC-023, CF-WC-024: Content Factory security
    {
      name: 'cf-security',
      testMatch: /cf-security\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // CF-WC-025: Content Factory coverage
    {
      name: 'cf-coverage',
      testMatch: /cf-coverage\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // CF-WC-026: Content Factory snapshot
    {
      name: 'cf-snapshot',
      testMatch: /cf-snapshot\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: process.env.CI ? undefined : {
    command: 'cd backend && npm run dev',
    url: 'http://localhost:3001',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
