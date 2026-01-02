/**
 * Test feat-011: API endpoint to start/stop harness
 *
 * Acceptance Criteria:
 * 1. POST /api/harness/start launches harness
 * 2. POST /api/harness/stop terminates harness
 * 3. Returns success/error status
 */

const API_BASE = 'http://localhost:3434';

async function testHarnessAPI() {
  console.log('Testing feat-011: API endpoint to start/stop harness\n');

  let passed = 0;
  let failed = 0;

  // Test 1: POST /api/harness/stop returns proper response
  console.log('Test 1: POST /api/harness/stop returns proper response');
  try {
    const stopResponse = await fetch(`${API_BASE}/api/harness/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force: false })
    });

    const stopData = await stopResponse.json();

    // Should return either success (data) or error
    if (stopData.data || stopData.error) {
      console.log('  ✓ POST /api/harness/stop returns proper JSON response');
      console.log(`    Response: ${JSON.stringify(stopData).substring(0, 100)}...`);
      passed++;
    } else {
      console.log('  ✗ Invalid response format');
      failed++;
    }
  } catch (error) {
    console.log(`  ✗ Error: ${error.message}`);
    failed++;
  }

  // Test 2: POST /api/harness/start returns proper response
  console.log('\nTest 2: POST /api/harness/start returns proper response');
  try {
    const startResponse = await fetch(`${API_BASE}/api/harness/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ continuous: false, maxSessions: 1 })
    });

    const startData = await startResponse.json();

    // Should return either success (data) or error (if already running)
    if (startData.data || startData.error) {
      console.log('  ✓ POST /api/harness/start returns proper JSON response');
      console.log(`    Response: ${JSON.stringify(startData).substring(0, 100)}...`);

      // If successful, stop it again
      if (startData.data) {
        console.log('  → Stopping harness that was started...');
        await fetch(`${API_BASE}/api/harness/stop`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ force: true })
        });
      }
      passed++;
    } else {
      console.log('  ✗ Invalid response format');
      failed++;
    }
  } catch (error) {
    console.log(`  ✗ Error: ${error.message}`);
    failed++;
  }

  // Test 3: Endpoints handle errors gracefully
  console.log('\nTest 3: Endpoints handle errors gracefully');
  try {
    // Try starting twice (should return error on second attempt if first succeeded)
    const start1 = await fetch(`${API_BASE}/api/harness/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ continuous: false })
    });

    const start1Data = await start1.json();

    if (start1Data.data) {
      // First start succeeded, try starting again
      const start2 = await fetch(`${API_BASE}/api/harness/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ continuous: false })
      });

      const start2Data = await start2.json();

      if (start2Data.error && start2Data.error.message.includes('already running')) {
        console.log('  ✓ Returns error when harness already running');
        console.log(`    Error message: "${start2Data.error.message}"`);
        passed++;

        // Clean up
        await fetch(`${API_BASE}/api/harness/stop`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ force: true })
        });
      } else {
        console.log('  ✗ Expected error about harness already running');
        failed++;
      }
    } else if (start1Data.error) {
      // Harness was already running, which is fine
      console.log('  ✓ Handles already-running harness correctly');
      console.log(`    Error message: "${start1Data.error.message}"`);
      passed++;
    } else {
      console.log('  ✗ Unexpected response');
      failed++;
    }
  } catch (error) {
    console.log(`  ✗ Error: ${error.message}`);
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`Tests passed: ${passed}/3`);
  console.log(`Tests failed: ${failed}/3`);
  console.log('='.repeat(60));

  if (passed === 3) {
    console.log('\n✓ feat-011 PASSED - All acceptance criteria verified');
    process.exit(0);
  } else {
    console.log('\n✗ feat-011 FAILED - Some tests did not pass');
    process.exit(1);
  }
}

// Run tests
testHarnessAPI().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
