// Target Cloning with Customization (feat-065)
(function() {
  'use strict';

  const STORAGE_KEY = 'target-clone-config';
  let state = {
    clonedTargets: [],
    cloneHistory: [],
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
    #target-clone-card {
      background: var(--color-bg-secondary, #1a1f2e);
      border: 1px solid var(--color-border, #2a2f3e);
      border-radius: 12px;
      overflow: hidden;
    }
    #target-clone-card .card-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--color-border, #2a2f3e);
      background: var(--color-bg-tertiary, #151928);
    }
    #target-clone-card .card-header h3 {
      margin: 0; font-size: 1rem; font-weight: 600;
      color: var(--color-text-primary, #f1f5f9);
    }
    #target-clone-card .card-body { padding: 20px; }

    /* Source selector */
    .tc-source-section { margin-bottom: 16px; }
    .tc-label {
      display: block; font-size: 0.8rem; font-weight: 500;
      color: var(--color-text-secondary, #94a3b8); margin-bottom: 6px;
    }
    .tc-select {
      width: 100%; padding: 8px 12px;
      background: var(--color-bg-primary, #0a0e1a);
      border: 1px solid var(--color-border, #2a2f3e);
      border-radius: 6px;
      color: var(--color-text-primary, #f1f5f9);
      font-size: 0.85rem; font-family: inherit;
    }
    .tc-select:focus { outline: none; border-color: var(--color-accent, #6366f1); }

    /* Customization form */
    .tc-customize {
      background: var(--color-bg-primary, #0a0e1a);
      border: 1px solid var(--color-border, #2a2f3e);
      border-radius: 8px; padding: 16px;
      margin-bottom: 16px; display: none;
    }
    .tc-customize.visible { display: block; }
    .tc-form-title {
      font-size: 0.85rem; font-weight: 600;
      color: var(--color-text-primary, #f1f5f9); margin-bottom: 12px;
    }
    .tc-field { margin-bottom: 12px; }
    .tc-input {
      width: 100%; padding: 8px 12px;
      background: var(--color-bg-secondary, #1a1f2e);
      border: 1px solid var(--color-border, #2a2f3e);
      border-radius: 6px;
      color: var(--color-text-primary, #f1f5f9);
      font-size: 0.85rem; font-family: inherit; box-sizing: border-box;
    }
    .tc-input:focus { outline: none; border-color: var(--color-accent, #6366f1); }
    .tc-row {
      display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
    }

    /* Feature list preview */
    .tc-features {
      max-height: 150px; overflow-y: auto;
      border: 1px solid var(--color-border, #2a2f3e);
      border-radius: 6px; margin-top: 6px;
    }
    .tc-feature-item {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 10px; font-size: 0.8rem;
      border-bottom: 1px solid var(--color-border, #2a2f3e);
      color: var(--color-text-primary, #f1f5f9);
    }
    .tc-feature-item:last-child { border-bottom: none; }
    .tc-feature-check {
      width: 14px; height: 14px; accent-color: var(--color-accent, #6366f1);
    }
    .tc-feature-id {
      font-family: 'JetBrains Mono', monospace; font-size: 0.75rem;
      color: var(--color-text-secondary, #94a3b8); min-width: 60px;
    }
    .tc-feature-status {
      width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
    }

    /* Buttons */
    .tc-actions { display: flex; gap: 8px; margin-top: 14px; }
    .tc-btn {
      padding: 8px 16px; border: none; border-radius: 6px;
      font-size: 0.85rem; font-weight: 500; cursor: pointer;
      font-family: inherit; transition: all 0.2s;
    }
    .tc-btn-primary { background: var(--color-accent, #6366f1); color: #fff; }
    .tc-btn-primary:hover { opacity: 0.9; }
    .tc-btn-secondary {
      background: var(--color-bg-primary, #0a0e1a);
      color: var(--color-text-secondary, #94a3b8);
      border: 1px solid var(--color-border, #2a2f3e);
    }

    /* Cloned targets list */
    .tc-clones-section { margin-top: 16px; border-top: 1px solid var(--color-border, #2a2f3e); padding-top: 12px; }
    .tc-section-title {
      font-size: 0.8rem; font-weight: 600;
      color: var(--color-text-secondary, #94a3b8); margin-bottom: 10px;
      display: flex; align-items: center; gap: 8px;
    }
    .tc-section-count {
      font-size: 0.7rem; padding: 1px 6px; border-radius: 10px;
      background: var(--color-bg-primary, #0a0e1a);
    }
    .tc-clone-item {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 12px;
      background: var(--color-bg-primary, #0a0e1a);
      border: 1px solid var(--color-border, #2a2f3e);
      border-radius: 8px; margin-bottom: 6px;
    }
    .tc-clone-info { flex: 1; }
    .tc-clone-name {
      font-size: 0.85rem; font-weight: 500;
      color: var(--color-text-primary, #f1f5f9);
    }
    .tc-clone-meta {
      font-size: 0.72rem; color: var(--color-text-secondary, #94a3b8); margin-top: 2px;
    }
    .tc-clone-badge {
      font-size: 0.65rem; padding: 2px 6px; border-radius: 4px;
      background: rgba(99, 102, 241, 0.15); color: #818cf8;
    }
    .tc-clone-actions { display: flex; gap: 4px; }
    .tc-small-btn {
      padding: 4px 8px; border: none; border-radius: 4px;
      font-size: 0.7rem; cursor: pointer; font-family: inherit;
      background: var(--color-bg-secondary, #1a1f2e);
      color: var(--color-text-secondary, #94a3b8);
    }
    .tc-small-btn:hover { color: var(--color-text-primary, #f1f5f9); }

    /* History */
    .tc-history-item {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 10px; font-size: 0.8rem;
      background: var(--color-bg-primary, #0a0e1a);
      border-radius: 4px; margin-bottom: 3px;
      color: var(--color-text-secondary, #94a3b8);
    }

    /* Status */
    .tc-status {
      padding: 10px 14px; border-radius: 6px; font-size: 0.8rem;
      margin-top: 10px; display: none;
    }
    .tc-status.visible { display: block; }
    .tc-status.success {
      background: rgba(34, 197, 94, 0.1); color: #22c55e;
      border: 1px solid rgba(34, 197, 94, 0.2);
    }
    .tc-status.error {
      background: rgba(239, 68, 68, 0.1); color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.2);
    }
  `;
  document.head.appendChild(style);

  // --- Data ---
  let sourceFeatures = [];

  function loadFeatures() {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', '/feature_list.json', false);
      xhr.send();
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        sourceFeatures = data.features || [];
      }
    } catch(e) {
      sourceFeatures = [];
    }
  }

  // --- Clone Operations ---
  function generateCloneId() {
    return 'clone-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  }

  function cloneTarget(sourceId, customizations) {
    const source = sourceFeatures.find(f => f.id === sourceId);
    if (!source) return null;

    const clone = {
      id: generateCloneId(),
      sourceId: source.id,
      name: customizations.name || `Clone of ${source.description}`,
      description: customizations.description || source.description,
      category: customizations.category || source.category,
      priority: customizations.priority !== undefined ? customizations.priority : source.priority,
      path: customizations.path || '',
      settings: customizations.settings || {},
      features: (source.acceptance_criteria || []).map((ac, i) => ({
        id: `${sourceId}-ac-${i}`,
        text: ac,
        included: true,
      })),
      createdAt: new Date().toISOString(),
      preservedFeatureList: true,
    };

    // Apply feature list customizations
    if (customizations.featureSelections) {
      clone.features = clone.features.map(f => ({
        ...f,
        included: customizations.featureSelections[f.id] !== false,
      }));
    }

    state.clonedTargets.push(clone);
    state.cloneHistory.unshift({
      action: 'clone',
      cloneId: clone.id,
      sourceId: source.id,
      name: clone.name,
      timestamp: new Date().toISOString(),
    });
    if (state.cloneHistory.length > 30) state.cloneHistory.length = 30;
    saveState();
    renderContent();

    return clone;
  }

  function updateClone(cloneId, updates) {
    const idx = state.clonedTargets.findIndex(c => c.id === cloneId);
    if (idx === -1) return false;

    const clone = state.clonedTargets[idx];
    if (updates.name !== undefined) clone.name = updates.name;
    if (updates.path !== undefined) clone.path = updates.path;
    if (updates.category !== undefined) clone.category = updates.category;
    if (updates.priority !== undefined) clone.priority = updates.priority;
    if (updates.settings !== undefined) clone.settings = { ...clone.settings, ...updates.settings };
    if (updates.description !== undefined) clone.description = updates.description;

    state.cloneHistory.unshift({
      action: 'update',
      cloneId: clone.id,
      name: clone.name,
      timestamp: new Date().toISOString(),
    });
    saveState();
    renderContent();
    return true;
  }

  function deleteClone(cloneId) {
    const idx = state.clonedTargets.findIndex(c => c.id === cloneId);
    if (idx === -1) return false;

    const clone = state.clonedTargets[idx];
    state.clonedTargets.splice(idx, 1);
    state.cloneHistory.unshift({
      action: 'delete',
      cloneId: clone.id,
      name: clone.name,
      timestamp: new Date().toISOString(),
    });
    saveState();
    renderContent();
    return true;
  }

  function getClone(cloneId) {
    return state.clonedTargets.find(c => c.id === cloneId) || null;
  }

  // --- UI ---
  function showStatus(type, message) {
    const el = document.getElementById('tc-status');
    if (!el) return;
    el.className = 'tc-status visible ' + type;
    el.textContent = message;
    setTimeout(() => el.classList.remove('visible'), 4000);
  }

  function onSourceSelect() {
    const select = document.getElementById('tc-source-select');
    const customize = document.getElementById('tc-customize');
    const val = select.value;

    if (!val) {
      customize.classList.remove('visible');
      return;
    }

    const source = sourceFeatures.find(f => f.id === val);
    if (!source) return;

    customize.classList.add('visible');
    document.getElementById('tc-clone-name').value = `Clone of ${source.description}`;
    document.getElementById('tc-clone-desc').value = source.description;
    document.getElementById('tc-clone-category').value = source.category || '';
    document.getElementById('tc-clone-priority').value = source.priority || 1;
    document.getElementById('tc-clone-path').value = '';
    document.getElementById('tc-clone-settings').value = '';

    // Render feature list
    const featureList = document.getElementById('tc-feature-list');
    const criteria = source.acceptance_criteria || [];
    if (criteria.length === 0) {
      featureList.innerHTML = '<div style="padding:8px;font-size:0.8rem;color:var(--color-text-secondary);">No acceptance criteria</div>';
    } else {
      featureList.innerHTML = criteria.map((ac, i) => `
        <div class="tc-feature-item">
          <input type="checkbox" class="tc-feature-check" data-ac-index="${i}" checked>
          <span class="tc-feature-id">AC-${i + 1}</span>
          <span>${ac}</span>
        </div>
      `).join('');
    }
  }

  function performClone() {
    const sourceId = document.getElementById('tc-source-select').value;
    if (!sourceId) {
      showStatus('error', 'Select a source target first');
      return;
    }

    const name = document.getElementById('tc-clone-name').value.trim();
    const description = document.getElementById('tc-clone-desc').value.trim();
    const category = document.getElementById('tc-clone-category').value.trim();
    const priority = parseInt(document.getElementById('tc-clone-priority').value) || 1;
    const path = document.getElementById('tc-clone-path').value.trim();
    const settingsStr = document.getElementById('tc-clone-settings').value.trim();

    let settings = {};
    if (settingsStr) {
      try {
        settings = JSON.parse(settingsStr);
      } catch(e) {
        settings = { raw: settingsStr };
      }
    }

    const clone = cloneTarget(sourceId, { name, description, category, priority, path, settings });
    if (clone) {
      showStatus('success', `Target cloned: ${clone.name}`);
      document.getElementById('tc-source-select').value = '';
      document.getElementById('tc-customize').classList.remove('visible');
    }
  }

  function renderContent() {
    // Cloned targets list
    const clonesContainer = document.getElementById('tc-clones-list');
    const countEl = document.getElementById('tc-clones-count');

    if (countEl) countEl.textContent = state.clonedTargets.length;

    if (clonesContainer) {
      if (state.clonedTargets.length === 0) {
        clonesContainer.innerHTML = '<div style="padding:12px;font-size:0.8rem;color:var(--color-text-secondary);text-align:center;">No cloned targets yet. Select a source and clone.</div>';
      } else {
        clonesContainer.innerHTML = state.clonedTargets.map(c => {
          const date = new Date(c.createdAt).toLocaleDateString();
          const featureCount = c.features ? c.features.filter(f => f.included).length : 0;
          return `
            <div class="tc-clone-item">
              <div class="tc-clone-info">
                <div class="tc-clone-name">${c.name}</div>
                <div class="tc-clone-meta">
                  From: ${c.sourceId} | Category: ${c.category} | Priority: ${c.priority} | ${date}
                  ${c.path ? ` | Path: ${c.path}` : ''}
                </div>
              </div>
              <span class="tc-clone-badge">${featureCount} criteria</span>
              <div class="tc-clone-actions">
                <button class="tc-small-btn" onclick="window.targetClone.viewClone('${c.id}')">View</button>
                <button class="tc-small-btn" onclick="window.targetClone.deleteClone('${c.id}')">Delete</button>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // History
    const historyContainer = document.getElementById('tc-history-list');
    if (historyContainer) {
      if (state.cloneHistory.length === 0) {
        historyContainer.innerHTML = '<div style="padding:8px;font-size:0.8rem;color:var(--color-text-secondary);">No clone activity</div>';
      } else {
        historyContainer.innerHTML = state.cloneHistory.slice(0, 10).map(h => {
          const icon = h.action === 'clone' ? '📋' : h.action === 'update' ? '✏️' : '🗑️';
          const date = new Date(h.timestamp);
          const dateStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return `<div class="tc-history-item">
            <span>${icon}</span>
            <span style="flex:1;color:var(--color-text-primary);">${h.action}: ${h.name}</span>
            <span>${dateStr}</span>
          </div>`;
        }).join('');
      }
    }
  }

  function viewClone(cloneId) {
    const clone = getClone(cloneId);
    if (!clone) return;
    const details = JSON.stringify(clone, null, 2);
    alert(`Clone Details:\n\n${details}`);
  }

  function render() {
    const container = document.getElementById('target-clone-widget');
    if (!container) return;

    loadFeatures();

    const options = sourceFeatures.map(f =>
      `<option value="${f.id}">${f.id}: ${f.description} ${f.passes ? '✓' : '○'}</option>`
    ).join('');

    container.innerHTML = `
      <div id="target-clone-card">
        <div class="card-header">
          <h3>📋 Target Clone</h3>
          <span style="font-size:0.75rem;color:var(--color-text-secondary);">Clone & customize targets</span>
        </div>
        <div class="card-body">
          <!-- Source selector -->
          <div class="tc-source-section">
            <label class="tc-label">Select Source Target to Clone</label>
            <select class="tc-select" id="tc-source-select" onchange="window.targetClone.onSourceSelect()">
              <option value="">-- Select a target --</option>
              ${options}
            </select>
          </div>

          <!-- Customization form -->
          <div class="tc-customize" id="tc-customize">
            <div class="tc-form-title">Customize Clone</div>
            <div class="tc-row">
              <div class="tc-field">
                <label class="tc-label">Clone Name</label>
                <input type="text" class="tc-input" id="tc-clone-name" placeholder="Name for the cloned target">
              </div>
              <div class="tc-field">
                <label class="tc-label">Category</label>
                <input type="text" class="tc-input" id="tc-clone-category" placeholder="e.g., core, ui, prd">
              </div>
            </div>
            <div class="tc-field">
              <label class="tc-label">Description</label>
              <input type="text" class="tc-input" id="tc-clone-desc" placeholder="Description">
            </div>
            <div class="tc-row">
              <div class="tc-field">
                <label class="tc-label">Priority</label>
                <input type="number" class="tc-input" id="tc-clone-priority" min="1" max="100" value="1">
              </div>
              <div class="tc-field">
                <label class="tc-label">Path</label>
                <input type="text" class="tc-input" id="tc-clone-path" placeholder="/path/to/target">
              </div>
            </div>
            <div class="tc-field">
              <label class="tc-label">Custom Settings (JSON)</label>
              <input type="text" class="tc-input" id="tc-clone-settings" placeholder='{"key": "value"}'>
            </div>
            <div class="tc-field">
              <label class="tc-label">Feature List (Acceptance Criteria)</label>
              <div class="tc-features" id="tc-feature-list"></div>
            </div>
            <div class="tc-actions">
              <button class="tc-btn tc-btn-primary" id="tc-clone-btn" onclick="window.targetClone.performClone()">Clone Target</button>
              <button class="tc-btn tc-btn-secondary" onclick="document.getElementById('tc-customize').classList.remove('visible')">Cancel</button>
            </div>
          </div>

          <!-- Status -->
          <div class="tc-status" id="tc-status"></div>

          <!-- Cloned Targets -->
          <div class="tc-clones-section">
            <div class="tc-section-title">
              Cloned Targets
              <span class="tc-section-count" id="tc-clones-count">0</span>
            </div>
            <div id="tc-clones-list"></div>
          </div>

          <!-- Clone History -->
          <div class="tc-clones-section">
            <div class="tc-section-title">Clone History</div>
            <div id="tc-history-list"></div>
          </div>
        </div>
      </div>
    `;

    renderContent();
  }

  // --- Public API ---
  window.targetClone = {
    cloneTarget,
    updateClone,
    deleteClone,
    getClone,
    onSourceSelect,
    performClone,
    viewClone,
    getState: () => ({ ...state }),
    getClonedTargets: () => [...state.clonedTargets],
    getCloneHistory: () => [...state.cloneHistory],
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
