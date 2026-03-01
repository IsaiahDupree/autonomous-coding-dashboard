# Testing Strategy

**Last Updated:** 2026-03-01
**Testing Framework:** Vitest, Playwright
**Coverage Target:** 80%+

---

## Table of Contents

1. [Overview](#overview)
2. [Testing Philosophy](#testing-philosophy)
3. [Test Categories](#test-categories)
4. [Testing Stack](#testing-stack)
5. [Unit Testing](#unit-testing)
6. [Integration Testing](#integration-testing)
7. [End-to-End Testing](#end-to-end-testing)
8. [API Testing](#api-testing)
9. [Performance Testing](#performance-testing)
10. [Security Testing](#security-testing)
11. [Test Data Management](#test-data-management)
12. [Running Tests](#running-tests)
13. [Continuous Integration](#continuous-integration)
14. [Coverage Requirements](#coverage-requirements)
15. [Best Practices](#best-practices)

---

## Overview

This document outlines the comprehensive testing strategy for the Autonomous Coding Dashboard platform, covering all three systems:

- **ACD (Autonomous Coding Dashboard)** - Agent harness system
- **PCT (Programmatic Creative Testing)** - Facebook ad creative testing
- **CF (Content Factory)** - Content production pipeline

Our testing approach prioritizes:
- **Reliability**: Catch bugs before production
- **Confidence**: Safe refactoring and feature additions
- **Speed**: Fast feedback loops
- **Maintainability**: Tests as living documentation

---

## Testing Philosophy

### Test Pyramid

```
          ╱────────╲
         ╱    E2E   ╲      ← Few (UI flows, critical paths)
        ╱────────────╲
       ╱ Integration  ╲    ← Some (API endpoints, service layers)
      ╱────────────────╲
     ╱   Unit Tests     ╲  ← Many (functions, utilities, components)
    ╱────────────────────╲
```

**Distribution Target**:
- **Unit Tests**: 70% of all tests
- **Integration Tests**: 20% of all tests
- **E2E Tests**: 10% of all tests

### Testing Principles

1. **Test Behavior, Not Implementation**
   - Focus on what the code does, not how it does it
   - Avoid testing internal implementation details

2. **Write Tests First When Possible** (TDD)
   - Red → Green → Refactor cycle
   - Tests become specifications

3. **Keep Tests Fast**
   - Unit tests: < 1ms each
   - Integration tests: < 100ms each
   - E2E tests: < 10s each

4. **Independent Tests**
   - Each test should run in isolation
   - No shared state between tests

5. **Descriptive Test Names**
   - Use: `it('should return 401 when user is not authenticated')`
   - Avoid: `it('test auth')`

6. **Arrange-Act-Assert Pattern**
   ```typescript
   it('should create a new brand', async () => {
     // Arrange
     const brandData = { name: 'Test Brand' };

     // Act
     const result = await createBrand(brandData);

     // Assert
     expect(result.name).toBe('Test Brand');
     expect(result.id).toBeDefined();
   });
   ```

---

## Test Categories

### 1. Unit Tests

**Purpose**: Test individual functions, classes, and components in isolation

**Scope**:
- Utility functions
- Service methods
- Validation logic
- Data transformations
- React components (if applicable)

**Example**:
```typescript
// backend/src/utils/__tests__/validator.test.ts
import { validateEmail } from '../validator';

describe('validateEmail', () => {
  it('should return true for valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  it('should return false for invalid email', () => {
    expect(validateEmail('invalid-email')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(validateEmail('')).toBe(false);
  });
});
```

### 2. Integration Tests

**Purpose**: Test interactions between multiple components/modules

**Scope**:
- API endpoints with database
- Service layer with external APIs
- Authentication flows
- Database queries

**Example**:
```typescript
// backend/src/__tests__/integration/brands.test.ts
import { app } from '../../index';
import request from 'supertest';
import { prisma } from '../../db';

describe('Brands API', () => {
  beforeEach(async () => {
    await prisma.pctBrand.deleteMany();
  });

  it('should create a new brand', async () => {
    const response = await request(app)
      .post('/api/pct/brands')
      .send({
        workspaceId: 'test-workspace',
        name: 'Test Brand',
        description: 'Test Description'
      })
      .expect(201);

    expect(response.body.name).toBe('Test Brand');

    // Verify in database
    const brand = await prisma.pctBrand.findUnique({
      where: { id: response.body.id }
    });
    expect(brand).toBeDefined();
  });
});
```

### 3. End-to-End Tests

**Purpose**: Test complete user workflows from UI to database

**Scope**:
- Critical user journeys
- Multi-step workflows
- Cross-system interactions

**Example**:
```typescript
// e2e/pct-workflow.spec.ts
import { test, expect } from '@playwright/test';

test('complete PCT campaign workflow', async ({ page }) => {
  // 1. Login
  await page.goto('http://localhost:3000');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  // 2. Navigate to PCT
  await page.goto('http://localhost:3000/pct.html');

  // 3. Create brand
  await page.click('text=+ New Brand');
  await page.fill('#brand-name', 'Test Brand');
  await page.click('button:has-text("Create Brand")');

  // 4. Create product
  await page.click('text=+ New Product');
  await page.fill('#product-name', 'Test Product');
  await page.click('button:has-text("Create Product")');

  // 5. Generate USPs
  await page.click('button:has-text("Generate USPs with AI")');
  await page.waitForSelector('.usp-item', { timeout: 10000 });

  // 6. Verify USPs created
  const usps = await page.locator('.usp-item').count();
  expect(usps).toBeGreaterThan(0);
});
```

### 4. API Tests

**Purpose**: Test API contracts and responses

**Scope**:
- Endpoint response formats
- Status codes
- Error handling
- Authentication/authorization

### 5. Performance Tests

**Purpose**: Ensure system meets performance requirements

**Scope**:
- Load testing
- Stress testing
- Response time benchmarks

### 6. Security Tests

**Purpose**: Identify security vulnerabilities

**Scope**:
- SQL injection
- XSS attacks
- CSRF protection
- Authentication bypass
- Authorization flaws

---

## Testing Stack

### Backend Testing

```json
{
  "vitest": "^1.0.0",           // Test runner
  "supertest": "^6.3.0",        // HTTP assertions
  "@faker-js/faker": "^8.0.0",  // Test data generation
  "msw": "^2.0.0"               // API mocking
}
```

### E2E Testing

```json
{
  "@playwright/test": "^1.40.0" // Browser automation
}
```

### Test Utilities

```typescript
// backend/src/__tests__/utils/setup.ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_TEST
    }
  }
});

export async function resetDatabase() {
  await prisma.$transaction([
    prisma.pctHook.deleteMany(),
    prisma.pctMarketingAngle.deleteMany(),
    prisma.pctUSP.deleteMany(),
    prisma.pctProduct.deleteMany(),
    prisma.pctBrand.deleteMany(),
    prisma.user.deleteMany()
  ]);
}

export async function createTestUser() {
  return prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
      passwordHash: 'hashed-password'
    }
  });
}
```

---

## Unit Testing

### What to Test

✅ **DO Test**:
- Pure functions
- Utility functions
- Validation logic
- Data transformations
- Business logic
- Error handling

❌ **DON'T Test**:
- Third-party libraries
- Framework internals
- Trivial getters/setters

### Example: Service Unit Tests

```typescript
// backend/src/services/__tests__/hook-generator.test.ts
import { HookGenerator } from '../hook-generator';

describe('HookGenerator', () => {
  let generator: HookGenerator;

  beforeEach(() => {
    generator = new HookGenerator({
      model: 'claude-sonnet-4-6',
      apiKey: 'test-key'
    });
  });

  describe('generateHook', () => {
    it('should generate hook with correct parameters', async () => {
      const hook = await generator.generateHook({
        angle: 'Mistake-proof application',
        framework: 'punchy',
        awarenessLevel: 'solution_aware',
        sophisticationLevel: 3
      });

      expect(hook.hookText).toBeDefined();
      expect(hook.framework).toBe('punchy');
      expect(hook.awarenessLevel).toBe('solution_aware');
      expect(hook.sophisticationLevel).toBe(3);
    });

    it('should throw error for invalid framework', async () => {
      await expect(
        generator.generateHook({
          angle: 'Test',
          framework: 'invalid' as any,
          awarenessLevel: 'solution_aware',
          sophisticationLevel: 3
        })
      ).rejects.toThrow('Invalid framework');
    });

    it('should respect character limit', async () => {
      const hook = await generator.generateHook({
        angle: 'Test',
        framework: 'punchy',
        awarenessLevel: 'solution_aware',
        sophisticationLevel: 3,
        maxLength: 50
      });

      expect(hook.hookText.length).toBeLessThanOrEqual(50);
    });
  });
});
```

### Example: Utility Unit Tests

```typescript
// backend/src/utils/__tests__/text-formatter.test.ts
import { formatHook, truncateText, capitalizeWords } from '../text-formatter';

describe('text-formatter utils', () => {
  describe('formatHook', () => {
    it('should trim whitespace', () => {
      expect(formatHook('  Hook text  ')).toBe('Hook text');
    });

    it('should capitalize first letter', () => {
      expect(formatHook('hook text')).toBe('Hook text');
    });

    it('should remove multiple spaces', () => {
      expect(formatHook('Hook   text')).toBe('Hook text');
    });
  });

  describe('truncateText', () => {
    it('should not truncate short text', () => {
      expect(truncateText('Short', 10)).toBe('Short');
    });

    it('should truncate long text', () => {
      expect(truncateText('This is a long text', 10)).toBe('This is...');
    });

    it('should use custom suffix', () => {
      expect(truncateText('Long text', 5, '…')).toBe('Long…');
    });
  });
});
```

---

## Integration Testing

### Database Integration Tests

```typescript
// backend/src/__tests__/integration/pct-workflow.test.ts
import { prisma, resetDatabase, createTestUser } from '../utils/setup';
import { PctService } from '../../services/pct-service';

describe('PCT Workflow Integration', () => {
  let service: PctService;
  let testUser: any;

  beforeAll(async () => {
    await resetDatabase();
    testUser = await createTestUser();
    service = new PctService(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should complete full brand-to-hook workflow', async () => {
    // 1. Create workspace
    const workspace = await prisma.pctWorkspace.create({
      data: {
        name: 'Test Workspace',
        userId: testUser.id
      }
    });

    // 2. Create brand
    const brand = await service.createBrand({
      workspaceId: workspace.id,
      name: 'Test Brand',
      brandVoice: 'Professional'
    });

    // 3. Create product
    const product = await service.createProduct({
      brandId: brand.id,
      name: 'Test Product',
      description: 'A test product',
      features: ['Feature 1', 'Feature 2']
    });

    // 4. Generate USPs
    const usps = await service.generateUSPs({
      productId: product.id,
      count: 3
    });

    expect(usps).toHaveLength(3);

    // 5. Generate marketing angles
    const angle = await service.generateMarketingAngle({
      uspId: usps[0].id
    });

    expect(angle.angleText).toBeDefined();

    // 6. Generate hooks
    const hooks = await service.generateHooks({
      angleId: angle.id,
      framework: 'punchy',
      count: 5
    });

    expect(hooks).toHaveLength(5);
    hooks.forEach(hook => {
      expect(hook.hookText).toBeDefined();
      expect(hook.framework).toBe('punchy');
    });
  });
});
```

### API Integration Tests

```typescript
// backend/src/__tests__/integration/api/brands.test.ts
import request from 'supertest';
import { app } from '../../../index';
import { prisma, resetDatabase } from '../../utils/setup';

describe('Brands API Integration', () => {
  let authToken: string;

  beforeAll(async () => {
    await resetDatabase();

    // Get auth token
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    authToken = response.body.token;
  });

  describe('POST /api/pct/brands', () => {
    it('should create brand with valid data', async () => {
      const response = await request(app)
        .post('/api/pct/brands')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workspaceId: 'test-workspace',
          name: 'Test Brand',
          brandVoice: 'Professional'
        })
        .expect(201);

      expect(response.body).toMatchObject({
        name: 'Test Brand',
        brandVoice: 'Professional'
      });
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/pct/brands')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing name
          brandVoice: 'Professional'
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return 401 without auth token', async () => {
      await request(app)
        .post('/api/pct/brands')
        .send({
          name: 'Test Brand'
        })
        .expect(401);
    });
  });

  describe('GET /api/pct/brands', () => {
    it('should list all brands', async () => {
      // Create test brands
      await prisma.pctBrand.createMany({
        data: [
          { workspaceId: 'test', name: 'Brand 1', brandVoice: 'Professional' },
          { workspaceId: 'test', name: 'Brand 2', brandVoice: 'Casual' }
        ]
      });

      const response = await request(app)
        .get('/api/pct/brands')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.brands).toHaveLength(2);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/pct/brands?limit=1&offset=0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.brands).toHaveLength(1);
      expect(response.body.pagination).toMatchObject({
        limit: 1,
        offset: 0,
        hasMore: true
      });
    });
  });
});
```

---

## End-to-End Testing

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] }
    }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI
  }
});
```

### E2E Test Examples

#### PCT Workflow

```typescript
// e2e/pct-complete-workflow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('PCT Complete Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });

  test('should create brand and generate hooks', async ({ page }) => {
    // Navigate to PCT
    await page.goto('/pct.html');

    // Create brand
    await page.click('summary:has-text("+ New Brand")');
    await page.fill('#brand-name', 'E2E Test Brand');
    await page.fill('#brand-desc', 'Test brand description');
    await page.selectOption('#brand-tone', 'professional');
    await page.click('button:has-text("Create Brand")');

    // Verify brand created
    await expect(page.locator('.brand-card')).toContainText('E2E Test Brand');

    // Create product
    await page.click('summary:has-text("+ New Product")');
    await page.fill('#product-name', 'E2E Test Product');
    await page.fill('#product-desc', 'Test product');
    await page.fill('#product-features', 'Feature 1\nFeature 2');
    await page.click('button:has-text("Create Product")');

    // Navigate to USPs tab
    await page.click('.pct-tab:has-text("USPs & Angles")');

    // Generate USPs
    await page.click('#gen-usps-btn');
    await page.waitForSelector('.usp-item', { timeout: 15000 });

    // Verify USPs generated
    const usps = await page.locator('.usp-item').count();
    expect(usps).toBeGreaterThan(0);

    // Generate marketing angle
    const firstUsp = page.locator('.usp-item').first();
    await firstUsp.click();
    await page.click('button:has-text("Generate Angles")');
    await page.waitForSelector('.angle-item', { timeout: 10000 });

    // Navigate to hook generation
    await page.click('.pct-tab:has-text("Hook Generation")');

    // Generate hooks
    const firstAngle = page.locator('.angle-item').first();
    await firstAngle.click();
    await page.selectOption('#framework-select', 'punchy');
    await page.click('button:has-text("Generate Hooks")');
    await page.waitForSelector('.hook-item', { timeout: 15000 });

    // Verify hooks generated
    const hooks = await page.locator('.hook-item').count();
    expect(hooks).toBeGreaterThan(0);

    // Approve a hook
    const firstHook = page.locator('.hook-item').first();
    await firstHook.click();
    await page.click('button:has-text("Approve")');

    // Navigate to hook review
    await page.click('.pct-tab:has-text("Hook Review")');

    // Verify approved hook appears
    await expect(page.locator('.hook-approved')).toHaveCount(1);
  });

  test('should handle errors gracefully', async ({ page }) => {
    await page.goto('/pct.html');

    // Try to create brand without required fields
    await page.click('summary:has-text("+ New Brand")');
    await page.click('button:has-text("Create Brand")');

    // Verify error message
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('required');
  });
});
```

#### ACD Harness

```typescript
// e2e/harness-control.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Harness Control', () => {
  test('should start and stop harness session', async ({ page }) => {
    await page.goto('/control.html');

    // Select target
    await page.selectOption('#target-select', { label: 'PCT System' });

    // Start harness
    await page.click('button:has-text("Start Harness")');

    // Wait for session to start
    await expect(page.locator('.status-running')).toBeVisible({ timeout: 5000 });

    // Verify session info displayed
    await expect(page.locator('.session-info')).toContainText('Session');

    // Stop harness
    await page.click('button:has-text("Stop Harness")');

    // Verify stopped
    await expect(page.locator('.status-stopped')).toBeVisible({ timeout: 5000 });
  });

  test('should display real-time logs', async ({ page }) => {
    await page.goto('/control.html');

    // Start session
    await page.selectOption('#target-select', { label: 'PCT System' });
    await page.click('button:has-text("Start Harness")');

    // Wait for logs to appear
    await page.waitForSelector('.log-entry', { timeout: 10000 });

    // Verify logs are updating
    const initialLogCount = await page.locator('.log-entry').count();
    await page.waitForTimeout(2000);
    const updatedLogCount = await page.locator('.log-entry').count();

    expect(updatedLogCount).toBeGreaterThan(initialLogCount);
  });
});
```

### Visual Regression Testing

```typescript
// e2e/visual-regression.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('dashboard homepage', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveScreenshot('dashboard-homepage.png');
  });

  test('PCT main page', async ({ page }) => {
    await page.goto('/pct.html');
    await expect(page).toHaveScreenshot('pct-main.png');
  });

  test('mobile responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page).toHaveScreenshot('mobile-homepage.png');
  });
});
```

---

## API Testing

### Contract Testing

```typescript
// backend/src/__tests__/contracts/pct-api.contract.test.ts
import request from 'supertest';
import { app } from '../../index';
import Joi from 'joi';

