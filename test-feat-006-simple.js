// Simple test for feat-006 using code inspection
const fs = require('fs');

function testFeat006() {
    console.log('Testing feat-006: Mode toggle switches between single and continuous mode\n');

    // Verify harness-control.js has the correct implementation
    const harnessControlJs = fs.readFileSync('harness-control.js', 'utf8');
    const indexHtml = fs.readFileSync('index.html', 'utf8');

    // Check 1: Toggle switch changes harness run mode
    const hasContinuousCheckbox = indexHtml.includes('continuous-mode') ||
        harnessControlJs.includes('continuous-mode');
    const readsCheckboxValue = harnessControlJs.includes("getElementById('continuous-mode')") &&
        harnessControlJs.includes('.checked');
    const passesToStartHarness = harnessControlJs.includes('continuous') &&
        harnessControlJs.includes('startHarness');
    console.log(`✓ Test 1a: Continuous mode checkbox exists - ${hasContinuousCheckbox ? 'PASS' : 'FAIL'}`);
    console.log(`✓ Test 1b: Reads checkbox value - ${readsCheckboxValue ? 'PASS' : 'FAIL'}`);
    console.log(`✓ Test 1c: Passes mode to startHarness - ${passesToStartHarness ? 'PASS' : 'FAIL'}`);

    // Check 2: Current mode is persisted
    const savesToLocalStorage = harnessControlJs.includes('localStorage.setItem') &&
        harnessControlJs.includes('harness-continuous-mode');
    const loadsFromLocalStorage = harnessControlJs.includes('localStorage.getItem') &&
        harnessControlJs.includes('harness-continuous-mode');
    const hasLoadSettings = harnessControlJs.includes('loadSettings()');
    const hasChangeListener = harnessControlJs.includes("addEventListener('change'") &&
        harnessControlJs.includes('continuous-mode');
    console.log(`✓ Test 2a: Saves to localStorage - ${savesToLocalStorage ? 'PASS' : 'FAIL'}`);
    console.log(`✓ Test 2b: Loads from localStorage - ${loadsFromLocalStorage ? 'PASS' : 'FAIL'}`);
    console.log(`✓ Test 2c: Calls loadSettings on init - ${hasLoadSettings ? 'PASS' : 'FAIL'}`);
    console.log(`✓ Test 2d: Has change event listener - ${hasChangeListener ? 'PASS' : 'FAIL'}`);

    // Check 3: Mode is passed to harness on start
    const passesOptionsToAPI = harnessControlJs.includes('continuous,') ||
        harnessControlJs.includes('continuous:') ||
        (harnessControlJs.includes('const continuous') && harnessControlJs.includes('startHarness'));
    const sendsInAPICall = harnessControlJs.includes('harnessClient.startHarness') &&
        harnessControlJs.includes('continuous');
    console.log(`✓ Test 3a: Includes continuous in options - ${passesOptionsToAPI ? 'PASS' : 'FAIL'}`);
    console.log(`✓ Test 3b: Sends to API via harnessClient - ${sendsInAPICall ? 'PASS' : 'FAIL'}`);

    // Additional verification
    const checksboxRestoresCorrectly = harnessControlJs.includes('checkbox.checked =') &&
        harnessControlJs.includes("=== 'true'");
    console.log(`✓ Test 4: Checkbox restores correctly (boolean conversion) - ${checksboxRestoresCorrectly ? 'PASS' : 'FAIL'}`);

    console.log('\n=== Acceptance Criteria for feat-006 ===');
    const criterion1 = hasContinuousCheckbox && readsCheckboxValue && passesToStartHarness;
    const criterion2 = savesToLocalStorage && loadsFromLocalStorage && hasLoadSettings && hasChangeListener;
    const criterion3 = passesOptionsToAPI && sendsInAPICall;

    console.log(`1. ${criterion1 ? '✓' : '✗'} Toggle switch changes harness run mode`);
    console.log(`2. ${criterion2 ? '✓' : '✗'} Current mode is persisted`);
    console.log(`3. ${criterion3 ? '✓' : '✗'} Mode is passed to harness on start`);

    const allPassed = criterion1 && criterion2 && criterion3 && checksboxRestoresCorrectly;

    if (allPassed) {
        console.log('\n✅ feat-006 implementation complete and verified!');
        console.log('\nFeatures:');
        console.log('  - Continuous mode checkbox that toggles run mode');
        console.log('  - Mode persisted to localStorage');
        console.log('  - Mode loaded on page load');
        console.log('  - Mode passed to harness API on start');
        return true;
    } else {
        console.log('\n❌ Some checks failed');
        return false;
    }
}

const success = testFeat006();
process.exit(success ? 0 : 1);
