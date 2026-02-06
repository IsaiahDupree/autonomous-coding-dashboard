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
    await new Promise(r => setTimeout(r, 3000));

    // === Basic Setup ===
    console.log('\n=== Basic Setup ===');

    const hasAPI = await page.evaluate(() => typeof window.restApi === 'object');
    assert(hasAPI, 'restApi API exists on window');

    const hasCard = await page.evaluate(() => !!document.getElementById('rest-api-card'));
    assert(hasCard, 'REST API card rendered');

    const hasTabs = await page.evaluate(() => document.querySelectorAll('.ra-tab').length === 3);
    assert(hasTabs, 'Three tabs exist (Endpoints, Auth, Rate Limiting)');

    const hasStats = await page.evaluate(() => document.querySelectorAll('.ra-stat-card').length === 4);
    assert(hasStats, 'Four stat cards displayed');

    // === AC1: Documented endpoints ===
    console.log('\n=== AC1: Documented endpoints ===');

    const endpoints = await page.evaluate(() => window.restApi.getEndpoints());
    assert(endpoints.length > 0, `${endpoints.length} endpoints documented`);
    assert(endpoints.length === 14, 'Has 14 endpoints');

    const first = endpoints[0];
    assert(first.id !== undefined, 'Endpoint has id');
    assert(first.method !== undefined, `Endpoint method: ${first.method}`);
    assert(first.path !== undefined, `Endpoint path: ${first.path}`);
    assert(first.description !== undefined, 'Endpoint has description');
    assert(first.auth !== undefined, 'Endpoint has auth flag');
    assert(first.rateLimit > 0, `Endpoint rate limit: ${first.rateLimit}`);
    assert(first.category !== undefined, `Endpoint category: ${first.category}`);
    assert(first.params !== undefined, 'Endpoint has params');

    // Filter by category
    const harnessEps = await page.evaluate(() => window.restApi.getEndpoints({ category: 'harness' }));
    assert(harnessEps.length > 0, `${harnessEps.length} harness endpoints`);
    const allHarness = harnessEps.every(e => e.category === 'harness');
    assert(allHarness, 'All filtered endpoints are harness category');

    // Filter by method
    const getEps = await page.evaluate(() => window.restApi.getEndpoints({ method: 'GET' }));
    assert(getEps.length > 0, `${getEps.length} GET endpoints`);
    const allGet = getEps.every(e => e.method === 'GET');
    assert(allGet, 'All method-filtered endpoints are GET');

    // Get specific endpoint
    const specific = await page.evaluate(() => window.restApi.getEndpoint('/api/status', 'GET'));
    assert(specific !== null, 'Can retrieve specific endpoint');
    assert(specific.method === 'GET', 'Specific endpoint has correct method');

    // Full documentation
    const docs = await page.evaluate(() => window.restApi.getDocumentation());
    assert(docs.version === 'v1', `API version: ${docs.version}`);
    assert(docs.baseUrl === '/api', `Base URL: ${docs.baseUrl}`);
    assert(docs.authScheme === 'Bearer Token', `Auth scheme: ${docs.authScheme}`);
    assert(docs.contentType === 'application/json', 'Content type documented');
    assert(docs.endpoints.length > 0, `${docs.endpoints.length} documented endpoints`);
    assert(docs.endpoints[0].example !== undefined, 'Endpoint has example');
    assert(docs.endpoints[0].example.request !== undefined, 'Example has request');
    assert(docs.endpoints[0].example.response !== undefined, 'Example has response');

    // HTTP methods represented
    const methods = new Set(endpoints.map(e => e.method));
    assert(methods.has('GET'), 'GET method available');
    assert(methods.has('POST'), 'POST method available');
    assert(methods.has('PUT'), 'PUT method available');
    assert(methods.has('DELETE'), 'DELETE method available');
    assert(methods.has('PATCH'), 'PATCH method available');

    // Endpoint list rendered
    const epList = await page.evaluate(() => !!document.getElementById('ra-endpoint-list'));
    assert(epList, 'Endpoint list rendered in DOM');

    const epItems = await page.evaluate(() => document.querySelectorAll('.ra-endpoint-item').length);
    assert(epItems > 0, `${epItems} endpoint items rendered`);

    const methodBadges = await page.evaluate(() => document.querySelectorAll('.ra-method-badge').length);
    assert(methodBadges > 0, `${methodBadges} method badges rendered`);

    // === AC2: Authentication ===
    console.log('\n=== AC2: Authentication ===');

    const tokens = await page.evaluate(() => window.restApi.getTokens());
    assert(tokens.length > 0, `${tokens.length} API tokens`);

    const firstToken = tokens[0];
    assert(firstToken.id !== undefined, 'Token has id');
    assert(firstToken.name !== undefined, 'Token has name');
    assert(firstToken.key !== undefined, 'Token has key');
    assert(firstToken.scopes.length > 0, `Token scopes: ${firstToken.scopes.join(', ')}`);
    assert(firstToken.createdAt !== undefined, 'Token has createdAt');
    assert(firstToken.expiresAt !== undefined, 'Token has expiresAt');
    assert(firstToken.requestCount >= 0, `Token requests: ${firstToken.requestCount}`);

    // Create token
    const newTokenId = await page.evaluate(() => window.restApi.createToken('Test Token', ['read', 'write']));
    assert(newTokenId !== undefined, `New token created: ${newTokenId}`);

    const afterCreate = await page.evaluate(() => window.restApi.getTokens());
    assert(afterCreate.length === tokens.length + 1, 'Token count increased');

    // Authenticate request
    const authResult = await page.evaluate((key) => window.restApi.authenticateRequest(key), firstToken.key);
    assert(authResult.authenticated === true, 'Valid token authenticates');
    assert(authResult.scopes.length > 0, 'Auth result has scopes');

    const badAuth = await page.evaluate(() => window.restApi.authenticateRequest('invalid-key'));
    assert(badAuth.authenticated === false, 'Invalid token fails auth');
    assert(badAuth.reason !== undefined, `Auth failure reason: ${badAuth.reason}`);

    // Revoke token
    const revoked = await page.evaluate((id) => window.restApi.revokeToken(id), newTokenId);
    assert(revoked === true, 'revokeToken returns true');
    const afterRevoke = await page.evaluate(() => window.restApi.getTokens());
    assert(afterRevoke.length === tokens.length, 'Token count back to original');

    // Switch to auth tab
    await page.evaluate(() => window.restApi.setTab('auth'));
    await new Promise(r => setTimeout(r, 300));

    const authTabActive = await page.evaluate(() => {
      return document.querySelector('.ra-tab[data-tab="auth"]').classList.contains('active');
    });
    assert(authTabActive, 'Auth tab becomes active');

    const authSection = await page.evaluate(() => !!document.getElementById('ra-auth-section'));
    assert(authSection, 'Auth section rendered');

    const tokenList = await page.evaluate(() => !!document.getElementById('ra-token-list'));
    assert(tokenList, 'Token list rendered');

    // === AC3: Rate limiting ===
    console.log('\n=== AC3: Rate limiting ===');

    const rateStatus = await page.evaluate(() => window.restApi.getRateLimitStatus());
    assert(rateStatus.windowMs > 0, `Rate limit window: ${rateStatus.windowMs}ms`);
    assert(rateStatus.maxRequests > 0, `Max requests: ${rateStatus.maxRequests}`);
    assert(rateStatus.remaining >= 0, `Remaining: ${rateStatus.remaining}`);
    assert(rateStatus.currentUsage >= 0, `Current usage: ${rateStatus.currentUsage}`);
    assert(rateStatus.usagePercent >= 0, `Usage percent: ${rateStatus.usagePercent}%`);
    assert(rateStatus.resetAt !== undefined, 'Has reset time');
    assert(rateStatus.isLimited !== undefined, `Is limited: ${rateStatus.isLimited}`);

    // Update rate limit
    const updated = await page.evaluate(() => window.restApi.updateRateLimit({ maxRequests: 200 }));
    assert(updated.maxRequests === 200, 'Rate limit updated to 200');

    // Request log
    const reqLog = await page.evaluate(() => window.restApi.getRequestLog());
    assert(reqLog.length > 0, `${reqLog.length} request log entries`);
    assert(reqLog[0].method !== undefined, 'Request has method');
    assert(reqLog[0].path !== undefined, 'Request has path');
    assert(reqLog[0].status !== undefined, `Request status: ${reqLog[0].status}`);
    assert(reqLog[0].duration > 0, `Request duration: ${reqLog[0].duration}ms`);

    // Switch to rate limit tab
    await page.evaluate(() => window.restApi.setTab('ratelimit'));
    await new Promise(r => setTimeout(r, 300));

    const rateTabActive = await page.evaluate(() => {
      return document.querySelector('.ra-tab[data-tab="ratelimit"]').classList.contains('active');
    });
    assert(rateTabActive, 'Rate Limiting tab becomes active');

    const rateSection = await page.evaluate(() => !!document.getElementById('ra-rate-section'));
    assert(rateSection, 'Rate limit section rendered');

    // === State ===
    console.log('\n=== State ===');

    const stateObj = await page.evaluate(() => window.restApi.getState());
    assert(stateObj.activeTab !== undefined, 'State has activeTab');
    assert(stateObj.endpointCount === 14, `State tracks ${stateObj.endpointCount} endpoints`);
    assert(stateObj.tokenCount > 0, `State tracks ${stateObj.tokenCount} tokens`);
    assert(stateObj.rateLimitStatus !== undefined, 'State has rate limit status');

    const savedState = await page.evaluate(() => localStorage.getItem('rest-api-config') !== null);
    assert(savedState, 'State persisted to localStorage');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n=======================================================');
  console.log('feat-081: REST API for External Integrations - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