describe('PCT API Contracts', () => {
  const brandSchema = Joi.object({
    id: Joi.string().uuid().required(),
    workspaceId: Joi.string().required(),
    name: Joi.string().required(),
    description: Joi.string().allow(null),
    brandVoice: Joi.string().allow(null),
    logoUrl: Joi.string().uri().allow(null),
    created_at: Joi.date().iso().required()
  });

  it('GET /api/pct/brands should match schema', async () => {
    const response = await request(app)
      .get('/api/pct/brands')
      .set('Authorization', 'Bearer test-token')
      .expect(200);

    const { error } = Joi.object({
      brands: Joi.array().items(brandSchema).required()
    }).validate(response.body);

    expect(error).toBeUndefined();
  });

  it('POST /api/pct/brands should match schema', async () => {
    const response = await request(app)
      .post('/api/pct/brands')
      .set('Authorization', 'Bearer test-token')
      .send({
        workspaceId: 'test',
        name: 'Test Brand'
      })
      .expect(201);

    const { error } = brandSchema.validate(response.body);
    expect(error).toBeUndefined();
  });
});
```

---

## Performance Testing

### Load Testing with k6

```javascript
// tests/load/pct-api-load.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 100, // 100 virtual users
  duration: '5m',
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01']     // Less than 1% errors
  }
};

