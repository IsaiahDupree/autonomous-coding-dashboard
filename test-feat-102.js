const puppeteer = require('puppeteer');
(async () => {
  let passed = 0, failed = 0; const results = [];
  function assert(c, m) { if (c) { passed++; results.push(`  ✓ ${m}`); } else { failed++; results.push(`  ✗ ${m}`); } }
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 3000));

    console.log('\n=== Setup ===');
    assert(await page.evaluate(() => typeof window.multiUser === 'object'), 'API exists');
    assert(await page.evaluate(() => !!document.getElementById('multi-user-card')), 'Card rendered');
    assert(await page.evaluate(() => document.querySelectorAll('#multi-user-card .mu-tab').length === 3), 'Three tabs');
    assert(await page.evaluate(() => document.querySelectorAll('#multi-user-card .mu-stat-card').length === 4), 'Four stats');

    console.log('\n=== Users ===');
    const users = await page.evaluate(() => window.multiUser.getUsers());
    assert(users.length === 6, `${users.length} users`);
    const u = users[0];
    assert(u.id !== undefined, `ID: ${u.id}`);
    assert(u.name !== undefined, `Name: ${u.name}`);
    assert(u.email !== undefined, `Email: ${u.email}`);
    assert(u.role !== undefined, `Role: ${u.role}`);
    assert(u.status !== undefined, `Status: ${u.status}`);
    assert(u.features >= 0, `Features: ${u.features}`);
    assert(await page.evaluate((id) => window.multiUser.getUser(id) !== null, u.id), 'Get user');
    const online = await page.evaluate(() => window.multiUser.getOnlineUsers());
    assert(online.length > 0, `${online.length} online`);
    assert(await page.evaluate(() => !!document.getElementById('mu-user-list')), 'User list rendered');
    assert(await page.evaluate(() => document.querySelectorAll('.mu-user-item').length) > 0, 'User items');

    console.log('\n=== Roles ===');
    const roles = await page.evaluate(() => window.multiUser.getRoles());
    assert(roles.length === 3, `${roles.length} roles`);
    const r = roles[0];
    assert(r.id !== undefined, `ID: ${r.id}`);
    assert(r.name !== undefined, `Name: ${r.name}`);
    assert(r.permissions.length > 0, `Perms: ${r.permissions.length}`);
    assert(r.userCount > 0, `Users: ${r.userCount}`);
    assert(r.description !== undefined, 'Has description');
    assert(await page.evaluate((id) => window.multiUser.getRole(id) !== null, r.id), 'Get role');
    await page.evaluate(() => window.multiUser.setTab('roles'));
    await new Promise(r => setTimeout(r, 300));
    assert(await page.evaluate(() => document.querySelector('.mu-tab[data-tab="roles"]').classList.contains('active')), 'Roles tab');
    assert(await page.evaluate(() => !!document.getElementById('mu-role-section')), 'Role section');
    assert(await page.evaluate(() => document.querySelectorAll('.mu-role-item').length) > 0, 'Role items');

    console.log('\n=== Sessions ===');
    const sessions = await page.evaluate(() => window.multiUser.getSessions());
    assert(sessions.length === 5, `${sessions.length} sessions`);
    const s = sessions[0];
    assert(s.id !== undefined, `ID: ${s.id}`);
    assert(s.userId !== undefined, `User: ${s.userId}`);
    assert(s.ip !== undefined, `IP: ${s.ip}`);
    assert(s.device !== undefined, `Device: ${s.device}`);
    assert(s.active !== undefined, `Active: ${s.active}`);
    assert(await page.evaluate((id) => window.multiUser.getSession(id) !== null, s.id), 'Get session');
    const activeSess = await page.evaluate(() => window.multiUser.getActiveSessions());
    assert(activeSess.length > 0, `${activeSess.length} active sessions`);
    await page.evaluate(() => window.multiUser.setTab('sessions'));
    await new Promise(r => setTimeout(r, 300));
    assert(await page.evaluate(() => document.querySelector('.mu-tab[data-tab="sessions"]').classList.contains('active')), 'Sessions tab');
    assert(await page.evaluate(() => !!document.getElementById('mu-session-section')), 'Session section');
    assert(await page.evaluate(() => document.querySelectorAll('.mu-session-item').length) > 0, 'Session items');

    console.log('\n=== State ===');
    const st = await page.evaluate(() => window.multiUser.getState());
    assert(st.userCount > 0, `Users: ${st.userCount}`);
    assert(st.onlineCount > 0, `Online: ${st.onlineCount}`);
    assert(st.roleCount > 0, `Roles: ${st.roleCount}`);
    assert(st.sessionCount > 0, `Sessions: ${st.sessionCount}`);
    assert(await page.evaluate(() => localStorage.getItem('multi-user-config') !== null), 'State persisted');
  } catch (err) { console.error('Error:', err.message); failed++; results.push(`  ✗ ${err.message}`); }
  await browser.close();
  console.log('\n=======================================================');
  console.log('feat-102: Multi-user Support - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
