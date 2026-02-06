const puppeteer = require('puppeteer');

(async () => {
  let passed = 0;
  let failed = 0;
  const results = [];

  function assert(condition, message) {
    if (condition) {
      passed++;
      results.push(`  ✓ ${message}`);
    } else {
      failed++;
      results.push(`  ✗ ${message}`);
    }
  }

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));

    // === Basic Setup ===
    console.log('\n=== Basic Setup ===');

    const hasAPI = await page.evaluate(() => typeof window.prdAnalyzer === 'object');
    assert(hasAPI, 'prdAnalyzer API exists on window');

    const hasCard = await page.evaluate(() => !!document.getElementById('prd-analyzer-card'));
    assert(hasCard, 'PRD analyzer card rendered');

    const hasAnalyzeBtn = await page.$('#pa-analyze-btn');
    assert(hasAnalyzeBtn !== null, 'Analyze button exists');

    const hasContentInput = await page.$('#pa-content-input');
    assert(hasContentInput !== null, 'Content input textarea exists');

    const hasFeatureSelect = await page.$('#pa-feature-select');
    assert(hasFeatureSelect !== null, 'Feature selector exists');

    // === AC1: Identify Missing Acceptance Criteria ===
    console.log('\n=== AC1: Identify Missing Acceptance Criteria ===');

    // Test analyzeContent with minimal PRD (should find many missing)
    const minimalAnalysis = await page.evaluate(() => {
      return window.prdAnalyzer.analyzeContent('# Simple Feature\n\nJust a brief description with no details.');
    });
    assert(minimalAnalysis.missingCriteria.length > 5, `Minimal PRD: ${minimalAnalysis.missingCriteria.length} missing criteria identified (> 5)`);

    // Check that missing criteria have required fields
    const hasMissingFields = await page.evaluate(() => {
      const analysis = window.prdAnalyzer.analyzeContent('# Test\nBasic content');
      const item = analysis.missingCriteria[0];
      return item && item.label && item.suggestion && item.priority;
    });
    assert(hasMissingFields, 'Missing criteria items have label, suggestion, and priority');

    // Check acceptance criteria detection
    const acDetection = await page.evaluate(() => {
      const withAC = window.prdAnalyzer.analyzeContent('# Feature\n## Acceptance Criteria\n- Must do X\n- Should do Y');
      const withoutAC = window.prdAnalyzer.analyzeContent('# Feature\nJust description');
      return {
        withAC: withAC.qualityResults.hasAcceptanceCriteria.found,
        withoutAC: withoutAC.qualityResults.hasAcceptanceCriteria.found,
      };
    });
    assert(acDetection.withAC === true, 'Detects when acceptance criteria are present');
    assert(acDetection.withoutAC === false, 'Detects when acceptance criteria are missing');

    // Check multiple quality attributes
    const qualityChecks = await page.evaluate(() => {
      const analysis = window.prdAnalyzer.analyzeContent('# PRD\n## Overview\nTest\n## Goals\nGoal 1\n## User Stories\nAs a user...\n## Acceptance Criteria\n- AC1\n## Security\nEncryption required');
      return {
        hasOverview: analysis.qualityResults.hasOverview.found,
        hasGoals: analysis.qualityResults.hasGoals.found,
        hasUserStories: analysis.qualityResults.hasUserStories.found,
        hasAcceptanceCriteria: analysis.qualityResults.hasAcceptanceCriteria.found,
        hasNonFunctional: analysis.qualityResults.hasNonFunctional.found,
      };
    });
    assert(qualityChecks.hasOverview, 'Detects Overview section');
    assert(qualityChecks.hasGoals, 'Detects Goals section');
    assert(qualityChecks.hasUserStories, 'Detects User Stories');
    assert(qualityChecks.hasAcceptanceCriteria, 'Detects Acceptance Criteria');
    assert(qualityChecks.hasNonFunctional, 'Detects non-functional requirements');

    // Missing criteria section in UI
    const hasMissingSection = await page.evaluate(() => !!document.getElementById('pa-missing-section'));
    assert(hasMissingSection, 'Missing criteria section exists in UI');

    // === AC2: Suggest Improvements ===
    console.log('\n=== AC2: Suggest Improvements ===');

    // Test improvements for brief PRD
    const briefImprovements = await page.evaluate(() => {
      const analysis = window.prdAnalyzer.analyzeContent('# Short\nBrief.');
      return analysis.improvements.length;
    });
    assert(briefImprovements > 0, `Brief PRD: ${briefImprovements} improvements suggested`);

    // Test improvement types
    const improvementTypes = await page.evaluate(() => {
      const analysis = window.prdAnalyzer.analyzeContent('# Feature\nBrief description only.');
      return {
        hasContentImprovement: analysis.improvements.some(i => i.type === 'content'),
        hasStructureImprovement: analysis.improvements.some(i => i.type === 'structure'),
        allHaveFields: analysis.improvements.every(i => i.title && i.description && i.priority),
      };
    });
    assert(improvementTypes.hasContentImprovement, 'Suggests content improvements for brief PRD');
    assert(improvementTypes.hasStructureImprovement, 'Suggests structure improvements');
    assert(improvementTypes.allHaveFields, 'All improvements have title, description, and priority');

    // Test vague language detection
    const vagueDetection = await page.evaluate(() => {
      const analysis = window.prdAnalyzer.analyzeContent('# Feature\n## Overview\nThis should be fast and good and nice and easy and simple and better than various solutions etc.');
      return analysis.improvements.some(i => i.title.includes('vague'));
    });
    assert(vagueDetection, 'Detects vague language in content');

    // Test well-written PRD has fewer improvements
    const goodPrdImprovements = await page.evaluate(() => {
      const analysis = window.prdAnalyzer.analyzeContent(`# Authentication System
## Overview
Build a secure authentication system for our web application.
## Goals
- Enable secure user registration and login
- Support OAuth providers
## User Stories
- As a user, I want to register with email
- As a user, I want to login with Google
## Requirements
- Registration with email verification
- OAuth login via Google and GitHub
- Password strength validation
- Rate limiting on login attempts
## Acceptance Criteria
- Registration completes in under 3 seconds
- Login supports 2FA via authenticator app
- Sessions expire after 24 hours
## Edge Cases
- Handle network disconnection during login
- Rate limit exceeded shows clear error message
## Technical Requirements
- JWT tokens with 24h expiry
- bcrypt password hashing
- Redis for session cache
## Success Metrics
- Login success rate above 99%
- Average login time under 2 seconds`);
      return {
        qualityScore: analysis.summary.qualityScore,
        improvementCount: analysis.improvements.length,
      };
    });
    assert(goodPrdImprovements.qualityScore >= 70, `Well-written PRD quality score: ${goodPrdImprovements.qualityScore}% (>= 70%)`);

    // Improvements section in UI
    const hasImprovementsSection = await page.evaluate(() => !!document.getElementById('pa-improvements-section'));
    assert(hasImprovementsSection, 'Improvements section exists in UI');

    // === AC3: Estimate Complexity ===
    console.log('\n=== AC3: Estimate Complexity ===');

    // Test simple feature complexity
    const simpleComplexity = await page.evaluate(() => {
      const analysis = window.prdAnalyzer.analyzeContent('# Add button\nAdd a button to the page.');
      return analysis.complexity;
    });
    assert(simpleComplexity.score <= 3, `Simple feature complexity: ${simpleComplexity.score}/10 (<= 3)`);
    assert(simpleComplexity.level === 'Low', `Simple feature level: ${simpleComplexity.level}`);

    // Test complex feature complexity
    const complexFeature = await page.evaluate(() => {
      const analysis = window.prdAnalyzer.analyzeContent(`# Real-Time Collaborative Editor
## Overview
Build a real-time collaborative document editor with WebSocket connections and operational transform.
## Requirements
- Real-time sync using WebSocket and Redis pub/sub
- OAuth authentication with JWT tokens
- GraphQL API for document operations
- Database migration strategy for PostgreSQL
- Microservice architecture with Docker and Kubernetes
- Encryption for data at rest and in transit
- Integration with third-party services and external API
- Responsive dashboard with drag-drop, charts, animations, and real-time updates
## Acceptance Criteria
- Support 1000 concurrent users
- Sub-100ms latency for edit propagation
- 99.9% uptime
## Edge Cases
- Handle network disconnection
- Resolve conflicting edits`);
      return analysis.complexity;
    });
    assert(complexFeature.score >= 5, `Complex feature complexity: ${complexFeature.score}/10 (>= 5)`);
    assert(complexFeature.level === 'Medium' || complexFeature.level === 'High', `Complex feature level: ${complexFeature.level}`);
    assert(complexFeature.effortEstimate !== undefined, `Effort estimate: ${complexFeature.effortEstimate}`);

    // Complexity factors
    assert(complexFeature.factors.length > 0, `${complexFeature.factors.length} complexity factors identified`);
    const factorHasFields = complexFeature.factors.every(f => f.name && f.impact !== undefined && f.description);
    assert(factorHasFields, 'Complexity factors have name, impact, and description');

    // Complexity breakdown
    assert(complexFeature.breakdown !== undefined, 'Complexity breakdown exists');
    assert(complexFeature.breakdown.scope !== undefined, 'Breakdown has scope');
    assert(complexFeature.breakdown.technical !== undefined, 'Breakdown has technical');
    assert(complexFeature.breakdown.integration !== undefined, 'Breakdown has integration');
    assert(complexFeature.breakdown.ui !== undefined, 'Breakdown has UI');

    // Complexity section in UI
    const hasComplexitySection = await page.evaluate(() => !!document.getElementById('pa-complexity-section'));
    assert(hasComplexitySection, 'Complexity section exists in UI');

    // === UI Interaction Tests ===
    console.log('\n=== UI Interaction Tests ===');

    // Load demo and analyze
    await page.evaluate(() => window.prdAnalyzer.loadDemo());
    await new Promise(r => setTimeout(r, 300));

    const demoLoaded = await page.evaluate(() => document.getElementById('pa-content-input').value.includes('Collaborative'));
    assert(demoLoaded, 'Demo content loaded successfully');

    // Click analyze
    await page.evaluate(() => window.prdAnalyzer.analyze());
    await new Promise(r => setTimeout(r, 1500)); // Wait for simulated analysis

    // Check results are visible
    const resultsVisible = await page.evaluate(() => {
      const results = document.getElementById('pa-results');
      return results && results.classList.contains('visible');
    });
    assert(resultsVisible, 'Analysis results are visible after analyze');

    // Check score cards rendered
    const scoreCards = await page.evaluate(() => {
      return document.querySelectorAll('.pa-score-card').length;
    });
    assert(scoreCards === 3, `${scoreCards} score cards rendered (quality, complexity, effort)`);

    // Check section toggle works
    await page.evaluate(() => window.prdAnalyzer.toggleSection('pa-missing-section'));
    const sectionCollapsed = await page.evaluate(() => {
      return !document.getElementById('pa-missing-section').classList.contains('expanded');
    });
    assert(sectionCollapsed, 'Section toggle collapses section');

    await page.evaluate(() => window.prdAnalyzer.toggleSection('pa-missing-section'));
    const sectionExpanded = await page.evaluate(() => {
      return document.getElementById('pa-missing-section').classList.contains('expanded');
    });
    assert(sectionExpanded, 'Section toggle expands section again');

    // Test clear function
    await page.evaluate(() => window.prdAnalyzer.clear());
    const afterClear = await page.evaluate(() => {
      return {
        inputEmpty: document.getElementById('pa-content-input').value === '',
        resultsHidden: !document.getElementById('pa-results').classList.contains('visible'),
      };
    });
    assert(afterClear.inputEmpty, 'Clear empties input');
    assert(afterClear.resultsHidden, 'Clear hides results');

    // State persistence
    const savedState = await page.evaluate(() => {
      return localStorage.getItem('prd-analyzer-config') !== null;
    });
    assert(savedState, 'State persisted to localStorage');

    // analyzeFeature function
    const featureAnalysis = await page.evaluate(() => {
      const feature = {
        id: 'test-001',
        category: 'core',
        priority: 1,
        description: 'Test feature with requirements',
        acceptance_criteria: ['Must do X', 'Should handle errors', 'Performance under 200ms'],
      };
      const result = window.prdAnalyzer.analyzeFeature(feature);
      return {
        hasMissing: result.missingCriteria !== undefined,
        hasImprovements: result.improvements !== undefined,
        hasComplexity: result.complexity !== undefined,
        hasSummary: result.summary !== undefined,
      };
    });
    assert(featureAnalysis.hasMissing, 'analyzeFeature returns missing criteria');
    assert(featureAnalysis.hasImprovements, 'analyzeFeature returns improvements');
    assert(featureAnalysis.hasComplexity, 'analyzeFeature returns complexity');
    assert(featureAnalysis.hasSummary, 'analyzeFeature returns summary');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n=======================================================');
  console.log('feat-061: AI-powered PRD Analysis - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