export default function () {
  // List brands
  const listResponse = http.get('http://localhost:4000/api/pct/brands', {
    headers: {
      'Authorization': 'Bearer test-token'
    }
  });

  check(listResponse, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500
  });

  sleep(1);

  // Create brand
  const createResponse = http.post(
    'http://localhost:4000/api/pct/brands',
    JSON.stringify({
      workspaceId: 'load-test',
      name: `Brand ${__VU}-${__ITER}`
    }),
    {
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      }
    }
  );

  check(createResponse, {
    'create status is 201': (r) => r.status === 201,
    'create response time < 1000ms': (r) => r.timings.duration < 1000
  });

  sleep(1);
}
```

### Run Load Tests

```bash
# Install k6
brew install k6  # macOS
# or download from https://k6.io

# Run load test
k6 run tests/load/pct-api-load.js

# Run with higher load
k6 run --vus 500 --duration 10m tests/load/pct-api-load.js
```

### Database Performance Testing

```typescript
// backend/src/__tests__/performance/database-queries.test.ts
import { prisma } from '../../db';
import { performance } from 'perf_hooks';

describe('Database Query Performance', () => {
  it('should fetch brands in under 100ms', async () => {
    const start = performance.now();

    await prisma.pctBrand.findMany({
      take: 100
    });

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });

  it('should handle complex join query efficiently', async () => {
    const start = performance.now();

    await prisma.pctHook.findMany({
      include: {
        angle: {
          include: {
            usp: {
              include: {
                product: {
                  include: {
                    brand: true
                  }
                }
              }
            }
          }
        }
      },
      take: 50
    });

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(500);
  });
});
```

---

## Security Testing

### SQL Injection Testing

```typescript
// backend/src/__tests__/security/sql-injection.test.ts
import request from 'supertest';
import { app } from '../../index';

