// Target Archiving and Restore (feat-064)
(function() {
  'use strict';

  const STORAGE_KEY = 'target-archive-config';
  let state = {
    archivedTargets: [],
    archiveHistory: [],
  };

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) state = { ...state, ...JSON.parse(saved) };
    } catch(e) {}
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
  }

  // --- CSS ---
  const style = document.createElement('style');
  style.textContent = `
    #target-archive-card {
      background: var(--color-bg-secondary, #1a1f2e);
      border: 1px solid var(--color-border, #2a2f3e);
      border-radius: 12px;
      overflow: hidden;
    }
    #target-archive-card .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--color-border, #2a2f3e);
      background: var(--color-bg-tertiary, #151928);
    }
    #target-archive-card .card-header h3 {
      margin: 0; font-size: 1rem; font-weight: 600;
      color: var(--color-text-primary, #f1f5f9);
    }
    #target-archive-card .card-body { padding: 20px; }

    /* Stats bar */
    .ta-stats {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
    }
    .ta-stat {
      background: var(--color-bg-primary, #0a0e1a);
      border: 1px solid var(--color-border, #2a2f3e);
      border-radius: 8px;
      padding: 10px 16px;
      flex: 1;
      text-align: center;
    }
    .ta-stat-value {
      font-size: 1.3rem;
      font-weight: 700;
      color: var(--color-text-primary, #f1f5f9);
    }
    .ta-stat-label {
      font-size: 0.7rem;
      color: var(--color-text-secondary, #94a3b8);
      margin-top: 2px;
    }

    /* Tabs */
    .ta-tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 16px;
      background: var(--color-bg-primary, #0a0e1a);
      border-radius: 8px;
      padding: 4px;
    }
    .ta-tab {
      flex: 1;
      padding: 8px 12px;
      border: none;
      background: transparent;
      color: var(--color-text-secondary, #94a3b8);
      cursor: pointer;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 500;
      font-family: inherit;
      transition: all 0.2s;
    }
    .ta-tab:hover { color: var(--color-text-primary, #f1f5f9); }
    .ta-tab.active {
      background: var(--color-accent, #6366f1);
      color: #fff;
    }

    /* Panel */
    .ta-panel { display: none; }
    .ta-panel.active { display: block; }

    /* Target list */
    .ta-list { margin-top: 8px; }
    .ta-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      background: var(--color-bg-primary, #0a0e1a);
      border: 1px solid var(--color-border, #2a2f3e);
      border-radius: 8px;
      margin-bottom: 6px;
      transition: all 0.2s;
    }
    .ta-item:hover {
      border-color: var(--color-accent, #6366f1);
    }
    .ta-item-status {
      width: 10px; height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .ta-item-info { flex: 1; }
    .ta-item-name {
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--color-text-primary, #f1f5f9);
    }
    .ta-item-meta {
      font-size: 0.72rem;
      color: var(--color-text-secondary, #94a3b8);
      margin-top: 2px;
    }
    .ta-item-actions {
      display: flex;
      gap: 4px;
    }
    .ta-btn {
      padding: 5px 10px;
      border: none;
      border-radius: 4px;
      font-size: 0.75rem;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.2s;
    }
    .ta-btn-archive {
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .ta-btn-archive:hover { background: rgba(245, 158, 11, 0.25); }
    .ta-btn-restore {
      background: rgba(34, 197, 94, 0.15);
      color: #22c55e;
      border: 1px solid rgba(34, 197, 94, 0.3);
    }
    .ta-btn-restore:hover { background: rgba(34, 197, 94, 0.25); }
    .ta-btn-delete {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.2);
    }
    .ta-btn-primary {
      background: var(--color-accent, #6366f1);
      color: #fff;
      padding: 7px 14px;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 500;
    }
    .ta-btn-secondary {
      background: var(--color-bg-primary, #0a0e1a);
      color: var(--color-text-secondary, #94a3b8);
      border: 1px solid var(--color-border, #2a2f3e);
      padding: 7px 14px;
      border-radius: 6px;
      font-size: 0.8rem;
    }

    /* History */
    .ta-history-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      background: var(--color-bg-primary, #0a0e1a);
      border-radius: 6px;
      margin-bottom: 4px;
      font-size: 0.8rem;
    }
    .ta-history-icon {
      flex-shrink: 0;
      width: 24px;
      text-align: center;
    }
    .ta-history-text {
      flex: 1;
      color: var(--color-text-primary, #f1f5f9);
    }
    .ta-history-date {
      flex-shrink: 0;
      font-size: 0.7rem;
      color: var(--color-text-secondary, #94a3b8);
    }

    /* Empty state */
    .ta-empty {
      text-align: center;
      padding: 24px;
      color: var(--color-text-secondary, #94a3b8);
      font-size: 0.85rem;
    }

    /* Status toast */
    .ta-status {
      padding: 10px 14px;
      border-radius: 6px;
      font-size: 0.8rem;
      margin-top: 10px;
      display: none;
    }
    .ta-status.visible { display: block; }
    .ta-status.success {
      background: rgba(34, 197, 94, 0.1);
      color: #22c55e;
      border: 1px solid rgba(34, 197, 94, 0.2);
    }
  `;
  document.head.appendChild(style);

  // --- Archive Operations ---

  function getActiveTargets() {
    // Get features from feature_list.json that pass (completed targets)
    let features = [];
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', '/feature_list.json', false);
      xhr.send();
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        features = (data.features || []).filter(f => f.passes);
      }
    } catch(e) {}

    // Filter out already archived ones
    const archivedIds = new Set(state.archivedTargets.map(t => t.id));
    return features.filter(f => !archivedIds.has(f.id));
  }

  function archiveTarget(id, name) {
    // Check not already archived
    if (state.archivedTargets.some(t => t.id === id)) return false;

    const entry = {
      id,
      name: name || id,
      archivedAt: new Date().toISOString(),
      category: '',
    };

    // Try to get category from feature data
    try {
      const active = getActiveTargets();
      const feature = active.find(f => f.id === id);
      if (feature) {
        entry.name = feature.description || id;
        entry.category = feature.category || '';
      }
    } catch(e) {}

    state.archivedTargets.push(entry);
    addHistory('archive', entry.name);
    saveState();
    renderContent();
    return true;
  }

  function restoreTarget(id) {
    const idx = state.archivedTargets.findIndex(t => t.id === id);
    if (idx === -1) return false;

    const entry = state.archivedTargets[idx];
    state.archivedTargets.splice(idx, 1);
    addHistory('restore', entry.name);
    saveState();
    renderContent();
    return true;
  }

  function deleteArchived(id) {
    const idx = state.archivedTargets.findIndex(t => t.id === id);
    if (idx === -1) return false;

    const entry = state.archivedTargets[idx];
    state.archivedTargets.splice(idx, 1);
    addHistory('delete', entry.name);
    saveState();
    renderContent();
    return true;
  }

  function archiveAllCompleted() {
    const active = getActiveTargets();
    let count = 0;
    active.forEach(f => {
      if (!state.archivedTargets.some(t => t.id === f.id)) {
        state.archivedTargets.push({
          id: f.id,
          name: f.description || f.id,
          category: f.category || '',
          archivedAt: new Date().toISOString(),
        });
        count++;
      }
    });
    if (count > 0) {
      addHistory('bulk-archive', `${count} targets`);
      saveState();
      renderContent();
    }
    return count;
  }

  function restoreAll() {
    const count = state.archivedTargets.length;
    if (count === 0) return 0;
    state.archivedTargets = [];
    addHistory('bulk-restore', `${count} targets`);
    saveState();
    renderContent();
    return count;
  }

  function addHistory(action, targetName) {
    state.archiveHistory.unshift({
      action,
      targetName,
      timestamp: new Date().toISOString(),
    });
    if (state.archiveHistory.length > 50) state.archiveHistory.length = 50;
  }

  // --- Rendering ---
  function showStatus(message) {
    const el = document.getElementById('ta-status');
    if (!el) return;
    el.className = 'ta-status visible success';
    el.textContent = message;
    setTimeout(() => el.classList.remove('visible'), 3000);
  }

  function switchTab(tab) {
    document.querySelectorAll('.ta-tab').forEach(t => t.classList.remove('active'));
    const btn = document.querySelector(`.ta-tab[data-tab="${tab}"]`);
    if (btn) btn.classList.add('active');

    document.querySelectorAll('.ta-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById(`ta-panel-${tab}`);
    if (panel) panel.classList.add('active');
  }

  function renderContent() {
    const activeTargets = getActiveTargets();
    const archivedTargets = state.archivedTargets;

    // Stats
    const totalEl = document.getElementById('ta-stat-total');
    const archivedEl = document.getElementById('ta-stat-archived');
    const activeEl = document.getElementById('ta-stat-active');
    if (totalEl) totalEl.textContent = activeTargets.length + archivedTargets.length;
    if (archivedEl) archivedEl.textContent = archivedTargets.length;
    if (activeEl) activeEl.textContent = activeTargets.length;

    // Active list
    const activeList = document.getElementById('ta-active-list');
    if (activeList) {
      if (activeTargets.length === 0) {
        activeList.innerHTML = '<div class="ta-empty">No active completed targets to archive.</div>';
      } else {
        activeList.innerHTML = activeTargets.slice(0, 20).map(f => `
          <div class="ta-item">
            <div class="ta-item-status" style="background:#22c55e;"></div>
            <div class="ta-item-info">
              <div class="ta-item-name">${f.id}: ${f.description || ''}</div>
              <div class="ta-item-meta">${f.category || 'general'} | Priority: ${f.priority || '-'}</div>
            </div>
            <div class="ta-item-actions">
              <button class="ta-btn ta-btn-archive" onclick="window.targetArchive.archive('${f.id}','${(f.description || '').replace(/'/g, '\\\'')}')">Archive</button>
            </div>
          </div>
        `).join('');
      }
    }

    // Archived list
    const archivedList = document.getElementById('ta-archived-list');
    if (archivedList) {
      if (archivedTargets.length === 0) {
        archivedList.innerHTML = '<div class="ta-empty">No archived targets yet.</div>';
      } else {
        archivedList.innerHTML = archivedTargets.map(t => {
          const date = new Date(t.archivedAt).toLocaleDateString();
          return `
            <div class="ta-item">
              <div class="ta-item-status" style="background:#94a3b8;"></div>
              <div class="ta-item-info">
                <div class="ta-item-name">${t.id}: ${t.name}</div>
                <div class="ta-item-meta">Archived: ${date} | ${t.category || 'general'}</div>
              </div>
              <div class="ta-item-actions">
                <button class="ta-btn ta-btn-restore" onclick="window.targetArchive.restore('${t.id}')">Restore</button>
                <button class="ta-btn ta-btn-delete" onclick="window.targetArchive.deleteArchived('${t.id}')">Delete</button>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // History
    const historyList = document.getElementById('ta-history-list');
    if (historyList) {
      if (state.archiveHistory.length === 0) {
        historyList.innerHTML = '<div class="ta-empty">No archive activity yet.</div>';
      } else {
        historyList.innerHTML = state.archiveHistory.map(h => {
          const icon = h.action === 'archive' || h.action === 'bulk-archive' ? '📦'
            : h.action === 'restore' || h.action === 'bulk-restore' ? '♻️' : '🗑️';
          const actionLabel = h.action === 'archive' ? 'Archived'
            : h.action === 'restore' ? 'Restored'
            : h.action === 'bulk-archive' ? 'Bulk archived'
            : h.action === 'bulk-restore' ? 'Bulk restored'
            : 'Deleted';
          const date = new Date(h.timestamp);
          const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return `
            <div class="ta-history-item">
              <span class="ta-history-icon">${icon}</span>
              <span class="ta-history-text">${actionLabel}: ${h.targetName}</span>
              <span class="ta-history-date">${dateStr}</span>
            </div>
          `;
        }).join('');
      }
    }
  }

  function render() {
    const container = document.getElementById('target-archive-widget');
    if (!container) return;

    container.innerHTML = `
      <div id="target-archive-card">
        <div class="card-header">
          <h3>📦 Target Archive</h3>
          <div style="display:flex;gap:6px;">
            <button class="ta-btn ta-btn-primary" onclick="window.targetArchive.archiveAllCompleted()">Archive All</button>
            <button class="ta-btn ta-btn-secondary" onclick="window.targetArchive.restoreAll()">Restore All</button>
          </div>
        </div>
        <div class="card-body">
          <!-- Stats -->
          <div class="ta-stats">
            <div class="ta-stat">
              <div class="ta-stat-value" id="ta-stat-total">0</div>
              <div class="ta-stat-label">Total</div>
            </div>
            <div class="ta-stat">
              <div class="ta-stat-value" id="ta-stat-archived">0</div>
              <div class="ta-stat-label">Archived</div>
            </div>
            <div class="ta-stat">
              <div class="ta-stat-value" id="ta-stat-active">0</div>
              <div class="ta-stat-label">Active</div>
            </div>
          </div>

          <!-- Tabs -->
          <div class="ta-tabs">
            <button class="ta-tab active" data-tab="active" onclick="window.targetArchive.switchTab('active')">Active Targets</button>
            <button class="ta-tab" data-tab="archived" onclick="window.targetArchive.switchTab('archived')">Archived</button>
            <button class="ta-tab" data-tab="history" onclick="window.targetArchive.switchTab('history')">History</button>
          </div>

          <!-- Panels -->
          <div class="ta-panel active" id="ta-panel-active">
            <div class="ta-list" id="ta-active-list"></div>
          </div>
          <div class="ta-panel" id="ta-panel-archived">
            <div class="ta-list" id="ta-archived-list"></div>
          </div>
          <div class="ta-panel" id="ta-panel-history">
            <div class="ta-list" id="ta-history-list"></div>
          </div>

          <!-- Status -->
          <div class="ta-status" id="ta-status"></div>
        </div>
      </div>
    `;

    renderContent();
  }

  // --- Public API ---
  window.targetArchive = {
    archive: archiveTarget,
    restore: restoreTarget,
    deleteArchived,
    archiveAllCompleted,
    restoreAll,
    switchTab,
    getState: () => ({ ...state }),
    getArchivedTargets: () => [...state.archivedTargets],
    getArchiveHistory: () => [...state.archiveHistory],
    refresh: render,
  };

  // --- Init ---
  loadState();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
