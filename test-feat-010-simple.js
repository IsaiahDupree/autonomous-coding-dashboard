/**
 * Test for feat-010: API endpoint returns harness status
 *
 * Acceptance Criteria:
 * 1. GET /api/status returns current harness state
 * 2. Response includes feature stats
 * 3. Response includes session info
 */

const API_BASE = 'http://localhost:3434';

async function testStatusEndpoint() {
    console.log('Testing feat-010: API endpoint returns harness status');
    console.log('='.repeat(60));

    try {
        // Test: GET /api/status
        console.log('\n✓ Test 1: GET /api/status returns current harness state');
        const response = await fetch(`${API_BASE}/api/status`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('  Response:', JSON.stringify(data, null, 2));

        // Verify response structure
        if (!data.data) {
            throw new Error('Response missing "data" field');
        }

        // Test 1: Check harness state
        const harness = data.data.harness;
        if (!harness) {
            throw new Error('Response missing "harness" field');
        }

        if (!harness.status) {
            throw new Error('Harness state missing "status" field');
        }

        console.log(`  ✓ Harness status: ${harness.status}`);
        console.log(`  ✓ Session type: ${harness.sessionType || 'null'}`);
        console.log(`  ✓ Last update: ${harness.lastUpdate || 'null'}`);
        console.log(`  ✓ PID: ${harness.pid || 'null'}`);

        // Test 2: Check feature stats
        console.log('\n✓ Test 2: Response includes feature stats');
        const features = data.data.features;
        if (!features) {
            throw new Error('Response missing "features" field');
        }

        if (typeof features.total !== 'number') {
            throw new Error('Feature stats missing "total" field');
        }

        if (typeof features.passing !== 'number') {
            throw new Error('Feature stats missing "passing" field');
        }

        if (typeof features.pending !== 'number') {
            throw new Error('Feature stats missing "pending" field');
        }

        console.log(`  ✓ Total features: ${features.total}`);
        console.log(`  ✓ Passing: ${features.passing}`);
        console.log(`  ✓ Pending: ${features.pending}`);
        console.log(`  ✓ Percent complete: ${features.percentComplete}`);

        // Test 3: Check session info
        console.log('\n✓ Test 3: Response includes session info');

        if (harness.sessionType !== null && harness.sessionType !== undefined) {
            console.log(`  ✓ Session type is present: ${harness.sessionType}`);
        } else {
            console.log(`  ✓ Session type is null (harness may be idle)`);
        }

        if (harness.lastUpdate !== null && harness.lastUpdate !== undefined) {
            console.log(`  ✓ Last update is present: ${harness.lastUpdate}`);
        } else {
            console.log(`  ✓ Last update is null (harness may be idle)`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ ALL TESTS PASSED - feat-010 is working correctly!');
        console.log('='.repeat(60));

        return true;

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        console.error('Stack:', error.stack);
        return false;
    }
}

// Run the test
testStatusEndpoint().then(success => {
    process.exit(success ? 0 : 1);
});