describe('SQL Injection Protection', () => {
  const maliciousInputs = [
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "1' UNION SELECT * FROM users--",
    "admin'--",
    "' OR 1=1--"
  ];

  maliciousInputs.forEach(input => {
    it(`should safely handle: ${input}`, async () => {
      const response = await request(app)
        .get(`/api/pct/brands?name=${encodeURIComponent(input)}`)
        .set('Authorization', 'Bearer test-token');

      // Should not cause error or return unexpected data
      expect(response.status).toBeLessThan(500);

      // Should sanitize input
      expect(response.body).not.toContain('error');
    });
  });
});
```

### XSS Protection Testing

```typescript
// e2e/security/xss.spec.ts
import { test, expect } from '@playwright/test';

test.describe('XSS Protection', () => {
  const xssPayloads = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    '<svg onload=alert("XSS")>',
    'javascript:alert("XSS")'
  ];

  xssPayloads.forEach(payload => {
    test(`should escape: ${payload}`, async ({ page }) => {
      await page.goto('/pct.html');

      // Try to inject XSS in brand name
      await page.click('summary:has-text("+ New Brand")');
      await page.fill('#brand-name', payload);
      await page.click('button:has-text("Create Brand")');

      // Verify script didn't execute
      const dialogPromise = page.waitForEvent('dialog', { timeout: 1000 }).catch(() => null);
      const dialog = await dialogPromise;
      expect(dialog).toBeNull();

      // Verify payload is escaped in display
      const brandCard = page.locator('.brand-card').last();
      const text = await brandCard.textContent();
      expect(text).not.toContain('<script>');
    });
  });
});
```

### Authentication & Authorization Testing

```typescript
// backend/src/__tests__/security/auth.test.ts
import request from 'supertest';
import { app } from '../../index';

