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

    const hasAPI = await page.evaluate(() => typeof window.apiKeyEncryption === 'object');
    assert(hasAPI, 'apiKeyEncryption API exists on window');

    const hasCard = await page.evaluate(() => !!document.getElementById('api-key-encryption-card'));
    assert(hasCard, 'API key encryption card rendered');

    const hasTabs = await page.evaluate(() => document.querySelectorAll('.ake-tab').length === 3);
    assert(hasTabs, 'Three tabs exist (Keys, Rotation Log, Settings)');

    const hasStats = await page.evaluate(() => document.querySelectorAll('.ake-stat-card').length === 4);
    assert(hasStats, 'Four stat cards displayed');

    // === AC1: Encrypt stored keys ===
    console.log('\n=== AC1: Encrypt stored keys ===');

    const keys = await page.evaluate(() => window.apiKeyEncryption.getKeys());
    assert(keys.length > 0, `${keys.length} keys stored`);
    assert(keys.length === 5, 'Has 5 sample keys');

    const first = keys[0];
    assert(first.id !== undefined, 'Key has id');
    assert(first.name !== undefined, 'Key has name');
    assert(first.service !== undefined, 'Key has service');
    assert(first.isEncrypted === true, 'Key is encrypted');
    assert(first.masked !== undefined, 'Key has masked value');
    assert(first.masked.includes('****'), 'Key is properly masked');
    assert(first.createdAt !== undefined, 'Key has createdAt');
    assert(first.lastRotated !== undefined, 'Key has lastRotated');
    assert(first.rotationCount >= 0, `Key rotation count: ${first.rotationCount}`);
    assert(first.expiresIn > 0, `Key expires in ${first.expiresIn} days`);

    // All keys encrypted
    const allEncrypted = keys.every(k => k.isEncrypted);
    assert(allEncrypted, 'All stored keys are encrypted');

    // Get specific key
    const specific = await page.evaluate((id) => window.apiKeyEncryption.getKey(id), first.id);
    assert(specific !== null, 'Can retrieve specific key');
    assert(specific.id === first.id, 'Retrieved correct key');

    // Store a new key
    const newKeyId = await page.evaluate(() => {
      return window.apiKeyEncryption.storeKey('Test Key', 'test-service', 'test-secret-12345');
    });
    assert(newKeyId !== undefined, `New key stored with id: ${newKeyId}`);

    const afterStore = await page.evaluate(() => window.apiKeyEncryption.getKeys());
    assert(afterStore.length === 6, 'Key count increased to 6');

    const newKey = await page.evaluate((id) => window.apiKeyEncryption.getKey(id), newKeyId);
    assert(newKey.isEncrypted === true, 'New key is encrypted');
    assert(newKey.name === 'Test Key', 'New key has correct name');
    assert(newKey.service === 'test-service', 'New key has correct service');

    // Encryption stats
    const encStats = await page.evaluate(() => window.apiKeyEncryption.getEncryptionStats());
    assert(encStats.totalKeys > 0, `Total keys: ${encStats.totalKeys}`);
    assert(encStats.encryptedKeys > 0, `Encrypted: ${encStats.encryptedKeys}`);
    assert(encStats.encryptionRate > 0, `Encryption rate: ${encStats.encryptionRate}%`);
    assert(encStats.algorithm !== undefined, `Algorithm: ${encStats.algorithm}`);

    // Key list rendered
    const keyList = await page.evaluate(() => !!document.getElementById('ake-key-list'));
    assert(keyList, 'Key list rendered in DOM');

    const keyItems = await page.evaluate(() => document.querySelectorAll('.ake-key-item').length);
    assert(keyItems > 0, `${keyItems} key items rendered`);

    // Encrypted indicators
    const encIndicators = await page.evaluate(() => document.querySelectorAll('.ake-enc-indicator.encrypted').length);
    assert(encIndicators > 0, `${encIndicators} encrypted indicators shown`);

    // === AC2: Secure key retrieval ===
    console.log('\n=== AC2: Secure key retrieval ===');

    const retrieved = await page.evaluate((id) => window.apiKeyEncryption.retrieveKey(id), first.id);
    assert(retrieved !== null, 'Key retrieved successfully');
    assert(retrieved.id === first.id, 'Retrieved correct key id');
    assert(retrieved.name !== undefined, 'Retrieved key has name');
    assert(retrieved.service !== undefined, 'Retrieved key has service');
    assert(retrieved.decrypted !== undefined, 'Retrieved key has decrypted value');
    assert(retrieved.decrypted.length > 0, 'Decrypted value is not empty');
    assert(retrieved.accessedAt !== undefined, 'Retrieval records access time');

    // Masked value doesn't reveal full key
    const maskedKey = await page.evaluate((id) => window.apiKeyEncryption.getKey(id), first.id);
    assert(maskedKey.masked.includes('****'), 'Masked key hides middle portion');
    assert(maskedKey.masked.length < retrieved.decrypted.length, 'Masked shorter than decrypted');

    // Last accessed updated
    assert(maskedKey.lastAccessed !== null, 'Last accessed timestamp updated');

    // Delete a key
    const deleted = await page.evaluate((id) => window.apiKeyEncryption.deleteKey(id), newKeyId);
    assert(deleted === true, 'deleteKey returns true');
    const afterDelete = await page.evaluate(() => window.apiKeyEncryption.getKeys());
    assert(afterDelete.length === 5, 'Key count back to 5 after delete');

    // === AC3: Key rotation support ===
    console.log('\n=== AC3: Key rotation support ===');

    // Rotate a key
    const rotateResult = await page.evaluate((id) => window.apiKeyEncryption.rotateKey(id, 'new-rotated-secret-key-123'), first.id);
    assert(rotateResult === true, 'rotateKey returns true');

    const afterRotate = await page.evaluate((id) => window.apiKeyEncryption.getKey(id), first.id);
    assert(afterRotate.rotationCount > first.rotationCount, 'Rotation count increased');

    // Rotation log
    const rotLog = await page.evaluate(() => window.apiKeyEncryption.getRotationLog());
    assert(rotLog.length > 0, `${rotLog.length} rotation log entries`);

    const firstLog = rotLog[0];
    assert(firstLog.id !== undefined, 'Log entry has id');
    assert(firstLog.keyName !== undefined, 'Log entry has keyName');
    assert(firstLog.oldVersion !== undefined, 'Log entry has oldVersion');
    assert(firstLog.newVersion !== undefined, 'Log entry has newVersion');
    assert(firstLog.rotatedAt !== undefined, 'Log entry has rotatedAt');
    assert(firstLog.reason !== undefined, `Log entry reason: ${firstLog.reason}`);
    assert(firstLog.rotatedBy !== undefined, 'Log entry has rotatedBy');
    assert(firstLog.success === true, 'Log entry shows success');

    // Rotate all expiring
    const rotatedCount = await page.evaluate(() => window.apiKeyEncryption.rotateAllExpiring(100));
    assert(rotatedCount >= 0, `rotateAllExpiring rotated ${rotatedCount} keys`);

    // Switch to rotation tab
    await page.evaluate(() => window.apiKeyEncryption.setTab('rotation'));
    await new Promise(r => setTimeout(r, 300));

    const rotTabActive = await page.evaluate(() => {
      return document.querySelector('.ake-tab[data-tab="rotation"]').classList.contains('active');
    });
    assert(rotTabActive, 'Rotation Log tab becomes active');

    const rotList = await page.evaluate(() => !!document.getElementById('ake-rotation-list'));
    assert(rotList, 'Rotation list rendered');

    const rotItems = await page.evaluate(() => document.querySelectorAll('.ake-rotation-item').length);
    assert(rotItems > 0, `${rotItems} rotation items rendered`);

    // === Settings ===
    console.log('\n=== Settings ===');

    const config = await page.evaluate(() => window.apiKeyEncryption.getEncryptionConfig());
    assert(config.algorithm !== undefined, `Algorithm: ${config.algorithm}`);
    assert(config.autoRotateDays > 0, `Auto-rotate: ${config.autoRotateDays} days`);
    assert(config.requireEncryption !== undefined, `Require encryption: ${config.requireEncryption}`);

    // Update config
    const newConfig = await page.evaluate(() => window.apiKeyEncryption.updateConfig({ autoRotateDays: 60 }));
    assert(newConfig.autoRotateDays === 60, 'Config updated to 60 days');

    // Switch to settings tab
    await page.evaluate(() => window.apiKeyEncryption.setTab('settings'));
    await new Promise(r => setTimeout(r, 300));

    const settingsTabActive = await page.evaluate(() => {
      return document.querySelector('.ake-tab[data-tab="settings"]').classList.contains('active');
    });
    assert(settingsTabActive, 'Settings tab becomes active');

    const settingsEl = await page.evaluate(() => !!document.getElementById('ake-settings'));
    assert(settingsEl, 'Settings panel rendered');

    // === State Persistence ===
    console.log('\n=== State Persistence ===');

    const stateObj = await page.evaluate(() => window.apiKeyEncryption.getState());
    assert(stateObj.activeTab !== undefined, 'State has activeTab');
    assert(stateObj.keyCount > 0, `State tracks ${stateObj.keyCount} keys`);
    assert(stateObj.rotationLogCount > 0, `State tracks ${stateObj.rotationLogCount} rotations`);
    assert(stateObj.config !== undefined, 'State has config');

    const savedState = await page.evaluate(() => localStorage.getItem('api-key-encryption-config') !== null);
    assert(savedState, 'Config persisted to localStorage');

    const savedKeys = await page.evaluate(() => localStorage.getItem('api-encrypted-keys') !== null);
    assert(savedKeys, 'Encrypted keys persisted to localStorage');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n=======================================================');
  console.log('feat-078: API Key Encryption at Rest - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
