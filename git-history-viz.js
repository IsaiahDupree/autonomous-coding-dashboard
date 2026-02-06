// feat-077: Git History Visualization
(function () {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    #git-history-card {
      background: var(--color-card-bg, #1e1e2e);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .gh-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
    }
    .gh-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .gh-tabs {
      display: flex; gap: 4px; margin-bottom: 16px;
      background: var(--color-bg, #12121a); border-radius: 8px; padding: 3px;
    }
    .gh-tab {
      flex: 1; padding: 6px 12px; border: none; background: transparent;
      color: var(--color-text-secondary, #a0a0b0); cursor: pointer; border-radius: 6px; font-size: 13px; transition: all 0.2s;
    }
    .gh-tab.active { background: var(--color-primary, #6366f1); color: #fff; }
    .gh-tab:hover:not(.active) { background: rgba(255,255,255,0.05); }

    /* Timeline */
    .gh-timeline { position: relative; padding-left: 24px; }
    .gh-timeline::before {
      content: ''; position: absolute; left: 8px; top: 0; bottom: 0; width: 2px;
      background: var(--color-border, #2e2e3e);
    }
    .gh-commit {
      position: relative; margin-bottom: 12px;
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 12px 14px;
    }
    .gh-commit::before {
      content: ''; position: absolute; left: -20px; top: 16px; width: 10px; height: 10px;
      border-radius: 50%; background: var(--color-primary, #6366f1); border: 2px solid var(--color-card-bg, #1e1e2e);
    }
    .gh-commit.merge::before { background: #22c55e; }
    .gh-commit-hash {
      font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #6366f1;
    }
    .gh-commit-msg { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); margin-top: 2px; }
    .gh-commit-meta { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }

    /* Branch graph */
    .gh-graph-container {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 16px; overflow-x: auto;
    }
    .gh-branch-row { display: flex; align-items: center; margin-bottom: 8px; gap: 8px; }
    .gh-branch-line {
      display: flex; align-items: center; height: 24px; gap: 2px;
    }
    .gh-branch-dot {
      width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
    }
    .gh-branch-segment { height: 2px; width: 20px; flex-shrink: 0; }
    .gh-branch-label {
      font-family: 'JetBrains Mono', monospace; font-size: 12px;
      padding: 2px 8px; border-radius: 4px; white-space: nowrap;
    }
    .gh-branch-info { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-left: 8px; }

    /* Author stats */
    .gh-author-list { display: flex; flex-direction: column; gap: 10px; }
    .gh-author-item {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 14px;
    }
    .gh-author-top { display: flex; justify-content: space-between; align-items: center; }
    .gh-author-name { font-size: 14px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .gh-author-commits {
      font-size: 16px; font-weight: 700; color: #6366f1;
    }
    .gh-author-bar-track { height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; margin-top: 8px; }
    .gh-author-bar-fill { height: 6px; border-radius: 3px; transition: width 0.3s; }
    .gh-author-meta { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 6px; }
    .gh-stats-row {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px;
    }
    .gh-stat-card {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 12px; text-align: center;
    }
    .gh-stat-val { font-size: 20px; font-weight: 700; color: var(--color-text, #e0e0e0); }
    .gh-stat-label { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }
  `;
  document.head.appendChild(style);

  const STORAGE_KEY = 'git-history-config';
  let state = { activeTab: 'timeline', commits: [], branches: [], authors: [] };

  function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash = hash & hash; }
    return Math.abs(hash);
  }

  function generateCommits() {
    const authors = ['Claude Agent', 'Alice Chen', 'Bob Smith', 'System Bot'];
    const types = ['feat', 'fix', 'refactor', 'test', 'docs', 'chore'];
    const commits = [];
    const now = Date.now();
    for (let i = 0; i < 30; i++) {
      const seed = hashCode('commit-' + i);
      const type = types[seed % types.length];
      const featNum = 40 + (i % 40);
      const fid = 'feat-' + String(featNum).padStart(3, '0');
      const isMerge = i % 7 === 0;
      commits.push({
        id: 'c-' + String(seed).substring(0, 7),
        hash: String(seed).substring(0, 7) + String(hashCode('h' + i)).substring(0, 5),
        message: isMerge ? `Merge branch 'feature/${fid}' into main` : `${type}: Implement ${fid}`,
        author: authors[seed % authors.length],
        timestamp: new Date(now - i * 7200000).toISOString(),
        branch: isMerge ? 'main' : `feature/${fid}`,
        type: isMerge ? 'merge' : type,
        additions: 10 + (seed % 300),
        deletions: 2 + (seed % 50),
        filesChanged: 1 + (seed % 10),
        featureId: fid,
      });
    }
    return commits;
  }

  function generateBranchGraph() {
    const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6'];
    const branches = [
      { name: 'main', color: colors[0], commits: 30, status: 'active', headCommit: 'c-main' },
    ];
    for (let i = 1; i <= 6; i++) {
      const fid = 'feat-' + String(70 + i).padStart(3, '0');
      branches.push({
        name: `feature/${fid}`,
        color: colors[i % colors.length],
        commits: 3 + (hashCode(fid) % 10),
        status: i <= 3 ? 'merged' : i === 4 ? 'active' : 'stale',
        headCommit: 'c-' + fid,
        featureId: fid,
        mergedInto: i <= 3 ? 'main' : null,
      });
    }
    return branches;
  }

  function generateAuthorStats() {
    const authors = [
      { name: 'Claude Agent', email: 'claude@anthropic.com', commits: 45, additions: 12500, deletions: 2300, firstCommit: '2025-12-01', lastCommit: '2026-02-06' },
      { name: 'Alice Chen', email: 'alice@example.com', commits: 22, additions: 5400, deletions: 1200, firstCommit: '2025-11-15', lastCommit: '2026-02-04' },
      { name: 'Bob Smith', email: 'bob@example.com', commits: 15, additions: 3200, deletions: 800, firstCommit: '2025-12-10', lastCommit: '2026-01-28' },
      { name: 'System Bot', email: 'bot@system.com', commits: 8, additions: 400, deletions: 50, firstCommit: '2026-01-01', lastCommit: '2026-02-05' },
    ];
    const maxCommits = Math.max(...authors.map(a => a.commits));
    return authors.map(a => ({ ...a, percentage: Math.round(a.commits / maxCommits * 100) }));
  }

  // ── Core functions ───────────────────────────────────────────
  function getCommits() {
    if (state.commits.length === 0) state.commits = generateCommits();
    return state.commits;
  }

  function getCommit(id) {
    return getCommits().find(c => c.id === id) || null;
  }

  function getCommitTimeline(limit) {
    const commits = getCommits();
    return (limit ? commits.slice(0, limit) : commits).map(c => ({
      id: c.id, hash: c.hash, message: c.message, author: c.author,
      timestamp: c.timestamp, type: c.type, branch: c.branch,
    }));
  }

  function getBranchGraph() {
    if (state.branches.length === 0) state.branches = generateBranchGraph();
    return state.branches;
  }

  function getBranch(name) {
    return getBranchGraph().find(b => b.name === name) || null;
  }

  function getAuthorStats() {
    if (state.authors.length === 0) state.authors = generateAuthorStats();
    return state.authors;
  }

  function getAuthor(name) {
    return getAuthorStats().find(a => a.name === name) || null;
  }

  function getOverallStats() {
    const commits = getCommits();
    const authors = getAuthorStats();
    const branches = getBranchGraph();
    return {
      totalCommits: commits.length,
      totalAuthors: authors.length,
      totalBranches: branches.length,
      activeBranches: branches.filter(b => b.status === 'active').length,
      mergedBranches: branches.filter(b => b.status === 'merged').length,
      totalAdditions: authors.reduce((s, a) => s + a.additions, 0),
      totalDeletions: authors.reduce((s, a) => s + a.deletions, 0),
    };
  }

  // ── Render ───────────────────────────────────────────────────
  function render() {
    const container = document.getElementById('git-history-widget');
    if (!container) return;
    const stats = getOverallStats();

    container.innerHTML = `
      <div id="git-history-card">
        <div class="gh-header"><h3>Git History Visualization</h3></div>
        <div class="gh-stats-row" id="gh-stats">
          <div class="gh-stat-card"><div class="gh-stat-val">${stats.totalCommits}</div><div class="gh-stat-label">Commits</div></div>
          <div class="gh-stat-card"><div class="gh-stat-val">${stats.totalAuthors}</div><div class="gh-stat-label">Authors</div></div>
          <div class="gh-stat-card"><div class="gh-stat-val">${stats.totalBranches}</div><div class="gh-stat-label">Branches</div></div>
        </div>
        <div class="gh-tabs" id="gh-tabs">
          <button class="gh-tab ${state.activeTab === 'timeline' ? 'active' : ''}" data-tab="timeline">Timeline</button>
          <button class="gh-tab ${state.activeTab === 'graph' ? 'active' : ''}" data-tab="graph">Branch Graph</button>
          <button class="gh-tab ${state.activeTab === 'authors' ? 'active' : ''}" data-tab="authors">Authors</button>
        </div>
        <div id="gh-content"></div>
      </div>
    `;

    container.querySelectorAll('.gh-tab').forEach(btn => {
      btn.addEventListener('click', () => { state.activeTab = btn.dataset.tab; saveState(); render(); });
    });
    renderContent();
  }

  function renderContent() {
    const el = document.getElementById('gh-content');
    if (!el) return;
    if (state.activeTab === 'timeline') renderTimeline(el);
    else if (state.activeTab === 'graph') renderGraph(el);
    else renderAuthors(el);
  }

  function renderTimeline(el) {
    const commits = getCommitTimeline(20);
    el.innerHTML = `
      <div class="gh-timeline" id="gh-timeline">
        ${commits.map(c => `
          <div class="gh-commit ${c.type === 'merge' ? 'merge' : ''}" data-id="${c.id}">
            <span class="gh-commit-hash">${c.hash.substring(0, 7)}</span>
            <div class="gh-commit-msg">${escapeHtml(c.message)}</div>
            <div class="gh-commit-meta">${c.author} &middot; ${new Date(c.timestamp).toLocaleString()} &middot; ${c.branch}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderGraph(el) {
    const branches = getBranchGraph();
    el.innerHTML = `
      <div class="gh-graph-container" id="gh-branch-graph">
        ${branches.map(b => {
          const dotCount = Math.min(b.commits, 12);
          return `
            <div class="gh-branch-row" data-branch="${b.name}">
              <span class="gh-branch-label" style="background:${b.color}22;color:${b.color};border:1px solid ${b.color}44">${b.name}</span>
              <div class="gh-branch-line">
                ${Array.from({length: dotCount}, () => `
                  <div class="gh-branch-dot" style="background:${b.color}"></div>
                  <div class="gh-branch-segment" style="background:${b.color}"></div>
                `).join('')}
                <div class="gh-branch-dot" style="background:${b.color}"></div>
              </div>
              <span class="gh-branch-info">${b.commits} commits &middot; ${b.status}${b.mergedInto ? ' → ' + b.mergedInto : ''}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderAuthors(el) {
    const authors = getAuthorStats();
    el.innerHTML = `
      <div class="gh-author-list" id="gh-author-list">
        ${authors.map(a => `
          <div class="gh-author-item" data-author="${a.name}">
            <div class="gh-author-top">
              <div class="gh-author-name">${a.name}</div>
              <div class="gh-author-commits">${a.commits} commits</div>
            </div>
            <div class="gh-author-bar-track">
              <div class="gh-author-bar-fill" style="width:${a.percentage}%;background:#6366f1"></div>
            </div>
            <div class="gh-author-meta">
              +${a.additions.toLocaleString()} / -${a.deletions.toLocaleString()} &middot;
              ${a.email} &middot; Active: ${a.firstCommit} to ${a.lastCommit}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function escapeHtml(str) { return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeTab: state.activeTab })); } catch (e) {}
  }
  function loadState() {
    try { const s = localStorage.getItem(STORAGE_KEY); if (s) { state.activeTab = JSON.parse(s).activeTab || state.activeTab; } } catch (e) {}
  }

  window.gitHistoryViz = {
    getCommits, getCommit, getCommitTimeline, getBranchGraph, getBranch,
    getAuthorStats, getAuthor, getOverallStats,
    setTab(tab) { state.activeTab = tab; saveState(); render(); },
    getState() { return { activeTab: state.activeTab, commitCount: getCommits().length, branchCount: getBranchGraph().length, authorCount: getAuthorStats().length }; },
  };

  document.addEventListener('DOMContentLoaded', () => { loadState(); render(); });
})();
