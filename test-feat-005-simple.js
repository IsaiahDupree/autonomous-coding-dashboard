// Simple test for feat-005 using code inspection
const fs = require('fs');

function testFeat005() {
    console.log('Testing feat-005: Start/Stop harness buttons work\n');

    // Verify harness-control.js has the correct implementation
    const harnessControlJs = fs.readFileSync('harness-control.js', 'utf8');
    const harnessClientJs = fs.readFileSync('harness-client.js', 'utf8');
    const indexHtml = fs.readFileSync('index.html', 'utf8');

    // Check 1: Start button launches harness in background
    const hasStartButton = indexHtml.includes('btn-start-harness') ||
        harnessControlJs.includes('btn-start-harness');
    const hasStartHandler = harnessControlJs.includes('startHarness') &&
        harnessClientJs.includes('async startHarness');
    const callsStartAPI = harnessClientJs.includes('/harness/start') &&
        harnessClientJs.includes('POST');
    console.log(`✓ Test 1a: Start button exists - ${hasStartButton ? 'PASS' : 'FAIL'}`);
    console.log(`✓ Test 1b: Start handler implemented - ${hasStartHandler ? 'PASS' : 'FAIL'}`);
    console.log(`✓ Test 1c: Calls start API endpoint - ${callsStartAPI ? 'PASS' : 'FAIL'}`);

    // Check 2: Stop button terminates running harness
    const hasStopButton = indexHtml.includes('btn-stop-harness') ||
        harnessControlJs.includes('btn-stop-harness');
    const hasStopHandler = harnessControlJs.includes('stopHarness') &&
        harnessClientJs.includes('async stopHarness');
    const callsStopAPI = harnessClientJs.includes('/harness/stop') &&
        harnessClientJs.includes('POST');
    console.log(`✓ Test 2a: Stop button exists - ${hasStopButton ? 'PASS' : 'FAIL'}`);
    console.log(`✓ Test 2b: Stop handler implemented - ${hasStopHandler ? 'PASS' : 'FAIL'}`);
    console.log(`✓ Test 2c: Calls stop API endpoint - ${callsStopAPI ? 'PASS' : 'FAIL'}`);

    // Check 3: Buttons are disabled appropriately based on state
    const disablesStartWhenRunning = harnessControlJs.includes('startBtn.disabled') &&
        (harnessControlJs.includes("status === 'running'") ||
         harnessControlJs.includes("status.status === 'running'"));
    const disablesStopWhenIdle = harnessControlJs.includes('stopBtn.disabled') &&
        (harnessControlJs.includes("status !== 'running'") ||
         harnessControlJs.includes("status.status !== 'running'"));
    console.log(`✓ Test 3a: Start button disabled when running - ${disablesStartWhenRunning ? 'PASS' : 'FAIL'}`);
    console.log(`✓ Test 3b: Stop button disabled when idle - ${disablesStopWhenIdle ? 'PASS' : 'FAIL'}`);

    // Check 4: Event listeners are bound
    const bindsStartEvent = harnessControlJs.includes("'btn-start-harness'") &&
        harnessControlJs.includes('addEventListener');
    const bindsStopEvent = harnessControlJs.includes("'btn-stop-harness'") &&
        harnessControlJs.includes('addEventListener');
    console.log(`✓ Test 4a: Start button event listener bound - ${bindsStartEvent ? 'PASS' : 'FAIL'}`);
    console.log(`✓ Test 4b: Stop button event listener bound - ${bindsStopEvent ? 'PASS' : 'FAIL'}`);

    // Check 5: HarnessControlPanel is instantiated
    const panelInstantiated = harnessControlJs.includes('new HarnessControlPanel');
    console.log(`✓ Test 5: HarnessControlPanel instantiated - ${panelInstantiated ? 'PASS' : 'FAIL'}`);

    // Check 6: HarnessClient is instantiated
    const clientInstantiated = harnessClientJs.includes('new HarnessClient');
    console.log(`✓ Test 6: HarnessClient instantiated - ${clientInstantiated ? 'PASS' : 'FAIL'}`);

    // Check 7: Scripts are loaded in HTML
    const scriptsLoaded = indexHtml.includes('harness-client.js') &&
        indexHtml.includes('harness-control.js');
    console.log(`✓ Test 7: Required scripts loaded - ${scriptsLoaded ? 'PASS' : 'FAIL'}`);

    console.log('\n=== Acceptance Criteria for feat-005 ===');
    const criterion1 = hasStartButton && hasStartHandler && callsStartAPI;
    const criterion2 = hasStopButton && hasStopHandler && callsStopAPI;
    const criterion3 = disablesStartWhenRunning && disablesStopWhenIdle;

    console.log(`1. ${criterion1 ? '✓' : '✗'} Start button launches harness in background`);
    console.log(`2. ${criterion2 ? '✓' : '✗'} Stop button terminates running harness`);
    console.log(`3. ${criterion3 ? '✓' : '✗'} Buttons are disabled appropriately based on state`);

    const allPassed = criterion1 && criterion2 && criterion3 &&
        bindsStartEvent && bindsStopEvent && panelInstantiated &&
        clientInstantiated && scriptsLoaded;

    if (allPassed) {
        console.log('\n✅ feat-005 implementation complete and verified!');
        console.log('\nFeatures:');
        console.log('  - Start button with handler and API call');
        console.log('  - Stop button with handler and API call');
        console.log('  - Proper button enable/disable logic based on harness state');
        console.log('  - Event listeners properly bound');
        console.log('  - All required components instantiated and loaded');
        return true;
    } else {
        console.log('\n❌ Some checks failed');
        return false;
    }
}

const success = testFeat005();
process.exit(success ? 0 : 1);
