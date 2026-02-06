// feat-075: Branch Management per Target
(function () {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    #branch-manager-card {
      background: var(--color-card-bg, #1e1e2e);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .bm-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
    }
    .bm-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .bm-tabs {
      display: flex; gap: 4px; margin-bottom: 16px;
      background: var(--color-bg, #12121a); border-radius: 8px; padding: 3px;
    }
    .bm-tab {
      flex: 1; padding: 6px 12px; border: none; background: transparent;
      color: var(--color-text-secondary, #a0a0b0); cursor: pointer; border-radius: 6px; font-size: 13px; transition: all 0.2s;
    }
    .bm-tab.active { background: var(--color-primary, #6366f1); color: #fff; }
    .bm-tab:hover:not(.active) { background: rgba(255,255,255,0.05); }
    .bm-stats {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px;
    }
    .bm-stat {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 12px; text-align: center;
    }
    .bm-stat-val { font-size: 20px; font-weight: 700; color: var(--color-text, #e0e0e0); }
    .bm-stat-label { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }
    .bm-branch-list { display: flex; flex-direction: column; gap: 8px; }
    .bm-branch-item {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 12px 14px;
    }
    .bm-branch-top { display: flex; justify-content: space-between; align-items: center; }
    .bm-branch-name {
      font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 600;
      color: var(--color-text, #e0e0e0);
    }
    .bm-branch-meta { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }
    .bm-branch-status { padding: 2px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .bm-branch-status.active { background: rgba(34,197,94,0.12); color: #22c55e; }
    .bm-branch-status.merged { background: rgba(99,102,241,0.12); color: #6366f1; }
    .bm-branch-status.conflict { background: rgba(239,68,68,0.12); color: #ef4444; }
    .bm-branch-status.stale { background: rgba(245,158,11,0.12); color: #f59e0b; }
    .bm-branch-status.deleted { background: rgba(255,255,255,0.06); color: var(--color-text-secondary, #a0a0b0); }
    .bm-branch-actions { display: flex; gap: 6px; margin-top: 8px; }
    .bm-btn {
      padding: 4px 10px; border: none; border-radius: 4px; font-size: 12px; cursor: pointer;
    }
    .bm-btn-merge { background: rgba(34,197,94,0.12); color: #22c55e; border: 1px solid rgba(34,197,94,0.2); }
    .bm-btn-delete { background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); }
    .bm-btn-resolve { background: rgba(245,158,11,0.12); color: #f59e0b; border: 1px solid rgba(245,158,11,0.2); }
    .bm-conflict-item {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 14px; margin-bottom: 8px;
    }
    .bm-conflict-file {
      font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 600;
      color: var(--color-text, #e0e0e0);
    }
    .bm-conflict-meta { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }
    .bm-conflict-type { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .bm-conflict-type.content { background: rgba(239,68,68,0.15); color: #ef4444; }
    .bm-conflict-type.rename { background: rgba(245,158,11,0.15); color: #f59e0b; }
    .bm-conflict-type.delete { background: rgba(99,102,241,0.15); color: #6366f1; }
    .bm-resolution {
      display: flex; gap: 6px; margin-top: 8px;
    }
    .bm-resolution-btn {
      padding: 4px 10px; background: rgba(255,255,255,0.06); border: 1px solid var(--color-border, #2e2e3e);
      color: var(--color-text-secondary, #a0a0b0); border-radius: 4px; font-size: 12px; cursor: pointer;
    }
    .bm-resolution-btn.selected { background: var(--color-primary, #6366f1); color: #fff; border-color: var(--color-primary, #6366f1); }
  `;
  document.head.appendChild(style);

  const STORAGE_KEY = 'branch-manager-config';
  let state = { activeTab: 'branches', branches: [], conflicts: [] };

  function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash = hash & hash; }
    return Math.abs(hash);
  }

  function generateBranches() {
    const branches = [];
    const statuses = ['active', 'active', 'merged', 'merged', 'merged', 'conflict', 'stale', 'active', 'merged', 'active'];
    for (let i = 1; i <= 10; i++) {
      const id = 'feat-' + String(i).padStart(3, '0');
      const seed = hashCode(id);
      branches.push({
        id: 'branch-' + i,
        name: `feature/${id}`,
        featureId: id,
        baseBranch: 'main',
        status: statuses[i - 1],
        createdAt: new Date(Date.now() - (11 - i) * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - (11 - i) * 43200000).toISOString(),
        commits: 3 + (seed % 12),
        ahead: statuses[i - 1] === 'merged' ? 0 : 2 + (seed % 8),
        behind: statuses[i - 1] === 'conflict' ? 3 + (seed % 5) : seed % 3,
        autoMerge: statuses[i - 1] !== 'conflict',
        mergedAt: statuses[i - 1] === 'merged' ? new Date(Date.now() - (11 - i) * 21600000).toISOString() : null,
      });
    }
    return branches;
  }

  function generateConflicts() {
    return [
      { id: 'conflict-1', branchId: 'branch-6', file: 'src/app.js', type: 'content', lines: [45, 67], description: 'Both branches modified the same function', resolution: null },
      { id: 'conflict-2', branchId: 'branch-6', file: 'src/styles.css', type: 'content', lines: [120, 135], description: 'Overlapping style rules for .dashboard-card', resolution: null },
      { id: 'conflict-3', branchId: 'branch-6', file: 'config.json', type: 'rename', lines: [], description: 'File renamed in both branches', resolution: null },
    ];
  }

  // ── Core functions ───────────────────────────────────────────
  function getBranches() {
    if (state.branches.length === 0) state.branches = generateBranches();
    return state.branches;
  }

  function getBranch(id) {
    return getBranches().find(b => b.id === id) || null;
  }

  function createBranch(featureId, baseBranch) {
    const branch = {
      id: 'branch-' + Date.now(),
      name: `feature/${featureId}`,
      featureId,
      baseBranch: baseBranch || 'main',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      commits: 0,
      ahead: 0,
      behind: 0,
      autoMerge: true,
      mergedAt: null,
    };
    state.branches.unshift(branch);
    saveState();
    render();
    return branch;
  }

  function mergeBranch(id) {
    const branch = state.branches.find(b => b.id === id);
    if (!branch || branch.status === 'merged' || branch.status === 'conflict') return false;
    branch.status = 'merged';
    branch.mergedAt = new Date().toISOString();
    branch.ahead = 0;
    saveState();
    render();
    return true;
  }

  function deleteBranch(id) {
    const idx = state.branches.findIndex(b => b.id === id);
    if (idx === -1) return false;
    state.branches.splice(idx, 1);
    state.conflicts = state.conflicts.filter(c => c.branchId !== id);
    saveState();
    render();
    return true;
  }

  function getConflicts(branchId) {
    if (state.conflicts.length === 0) state.conflicts = generateConflicts();
    if (branchId) return state.conflicts.filter(c => c.branchId === branchId);
    return state.conflicts;
  }

  function getConflict(id) {
    if (state.conflicts.length === 0) state.conflicts = generateConflicts();
    return state.conflicts.find(c => c.id === id) || null;
  }

  function resolveConflict(id, resolution) {
    const conflict = getConflict(id);
    if (!conflict) return false;
    conflict.resolution = resolution; // 'ours', 'theirs', 'manual'
    // Check if all conflicts for this branch are resolved
    const branchConflicts = state.conflicts.filter(c => c.branchId === conflict.branchId);
    const allResolved = branchConflicts.every(c => c.resolution !== null);
    if (allResolved) {
      const branch = state.branches.find(b => b.id === conflict.branchId);
      if (branch) branch.status = 'active';
    }
    saveState();
    render();
    return true;
  }

  function autoMergeCompleted() {
    const completed = state.branches.filter(b => b.status === 'active' && b.autoMerge);
    let mergedCount = 0;
    completed.forEach(b => {
      if (b.behind === 0 || b.status === 'active') {
        b.status = 'merged';
        b.mergedAt = new Date().toISOString();
        b.ahead = 0;
        mergedCount++;
      }
    });
    saveState();
    render();
    return mergedCount;
  }

  function getStats() {
    const branches = getBranches();
    return {
      total: branches.length,
      active: branches.filter(b => b.status === 'active').length,
      merged: branches.filter(b => b.status === 'merged').length,
      conflicts: branches.filter(b => b.status === 'conflict').length,
      stale: branches.filter(b => b.status === 'stale').length,
    };
  }

  // ── Render ───────────────────────────────────────────────────
  function render() {
    const container = document.getElementById('branch-manager-widget');
    if (!container) return;
    const stats = getStats();

    container.innerHTML = `
      <div id="branch-manager-card">
        <div class="bm-header">
          <h3>Branch Management</h3>
          <button class="bm-btn bm-btn-merge" id="bm-auto-merge" style="padding:6px 14px">Auto-Merge Completed</button>
        </div>
        <div class="bm-stats" id="bm-stats">
          <div class="bm-stat"><div class="bm-stat-val">${stats.total}</div><div class="bm-stat-label">Total</div></div>
          <div class="bm-stat"><div class="bm-stat-val" style="color:#22c55e">${stats.active}</div><div class="bm-stat-label">Active</div></div>
          <div class="bm-stat"><div class="bm-stat-val" style="color:#6366f1">${stats.merged}</div><div class="bm-stat-label">Merged</div></div>
          <div class="bm-stat"><div class="bm-stat-val" style="color:#ef4444">${stats.conflicts}</div><div class="bm-stat-label">Conflicts</div></div>
        </div>
        <div class="bm-tabs" id="bm-tabs">
          <button class="bm-tab ${state.activeTab === 'branches' ? 'active' : ''}" data-tab="branches">Branches</button>
          <button class="bm-tab ${state.activeTab === 'conflicts' ? 'active' : ''}" data-tab="conflicts">Conflicts</button>
        </div>
        <div id="bm-content"></div>
      </div>
    `;

    document.getElementById('bm-auto-merge').addEventListener('click', () => autoMergeCompleted());
    container.querySelectorAll('.bm-tab').forEach(btn => {
      btn.addEventListener('click', () => { state.activeTab = btn.dataset.tab; saveState(); render(); });
    });
    renderContent();
  }

  function renderContent() {
    const el = document.getElementById('bm-content');
    if (!el) return;
    if (state.activeTab === 'branches') renderBranches(el);
    else renderConflicts(el);
  }

  function renderBranches(el) {
    const branches = getBranches();
    el.innerHTML = `
      <div class="bm-branch-list" id="bm-branch-list">
        ${branches.map(b => `
          <div class="bm-branch-item" data-branch="${b.id}">
            <div class="bm-branch-top">
              <div>
                <div class="bm-branch-name">${b.name}</div>
                <div class="bm-branch-meta">${b.featureId} &middot; ${b.commits} commits &middot; +${b.ahead}/-${b.behind} &middot; base: ${b.baseBranch}</div>
              </div>
              <span class="bm-branch-status ${b.status}">${b.status}${b.mergedAt ? ' ✓' : ''}</span>
            </div>
            ${b.status === 'active' || b.status === 'stale' ? `
              <div class="bm-branch-actions">
                <button class="bm-btn bm-btn-merge" data-merge="${b.id}">Merge</button>
                <button class="bm-btn bm-btn-delete" data-delete="${b.id}">Delete</button>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
    el.querySelectorAll('[data-merge]').forEach(btn => {
      btn.addEventListener('click', () => mergeBranch(btn.dataset.merge));
    });
    el.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', () => deleteBranch(btn.dataset.delete));
    });
  }

  function renderConflicts(el) {
    const conflicts = getConflicts();
    if (conflicts.length === 0) {
      el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--color-text-secondary,#a0a0b0);font-size:13px;">No conflicts detected.</div>';
      return;
    }
    el.innerHTML = `
      <div id="bm-conflict-list">
        ${conflicts.map(c => `
          <div class="bm-conflict-item" data-conflict="${c.id}">
            <div class="bm-conflict-file">${c.file}</div>
            <div class="bm-conflict-meta">
              <span class="bm-conflict-type ${c.type}">${c.type}</span>
              ${c.lines.length > 0 ? ' Lines ' + c.lines.join('-') : ''} &middot; ${c.description}
            </div>
            <div class="bm-resolution">
              <button class="bm-resolution-btn ${c.resolution === 'ours' ? 'selected' : ''}" data-resolve="${c.id}" data-choice="ours">Keep Ours</button>
              <button class="bm-resolution-btn ${c.resolution === 'theirs' ? 'selected' : ''}" data-resolve="${c.id}" data-choice="theirs">Keep Theirs</button>
              <button class="bm-resolution-btn ${c.resolution === 'manual' ? 'selected' : ''}" data-resolve="${c.id}" data-choice="manual">Manual</button>
              ${c.resolution ? '<span style="font-size:11px;color:#22c55e;margin-left:8px">Resolved</span>' : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
    el.querySelectorAll('[data-resolve]').forEach(btn => {
      btn.addEventListener('click', () => resolveConflict(btn.dataset.resolve, btn.dataset.choice));
    });
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeTab: state.activeTab })); } catch (e) {}
  }
  function loadState() {
    try { const s = localStorage.getItem(STORAGE_KEY); if (s) { const p = JSON.parse(s); state.activeTab = p.activeTab || state.activeTab; } } catch (e) {}
  }

  window.branchManager = {
    getBranches, getBranch, createBranch, mergeBranch, deleteBranch,
    getConflicts, getConflict, resolveConflict, autoMergeCompleted, getStats,
    setTab(tab) { state.activeTab = tab; saveState(); render(); },
    getState() { return { activeTab: state.activeTab, branchCount: getBranches().length, conflictCount: getConflicts().length }; },
  };

  document.addEventListener('DOMContentLoaded', () => { loadState(); render(); });
})();
