// feat-073: Visual Regression Testing Integration
(function () {
  'use strict';

  // ── CSS ──────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #visual-regression-card {
      background: var(--color-card-bg, #1e1e2e);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .vr-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .vr-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--color-text, #e0e0e0);
    }
    .vr-header-actions {
      display: flex;
      gap: 8px;
    }
    .vr-btn {
      padding: 6px 14px;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    .vr-btn-primary {
      background: var(--color-primary, #6366f1);
      color: #fff;
    }
    .vr-btn-primary:hover { opacity: 0.9; }
    .vr-btn-success {
      background: #22c55e;
      color: #fff;
    }
    .vr-btn-danger {
      background: #ef4444;
      color: #fff;
    }
    .vr-btn-ghost {
      background: rgba(255,255,255,0.06);
      color: var(--color-text-secondary, #a0a0b0);
      border: 1px solid var(--color-border, #2e2e3e);
    }

    .vr-tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 16px;
      background: var(--color-bg, #12121a);
      border-radius: 8px;
      padding: 3px;
    }
    .vr-tab {
      flex: 1;
      padding: 6px 12px;
      border: none;
      background: transparent;
      color: var(--color-text-secondary, #a0a0b0);
      cursor: pointer;
      border-radius: 6px;
      font-size: 13px;
      transition: all 0.2s;
    }
    .vr-tab.active {
      background: var(--color-primary, #6366f1);
      color: #fff;
    }
    .vr-tab:hover:not(.active) {
      background: rgba(255,255,255,0.05);
    }

    /* Stats */
    .vr-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }
    .vr-stat {
      background: var(--color-bg, #12121a);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px;
      padding: 12px;
      text-align: center;
    }
    .vr-stat-val {
      font-size: 20px;
      font-weight: 700;
      color: var(--color-text, #e0e0e0);
    }
    .vr-stat-label {
      font-size: 12px;
      color: var(--color-text-secondary, #a0a0b0);
      margin-top: 4px;
    }

    /* Screenshot list */
    .vr-screenshot-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .vr-screenshot-item {
      background: var(--color-bg, #12121a);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px;
      padding: 14px;
    }
    .vr-screenshot-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .vr-screenshot-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--color-text, #e0e0e0);
    }
    .vr-screenshot-meta {
      font-size: 12px;
      color: var(--color-text-secondary, #a0a0b0);
      margin-top: 2px;
    }
    .vr-screenshot-status {
      padding: 2px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .vr-screenshot-status.match { background: rgba(34,197,94,0.12); color: #22c55e; }
    .vr-screenshot-status.diff { background: rgba(239,68,68,0.12); color: #ef4444; }
    .vr-screenshot-status.new { background: rgba(99,102,241,0.12); color: #6366f1; }
    .vr-screenshot-status.approved { background: rgba(34,197,94,0.12); color: #22c55e; }
    .vr-screenshot-status.rejected { background: rgba(239,68,68,0.12); color: #ef4444; }
    .vr-screenshot-status.pending { background: rgba(245,158,11,0.12); color: #f59e0b; }

    /* Diff details */
    .vr-diff-detail {
      margin-top: 10px;
      padding: 10px;
      background: var(--color-card-bg, #1e1e2e);
      border-radius: 6px;
      border: 1px solid var(--color-border, #2e2e3e);
    }
    .vr-diff-bar {
      display: flex;
      gap: 2px;
      margin-bottom: 8px;
    }
    .vr-diff-pixel {
      flex: 1;
      height: 20px;
      border-radius: 2px;
    }
    .vr-diff-pixel.same { background: #22c55e; }
    .vr-diff-pixel.changed { background: #ef4444; }
    .vr-diff-info {
      font-size: 12px;
      color: var(--color-text-secondary, #a0a0b0);
    }
    .vr-diff-info strong { color: var(--color-text, #e0e0e0); }

    /* Approve actions */
    .vr-approve-actions {
      display: flex;
      gap: 6px;
      margin-top: 10px;
    }

    /* Highlights */
    .vr-highlight-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 12px;
    }
    .vr-highlight-card {
      background: var(--color-bg, #12121a);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px;
      padding: 14px;
    }
    .vr-highlight-region {
      font-size: 13px;
      font-weight: 600;
      color: var(--color-text, #e0e0e0);
      margin-bottom: 4px;
    }
    .vr-highlight-change {
      font-size: 12px;
      color: var(--color-text-secondary, #a0a0b0);
      line-height: 1.4;
    }
    .vr-highlight-severity {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      margin-top: 6px;
    }
    .vr-highlight-severity.major { background: rgba(239,68,68,0.15); color: #ef4444; }
    .vr-highlight-severity.minor { background: rgba(245,158,11,0.15); color: #f59e0b; }
    .vr-highlight-severity.cosmetic { background: rgba(34,197,94,0.15); color: #22c55e; }
  `;
  document.head.appendChild(style);

  // ── State ────────────────────────────────────────────────────
  const STORAGE_KEY = 'visual-regression-config';
  let state = {
    activeTab: 'screenshots',
    screenshots: [],
    pendingApprovals: [],
  };

  function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  // ── Data generation ──────────────────────────────────────────
  function generateScreenshots() {
    const pages = [
      { name: 'Dashboard Overview', path: '/dashboard', component: 'main' },
      { name: 'Feature List', path: '/features', component: 'feature-grid' },
      { name: 'Analytics Panel', path: '/analytics', component: 'analytics' },
      { name: 'Session Monitor', path: '/session', component: 'session-panel' },
      { name: 'Settings Page', path: '/settings', component: 'settings' },
      { name: 'Login Form', path: '/login', component: 'auth-form' },
      { name: 'Error View', path: '/error', component: 'error-page' },
      { name: 'Mobile Dashboard', path: '/dashboard-mobile', component: 'mobile-main' },
      { name: 'Sidebar Navigation', path: '/sidebar', component: 'nav-sidebar' },
      { name: 'Chart Widgets', path: '/charts', component: 'chart-grid' },
    ];

    return pages.map((p, i) => {
      const seed = hashCode(p.name);
      const hasDiff = (seed % 3) === 0;
      const isNew = i === pages.length - 1;
      const diffPercent = hasDiff ? (seed % 30) + 1 : 0;
      return {
        id: 'ss-' + String(i + 1).padStart(3, '0'),
        name: p.name,
        path: p.path,
        component: p.component,
        baselineWidth: 1280,
        baselineHeight: 900,
        currentWidth: 1280,
        currentHeight: 900,
        status: isNew ? 'new' : hasDiff ? 'diff' : 'match',
        diffPercent,
        pixelsDiff: hasDiff ? Math.round(1280 * 900 * diffPercent / 100) : 0,
        totalPixels: 1280 * 900,
        capturedAt: new Date(Date.now() - i * 600000).toISOString(),
        approvalStatus: isNew ? 'pending' : hasDiff ? 'pending' : 'approved',
        diffRegions: hasDiff ? generateDiffRegions(seed) : [],
      };
    });
  }

  function generateDiffRegions(seed) {
    const regions = [];
    const count = 1 + (seed % 4);
    const regionNames = ['Header area', 'Content section', 'Footer bar', 'Sidebar panel', 'Button group', 'Text block'];
    const severities = ['major', 'minor', 'cosmetic'];
    for (let i = 0; i < count; i++) {
      regions.push({
        id: 'region-' + (seed + i),
        name: regionNames[i % regionNames.length],
        x: 50 + (seed + i * 100) % 800,
        y: 50 + (seed + i * 80) % 600,
        width: 100 + (seed + i) % 200,
        height: 50 + (seed + i) % 150,
        severity: severities[(seed + i) % severities.length],
        description: `${severities[(seed + i) % severities.length]} change detected in ${regionNames[i % regionNames.length].toLowerCase()}`,
      });
    }
    return regions;
  }

  // ── Core data functions ──────────────────────────────────────
  function getScreenshots() {
    if (state.screenshots.length === 0) {
      state.screenshots = generateScreenshots();
    }
    return state.screenshots;
  }

  function getScreenshot(id) {
    return getScreenshots().find(s => s.id === id) || null;
  }

  function compareScreenshots(id) {
    const ss = getScreenshot(id);
    if (!ss) return null;
    return {
      screenshotId: ss.id,
      name: ss.name,
      status: ss.status,
      diffPercent: ss.diffPercent,
      pixelsDiff: ss.pixelsDiff,
      totalPixels: ss.totalPixels,
      matchPercent: 100 - ss.diffPercent,
      regions: ss.diffRegions,
      baseline: { width: ss.baselineWidth, height: ss.baselineHeight },
      current: { width: ss.currentWidth, height: ss.currentHeight },
    };
  }

  function getDiffHighlights(id) {
    const ss = getScreenshot(id);
    if (!ss) return [];
    return ss.diffRegions;
  }

  function approveChange(id) {
    const ss = getScreenshots().find(s => s.id === id);
    if (!ss) return false;
    ss.approvalStatus = 'approved';
    ss.status = 'match';
    ss.diffPercent = 0;
    ss.pixelsDiff = 0;
    ss.diffRegions = [];
    saveState();
    render();
    return true;
  }

  function rejectChange(id) {
    const ss = getScreenshots().find(s => s.id === id);
    if (!ss) return false;
    ss.approvalStatus = 'rejected';
    saveState();
    render();
    return true;
  }

  function getPendingApprovals() {
    return getScreenshots().filter(s => s.approvalStatus === 'pending');
  }

  function approveAll() {
    const pending = getPendingApprovals();
    pending.forEach(s => {
      s.approvalStatus = 'approved';
      s.status = 'match';
      s.diffPercent = 0;
      s.pixelsDiff = 0;
      s.diffRegions = [];
    });
    saveState();
    render();
    return pending.length;
  }

  function getOverviewStats() {
    const screenshots = getScreenshots();
    return {
      total: screenshots.length,
      matching: screenshots.filter(s => s.status === 'match').length,
      diffs: screenshots.filter(s => s.status === 'diff').length,
      newScreenshots: screenshots.filter(s => s.status === 'new').length,
      pendingApprovals: screenshots.filter(s => s.approvalStatus === 'pending').length,
      approved: screenshots.filter(s => s.approvalStatus === 'approved').length,
      rejected: screenshots.filter(s => s.approvalStatus === 'rejected').length,
    };
  }

  // ── Render ───────────────────────────────────────────────────
  function render() {
    const container = document.getElementById('visual-regression-widget');
    if (!container) return;

    const stats = getOverviewStats();

    container.innerHTML = `
      <div id="visual-regression-card">
        <div class="vr-header">
          <h3>Visual Regression Testing</h3>
          <div class="vr-header-actions">
            ${stats.pendingApprovals > 0 ? `<button class="vr-btn vr-btn-success" id="vr-approve-all">Approve All (${stats.pendingApprovals})</button>` : ''}
            <button class="vr-btn vr-btn-primary" id="vr-capture-btn">Capture</button>
          </div>
        </div>
        <div class="vr-stats" id="vr-stats">
          <div class="vr-stat"><div class="vr-stat-val">${stats.total}</div><div class="vr-stat-label">Screenshots</div></div>
          <div class="vr-stat"><div class="vr-stat-val" style="color:#22c55e">${stats.matching}</div><div class="vr-stat-label">Matching</div></div>
          <div class="vr-stat"><div class="vr-stat-val" style="color:#ef4444">${stats.diffs}</div><div class="vr-stat-label">Differences</div></div>
          <div class="vr-stat"><div class="vr-stat-val" style="color:#f59e0b">${stats.pendingApprovals}</div><div class="vr-stat-label">Pending</div></div>
        </div>
        <div class="vr-tabs" id="vr-tabs">
          <button class="vr-tab ${state.activeTab === 'screenshots' ? 'active' : ''}" data-tab="screenshots">Screenshots</button>
          <button class="vr-tab ${state.activeTab === 'highlights' ? 'active' : ''}" data-tab="highlights">Highlights</button>
          <button class="vr-tab ${state.activeTab === 'approvals' ? 'active' : ''}" data-tab="approvals">Approvals</button>
        </div>
        <div id="vr-content"></div>
      </div>
    `;

    container.querySelectorAll('.vr-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        state.activeTab = btn.dataset.tab;
        saveState();
        render();
      });
    });

    const approveAllBtn = document.getElementById('vr-approve-all');
    if (approveAllBtn) approveAllBtn.addEventListener('click', () => approveAll());

    renderContent();
  }

  function renderContent() {
    const el = document.getElementById('vr-content');
    if (!el) return;
    switch (state.activeTab) {
      case 'screenshots': renderScreenshots(el); break;
      case 'highlights': renderHighlights(el); break;
      case 'approvals': renderApprovals(el); break;
    }
  }

  function renderScreenshots(el) {
    const screenshots = getScreenshots();
    el.innerHTML = `
      <div class="vr-screenshot-list" id="vr-screenshot-list">
        ${screenshots.map(s => `
          <div class="vr-screenshot-item" data-id="${s.id}">
            <div class="vr-screenshot-top">
              <div>
                <div class="vr-screenshot-name">${s.name}</div>
                <div class="vr-screenshot-meta">${s.path} &middot; ${s.baselineWidth}x${s.baselineHeight} &middot; ${new Date(s.capturedAt).toLocaleString()}</div>
              </div>
              <span class="vr-screenshot-status ${s.status}">${s.status === 'diff' ? s.diffPercent + '% diff' : s.status}</span>
            </div>
            ${s.status === 'diff' ? `
              <div class="vr-diff-detail">
                <div class="vr-diff-bar">
                  ${Array.from({length: 20}, (_, i) => `<div class="vr-diff-pixel ${i < Math.ceil(s.diffPercent / 5) ? 'changed' : 'same'}"></div>`).join('')}
                </div>
                <div class="vr-diff-info">
                  <strong>${s.pixelsDiff.toLocaleString()}</strong> pixels changed of ${s.totalPixels.toLocaleString()} &middot;
                  ${s.diffRegions.length} region(s) affected
                </div>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderHighlights(el) {
    const screenshots = getScreenshots().filter(s => s.diffRegions.length > 0);
    if (screenshots.length === 0) {
      el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--color-text-secondary,#a0a0b0);font-size:13px;">No differences to highlight.</div>';
      return;
    }

    const allRegions = [];
    screenshots.forEach(s => {
      s.diffRegions.forEach(r => {
        allRegions.push({ ...r, screenshotName: s.name, screenshotId: s.id });
      });
    });

    el.innerHTML = `
      <div class="vr-highlight-grid" id="vr-highlight-grid">
        ${allRegions.map(r => `
          <div class="vr-highlight-card" data-region="${r.id}">
            <div class="vr-highlight-region">${r.name}</div>
            <div class="vr-highlight-change">${r.description}</div>
            <div style="font-size:11px;color:var(--color-text-secondary,#a0a0b0);margin-top:4px;">
              in ${r.screenshotName} &middot; ${r.width}x${r.height}px at (${r.x},${r.y})
            </div>
            <span class="vr-highlight-severity ${r.severity}">${r.severity}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderApprovals(el) {
    const pending = getPendingApprovals();
    const approved = getScreenshots().filter(s => s.approvalStatus === 'approved');
    const rejected = getScreenshots().filter(s => s.approvalStatus === 'rejected');

    el.innerHTML = `
      <div class="vr-screenshot-list" id="vr-approval-list">
        ${pending.length === 0 && rejected.length === 0 ? '<div style="text-align:center;padding:20px;color:var(--color-text-secondary,#a0a0b0);font-size:13px;">All changes approved.</div>' : ''}
        ${pending.map(s => `
          <div class="vr-screenshot-item" data-id="${s.id}">
            <div class="vr-screenshot-top">
              <div>
                <div class="vr-screenshot-name">${s.name}</div>
                <div class="vr-screenshot-meta">${s.status === 'new' ? 'New screenshot' : s.diffPercent + '% difference'} &middot; ${s.path}</div>
              </div>
              <span class="vr-screenshot-status pending">Pending</span>
            </div>
            <div class="vr-approve-actions">
              <button class="vr-btn vr-btn-success vr-approve-btn" data-id="${s.id}">Approve</button>
              <button class="vr-btn vr-btn-danger vr-reject-btn" data-id="${s.id}">Reject</button>
            </div>
          </div>
        `).join('')}
        ${rejected.map(s => `
          <div class="vr-screenshot-item" data-id="${s.id}">
            <div class="vr-screenshot-top">
              <div>
                <div class="vr-screenshot-name">${s.name}</div>
                <div class="vr-screenshot-meta">Rejected &middot; ${s.path}</div>
              </div>
              <span class="vr-screenshot-status rejected">Rejected</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    el.querySelectorAll('.vr-approve-btn').forEach(btn => {
      btn.addEventListener('click', () => approveChange(btn.dataset.id));
    });
    el.querySelectorAll('.vr-reject-btn').forEach(btn => {
      btn.addEventListener('click', () => rejectChange(btn.dataset.id));
    });
  }

  // ── Persistence ──────────────────────────────────────────────
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeTab: state.activeTab }));
    } catch (e) { /* ignore */ }
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        state.activeTab = parsed.activeTab || state.activeTab;
      }
    } catch (e) { /* ignore */ }
  }

  // ── Public API ───────────────────────────────────────────────
  window.visualRegression = {
    getScreenshots,
    getScreenshot,
    compareScreenshots,
    getDiffHighlights,
    approveChange,
    rejectChange,
    getPendingApprovals,
    approveAll,
    getOverviewStats,
    setTab(tab) {
      state.activeTab = tab;
      saveState();
      render();
    },
    getState() {
      return {
        activeTab: state.activeTab,
        screenshotCount: getScreenshots().length,
        pendingCount: getPendingApprovals().length,
      };
    },
  };

  // ── Init ─────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    loadState();
    render();
  });
})();
