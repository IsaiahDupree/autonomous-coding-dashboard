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

    const hasAPI = await page.evaluate(() => typeof window.graphqlApi === 'object');
    assert(hasAPI, 'graphqlApi API exists on window');

    const hasCard = await page.evaluate(() => !!document.getElementById('graphql-api-card'));
    assert(hasCard, 'GraphQL API card rendered');

    const hasTabs = await page.evaluate(() => document.querySelectorAll('.gq-tab').length === 3);
    assert(hasTabs, 'Three tabs exist (Schema, Queries, Mutations)');

    const hasStats = await page.evaluate(() => document.querySelectorAll('.gq-stat-card').length === 4);
    assert(hasStats, 'Four stat cards displayed');

    // === AC1: Schema definition ===
    console.log('\n=== AC1: Schema definition ===');

    const schema = await page.evaluate(() => window.graphqlApi.getSchema());
    assert(schema.length > 0, `${schema.length} schema types defined`);
    assert(schema.length === 6, 'Has 6 schema types');

    const featureType = schema.find(t => t.name === 'Feature');
    assert(featureType !== null, 'Feature type exists');
    assert(featureType.kind === 'type', 'Feature is an object type');
    assert(featureType.fields.length > 0, `Feature has ${featureType.fields.length} fields`);
    assert(featureType.fieldCount > 0, 'Feature has fieldCount');

    const firstField = featureType.fields[0];
    assert(firstField.name !== undefined, 'Field has name');
    assert(firstField.type !== undefined, `Field type: ${firstField.type}`);
    assert(firstField.description !== undefined, 'Field has description');

    // Get specific type
    const specific = await page.evaluate(() => window.graphqlApi.getType('Feature'));
    assert(specific !== null, 'Can retrieve specific type');
    assert(specific.name === 'Feature', 'Retrieved correct type');

    // Enum type
    const enumType = schema.find(t => t.kind === 'enum');
    assert(enumType !== null, 'Has enum type');
    assert(enumType.name === 'DeployStatus', 'Enum is DeployStatus');

    // Input type
    const inputType = schema.find(t => t.kind === 'input');
    assert(inputType !== null, 'Has input type');
    assert(inputType.name === 'FeatureInput', 'Input is FeatureInput');

    // Introspection
    const intro = await page.evaluate(() => window.graphqlApi.introspect());
    assert(intro.__schema !== undefined, 'Introspection returns __schema');
    assert(intro.__schema.types.length > 0, `${intro.__schema.types.length} types in introspection`);
    assert(intro.__schema.queryType !== undefined, 'Has queryType');
    assert(intro.__schema.queryType.name === 'Query', 'Query type name is Query');
    assert(intro.__schema.mutationType !== undefined, 'Has mutationType');
    assert(intro.__schema.mutationType.name === 'Mutation', 'Mutation type name is Mutation');
    assert(intro.__schema.queryType.fields.length > 0, 'Query type has fields');
    assert(intro.__schema.mutationType.fields.length > 0, 'Mutation type has fields');

    // Schema list rendered
    const schemaList = await page.evaluate(() => !!document.getElementById('gq-schema-list'));
    assert(schemaList, 'Schema list rendered in DOM');

    const typeCards = await page.evaluate(() => document.querySelectorAll('.gq-type-card').length);
    assert(typeCards > 0, `${typeCards} type cards rendered`);
    assert(typeCards === 6, 'All 6 types rendered');

    const fieldEls = await page.evaluate(() => document.querySelectorAll('.gq-field').length);
    assert(fieldEls > 0, `${fieldEls} field elements rendered`);

    // === AC2: Query support ===
    console.log('\n=== AC2: Query support ===');

    const queries = await page.evaluate(() => window.graphqlApi.getQueries());
    assert(queries.length > 0, `${queries.length} queries defined`);
    assert(queries.length === 6, 'Has 6 queries');

    const firstQuery = queries[0];
    assert(firstQuery.name !== undefined, `Query name: ${firstQuery.name}`);
    assert(firstQuery.args !== undefined, 'Query has args');
    assert(firstQuery.returnType !== undefined, `Return type: ${firstQuery.returnType}`);
    assert(firstQuery.description !== undefined, 'Query has description');
    assert(firstQuery.signature !== undefined, 'Query has signature');

    // Get specific query
    const specificQuery = await page.evaluate(() => window.graphqlApi.getQuery('features'));
    assert(specificQuery !== null, 'Can retrieve specific query');
    assert(specificQuery.name === 'features', 'Retrieved correct query');
    assert(specificQuery.args.length > 0, `Query has ${specificQuery.args.length} args`);
    assert(specificQuery.args[0].name !== undefined, 'Arg has name');
    assert(specificQuery.args[0].type !== undefined, 'Arg has type');

    // Execute query
    const queryResult = await page.evaluate(() => {
      return window.graphqlApi.executeQuery('query { features { id description passes } }');
    });
    assert(queryResult.data !== null, 'Query returns data');
    assert(queryResult.errors === null, 'Query has no errors');
    assert(queryResult.executionTime > 0, `Execution time: ${queryResult.executionTime}ms`);

    // Invalid query
    const badResult = await page.evaluate(() => window.graphqlApi.executeQuery('invalid'));
    assert(badResult.errors !== null, 'Invalid query returns errors');
    assert(badResult.errors.length > 0, 'Error array has entries');
    assert(badResult.errors[0].message !== undefined, 'Error has message');

    // Switch to queries tab
    await page.evaluate(() => window.graphqlApi.setTab('queries'));
    await new Promise(r => setTimeout(r, 300));

    const queryTabActive = await page.evaluate(() => {
      return document.querySelector('.gq-tab[data-tab="queries"]').classList.contains('active');
    });
    assert(queryTabActive, 'Queries tab becomes active');

    const queryList = await page.evaluate(() => !!document.getElementById('gq-query-list'));
    assert(queryList, 'Query list rendered');

    const queryItems = await page.evaluate(() => document.querySelectorAll('.gq-op-item').length);
    assert(queryItems > 0, `${queryItems} query items rendered`);

    const queryBadges = await page.evaluate(() => document.querySelectorAll('.gq-op-badge.query').length);
    assert(queryBadges > 0, `${queryBadges} QUERY badges rendered`);

    // === AC3: Mutation support ===
    console.log('\n=== AC3: Mutation support ===');

    const mutations = await page.evaluate(() => window.graphqlApi.getMutations());
    assert(mutations.length > 0, `${mutations.length} mutations defined`);
    assert(mutations.length === 6, 'Has 6 mutations');

    const firstMut = mutations[0];
    assert(firstMut.name !== undefined, `Mutation name: ${firstMut.name}`);
    assert(firstMut.args !== undefined, 'Mutation has args');
    assert(firstMut.returnType !== undefined, `Return type: ${firstMut.returnType}`);
    assert(firstMut.description !== undefined, 'Mutation has description');
    assert(firstMut.signature !== undefined, 'Mutation has signature');

    // Get specific mutation
    const specificMut = await page.evaluate(() => window.graphqlApi.getMutation('updateFeature'));
    assert(specificMut !== null, 'Can retrieve specific mutation');
    assert(specificMut.name === 'updateFeature', 'Retrieved correct mutation');
    assert(specificMut.args.length > 0, `Mutation has ${specificMut.args.length} args`);

    // Execute mutation
    const mutResult = await page.evaluate(() => {
      return window.graphqlApi.executeQuery('mutation { updateFeature(id: "feat-001", input: {passes: true}) { id passes } }', { id: 'feat-001' });
    });
    assert(mutResult.data !== null, 'Mutation returns data');
    assert(mutResult.errors === null, 'Mutation has no errors');
    assert(mutResult.executionTime > 0, `Mutation time: ${mutResult.executionTime}ms`);

    // Switch to mutations tab
    await page.evaluate(() => window.graphqlApi.setTab('mutations'));
    await new Promise(r => setTimeout(r, 300));

    const mutTabActive = await page.evaluate(() => {
      return document.querySelector('.gq-tab[data-tab="mutations"]').classList.contains('active');
    });
    assert(mutTabActive, 'Mutations tab becomes active');

    const mutList = await page.evaluate(() => !!document.getElementById('gq-mutation-list'));
    assert(mutList, 'Mutation list rendered');

    const mutBadges = await page.evaluate(() => document.querySelectorAll('.gq-op-badge.mutation').length);
    assert(mutBadges > 0, `${mutBadges} MUTATION badges rendered`);

    // === Stats & State ===
    console.log('\n=== Stats & State ===');

    const stats = await page.evaluate(() => window.graphqlApi.getStats());
    assert(stats.totalTypes === 6, `Total types: ${stats.totalTypes}`);
    assert(stats.totalQueries === 6, `Total queries: ${stats.totalQueries}`);
    assert(stats.totalMutations === 6, `Total mutations: ${stats.totalMutations}`);
    assert(stats.totalFields > 0, `Total fields: ${stats.totalFields}`);

    const stateObj = await page.evaluate(() => window.graphqlApi.getState());
    assert(stateObj.activeTab !== undefined, 'State has activeTab');
    assert(stateObj.typeCount === 6, `State tracks ${stateObj.typeCount} types`);
    assert(stateObj.queryCount === 6, `State tracks ${stateObj.queryCount} queries`);
    assert(stateObj.mutationCount === 6, `State tracks ${stateObj.mutationCount} mutations`);

    const savedState = await page.evaluate(() => localStorage.getItem('graphql-api-config') !== null);
    assert(savedState, 'State persisted to localStorage');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n=======================================================');
  console.log('feat-083: GraphQL API Endpoint - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
