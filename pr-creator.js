// feat-076: PR Auto-Creation with Descriptions
(function () {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    #pr-creator-card {
      background: var(--color-card-bg, #1e1e2e);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .pr-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
    }
    .pr-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .pr-tabs {
      display: flex; gap: 4px; margin-bottom: 16px;
      background: var(--color-bg, #12121a); border-radius: 8px; padding: 3px;
    }
    .pr-tab {
      flex: 1; padding: 6px 12px; border: none; background: transparent;
      color: var(--color-text-secondary, #a0a0b0); cursor: pointer; border-radius: 6px; font-size: 13px; transition: all 0.2s;
    }
    .pr-tab.active { background: var(--color-primary, #6366f1); color: #fff; }
    .pr-tab:hover:not(.active) { background: rgba(255,255,255,0.05); }
    .pr-stats {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px;
    }
    .pr-stat {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 12px; text-align: center;
    }
    .pr-stat-val { font-size: 20px; font-weight: 700; color: var(--color-text, #e0e0e0); }
    .pr-stat-label { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }
    .pr-list { display: flex; flex-direction: column; gap: 10px; }
    .pr-item {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 14px;
    }
    .pr-item-top { display: flex; justify-content: space-between; align-items: flex-start; }
    .pr-item-title { font-size: 14px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .pr-item-meta { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }
    .pr-item-status { padding: 2px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .pr-item-status.open { background: rgba(34,197,94,0.12); color: #22c55e; }
    .pr-item-status.merged { background: rgba(99,102,241,0.12); color: #6366f1; }
    .pr-item-status.closed { background: rgba(239,68,68,0.12); color: #ef4444; }
    .pr-item-status.draft { background: rgba(245,158,11,0.12); color: #f59e0b; }
    .pr-item-desc {
      font-size: 13px; color: var(--color-text-secondary, #a0a0b0);
      margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.04);
      line-height: 1.5; max-height: 80px; overflow: hidden;
    }
    .pr-reviewers { display: flex; gap: 4px; margin-top: 8px; flex-wrap: wrap; }
    .pr-reviewer {
      display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px;
      background: rgba(99,102,241,0.12); color: #6366f1;
    }
    .pr-reviewer.approved { background: rgba(34,197,94,0.12); color: #22c55e; }
    .pr-reviewer.pending { background: rgba(245,158,11,0.12); color: #f59e0b; }
    .pr-form {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 16px;
    }
    .pr-form-row { display: flex; gap: 10px; margin-bottom: 10px; align-items: center; }
    .pr-form-label { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); min-width: 80px; }
    .pr-form-input, .pr-form-select, .pr-form-textarea {
      flex: 1; background: var(--color-card-bg, #1e1e2e); border: 1px solid var(--color-border, #2e2e3e);
      color: var(--color-text, #e0e0e0); border-radius: 6px; padding: 6px 10px; font-size: 13px; font-family: inherit;
    }
    .pr-form-textarea { resize: vertical; min-height: 80px; }
    .pr-create-btn {
      padding: 8px 20px; background: #22c55e; color: #fff; border: none;
      border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; margin-top: 8px;
    }
    .pr-create-btn:hover { opacity: 0.9; }
    .pr-template-list { display: flex; flex-direction: column; gap: 8px; }
    .pr-template-item {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 12px; cursor: pointer; transition: border-color 0.2s;
    }
    .pr-template-item:hover { border-color: var(--color-primary, #6366f1); }
    .pr-template-name { font-size: 13px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .pr-template-preview { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }
  `;
  document.head.appendChild(style);

  const STORAGE_KEY = 'pr-creator-config';
  let state = { activeTab: 'prs', pullRequests: [], reviewers: [] };

  const AVAILABLE_REVIEWERS = [
    { id: 'rev-1', name: 'Alice Chen', role: 'lead' },
    { id: 'rev-2', name: 'Bob Smith', role: 'senior' },
    { id: 'rev-3', name: 'Carol Davis', role: 'senior' },
    { id: 'rev-4', name: 'Dan Wilson', role: 'mid' },
    { id: 'rev-5', name: 'Eve Johnson', role: 'mid' },
  ];

  const PR_TEMPLATES = [
    { id: 'tpl-feature', name: 'Feature PR', sections: ['Summary', 'Changes', 'Test Plan', 'Screenshots'] },
    { id: 'tpl-bugfix', name: 'Bug Fix PR', sections: ['Problem', 'Root Cause', 'Fix', 'Test Plan'] },
    { id: 'tpl-refactor', name: 'Refactor PR', sections: ['Motivation', 'Changes', 'Risk Assessment'] },
  ];

  function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash = hash & hash; }
    return Math.abs(hash);
  }

  function generatePRs() {
    const prs = [];
    const statuses = ['open', 'merged', 'open', 'merged', 'merged', 'draft', 'closed', 'open'];
    for (let i = 0; i < 8; i++) {
      const fid = 'feat-' + String(i + 50).padStart(3, '0');
      const seed = hashCode(fid);
      const reviewerCount = 1 + (seed % 3);
      const reviewerList = AVAILABLE_REVIEWERS.slice(0, reviewerCount).map(r => ({
        ...r,
        status: statuses[i] === 'merged' ? 'approved' : (seed % 2 === 0 ? 'approved' : 'pending'),
      }));
      prs.push({
        id: 'pr-' + (100 + i),
        number: 100 + i,
        title: `feat(${fid}): Implement ${fid}`,
        featureId: fid,
        branch: `feature/${fid}`,
        baseBranch: 'main',
        status: statuses[i],
        description: generateDescription(fid, statuses[i]),
        reviewers: reviewerList,
        createdAt: new Date(Date.now() - (8 - i) * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - (8 - i) * 43200000).toISOString(),
        mergedAt: statuses[i] === 'merged' ? new Date(Date.now() - (8 - i) * 21600000).toISOString() : null,
        additions: 50 + (seed % 300),
        deletions: 5 + (seed % 50),
        filesChanged: 2 + (seed % 8),
        autoGenerated: true,
      });
    }
    return prs;
  }

  function generateDescription(featureId, status) {
    return `## Summary\nImplement ${featureId} feature with all acceptance criteria.\n\n## Changes\n- Added new widget component\n- Integrated with dashboard layout\n- Added comprehensive test suite\n\n## Test Plan\n- [ ] Unit tests pass\n- [ ] Integration tests pass\n- [ ] Manual verification complete`;
  }

  function generateDescriptionFromPRD(featureId, prdContent) {
    const prd = prdContent || '';
    let desc = `## Summary\nImplementation of ${featureId}`;
    if (prd) desc += `\n\nBased on PRD:\n${prd.substring(0, 200)}${prd.length > 200 ? '...' : ''}`;
    desc += `\n\n## Changes\n- Core implementation for ${featureId}\n- UI components and styling\n- Test coverage\n\n## Test Plan\n- Automated Puppeteer tests\n- Manual review of acceptance criteria\n\n## Acceptance Criteria\nAll criteria verified and passing.`;
    return desc;
  }

  // ── Core functions ───────────────────────────────────────────
  function getPullRequests() {
    if (state.pullRequests.length === 0) state.pullRequests = generatePRs();
    return state.pullRequests;
  }

  function getPullRequest(id) {
    return getPullRequests().find(pr => pr.id === id) || null;
  }

  function createPR(options) {
    const opts = options || {};
    const featureId = opts.featureId || 'feat-unknown';
    const pr = {
      id: 'pr-' + Date.now(),
      number: 200 + state.pullRequests.length,
      title: opts.title || `feat(${featureId}): Implement ${featureId}`,
      featureId,
      branch: opts.branch || `feature/${featureId}`,
      baseBranch: opts.baseBranch || 'main',
      status: opts.draft ? 'draft' : 'open',
      description: opts.description || generateDescriptionFromPRD(featureId, opts.prdContent),
      reviewers: (opts.reviewerIds || []).map(rid => {
        const r = AVAILABLE_REVIEWERS.find(rev => rev.id === rid);
        return r ? { ...r, status: 'pending' } : null;
      }).filter(Boolean),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mergedAt: null,
      additions: opts.additions || 0,
      deletions: opts.deletions || 0,
      filesChanged: opts.filesChanged || 0,
      autoGenerated: true,
    };
    state.pullRequests.unshift(pr);
    saveState();
    render();
    return pr;
  }

  function createPROnComplete(featureId, prdContent) {
    return createPR({
      featureId,
      description: generateDescriptionFromPRD(featureId, prdContent),
      reviewerIds: ['rev-1', 'rev-2'],
    });
  }

  function addReviewer(prId, reviewerId) {
    const pr = getPullRequest(prId);
    if (!pr) return false;
    const reviewer = AVAILABLE_REVIEWERS.find(r => r.id === reviewerId);
    if (!reviewer) return false;
    if (pr.reviewers.some(r => r.id === reviewerId)) return false;
    pr.reviewers.push({ ...reviewer, status: 'pending' });
    saveState();
    render();
    return true;
  }

  function removeReviewer(prId, reviewerId) {
    const pr = getPullRequest(prId);
    if (!pr) return false;
    const idx = pr.reviewers.findIndex(r => r.id === reviewerId);
    if (idx === -1) return false;
    pr.reviewers.splice(idx, 1);
    saveState();
    render();
    return true;
  }

  function getAvailableReviewers() {
    return AVAILABLE_REVIEWERS;
  }

  function getTemplates() {
    return PR_TEMPLATES;
  }

  function getStats() {
    const prs = getPullRequests();
    return {
      total: prs.length,
      open: prs.filter(p => p.status === 'open').length,
      merged: prs.filter(p => p.status === 'merged').length,
      draft: prs.filter(p => p.status === 'draft').length,
      closed: prs.filter(p => p.status === 'closed').length,
    };
  }

  // ── Render ───────────────────────────────────────────────────
  function render() {
    const container = document.getElementById('pr-creator-widget');
    if (!container) return;
    const stats = getStats();

    container.innerHTML = `
      <div id="pr-creator-card">
        <div class="pr-header"><h3>PR Auto-Creation</h3></div>
        <div class="pr-stats" id="pr-stats">
          <div class="pr-stat"><div class="pr-stat-val">${stats.total}</div><div class="pr-stat-label">Total PRs</div></div>
          <div class="pr-stat"><div class="pr-stat-val" style="color:#22c55e">${stats.open}</div><div class="pr-stat-label">Open</div></div>
          <div class="pr-stat"><div class="pr-stat-val" style="color:#6366f1">${stats.merged}</div><div class="pr-stat-label">Merged</div></div>
          <div class="pr-stat"><div class="pr-stat-val" style="color:#f59e0b">${stats.draft}</div><div class="pr-stat-label">Draft</div></div>
        </div>
        <div class="pr-tabs" id="pr-tabs">
          <button class="pr-tab ${state.activeTab === 'prs' ? 'active' : ''}" data-tab="prs">Pull Requests</button>
          <button class="pr-tab ${state.activeTab === 'create' ? 'active' : ''}" data-tab="create">Create PR</button>
          <button class="pr-tab ${state.activeTab === 'templates' ? 'active' : ''}" data-tab="templates">Templates</button>
        </div>
        <div id="pr-content"></div>
      </div>
    `;

    container.querySelectorAll('.pr-tab').forEach(btn => {
      btn.addEventListener('click', () => { state.activeTab = btn.dataset.tab; saveState(); render(); });
    });
    renderContent();
  }

  function renderContent() {
    const el = document.getElementById('pr-content');
    if (!el) return;
    if (state.activeTab === 'prs') renderPRList(el);
    else if (state.activeTab === 'create') renderCreateForm(el);
    else renderTemplates(el);
  }

  function renderPRList(el) {
    const prs = getPullRequests();
    el.innerHTML = `
      <div class="pr-list" id="pr-list">
        ${prs.map(pr => `
          <div class="pr-item" data-pr="${pr.id}">
            <div class="pr-item-top">
              <div>
                <div class="pr-item-title">#${pr.number} ${pr.title}</div>
                <div class="pr-item-meta">${pr.branch} → ${pr.baseBranch} &middot; +${pr.additions}/-${pr.deletions} &middot; ${pr.filesChanged} files</div>
              </div>
              <span class="pr-item-status ${pr.status}">${pr.status}</span>
            </div>
            <div class="pr-item-desc">${pr.description.substring(0, 150)}...</div>
            <div class="pr-reviewers">
              ${pr.reviewers.map(r => `<span class="pr-reviewer ${r.status}">${r.name} (${r.status})</span>`).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderCreateForm(el) {
    el.innerHTML = `
      <div class="pr-form" id="pr-form">
        <div class="pr-form-row">
          <span class="pr-form-label">Feature ID</span>
          <input class="pr-form-input" id="pr-feat-id" placeholder="e.g. feat-076" value="">
        </div>
        <div class="pr-form-row">
          <span class="pr-form-label">Title</span>
          <input class="pr-form-input" id="pr-title" placeholder="PR title (auto-generated if empty)" value="">
        </div>
        <div class="pr-form-row">
          <span class="pr-form-label">Description</span>
          <textarea class="pr-form-textarea" id="pr-desc" placeholder="PR description (auto-generated from PRD)"></textarea>
        </div>
        <div class="pr-form-row">
          <span class="pr-form-label">Reviewers</span>
          <select class="pr-form-select" id="pr-reviewer-select">
            <option value="">Add reviewer...</option>
            ${AVAILABLE_REVIEWERS.map(r => `<option value="${r.id}">${r.name} (${r.role})</option>`).join('')}
          </select>
        </div>
        <button class="pr-create-btn" id="pr-create-btn">Create Pull Request</button>
      </div>
    `;

    document.getElementById('pr-create-btn').addEventListener('click', () => {
      const featureId = document.getElementById('pr-feat-id').value || 'feat-new';
      const title = document.getElementById('pr-title').value;
      const desc = document.getElementById('pr-desc').value;
      const revSelect = document.getElementById('pr-reviewer-select');
      const reviewerIds = revSelect.value ? [revSelect.value] : [];
      createPR({ featureId, title: title || undefined, description: desc || undefined, reviewerIds });
    });
  }

  function renderTemplates(el) {
    el.innerHTML = `
      <div class="pr-template-list" id="pr-template-list">
        ${PR_TEMPLATES.map(t => `
          <div class="pr-template-item" data-template="${t.id}">
            <div class="pr-template-name">${t.name}</div>
            <div class="pr-template-preview">Sections: ${t.sections.join(', ')}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeTab: state.activeTab })); } catch (e) {}
  }
  function loadState() {
    try { const s = localStorage.getItem(STORAGE_KEY); if (s) { const p = JSON.parse(s); state.activeTab = p.activeTab || state.activeTab; } } catch (e) {}
  }

  window.prCreator = {
    getPullRequests, getPullRequest, createPR, createPROnComplete,
    addReviewer, removeReviewer, getAvailableReviewers, getTemplates,
    generateDescriptionFromPRD, getStats,
    setTab(tab) { state.activeTab = tab; saveState(); render(); },
    getState() { return { activeTab: state.activeTab, prCount: getPullRequests().length }; },
  };

  document.addEventListener('DOMContentLoaded', () => { loadState(); render(); });
})();
