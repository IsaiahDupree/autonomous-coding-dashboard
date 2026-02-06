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

    assert(await page.evaluate(() => typeof window.featureComments === 'object'), 'API exists');
    assert(await page.evaluate(() => !!document.getElementById('feature-comments-card')), 'Card rendered');
    assert(await page.evaluate(() => document.querySelectorAll('#feature-comments-card .fc-tab').length === 3), 'Three tabs');
    assert(await page.evaluate(() => document.querySelectorAll('#feature-comments-card .fc-stat-card').length === 4), 'Four stats');

    const cmts = await page.evaluate(() => window.featureComments.getComments());
    assert(cmts.length === 8, `${cmts.length} comments`);
    const c = cmts[0];
    assert(c.id !== undefined, `ID: ${c.id}`);
    assert(c.featureId !== undefined, `Feature: ${c.featureId}`);
    assert(c.author !== undefined, `Author: ${c.author}`);
    assert(c.text !== undefined, 'Has text');
    assert(c.likes >= 0, `Likes: ${c.likes}`);
    assert(c.resolved !== undefined, `Resolved: ${c.resolved}`);
    assert(await page.evaluate((id) => window.featureComments.getComment(id) !== null, c.id), 'Get comment');
    const forFeat = await page.evaluate(() => window.featureComments.getCommentsForFeature('feat-094'));
    assert(forFeat.length > 0, `${forFeat.length} for feat-094`);
    const resolved = await page.evaluate(() => window.featureComments.getResolvedComments());
    assert(resolved.length > 0, `${resolved.length} resolved`);
    assert(await page.evaluate(() => !!document.getElementById('fc-comment-list')), 'Comment list');
    assert(await page.evaluate(() => document.querySelectorAll('.fc-comment-item').length) > 0, 'Comment items');

    const threads = await page.evaluate(() => window.featureComments.getThreads());
    assert(threads.length === 4, `${threads.length} threads`);
    assert(threads[0].title !== undefined, `Title: ${threads[0].title}`);
    assert(threads[0].commentCount > 0, `Comments: ${threads[0].commentCount}`);
    assert(threads[0].status !== undefined, `Status: ${threads[0].status}`);
    assert(await page.evaluate((id) => window.featureComments.getThread(id) !== null, threads[0].id), 'Get thread');
    await page.evaluate(() => window.featureComments.setTab('threads'));
    await new Promise(r => setTimeout(r, 300));
    assert(await page.evaluate(() => !!document.getElementById('fc-thread-section')), 'Thread section');

    const rxns = await page.evaluate(() => window.featureComments.getReactions());
    assert(rxns.length === 5, `${rxns.length} reactions`);
    assert(rxns[0].emoji !== undefined, `Emoji: ${rxns[0].emoji}`);
    assert(rxns[0].count > 0, `Count: ${rxns[0].count}`);
    assert(rxns[0].users.length > 0, `Users: ${rxns[0].users.length}`);
    assert(await page.evaluate((id) => window.featureComments.getReaction(id) !== null, rxns[0].id), 'Get reaction');
    const forCmt = await page.evaluate(() => window.featureComments.getReactionsForComment('cmt-001'));
    assert(forCmt.length > 0, `${forCmt.length} for cmt-001`);
    await page.evaluate(() => window.featureComments.setTab('reactions'));
    await new Promise(r => setTimeout(r, 300));
    assert(await page.evaluate(() => !!document.getElementById('fc-reaction-section')), 'Reaction section');

    const st = await page.evaluate(() => window.featureComments.getState());
    assert(st.commentCount > 0, `Comments: ${st.commentCount}`);
    assert(st.threadCount > 0, `Threads: ${st.threadCount}`);
    assert(st.reactionCount > 0, `Reactions: ${st.reactionCount}`);
    assert(await page.evaluate(() => localStorage.getItem('feature-comments-config') !== null), 'State persisted');
  } catch (err) { failed++; results.push(`  ✗ ${err.message}`); }
  await browser.close();
  console.log('\n=======================================================');
  console.log('feat-104: Comments on Features - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