describe('Authentication & Authorization', () => {
  it('should reject requests without auth token', async () => {
    await request(app)
      .get('/api/pct/brands')
      .expect(401);
  });

  it('should reject requests with invalid token', async () => {
    await request(app)
      .get('/api/pct/brands')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });

  it('should reject requests with expired token', async () => {
    const expiredToken = 'expired-jwt-token';

    await request(app)
      .get('/api/pct/brands')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
  });

  it('should prevent unauthorized access to other users data', async () => {
    // User 1 token
    const user1Token = 'user1-token';

    // Create brand as user 1
    const brand = await request(app)
      .post('/api/pct/brands')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ workspaceId: 'user1-workspace', name: 'User 1 Brand' })
      .expect(201);

    // Try to access as user 2
    const user2Token = 'user2-token';

    await request(app)
      .get(`/api/pct/brands/${brand.body.id}`)
      .set('Authorization', `Bearer ${user2Token}`)
      .expect(403);
  });
});
```

---

## Test Data Management

### Factories

```typescript
// backend/src/__tests__/factories/brand.factory.ts
import { faker } from '@faker-js/faker';
import { prisma } from '../../db';

export class BrandFactory {
  static async create(overrides = {}) {
    return prisma.pctBrand.create({
      data: {
        workspaceId: faker.string.uuid(),
        name: faker.company.name(),
        description: faker.company.catchPhrase(),
        brandVoice: faker.helpers.arrayElement(['Professional', 'Casual', 'Bold']),
        ...overrides
      }
    });
  }

