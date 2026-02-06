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

    assert(await page.evaluate(() => typeof window.teamActivity === 'object'), 'API exists');
    assert(await page.evaluate(() => !!document.getElementById('team-activity-card')), 'Card rendered');
    assert(await page.evaluate(() => document.querySelectorAll('#team-activity-card .ta-tab').length === 3), 'Three tabs');
    assert(await page.evaluate(() => document.querySelectorAll('#team-activity-card .ta-stat-card').length === 4), 'Four stats');

    const acts = await page.evaluate(() => window.teamActivity.getActivities());
    assert(acts.length === 8, `${acts.length} activities`);
    const a = acts[0];
    assert(a.id !== undefined, `ID: ${a.id}`);
    assert(a.user !== undefined, `User: ${a.user}`);
    assert(a.type !== undefined, `Type: ${a.type}`);
    assert(a.action !== undefined, `Action: ${a.action}`);
    assert(a.target !== undefined, `Target: ${a.target}`);
    assert(a.message !== undefined, 'Has message');
    assert(a.timestamp !== undefined, 'Has timestamp');
    assert(await page.evaluate((id) => window.teamActivity.getActivity(id) !== null, a.id), 'Get activity');
    const byUser = await page.evaluate(() => window.teamActivity.getActivitiesByUser('Alice Chen'));
    assert(byUser.length > 0, `${byUser.length} by Alice`);
    const byType = await page.evaluate(() => window.teamActivity.getActivitiesByType('feature'));
    assert(byType.length > 0, `${byType.length} feature activities`);
    assert(await page.evaluate(() => !!document.getElementById('ta-feed-list')), 'Feed list');
    assert(await page.evaluate(() => document.querySelectorAll('.ta-activity-item').length) > 0, 'Activity items');

    const ms = await page.evaluate(() => window.teamActivity.getMilestones());
    assert(ms.length === 4, `${ms.length} milestones`);
    assert(ms[0].id !== undefined, 'Milestone id');
    assert(ms[0].title !== undefined, `Title: ${ms[0].title}`);
    assert(ms[0].progress >= 0, `Progress: ${ms[0].progress}%`);
    assert(ms[0].category !== undefined, `Category: ${ms[0].category}`);
    assert(await page.evaluate((id) => window.teamActivity.getMilestone(id) !== null, ms[0].id), 'Get milestone');
    await page.evaluate(() => window.teamActivity.setTab('milestones'));
    await new Promise(r => setTimeout(r, 300));
    assert(await page.evaluate(() => document.querySelector('.ta-tab[data-tab="milestones"]').classList.contains('active')), 'Milestones tab');
    assert(await page.evaluate(() => !!document.getElementById('ta-milestone-section')), 'Milestone section');

    const men = await page.evaluate(() => window.teamActivity.getMentions());
    assert(men.length === 4, `${men.length} mentions`);
    assert(men[0].from !== undefined, `From: ${men[0].from}`);
    assert(men[0].to !== undefined, `To: ${men[0].to}`);
    assert(men[0].message !== undefined, 'Has message');
    assert(men[0].read !== undefined, `Read: ${men[0].read}`);
    assert(await page.evaluate((id) => window.teamActivity.getMention(id) !== null, men[0].id), 'Get mention');
    const unread = await page.evaluate(() => window.teamActivity.getUnreadMentions());
    assert(unread.length > 0, `${unread.length} unread`);
    await page.evaluate(() => window.teamActivity.setTab('mentions'));
    await new Promise(r => setTimeout(r, 300));
    assert(await page.evaluate(() => !!document.getElementById('ta-mention-section')), 'Mention section');

    const st = await page.evaluate(() => window.teamActivity.getState());
    assert(st.activityCount > 0, `Activities: ${st.activityCount}`);
    assert(st.milestoneCount > 0, `Milestones: ${st.milestoneCount}`);
    assert(st.mentionCount > 0, `Mentions: ${st.mentionCount}`);
    assert(await page.evaluate(() => localStorage.getItem('team-activity-config') !== null), 'State persisted');
  } catch (err) { failed++; results.push(`  ✗ ${err.message}`); }
  await browser.close();
  console.log('\n=======================================================');
  console.log('feat-103: Team Activity Feed - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
