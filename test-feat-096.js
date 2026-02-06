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

    const hasAPI = await page.evaluate(() => typeof window.apiDocumentation === 'object');
    assert(hasAPI, 'apiDocumentation API exists on window');

    const hasCard = await page.evaluate(() => !!document.getElementById('api-docs-card'));
    assert(hasCard, 'API docs card rendered');

    const hasTabs = await page.evaluate(() => document.querySelectorAll('.apid-tab').length === 3);
    assert(hasTabs, 'Three tabs exist');

    const hasStats = await page.evaluate(() => document.querySelectorAll('.apid-stat-card').length === 4);
    assert(hasStats, 'Four stat cards displayed');

    // === AC1: API Endpoints ===
    console.log('\n=== AC1: API Endpoints ===');

    const endpoints = await page.evaluate(() => window.apiDocumentation.getEndpoints());
    assert(endpoints.length > 0, `${endpoints.length} endpoints`);
    assert(endpoints.length === 8, 'Has 8 endpoints');

    const first = endpoints[0];
    assert(first.id !== undefined, 'Endpoint has id');
    assert(first.method !== undefined, `Method: ${first.method}`);
    assert(first.path !== undefined, `Path: ${first.path}`);
    assert(first.description !== undefined, 'Has description');
    assert(first.category !== undefined, `Category: ${first.category}`);
    assert(first.auth !== undefined, `Auth: ${first.auth}`);
    assert(first.params !== undefined, 'Has params');
    assert(first.response !== undefined, 'Has response');

    // Get specific endpoint
    const specific = await page.evaluate((id) => window.apiDocumentation.getEndpoint(id), first.id);
    assert(specific !== null, 'Can retrieve specific endpoint');

    // Get by category
    const harnessEps = await page.evaluate(() => window.apiDocumentation.getEndpointsByCategory('harness'));
    assert(harnessEps.length > 0, `${harnessEps.length} harness endpoints`);

    // HTTP methods
    const methods = new Set(endpoints.map(e => e.method));
    assert(methods.has('GET'), 'Has GET endpoints');
    assert(methods.has('POST'), 'Has POST endpoints');
    assert(methods.has('PUT'), 'Has PUT endpoints');

    // Endpoint list rendered
    const endpointList = await page.evaluate(() => !!document.getElementById('apid-endpoint-list'));
    assert(endpointList, 'Endpoint list rendered');

    const endpointItems = await page.evaluate(() => document.querySelectorAll('.apid-endpoint-item').length);
    assert(endpointItems > 0, `${endpointItems} endpoint items rendered`);

    // === AC2: Schemas ===
    console.log('\n=== AC2: Schemas ===');

    const schemas = await page.evaluate(() => window.apiDocumentation.getSchemas());
    assert(schemas.length > 0, `${schemas.length} schemas`);
    assert(schemas.length === 6, 'Has 6 schemas');

    const firstSchema = schemas[0];
    assert(firstSchema.id !== undefined, 'Schema has id');
    assert(firstSchema.name !== undefined, `Name: ${firstSchema.name}`);
    assert(firstSchema.description !== undefined, 'Has description');
    assert(firstSchema.fields !== undefined, 'Has fields');
    assert(firstSchema.fields.length > 0, `${firstSchema.fields.length} fields`);

    const firstField = firstSchema.fields[0];
    assert(firstField.name !== undefined, `Field name: ${firstField.name}`);
    assert(firstField.type !== undefined, `Field type: ${firstField.type}`);
    assert(firstField.required !== undefined, `Required: ${firstField.required}`);

    // Get specific schema
    const specificSchema = await page.evaluate((id) => window.apiDocumentation.getSchema(id), firstSchema.id);
    assert(specificSchema !== null, 'Can retrieve specific schema');

    // Switch to schemas tab
    await page.evaluate(() => window.apiDocumentation.setTab('schemas'));
    await new Promise(r => setTimeout(r, 300));

    const schTabActive = await page.evaluate(() => {
      return document.querySelector('.apid-tab[data-tab="schemas"]').classList.contains('active');
    });
    assert(schTabActive, 'Schemas tab becomes active');

    const schSection = await page.evaluate(() => !!document.getElementById('apid-schema-section'));
    assert(schSection, 'Schema section rendered');

    const schItems = await page.evaluate(() => document.querySelectorAll('.apid-schema-item').length);
    assert(schItems > 0, `${schItems} schema items rendered`);

    // === AC3: Examples ===
    console.log('\n=== AC3: Examples ===');

    const examples = await page.evaluate(() => window.apiDocumentation.getExamples());
    assert(examples.length > 0, `${examples.length} examples`);
    assert(examples.length === 8, 'Has 8 examples');

    const firstEx = examples[0];
    assert(firstEx.id !== undefined, 'Example has id');
    assert(firstEx.endpointId !== undefined, `Endpoint: ${firstEx.endpointId}`);
    assert(firstEx.name !== undefined, `Name: ${firstEx.name}`);
    assert(firstEx.request !== undefined, 'Has request');
    assert(firstEx.request.method !== undefined, `Req method: ${firstEx.request.method}`);
    assert(firstEx.request.url !== undefined, `Req url: ${firstEx.request.url}`);
    assert(firstEx.response !== undefined, 'Has response');
    assert(firstEx.response.status > 0, `Status: ${firstEx.response.status}`);

    // Get specific example
    const specificEx = await page.evaluate((id) => window.apiDocumentation.getExample(id), firstEx.id);
    assert(specificEx !== null, 'Can retrieve specific example');

    // Get examples for endpoint
    const epExamples = await page.evaluate((id) => window.apiDocumentation.getExamplesForEndpoint(id), 'ep-001');
    assert(epExamples.length > 0, `${epExamples.length} examples for ep-001`);

    // Generate documentation
    const docs = await page.evaluate(() => window.apiDocumentation.generateDocumentation());
    assert(docs.title !== undefined, `Title: ${docs.title}`);
    assert(docs.version !== undefined, `Version: ${docs.version}`);
    assert(docs.endpointCount > 0, `Endpoints: ${docs.endpointCount}`);
    assert(docs.schemaCount > 0, `Schemas: ${docs.schemaCount}`);
    assert(docs.exampleCount > 0, `Examples: ${docs.exampleCount}`);
    assert(docs.categories.length > 0, `Categories: ${docs.categories.join(', ')}`);

    // Switch to examples tab
    await page.evaluate(() => window.apiDocumentation.setTab('examples'));
    await new Promise(r => setTimeout(r, 300));

    const exTabActive = await page.evaluate(() => {
      return document.querySelector('.apid-tab[data-tab="examples"]').classList.contains('active');
    });
    assert(exTabActive, 'Examples tab becomes active');

    const exSection = await page.evaluate(() => !!document.getElementById('apid-examples-section'));
    assert(exSection, 'Examples section rendered');

    const exItems = await page.evaluate(() => document.querySelectorAll('.apid-example-item').length);
    assert(exItems > 0, `${exItems} example items rendered`);

    // === State ===
    console.log('\n=== State ===');

    const stateObj = await page.evaluate(() => window.apiDocumentation.getState());
    assert(stateObj.activeTab !== undefined, 'State has activeTab');
    assert(stateObj.endpointCount > 0, `Endpoints: ${stateObj.endpointCount}`);
    assert(stateObj.schemaCount > 0, `Schemas: ${stateObj.schemaCount}`);
    assert(stateObj.exampleCount > 0, `Examples: ${stateObj.exampleCount}`);

    const savedState = await page.evaluate(() => localStorage.getItem('api-docs-config') !== null);
    assert(savedState, 'State persisted to localStorage');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n=======================================================');
  console.log('feat-096: API Documentation - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
