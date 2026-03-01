# Content Factory Testing Strategy

## Overview

This document outlines the comprehensive testing strategy for Content Factory, covering unit tests, integration tests, end-to-end tests, and manual testing procedures.

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Test Environment Setup](#test-environment-setup)
3. [Unit Testing](#unit-testing)
4. [Integration Testing](#integration-testing)
5. [End-to-End Testing](#end-to-end-testing)
6. [API Testing](#api-testing)
7. [Database Testing](#database-testing)
8. [Third-Party Integration Testing](#third-party-integration-testing)
9. [Performance Testing](#performance-testing)
10. [Manual Testing Procedures](#manual-testing-procedures)
11. [Test Coverage Goals](#test-coverage-goals)
12. [Continuous Integration](#continuous-integration)

---

## Testing Philosophy

### Testing Pyramid

```
        /\
       /  \      E2E Tests (10%)
      /────\     - Critical user journeys
     /      \    - Platform publishing
    /────────\   - Payment flows
   /          \
  / Integration\ (30%)
 /    Tests     \  - API routes
/────────────────\ - Database queries
\  Unit Tests    / - Service functions
 \ (60%)        /  - Business logic
  \────────────/
```

### Key Principles

1. **Fast Feedback**: Unit tests run in < 1s, integration tests in < 10s
2. **Isolated**: Tests don't depend on external services (use mocks)
3. **Deterministic**: Same input always produces same output
4. **Maintainable**: Clear test names, DRY principles
5. **Comprehensive**: Cover happy paths, edge cases, error scenarios

---

## Test Environment Setup

### Dependencies

```bash
cd backend

# Install test dependencies
npm install --save-dev \
  vitest \
  @vitest/ui \
  @vitest/coverage-v8 \
  supertest \
  @types/supertest \
  msw \
  @playwright/test
```

### Configuration

**vitest.config.ts:**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/__tests__/**',
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
```

**src/__tests__/setup.ts:**

```typescript
import { beforeAll, afterAll, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

// Test database
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_TEST,
    },
  },
});

beforeAll(async () => {
  // Run migrations on test database
  await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
});

afterEach(async () => {
  // Clean up test data after each test
  await prisma.cf_performance_metrics.deleteMany();
  await prisma.cf_published_content.deleteMany();
  await prisma.cf_assembled_content.deleteMany();
  await prisma.cf_scripts.deleteMany();
  await prisma.cf_generated_videos.deleteMany();
  await prisma.cf_generated_images.deleteMany();
  await prisma.cf_product_dossiers.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

export { prisma };
```

---

## Unit Testing

### Service Layer Tests

**Example: Script Generation Service**

**src/services/__tests__/script-generation.test.ts:**

```typescript
import { describe, it, expect } from 'vitest';
import { generateScript, DossierContext } from '../cf-generation';

describe('generateScript', () => {
  const dossier: DossierContext = {
    name: 'Acne Patch',
    benefits: ['Clear skin overnight', 'Invisible wear'],
    painPoints: ['Embarrassing breakouts', 'Slow healing'],
    proofTypes: ['before_after'],
  };

  it('generates unaware script (level 1) without product name', () => {
    const script = generateScript(dossier, 1, 3);

    expect(script.awarenessLevel).toBe(1);
    expect(script.hook).toBeTruthy();
    expect(script.body).toBeTruthy();
    expect(script.cta).toBeTruthy();

    // Level 1 should NOT mention product name
    expect(script.fullScript.toLowerCase()).not.toContain('acne patch');

    // Should focus on relatable scenario
    expect(script.hook.toLowerCase()).toMatch(/pov|when|imagine/);
  });

  it('generates problem aware script (level 2) with pain points', () => {
    const script = generateScript(dossier, 2, 3);

    expect(script.awarenessLevel).toBe(2);

    // Should mention pain points
    const lowerScript = script.fullScript.toLowerCase();
    const hasPainPoint = dossier.painPoints.some((pain) =>
      lowerScript.includes(pain.toLowerCase())
    );
    expect(hasPainPoint).toBe(true);
  });

  it('generates product aware script (level 4) with product name', () => {
    const script = generateScript(dossier, 4, 3);

    expect(script.awarenessLevel).toBe(4);

    // Level 4 should mention product name
    expect(script.fullScript.toLowerCase()).toContain('acne patch');
  });

  it('generates most aware script (level 5) with urgency', () => {
    const script = generateScript(dossier, 5, 3);

    expect(script.awarenessLevel).toBe(5);

    // Should have urgency/scarcity language
    expect(script.cta.toLowerCase()).toMatch(/now|today|limited|sale|link/);
  });

  it('estimates script duration based on word count', () => {
    const script = generateScript(dossier, 3, 3);

    expect(script.estimatedDuration).toBeGreaterThan(0);
    expect(script.estimatedDuration).toBeLessThan(60); // Under 60 seconds

    // Rough estimate: ~150 words per minute = 2.5 words per second
    const wordCount = script.fullScript.split(/\s+/).length;
    const expectedDuration = Math.ceil(wordCount / 2.5);
    expect(script.estimatedDuration).toBeCloseTo(expectedDuration, 3);
  });
});
```

### Utility Function Tests

**src/utils/__tests__/scoring.test.ts:**

```typescript
import { describe, it, expect } from 'vitest';
import { calculateContentScore, ScoringWeights } from '../scoring';

describe('calculateContentScore', () => {
  const weights: ScoringWeights = {
    engagement: 0.4,
    ctr: 0.3,
    conversions: 0.3,
  };

  it('calculates score with all metrics', () => {
    const metrics = {
      views: 10000,
      likes: 1000,
      comments: 100,
      shares: 200,
      saves: 150,
      clicks: 300,
      conversions: 25,
    };

    const score = calculateContentScore(metrics, weights);

    // Engagement rate: (1000+100+200+150)/10000 = 0.145
    // CTR: 300/10000 = 0.03
    // Conversion contribution
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('returns 0 for zero views', () => {
    const metrics = {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      clicks: 0,
      conversions: 0,
    };

    const score = calculateContentScore(metrics, weights);
    expect(score).toBe(0);
  });

  it('handles missing conversions gracefully', () => {
    const metrics = {
      views: 5000,
      likes: 500,
      comments: 50,
      shares: 100,
      saves: 75,
      clicks: 150,
      conversions: 0,
    };

    const score = calculateContentScore(metrics, weights);
    expect(score).toBeGreaterThan(0); // Still scores based on engagement + CTR
  });
});
```

---

## Integration Testing

### API Route Tests

**src/routes/__tests__/dossiers.test.ts:**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../index';
import { prisma } from '../../__tests__/setup';

describe('POST /api/cf/dossiers', () => {
  it('creates a new dossier with valid data', async () => {
    const response = await request(app)
      .post('/api/cf/dossiers')
      .send({
        name: 'Acne Patch',
        benefits: ['Clear skin overnight'],
        painPoints: ['Embarrassing breakouts'],
        category: 'Beauty',
        price: 12.99,
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('Acne Patch');
    expect(response.body.slug).toBe('acne-patch');
    expect(response.body.status).toBe('draft');

    // Verify in database
    const dossier = await prisma.cf_product_dossiers.findUnique({
      where: { id: response.body.id },
    });
    expect(dossier).toBeTruthy();
    expect(dossier?.name).toBe('Acne Patch');
  });

  it('returns 400 for missing required fields', async () => {
    const response = await request(app)
      .post('/api/cf/dossiers')
      .send({
        // Missing name
        benefits: ['Clear skin'],
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('name');
  });

  it('generates unique slug for duplicate names', async () => {
    // Create first dossier
    await request(app)
      .post('/api/cf/dossiers')
      .send({
        name: 'Acne Patch',
        benefits: ['Clear skin'],
      })
      .expect(201);

    // Create second with same name
    const response = await request(app)
      .post('/api/cf/dossiers')
      .send({
        name: 'Acne Patch',
        benefits: ['Different benefit'],
      })
      .expect(201);

    expect(response.body.slug).toMatch(/^acne-patch-\d+$/);
  });
});

describe('GET /api/cf/dossiers/:id', () => {
  let dossierId: string;

  beforeEach(async () => {
    // Create test dossier
    const dossier = await prisma.cf_product_dossiers.create({
      data: {
        slug: 'test-product',
        name: 'Test Product',
        benefits: ['Benefit 1'],
        painPoints: ['Pain 1'],
        status: 'active',
      },
    });
    dossierId = dossier.id;
  });

  it('returns dossier with asset counts', async () => {
    // Create some images
    await prisma.cf_generated_images.create({
      data: {
        dossierId,
        type: 'before',
        prompt: 'Test prompt',
        status: 'completed',
      },
    });

    const response = await request(app)
      .get(`/api/cf/dossiers/${dossierId}`)
      .expect(200);

    expect(response.body.id).toBe(dossierId);
    expect(response.body.name).toBe('Test Product');
    expect(response.body._counts).toHaveProperty('images');
    expect(response.body._counts.images).toBe(1);
  });

  it('returns 404 for non-existent dossier', async () => {
    const fakeId = '550e8400-e29b-41d4-a716-446655440000';

    await request(app)
      .get(`/api/cf/dossiers/${fakeId}`)
      .expect(404);
  });
});
```

### Database Query Tests

**src/db/__tests__/metrics-queries.test.ts:**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../__tests__/setup';
import { getTopPerformers, getMetricsAggregate } from '../metrics-queries';

describe('getTopPerformers', () => {
  beforeEach(async () => {
    // Create test data
    const dossier = await prisma.cf_product_dossiers.create({
      data: {
        slug: 'test-dossier',
        name: 'Test Dossier',
      },
    });

    const assembled = await prisma.cf_assembled_content.create({
      data: {
        dossierId: dossier.id,
        platform: 'tiktok',
        status: 'published',
      },
    });

    const published = await prisma.cf_published_content.create({
      data: {
        assembledContentId: assembled.id,
        platform: 'tiktok',
      },
    });

    // Create metrics
    await prisma.cf_performance_metrics.create({
      data: {
        publishedContentId: published.id,
        date: new Date('2026-02-20'),
        views: 10000,
        likes: 1500,
        comments: 200,
        shares: 300,
        saves: 200,
        clicks: 500,
        conversions: 30,
        spend: 5.0,
      },
    });
  });

  it('returns top performers above threshold', async () => {
    const topPerformers = await getTopPerformers({
      minViews: 1000,
      limit: 10,
    });

    expect(topPerformers.length).toBeGreaterThan(0);
    expect(topPerformers[0].totalViews).toBeGreaterThanOrEqual(1000);
    expect(topPerformers[0]).toHaveProperty('avgEngagement');
    expect(topPerformers[0]).toHaveProperty('avgCtr');
  });

  it('excludes content below threshold', async () => {
    const topPerformers = await getTopPerformers({
      minViews: 20000, // Higher than test data
      limit: 10,
    });

    expect(topPerformers.length).toBe(0);
  });
});
```

---

## End-to-End Testing

### Playwright Setup

**playwright.config.ts:**

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### E2E Test Example

**e2e/content-generation-flow.spec.ts:**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Content Generation Flow', () => {
  test('complete flow: dossier → scripts → images → publish', async ({
    page,
  }) => {
    // 1. Navigate to Content Factory
    await page.goto('/content-factory');
    await expect(page.getByText('Content Factory')).toBeVisible();

    // 2. Create new dossier
    await page.click('text=New Dossier');
    await page.fill('[name="name"]', 'E2E Test Product');
    await page.fill('[name="benefits.0"]', 'Benefit 1');
    await page.fill('[name="painPoints.0"]', 'Pain Point 1');
    await page.click('button:has-text("Create")');

    // Wait for dossier to be created
    await expect(page.getByText('E2E Test Product')).toBeVisible();

    // 3. Generate scripts
    await page.click('text=Generate Scripts');
    await page.click('text=Generate All 5 Levels');

    // Wait for scripts to generate
    await page.waitForSelector('text=Scripts generated', {
      timeout: 10000,
    });

    // Verify 5 scripts created
    const scriptCards = await page.locator('[data-testid="script-card"]').count();
    expect(scriptCards).toBe(5);

    // 4. Generate images
    await page.click('text=Generate Images');
    await page.fill('[name="variants"]', '2');
    await page.click('button:has-text("Generate Before Images")');

    // Wait for generation to start
    await expect(page.getByText('Generating...')).toBeVisible();

    // Wait for completion (mocked in test)
    await page.waitForSelector('text=Images ready', { timeout: 15000 });

    // 5. Assemble content
    await page.click('text=Assemble Content');
    await page.selectOption('[name="scriptId"]', { index: 0 });
    await page.selectOption('[name="platform"]', 'tiktok');
    await page.click('button:has-text("Assemble")');

    // Wait for assembly
    await expect(page.getByText('Content ready to publish')).toBeVisible();

    // 6. Publish (or schedule)
    await page.click('text=Publish');
    await page.fill('[name="promotionBudget"]', '5.00');
    await page.click('button:has-text("Publish to TikTok")');

    // Success message
    await expect(page.getByText('Published successfully')).toBeVisible({
      timeout: 20000,
    });
  });

  test('validates required fields on dossier creation', async ({ page }) => {
    await page.goto('/content-factory/dossiers/new');

    // Try to submit without required fields
    await page.click('button:has-text("Create")');

    // Expect validation errors
    await expect(page.getByText('Name is required')).toBeVisible();
    await expect(page.getByText('At least one benefit required')).toBeVisible();
  });
});
```

---

## API Testing

### REST API Tests with Postman/Hoppscotch

**Export collection as JSON:**

```json
{
  "name": "Content Factory API",
  "requests": [
    {
      "name": "Create Dossier",
      "method": "POST",
      "url": "{{baseUrl}}/api/cf/dossiers",
      "headers": {
        "Content-Type": "application/json"
      },
      "body": {
        "name": "Test Product",
        "benefits": ["Benefit 1"],
        "painPoints": ["Pain 1"]
      },
      "tests": [
        "pm.test('Status code is 201', () => pm.response.to.have.status(201))",
        "pm.test('Response has id', () => pm.response.json().to.have.property('id'))"
      ]
    }
  ]
}
```

### Contract Testing

**Using Pact:**

```typescript
import { Pact } from '@pact-foundation/pact';

const provider = new Pact({
  consumer: 'ContentFactoryFrontend',
  provider: 'ContentFactoryBackend',
  port: 1234,
});

describe('Dossier API Contract', () => {
  beforeAll(() => provider.setup());
  afterAll(() => provider.finalize());

  it('creates dossier with valid data', async () => {
    await provider.addInteraction({
      state: 'User is authenticated',
      uponReceiving: 'a request to create dossier',
      withRequest: {
        method: 'POST',
        path: '/api/cf/dossiers',
        body: {
          name: 'Test Product',
          benefits: ['Benefit 1'],
        },
      },
      willRespondWith: {
        status: 201,
        body: {
          id: Matchers.uuid(),
          name: 'Test Product',
          slug: 'test-product',
        },
      },
    });

    // Run test
    const response = await fetch('http://localhost:1234/api/cf/dossiers', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Product',
        benefits: ['Benefit 1'],
      }),
    });

    expect(response.status).toBe(201);
  });
});
```

---

## Third-Party Integration Testing

### Mocking Remotion API

**src/__tests__/mocks/remotion.ts:**

```typescript
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

export const remotionHandlers = [
  // Nano Banana image generation
  http.post('https://api.remotion.dev/api/ai/nano-banana', () => {
    return HttpResponse.json({
      jobId: 'job_test_123',
      status: 'pending',
    });
  }),

  // Check job status
  http.get('https://api.remotion.dev/api/jobs/:jobId', ({ params }) => {
    return HttpResponse.json({
      jobId: params.jobId,
      status: 'completed',
      result: {
        imageUrl: 'https://cdn.remotion.dev/test/image.png',
        width: 1080,
        height: 1920,
      },
    });
  }),

  // Veo video generation
  http.post('https://api.remotion.dev/api/ai/veo', () => {
    return HttpResponse.json({
      jobId: 'job_video_456',
      status: 'pending',
      estimatedTime: 120,
    });
  }),
];

export const remotionServer = setupServer(...remotionHandlers);
```

**Using in tests:**

```typescript
import { beforeAll, afterAll, afterEach } from 'vitest';
import { remotionServer } from './mocks/remotion';

beforeAll(() => remotionServer.listen());
afterEach(() => remotionServer.resetHandlers());
afterAll(() => remotionServer.close());

describe('Image Generation with Remotion', () => {
  it('generates before images via Remotion API', async () => {
    const result = await generateNanoBananaImage({
      prompt: 'Woman with acne',
      type: 'before',
    });

    expect(result.jobId).toBe('job_test_123');
    expect(result.status).toBe('pending');
  });
});
```

---

## Performance Testing

### Load Testing with k6

**scripts/load-test.js:**

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 10 }, // Ramp up
    { duration: '1m', target: 50 },  // Sustain
    { duration: '30s', target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],   // Less than 1% errors
  },
};

export default function () {
  // Test GET /dossiers
  let res = http.get('https://api.yourdomain.com/api/cf/dossiers');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

**Run:**

```bash
k6 run scripts/load-test.js
```

---

## Manual Testing Procedures

### Pre-Release Testing Checklist

**Functional Tests:**

- [ ] Create new dossier
- [ ] Generate all 5 awareness-level scripts
- [ ] Generate before images (3 variants)
- [ ] Generate after images (3 variants)
- [ ] Generate reveal video
- [ ] Assemble content with script + video
- [ ] Preview assembled content
- [ ] Publish to TikTok (test account)
- [ ] Start $5 promotion
- [ ] Verify metrics sync after 24h
- [ ] Calculate content score
- [ ] Identify winning content
- [ ] Generate "more like winner"

**Platform-Specific Tests:**

- [ ] TikTok: OAuth flow, upload, promote
- [ ] Instagram: OAuth flow, upload
- [ ] Remotion: Image generation, video generation

**Error Scenarios:**

- [ ] Invalid dossier data (missing fields)
- [ ] Remotion API failure (mock 500 error)
- [ ] TikTok API rate limit
- [ ] Database connection failure
- [ ] Duplicate slug handling

---

## Test Coverage Goals

### Target Coverage

- **Unit Tests**: 80% code coverage
- **Integration Tests**: All API routes covered
- **E2E Tests**: Critical user flows (dossier creation, publishing)

### Running Coverage

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/index.html
```

### Coverage Report Example

```
--------------------------|---------|----------|---------|---------|
File                      | % Stmts | % Branch | % Funcs | % Lines |
--------------------------|---------|----------|---------|---------|
All files                 |   82.45 |    76.32 |   85.12 |   82.18 |
 routes                   |   88.23 |    81.45 |   92.11 |   88.01 |
  content-factory.ts      |   87.56 |    79.32 |   90.45 |   87.23 |
 services                 |   79.12 |    72.45 |   81.34 |   78.98 |
  cf-generation.ts        |   81.23 |    74.56 |   83.12 |   80.98 |
 utils                    |   85.34 |    78.23 |   88.45 |   85.12 |
  scoring.ts              |   92.11 |    86.34 |   95.23 |   92.01 |
--------------------------|---------|----------|---------|---------|
```

---

## Continuous Integration

### GitHub Actions Test Workflow

**.github/workflows/test.yml:**

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
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

      - name: Run unit tests
        run: npm run test:unit

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  integration-tests:
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
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Run migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test

      - name: Run integration tests
        run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Test Data Management

### Test Fixtures

**src/__tests__/fixtures/dossiers.ts:**

```typescript
export const testDossiers = {
  acnePatch: {
    name: 'Acne Patch',
    slug: 'acne-patch',
    benefits: ['Clear skin overnight', 'Invisible wear'],
    painPoints: ['Embarrassing breakouts', 'Slow healing'],
    category: 'Beauty',
    niche: 'Skincare',
    price: 12.99,
  },
  weightLossTea: {
    name: 'Weight Loss Tea',
    slug: 'weight-loss-tea',
    benefits: ['Boost metabolism', 'Natural ingredients'],
    painPoints: ['Stubborn weight', 'Low energy'],
    category: 'Fitness',
    niche: 'Supplements',
    price: 24.99,
  },
};
```

### Database Seeding for Tests

```bash
# Seed test database
NODE_ENV=test npx prisma db seed
```

---

## Troubleshooting Tests

### Common Issues

**Issue: Tests timing out**

```bash
# Increase timeout in vitest.config.ts
export default defineConfig({
  test: {
    testTimeout: 10000, // 10 seconds
  },
});
```

**Issue: Database connection errors**

```bash
# Verify test database URL
echo $DATABASE_URL_TEST

# Reset test database
npx prisma migrate reset --skip-seed
```

**Issue: Flaky E2E tests**

- Add explicit waits: `await page.waitForSelector(...)`
- Use `waitForLoadState('networkidle')`
- Increase timeout for slow operations
- Check for race conditions

---

## Summary

This testing strategy ensures:

✅ **Fast Feedback**: Unit tests run in < 1s
✅ **High Coverage**: 80%+ code coverage
✅ **Isolated**: No external dependencies in tests
✅ **Comprehensive**: Unit, integration, E2E, performance
✅ **Automated**: CI/CD integration
✅ **Maintainable**: Clear structure, fixtures, mocks

**Run all tests:**

```bash
npm run test        # All tests
npm run test:unit   # Unit only
npm run test:int    # Integration only
npm run test:e2e    # E2E only
npm run test:watch  # Watch mode
```
