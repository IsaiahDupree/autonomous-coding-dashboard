const puppeteer = require('puppeteer');

(async () => {
  let passed = 0;
  let failed = 0;
  const results = [];

  function assert(condition, message) {
    if (condition) { passed++; results.push(`  ✓ ${message}`); }
    else { failed++; results.push(`  ✗ ${message}`); }
  }

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 3000));

    console.log('\n=== Basic Setup ===');
    assert(await page.evaluate(() => typeof window.helpSystem === 'object'), 'helpSystem API exists');
    assert(await page.evaluate(() => !!document.getElementById('help-system-card')), 'Help card rendered');
    assert(await page.evaluate(() => document.querySelectorAll('.hs-tab').length === 3), 'Three tabs');
    assert(await page.evaluate(() => document.querySelectorAll('.hs-stat-card').length === 4), 'Four stats');

    console.log('\n=== AC1: Help Articles ===');
    const articles = await page.evaluate(() => window.helpSystem.getArticles());
    assert(articles.length === 8, `${articles.length} articles`);
    const art = articles[0];
    assert(art.id !== undefined, 'Has id');
    assert(art.title !== undefined, `Title: ${art.title}`);
    assert(art.category !== undefined, `Category: ${art.category}`);
    assert(art.content !== undefined, 'Has content');
    assert(art.tags !== undefined, 'Has tags');
    assert(art.readTime > 0, `Read time: ${art.readTime}min`);
    assert(art.views > 0, `Views: ${art.views}`);

    assert(await page.evaluate((id) => window.helpSystem.getArticle(id) !== null, art.id), 'Get specific article');
    const byCat = await page.evaluate(() => window.helpSystem.getArticlesByCategory('api'));
    assert(byCat.length > 0, `${byCat.length} API articles`);
    const searchRes = await page.evaluate(() => window.helpSystem.searchArticles('harness'));
    assert(searchRes.length > 0, `${searchRes.length} results for "harness"`);
    const emptySearch = await page.evaluate(() => window.helpSystem.searchArticles(''));
    assert(emptySearch.length === 0, 'Empty search returns nothing');

    assert(await page.evaluate(() => !!document.getElementById('hs-article-list')), 'Article list rendered');
    const artItems = await page.evaluate(() => document.querySelectorAll('.hs-article-item').length);
    assert(artItems > 0, `${artItems} article items rendered`);

    console.log('\n=== AC2: FAQs ===');
    const faqs = await page.evaluate(() => window.helpSystem.getFAQs());
    assert(faqs.length === 6, `${faqs.length} FAQs`);
    const faq = faqs[0];
    assert(faq.id !== undefined, 'Has id');
    assert(faq.question !== undefined, `Q: ${faq.question}`);
    assert(faq.answer !== undefined, 'Has answer');
    assert(faq.category !== undefined, `Category: ${faq.category}`);
    assert(faq.helpful > 0, `Helpful: ${faq.helpful}`);

    assert(await page.evaluate((id) => window.helpSystem.getFAQ(id) !== null, faq.id), 'Get specific FAQ');

    await page.evaluate(() => window.helpSystem.setTab('faqs'));
    await new Promise(r => setTimeout(r, 300));
    assert(await page.evaluate(() => document.querySelector('.hs-tab[data-tab="faqs"]').classList.contains('active')), 'FAQs tab active');
    assert(await page.evaluate(() => !!document.getElementById('hs-faq-section')), 'FAQ section rendered');
    assert(await page.evaluate(() => document.querySelectorAll('.hs-faq-item').length) > 0, 'FAQ items rendered');

    console.log('\n=== AC3: Guided Tours ===');
    const tours = await page.evaluate(() => window.helpSystem.getTours());
    assert(tours.length === 5, `${tours.length} tours`);
    const tour = tours[0];
    assert(tour.id !== undefined, 'Has id');
    assert(tour.name !== undefined, `Name: ${tour.name}`);
    assert(tour.steps > 0, `Steps: ${tour.steps}`);
    assert(tour.description !== undefined, 'Has description');
    assert(tour.target !== undefined, `Target: ${tour.target}`);
    assert(tour.completed !== undefined, `Completed: ${tour.completed}`);

    assert(await page.evaluate((id) => window.helpSystem.getTour(id) !== null, tour.id), 'Get specific tour');
    const started = await page.evaluate((id) => window.helpSystem.startTour(id), tour.id);
    assert(started !== null, 'Can start tour');
    assert(started.currentStep === 1, 'Starts at step 1');
    assert(started.status === 'active', 'Status: active');

    await page.evaluate(() => window.helpSystem.setTab('tours'));
    await new Promise(r => setTimeout(r, 300));
    assert(await page.evaluate(() => document.querySelector('.hs-tab[data-tab="tours"]').classList.contains('active')), 'Tours tab active');
    assert(await page.evaluate(() => !!document.getElementById('hs-tour-section')), 'Tour section rendered');
    assert(await page.evaluate(() => document.querySelectorAll('.hs-tour-item').length) > 0, 'Tour items rendered');

    console.log('\n=== State ===');
    const st = await page.evaluate(() => window.helpSystem.getState());
    assert(st.activeTab !== undefined, 'Has activeTab');
    assert(st.articleCount > 0, `Articles: ${st.articleCount}`);
    assert(st.faqCount > 0, `FAQs: ${st.faqCount}`);
    assert(st.tourCount > 0, `Tours: ${st.tourCount}`);
    assert(await page.evaluate(() => localStorage.getItem('help-system-config') !== null), 'State persisted');

    const stats = await page.evaluate(() => window.helpSystem.getHelpStats());
    assert(stats.articleCount > 0, `Stats articles: ${stats.articleCount}`);
    assert(stats.faqCount > 0, `Stats FAQs: ${stats.faqCount}`);
    assert(stats.tourCount > 0, `Stats tours: ${stats.tourCount}`);
    assert(stats.categoryCount > 0, `Stats categories: ${stats.categoryCount}`);

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();
  console.log('\n=======================================================');
  console.log('feat-098: In-app Help System - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
