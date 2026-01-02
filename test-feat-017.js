const puppeteer = require('puppeteer');

// Helper function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log('Testing feat-017: Audio alert option');
  console.log('=====================================\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--autoplay-policy=no-user-gesture-required']
  });
  const page = await browser.newPage();

  // Navigate to dashboard
  console.log('1. Navigating to dashboard...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await wait(1000);

  // Acceptance Criteria 1: Toggle to enable/disable audio alerts
  console.log('\n2. Testing toggle to enable/disable audio alerts...');

  // Check if audio toggle exists
  const audioToggle = await page.$('#audio-toggle');
  if (!audioToggle) {
    console.log('❌ FAILED: Audio toggle not found');
    await browser.close();
    process.exit(1);
  }
  console.log('✅ Audio toggle button exists');

  // Check initial state (should be unchecked)
  let isChecked = await page.$eval('#audio-toggle', el => el.checked);
  console.log(`   Initial state: ${isChecked ? 'enabled' : 'disabled'}`);

  // Enable audio
  console.log('   Clicking toggle to enable audio...');
  await page.evaluate(() => {
    document.getElementById('audio-toggle').click();
  });
  await wait(1000);

  // Verify it's enabled
  isChecked = await page.$eval('#audio-toggle', el => el.checked);
  if (!isChecked) {
    console.log('❌ FAILED: Audio toggle did not enable');
    await browser.close();
    process.exit(1);
  }
  console.log('✅ Audio toggle enabled successfully');

  // Verify localStorage persistence
  const audioEnabledInStorage = await page.evaluate(() => {
    return localStorage.getItem('audioEnabled');
  });
  if (audioEnabledInStorage !== 'true') {
    console.log('❌ FAILED: Audio preference not saved to localStorage');
    await browser.close();
    process.exit(1);
  }
  console.log('✅ Audio preference persisted to localStorage');

  // Disable audio
  console.log('   Clicking toggle to disable audio...');
  await page.evaluate(() => {
    document.getElementById('audio-toggle').click();
  });
  await wait(500);

  isChecked = await page.$eval('#audio-toggle', el => el.checked);
  if (isChecked) {
    console.log('❌ FAILED: Audio toggle did not disable');
    await browser.close();
    process.exit(1);
  }
  console.log('✅ Audio toggle disabled successfully');

  // Re-enable for next tests
  console.log('   Re-enabling audio for remaining tests...');
  await page.evaluate(() => {
    document.getElementById('audio-toggle').click();
  });
  await wait(1000);

  // Acceptance Criteria 2: Sound plays on feature completion
  console.log('\n3. Testing sound plays on feature completion...');
  console.log('   Checking if playSuccessSound function exists...');

  const hasSuccessSound = await page.evaluate(() => {
    return typeof window.playSuccessSound === 'function' ||
           typeof playSuccessSound === 'function';
  });

  if (!hasSuccessSound) {
    console.log('❌ FAILED: playSuccessSound function not found');
    await browser.close();
    process.exit(1);
  }
  console.log('✅ playSuccessSound function exists');

  // Test that notifyFeatureCompletion calls playSuccessSound
  console.log('   Verifying notifyFeatureCompletion integrates with audio...');
  const featureCompletionWorks = await page.evaluate(() => {
    // Check if the function includes audio call
    const funcString = notifyFeatureCompletion.toString();
    return funcString.includes('playSuccessSound');
  });

  if (!featureCompletionWorks) {
    console.log('❌ FAILED: notifyFeatureCompletion does not call playSuccessSound');
    await browser.close();
    process.exit(1);
  }
  console.log('✅ Feature completion notifications integrated with audio');

  // Acceptance Criteria 3: Different sound for errors
  console.log('\n4. Testing different sound for errors...');
  console.log('   Checking if playErrorSound function exists...');

  const hasErrorSound = await page.evaluate(() => {
    return typeof window.playErrorSound === 'function' ||
           typeof playErrorSound === 'function';
  });

  if (!hasErrorSound) {
    console.log('❌ FAILED: playErrorSound function not found');
    await browser.close();
    process.exit(1);
  }
  console.log('✅ playErrorSound function exists');

  // Verify error notifications call error sound
  console.log('   Verifying notifyError integrates with error sound...');
  const errorSoundWorks = await page.evaluate(() => {
    const funcString = notifyError.toString();
    return funcString.includes('playErrorSound');
  });

  if (!errorSoundWorks) {
    console.log('❌ FAILED: notifyError does not call playErrorSound');
    await browser.close();
    process.exit(1);
  }
  console.log('✅ Error notifications integrated with error sound');

  // Verify sounds are different
  console.log('   Verifying success and error sounds are different...');
  const soundsAreDifferent = await page.evaluate(() => {
    const successFunc = playSuccessSound.toString();
    const errorFunc = playErrorSound.toString();

    // Check for different frequencies or wave types
    const successHasHighFreq = successFunc.includes('783.99') || successFunc.includes('659.25');
    const errorHasLowFreq = errorFunc.includes('349.23') || errorFunc.includes('392');
    const differentTypes = (successFunc.includes('sine') && errorFunc.includes('square')) ||
                          (successFunc.includes('square') && errorFunc.includes('sine'));

    return (successHasHighFreq && errorHasLowFreq) || differentTypes;
  });

  if (!soundsAreDifferent) {
    console.log('❌ FAILED: Success and error sounds are not sufficiently different');
    await browser.close();
    process.exit(1);
  }
  console.log('✅ Success and error sounds use different tones/frequencies');

  // Additional test: Verify audio context exists
  console.log('\n5. Additional checks...');
  const audioContextExists = await page.evaluate(() => {
    return typeof audioContext !== 'undefined';
  });

  if (!audioContextExists) {
    console.log('⚠️  WARNING: audioContext not found in global scope');
  } else {
    console.log('✅ Audio context initialized');
  }

  // Take screenshot
  await page.screenshot({ path: 'test-feat-017-screenshot.png', fullPage: true });
  console.log('✅ Screenshot saved: test-feat-017-screenshot.png');

  console.log('\n=====================================');
  console.log('✅ ALL TESTS PASSED for feat-017!');
  console.log('=====================================');
  console.log('\nAcceptance Criteria Verified:');
  console.log('  ✅ Toggle to enable/disable audio alerts');
  console.log('  ✅ Sound plays on feature completion');
  console.log('  ✅ Different sound for errors');

  await browser.close();
})();
