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

    const hasAPI = await page.evaluate(() => typeof window.gitHistoryViz === 'object');
    assert(hasAPI, 'gitHistoryViz API exists on window');

    const hasCard = await page.evaluate(() => !!document.getElementById('git-history-card'));
    assert(hasCard, 'Git history card rendered');

    const hasTabs = await page.evaluate(() => document.querySelectorAll('.gh-tab').length === 3);
    assert(hasTabs, 'Three tabs exist (Timeline, Branch Graph, Authors)');

    const hasStats = await page.evaluate(() => document.querySelectorAll('.gh-stat-card').length === 3);
    assert(hasStats, 'Three stat cards displayed (Commits, Authors, Branches)');

    // === AC1: Commit Timeline ===
    console.log('\n=== AC1: Commit Timeline ===');

    const commits = await page.evaluate(() => window.gitHistoryViz.getCommits());
    assert(commits.length > 0, `${commits.length} commits generated`);
    assert(commits.length === 30, 'Has 30 commits');

    const first = commits[0];
    assert(first.id !== undefined, 'Commit has id');
    assert(first.hash !== undefined, 'Commit has hash');
    assert(first.message !== undefined, 'Commit has message');
    assert(first.author !== undefined, 'Commit has author');
    assert(first.timestamp !== undefined, 'Commit has timestamp');
    assert(first.branch !== undefined, 'Commit has branch');
    assert(first.type !== undefined, 'Commit has type');
    assert(first.additions > 0, 'Commit has additions');
    assert(first.deletions >= 0, 'Commit has deletions');
    assert(first.filesChanged > 0, 'Commit has filesChanged');

    // Get specific commit
    const specific = await page.evaluate((id) => window.gitHistoryViz.getCommit(id), first.id);
    assert(specific !== null, 'Can retrieve specific commit by id');
    assert(specific.id === first.id, 'Retrieved correct commit');

    // Timeline view
    const timeline = await page.evaluate(() => window.gitHistoryViz.getCommitTimeline(10));
    assert(timeline.length === 10, 'getCommitTimeline respects limit');
    assert(timeline[0].hash !== undefined, 'Timeline entry has hash');
    assert(timeline[0].message !== undefined, 'Timeline entry has message');

    // Merge commits
    const merges = commits.filter(c => c.type === 'merge');
    assert(merges.length > 0, `${merges.length} merge commits found`);
    assert(merges[0].message.includes('Merge'), 'Merge commit message contains "Merge"');

    // Timeline DOM rendered
    const timelineEl = await page.evaluate(() => !!document.getElementById('gh-timeline'));
    assert(timelineEl, 'Timeline element rendered');

    const commitEls = await page.evaluate(() => document.querySelectorAll('.gh-commit').length);
    assert(commitEls > 0, `${commitEls} commit elements rendered in DOM`);

    const mergeEls = await page.evaluate(() => document.querySelectorAll('.gh-commit.merge').length);
    assert(mergeEls > 0, `${mergeEls} merge commit elements highlighted`);

    // Commit hash displayed
    const hashDisplayed = await page.evaluate(() => !!document.querySelector('.gh-commit-hash'));
    assert(hashDisplayed, 'Commit hash displayed');

    // Commit meta displayed
    const metaDisplayed = await page.evaluate(() => !!document.querySelector('.gh-commit-meta'));
    assert(metaDisplayed, 'Commit meta (author, date, branch) displayed');

    // === AC2: Branch Graph ===
    console.log('\n=== AC2: Branch Graph ===');

    const branches = await page.evaluate(() => window.gitHistoryViz.getBranchGraph());
    assert(branches.length > 0, `${branches.length} branches in graph`);
    assert(branches.length === 7, 'Has 7 branches (main + 6 feature)');

    const mainBranch = branches.find(b => b.name === 'main');
    assert(mainBranch !== null, 'Main branch exists');
    assert(mainBranch.status === 'active', 'Main branch is active');
    assert(mainBranch.commits > 0, `Main has ${mainBranch.commits} commits`);
    assert(mainBranch.color !== undefined, 'Branch has color');

    // Branch statuses
    const merged = branches.filter(b => b.status === 'merged');
    assert(merged.length > 0, `${merged.length} merged branches`);
    assert(merged[0].mergedInto === 'main', 'Merged branch target is main');

    const active = branches.filter(b => b.status === 'active');
    assert(active.length > 0, `${active.length} active branches`);

    const stale = branches.filter(b => b.status === 'stale');
    assert(stale.length > 0, `${stale.length} stale branches`);

    // Get specific branch
    const specificBranch = await page.evaluate((n) => window.gitHistoryViz.getBranch(n), 'main');
    assert(specificBranch !== null, 'Can retrieve specific branch by name');

    // Switch to branch graph tab
    await page.evaluate(() => window.gitHistoryViz.setTab('graph'));
    await new Promise(r => setTimeout(r, 300));

    const graphTabActive = await page.evaluate(() => {
      return document.querySelector('.gh-tab[data-tab="graph"]').classList.contains('active');
    });
    assert(graphTabActive, 'Branch Graph tab becomes active');

    const graphEl = await page.evaluate(() => !!document.getElementById('gh-branch-graph'));
    assert(graphEl, 'Branch graph container rendered');

    const branchRows = await page.evaluate(() => document.querySelectorAll('.gh-branch-row').length);
    assert(branchRows > 0, `${branchRows} branch rows rendered`);
    assert(branchRows === 7, 'All 7 branches rendered in graph');

    const branchLabels = await page.evaluate(() => document.querySelectorAll('.gh-branch-label').length);
    assert(branchLabels > 0, `${branchLabels} branch labels shown`);

    const branchDots = await page.evaluate(() => document.querySelectorAll('.gh-branch-dot').length);
    assert(branchDots > 0, `${branchDots} commit dots in graph`);

    // === AC3: Author Statistics ===
    console.log('\n=== AC3: Author Statistics ===');

    const authors = await page.evaluate(() => window.gitHistoryViz.getAuthorStats());
    assert(authors.length > 0, `${authors.length} authors tracked`);
    assert(authors.length === 4, 'Has 4 authors');

    const firstAuthor = authors[0];
    assert(firstAuthor.name !== undefined, 'Author has name');
    assert(firstAuthor.email !== undefined, 'Author has email');
    assert(firstAuthor.commits > 0, `Author has ${firstAuthor.commits} commits`);
    assert(firstAuthor.additions > 0, 'Author has additions count');
    assert(firstAuthor.deletions >= 0, 'Author has deletions count');
    assert(firstAuthor.percentage > 0, `Author percentage: ${firstAuthor.percentage}%`);
    assert(firstAuthor.firstCommit !== undefined, 'Author has firstCommit date');
    assert(firstAuthor.lastCommit !== undefined, 'Author has lastCommit date');

    // Get specific author
    const specificAuthor = await page.evaluate((n) => window.gitHistoryViz.getAuthor(n), firstAuthor.name);
    assert(specificAuthor !== null, 'Can retrieve specific author');
    assert(specificAuthor.name === firstAuthor.name, 'Retrieved correct author');

    // Switch to authors tab
    await page.evaluate(() => window.gitHistoryViz.setTab('authors'));
    await new Promise(r => setTimeout(r, 300));

    const authTabActive = await page.evaluate(() => {
      return document.querySelector('.gh-tab[data-tab="authors"]').classList.contains('active');
    });
    assert(authTabActive, 'Authors tab becomes active');

    const authorList = await page.evaluate(() => !!document.getElementById('gh-author-list'));
    assert(authorList, 'Author list rendered');

    const authorItems = await page.evaluate(() => document.querySelectorAll('.gh-author-item').length);
    assert(authorItems > 0, `${authorItems} author items rendered`);
    assert(authorItems === 4, 'All 4 author items rendered');

    const authorBars = await page.evaluate(() => document.querySelectorAll('.gh-author-bar-fill').length);
    assert(authorBars > 0, `${authorBars} author progress bars rendered`);

    // === Overall Stats ===
    console.log('\n=== Overall Stats ===');

    const overall = await page.evaluate(() => window.gitHistoryViz.getOverallStats());
    assert(overall.totalCommits === 30, `Total commits: ${overall.totalCommits}`);
    assert(overall.totalAuthors === 4, `Total authors: ${overall.totalAuthors}`);
    assert(overall.totalBranches === 7, `Total branches: ${overall.totalBranches}`);
    assert(overall.activeBranches > 0, `Active branches: ${overall.activeBranches}`);
    assert(overall.mergedBranches > 0, `Merged branches: ${overall.mergedBranches}`);
    assert(overall.totalAdditions > 0, `Total additions: ${overall.totalAdditions}`);
    assert(overall.totalDeletions > 0, `Total deletions: ${overall.totalDeletions}`);

    // === State Persistence ===
    console.log('\n=== State Persistence ===');

    const stateObj = await page.evaluate(() => window.gitHistoryViz.getState());
    assert(stateObj.activeTab !== undefined, 'State has activeTab');
    assert(stateObj.commitCount === 30, `State tracks ${stateObj.commitCount} commits`);
    assert(stateObj.branchCount === 7, `State tracks ${stateObj.branchCount} branches`);
    assert(stateObj.authorCount === 4, `State tracks ${stateObj.authorCount} authors`);

    const savedState = await page.evaluate(() => localStorage.getItem('git-history-config') !== null);
    assert(savedState, 'State persisted to localStorage');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n=======================================================');
  console.log('feat-077: Git History Visualization - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