  static async createMany(count: number, overrides = {}) {
    return Promise.all(
      Array.from({ length: count }, () => this.create(overrides))
    );
  }
}

export class ProductFactory {
  static async create(overrides = {}) {
    return prisma.pctProduct.create({
      data: {
        brandId: overrides.brandId || (await BrandFactory.create()).id,
        name: faker.commerce.productName(),
        description: faker.commerce.productDescription(),
        features: [faker.commerce.productAdjective(), faker.commerce.productMaterial()],
        benefits: [faker.lorem.sentence(), faker.lorem.sentence()],
        pricePoint: faker.commerce.price(),
        ...overrides
      }
    });
  }
}
```

### Usage in Tests

```typescript
import { BrandFactory, ProductFactory } from '../factories';

describe('Products API', () => {
  it('should list products for a brand', async () => {
    const brand = await BrandFactory.create();
    await ProductFactory.createMany(5, { brandId: brand.id });

    const response = await request(app)
      .get(`/api/pct/brands/${brand.id}/products`)
      .set('Authorization', 'Bearer test-token')
      .expect(200);

    expect(response.body.products).toHaveLength(5);
  });
});
```

---

## Running Tests

### Commands

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test file
npm test -- brands.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should create brand"

# Run E2E tests in headed mode
npm run test:e2e -- --headed

# Run E2E tests in specific browser
npm run test:e2e -- --project=firefox

# Run E2E tests in debug mode
npm run test:e2e -- --debug
```

### Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:unit": "vitest run --dir src/__tests__/unit",
    "test:integration": "vitest run --dir src/__tests__/integration",
    "test:e2e": "playwright test",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest watch",
    "test:ui": "vitest --ui",
    "test:load": "k6 run tests/load/pct-api-load.js"
  }
}
```

---

## Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-integration:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run migrations
        run: cd backend && npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test

      - name: Run unit tests
        run: npm run test:unit
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
          REDIS_URL: redis://localhost:6379

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
          REDIS_URL: redis://localhost:6379

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  e2e:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          CI: true

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

---

## Coverage Requirements

### Coverage Targets

| Metric | Target | Critical |
|--------|--------|----------|
| **Statements** | 80% | 90% |
| **Branches** | 75% | 85% |
| **Functions** | 80% | 90% |
| **Lines** | 80% | 90% |

### Critical Paths (100% Coverage Required)

- Authentication flows
- Payment processing
- Data deletion (GDPR)
- Security middleware
- Input validation

### Coverage Configuration

```javascript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types.ts',
        '**/__tests__/**'
      ],
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
      thresholds: {
        perFile: true,
        autoUpdate: false,
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80
      }
    }
  }
});
```

---

## Best Practices

### 1. Test Naming

✅ **Good**:
```typescript
it('should return 404 when brand does not exist')
it('should create hook with correct framework parameters')
it('should prevent SQL injection in search queries')
```

❌ **Bad**:
```typescript
it('test brand')
it('works')
it('test1')
```

### 2. Test Organization

```typescript
describe('BrandService', () => {
  describe('createBrand', () => {
    it('should create brand with valid data')
    it('should throw error for duplicate name')
    it('should validate required fields')
  });

  describe('updateBrand', () => {
    it('should update existing brand')
    it('should return 404 for non-existent brand')
  });
});
```

### 3. Avoid Test Interdependence

❌ **Bad** (tests depend on each other):
```typescript
let brandId: string;

it('should create brand', () => {
  brandId = createBrand().id;
});

it('should update brand', () => {
  updateBrand(brandId, {...});
});
```

✅ **Good** (independent tests):
```typescript
it('should create brand', async () => {
  const brand = await createBrand({...});
  expect(brand.id).toBeDefined();
});

it('should update brand', async () => {
  const brand = await BrandFactory.create();
  const updated = await updateBrand(brand.id, {...});
  expect(updated.name).toBe('New Name');
});
```

### 4. Use Test Doubles Appropriately

- **Mock**: Replace implementation
- **Stub**: Return predefined responses
- **Spy**: Track calls without changing behavior
- **Fake**: Simplified implementation (e.g., in-memory database)

```typescript
// Mock external API
import { vi } from 'vitest';

vi.mock('../../services/anthropic', () => ({
  generateText: vi.fn().mockResolvedValue('Generated hook text')
}));

// Spy on function
const spy = vi.spyOn(service, 'createBrand');
await service.createBrand({...});
expect(spy).toHaveBeenCalledWith({...});
```

### 5. Clean Up After Tests

```typescript
afterEach(async () => {
  await prisma.pctHook.deleteMany();
  await prisma.pctBrand.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

### 6. Test Edge Cases

- Empty inputs
- Null values
- Maximum limits
- Boundary values
- Invalid formats
- Concurrent operations

### 7. Parallel Test Execution

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 4
      }
    }
  }
});
```

---

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library Best Practices](https://testing-library.com/docs/)
- [Kent C. Dodds - Testing JavaScript](https://testingjavascript.com/)
- [Database Schema](DATABASE_SCHEMA.md)
- [API Documentation](API_DOCUMENTATION.md)

---

**Last Updated:** 2026-03-01
**Testing Framework Version:** Vitest 1.0.0, Playwright 1.40.0
