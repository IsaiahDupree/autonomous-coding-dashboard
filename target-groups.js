// Target Grouping and Organization (feat-066)
(function() {
  'use strict';

  const STORAGE_KEY = 'target-groups-config';
  let state = {
    groups: [],
    activeFilter: null,
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
    #target-groups-card {
      background: var(--color-bg-secondary, #1a1f2e);
      border: 1px solid var(--color-border, #2a2f3e);
      border-radius: 12px;
      overflow: hidden;
    }
    #target-groups-card .card-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--color-border, #2a2f3e);
      background: var(--color-bg-tertiary, #151928);
    }
    #target-groups-card .card-header h3 {
      margin: 0; font-size: 1rem; font-weight: 600;
      color: var(--color-text-primary, #f1f5f9);
    }
    #target-groups-card .card-body { padding: 20px; }

    /* Filter bar */
    .tg-filter-bar {
      display: flex; gap: 6px; flex-wrap: wrap;
      margin-bottom: 16px;
      padding: 8px;
      background: var(--color-bg-primary, #0a0e1a);
      border-radius: 8px;
    }
    .tg-filter-chip {
      padding: 5px 12px; border: none; border-radius: 20px;
      font-size: 0.78rem; cursor: pointer; font-family: inherit;
      background: var(--color-bg-secondary, #1a1f2e);
      color: var(--color-text-secondary, #94a3b8);
      border: 1px solid var(--color-border, #2a2f3e);
      transition: all 0.2s;
    }
    .tg-filter-chip:hover {
      color: var(--color-text-primary, #f1f5f9);
      border-color: var(--color-accent, #6366f1);
    }
    .tg-filter-chip.active {
      background: var(--color-accent, #6366f1);
      color: #fff;
      border-color: var(--color-accent, #6366f1);
    }

    /* Group cards */
    .tg-groups-list { margin-bottom: 12px; }
    .tg-group-card {
      background: var(--color-bg-primary, #0a0e1a);
      border: 1px solid var(--color-border, #2a2f3e);
      border-radius: 8px;
      margin-bottom: 8px;
      overflow: hidden;
    }
    .tg-group-header {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 14px;
      cursor: pointer;
    }
    .tg-group-header:hover { background: var(--color-bg-secondary, #1a1f2e); }
    .tg-group-color {
      width: 12px; height: 12px; border-radius: 3px; flex-shrink: 0;
    }
    .tg-group-name {
      flex: 1; font-size: 0.85rem; font-weight: 600;
      color: var(--color-text-primary, #f1f5f9);
    }
    .tg-group-count {
      font-size: 0.72rem; padding: 2px 8px; border-radius: 10px;
      background: var(--color-bg-secondary, #1a1f2e);
      color: var(--color-text-secondary, #94a3b8);
    }
    .tg-group-toggle {
      color: var(--color-text-secondary, #94a3b8);
      font-size: 0.7rem; transition: transform 0.2s;
    }
    .tg-group-card.expanded .tg-group-toggle { transform: rotate(180deg); }
    .tg-group-body {
      display: none; padding: 0 14px 12px;
      border-top: 1px solid var(--color-border, #2a2f3e);
    }
    .tg-group-card.expanded .tg-group-body { display: block; }

    /* Group members */
    .tg-member {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 0; font-size: 0.8rem;
      border-bottom: 1px solid var(--color-border, #2a2f3e);
    }
    .tg-member:last-child { border-bottom: none; }
    .tg-member-status {
      width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
    }
    .tg-member-id {
      font-family: 'JetBrains Mono', monospace; font-size: 0.72rem;
      color: var(--color-text-secondary, #94a3b8); min-width: 60px;
    }
    .tg-member-name {
      flex: 1; color: var(--color-text-primary, #f1f5f9);
    }
    .tg-member-remove {
      padding: 2px 6px; border: none; border-radius: 3px;
      font-size: 0.65rem; cursor: pointer;
      background: rgba(239, 68, 68, 0.1); color: #ef4444;
    }

    /* Bulk actions */
    .tg-bulk-bar {
      display: flex; gap: 6px; padding: 10px;
      background: var(--color-bg-primary, #0a0e1a);
      border: 1px solid var(--color-border, #2a2f3e);
      border-radius: 8px; margin-top: 8px;
    }
    .tg-bulk-btn {
      padding: 5px 10px; border: none; border-radius: 4px;
      font-size: 0.75rem; cursor: pointer; font-family: inherit;
      transition: all 0.2s;
    }
    .tg-bulk-archive {
      background: rgba(245, 158, 11, 0.15); color: #f59e0b;
    }
    .tg-bulk-reset {
      background: rgba(99, 102, 241, 0.15); color: #6366f1;
    }
    .tg-bulk-delete {
      background: rgba(239, 68, 68, 0.1); color: #ef4444;
    }
    .tg-bulk-select-all {
      background: var(--color-bg-secondary, #1a1f2e);
      color: var(--color-text-secondary, #94a3b8);
      border: 1px solid var(--color-border, #2a2f3e);
    }

    /* Create group */
    .tg-create-section {
      background: var(--color-bg-primary, #0a0e1a);
      border: 1px solid var(--color-border, #2a2f3e);
      border-radius: 8px; padding: 14px;
      margin-top: 12px; display: none;
    }
    .tg-create-section.visible { display: block; }
    .tg-create-row {
      display: flex; gap: 8px; align-items: flex-end;
    }
    .tg-field { margin-bottom: 10px; }
    .tg-label {
      font-size: 0.75rem; font-weight: 500;
      color: var(--color-text-secondary, #94a3b8);
      margin-bottom: 4px; display: block;
    }
    .tg-input {
      padding: 7px 10px;
      background: var(--color-bg-secondary, #1a1f2e);
      border: 1px solid var(--color-border, #2a2f3e);
      border-radius: 6px;
      color: var(--color-text-primary, #f1f5f9);
      font-size: 0.82rem; font-family: inherit;
      box-sizing: border-box; width: 100%;
    }
    .tg-input:focus { outline: none; border-color: var(--color-accent, #6366f1); }
    .tg-color-input {
      width: 40px; height: 32px; padding: 2px; border: none;
      border-radius: 4px; cursor: pointer;
      background: var(--color-bg-secondary, #1a1f2e);
    }

    /* Buttons */
    .tg-btn {
      padding: 7px 14px; border: none; border-radius: 6px;
      font-size: 0.82rem; font-weight: 500; cursor: pointer;
      font-family: inherit; transition: all 0.2s;
    }
    .tg-btn-primary { background: var(--color-accent, #6366f1); color: #fff; }
    .tg-btn-secondary {
      background: var(--color-bg-primary, #0a0e1a);
      color: var(--color-text-secondary, #94a3b8);
      border: 1px solid var(--color-border, #2a2f3e);
    }

    /* Status */
    .tg-status {
      padding: 8px 12px; border-radius: 6px; font-size: 0.8rem;
      margin-top: 8px; display: none;
    }
    .tg-status.visible { display: block; }
    .tg-status.success {
      background: rgba(34, 197, 94, 0.1); color: #22c55e;
      border: 1px solid rgba(34, 197, 94, 0.2);
    }
  `;
  document.head.appendChild(style);

  // --- Data ---
  let allFeatures = [];

  function loadFeatures() {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', '/feature_list.json', false);
      xhr.send();
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        allFeatures = data.features || [];
      }
    } catch(e) {
      allFeatures = [];
    }
  }

  // --- Group Operations ---
  function generateId() {
    return 'grp-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  }

  function createGroup(name, color, description) {
    if (!name) return null;
    const group = {
      id: generateId(),
      name,
      color: color || '#6366f1',
      description: description || '',
      members: [],
      createdAt: new Date().toISOString(),
    };
    state.groups.push(group);
    saveState();
    renderContent();
    return group;
  }

  function deleteGroup(groupId) {
    const idx = state.groups.findIndex(g => g.id === groupId);
    if (idx === -1) return false;
    state.groups.splice(idx, 1);
    if (state.activeFilter === groupId) state.activeFilter = null;
    saveState();
    renderContent();
    return true;
  }

  function renameGroup(groupId, newName) {
    const group = state.groups.find(g => g.id === groupId);
    if (!group) return false;
    group.name = newName;
    saveState();
    renderContent();
    return true;
  }

  function addMember(groupId, featureId) {
    const group = state.groups.find(g => g.id === groupId);
    if (!group) return false;
    if (group.members.includes(featureId)) return false;
    group.members.push(featureId);
    saveState();
    renderContent();
    return true;
  }

  function removeMember(groupId, featureId) {
    const group = state.groups.find(g => g.id === groupId);
    if (!group) return false;
    const idx = group.members.indexOf(featureId);
    if (idx === -1) return false;
    group.members.splice(idx, 1);
    saveState();
    renderContent();
    return true;
  }

  function getGroup(groupId) {
    return state.groups.find(g => g.id === groupId) || null;
  }

  // --- Bulk Actions ---
  function bulkArchiveGroup(groupId) {
    const group = state.groups.find(g => g.id === groupId);
    if (!group || group.members.length === 0) return 0;
    // Mark members as "archived" by adding a flag
    let count = 0;
    group.members.forEach(mId => {
      if (window.targetArchive && typeof window.targetArchive.archive === 'function') {
        const feature = allFeatures.find(f => f.id === mId);
        if (feature) {
          window.targetArchive.archive(mId, feature.description);
          count++;
        }
      }
    });
    return count;
  }

  function bulkResetGroup(groupId) {
    const group = state.groups.find(g => g.id === groupId);
    if (!group) return false;
    group.members = [];
    saveState();
    renderContent();
    return true;
  }

  function bulkDeleteGroup(groupId) {
    return deleteGroup(groupId);
  }

  // --- Filter ---
  function setFilter(groupId) {
    if (state.activeFilter === groupId) {
      state.activeFilter = null;
    } else {
      state.activeFilter = groupId;
    }
    saveState();
    renderContent();
  }

  function getFilteredFeatures() {
    if (!state.activeFilter) return allFeatures;
    const group = state.groups.find(g => g.id === state.activeFilter);
    if (!group) return allFeatures;
    return allFeatures.filter(f => group.members.includes(f.id));
  }

  // --- UI ---
  function showStatus(message) {
    const el = document.getElementById('tg-status');
    if (!el) return;
    el.className = 'tg-status visible success';
    el.textContent = message;
    setTimeout(() => el.classList.remove('visible'), 3000);
  }

  function toggleGroup(groupId) {
    const card = document.querySelector(`[data-group-id="${groupId}"]`);
    if (card) card.classList.toggle('expanded');
  }

  function showCreateForm() {
    document.getElementById('tg-create-section').classList.toggle('visible');
  }

  function performCreate() {
    const name = document.getElementById('tg-create-name').value.trim();
    const color = document.getElementById('tg-create-color').value;
    const desc = document.getElementById('tg-create-desc').value.trim();

    if (!name) return;

    createGroup(name, color, desc);
    showStatus(`Group "${name}" created`);
    document.getElementById('tg-create-name').value = '';
    document.getElementById('tg-create-desc').value = '';
    document.getElementById('tg-create-section').classList.remove('visible');
  }

  function addFeatureToGroup(groupId) {
    const select = document.getElementById(`tg-add-select-${groupId}`);
    if (!select || !select.value) return;
    addMember(groupId, select.value);
    select.value = '';
  }

  function renderContent() {
    // Filter bar
    const filterBar = document.getElementById('tg-filter-bar');
    if (filterBar) {
      filterBar.innerHTML = `
        <button class="tg-filter-chip ${!state.activeFilter ? 'active' : ''}" onclick="window.targetGroups.setFilter(null)">All</button>
        ${state.groups.map(g => `
          <button class="tg-filter-chip ${state.activeFilter === g.id ? 'active' : ''}"
            onclick="window.targetGroups.setFilter('${g.id}')" style="border-left: 3px solid ${g.color};">
            ${g.name} (${g.members.length})
          </button>
        `).join('')}
      `;
    }

    // Groups list
    const groupsList = document.getElementById('tg-groups-list');
    if (groupsList) {
      if (state.groups.length === 0) {
        groupsList.innerHTML = '<div style="text-align:center;padding:16px;font-size:0.85rem;color:var(--color-text-secondary);">No groups yet. Create a group to organize targets.</div>';
      } else {
        groupsList.innerHTML = state.groups.map(g => {
          const members = g.members.map(mId => {
            const feat = allFeatures.find(f => f.id === mId);
            return { id: mId, name: feat ? feat.description : mId, passes: feat ? feat.passes : false };
          });

          const featureOptions = allFeatures
            .filter(f => !g.members.includes(f.id))
            .slice(0, 50)
            .map(f => `<option value="${f.id}">${f.id}: ${f.description}</option>`)
            .join('');

          return `
            <div class="tg-group-card" data-group-id="${g.id}">
              <div class="tg-group-header" onclick="window.targetGroups.toggleGroup('${g.id}')">
                <div class="tg-group-color" style="background:${g.color};"></div>
                <span class="tg-group-name">${g.name}</span>
                <span class="tg-group-count">${g.members.length} targets</span>
                <span class="tg-group-toggle">▼</span>
              </div>
              <div class="tg-group-body">
                ${members.length === 0
                  ? '<div style="padding:8px 0;font-size:0.8rem;color:var(--color-text-secondary);">No members</div>'
                  : members.map(m => `
                    <div class="tg-member">
                      <div class="tg-member-status" style="background:${m.passes ? '#22c55e' : '#94a3b8'};"></div>
                      <span class="tg-member-id">${m.id}</span>
                      <span class="tg-member-name">${m.name}</span>
                      <button class="tg-member-remove" onclick="window.targetGroups.removeMember('${g.id}','${m.id}')">Remove</button>
                    </div>
                  `).join('')
                }
                <div style="display:flex;gap:6px;margin-top:8px;align-items:center;">
                  <select class="tg-input" id="tg-add-select-${g.id}" style="flex:1;padding:5px 8px;font-size:0.78rem;">
                    <option value="">Add target...</option>
                    ${featureOptions}
                  </select>
                  <button class="tg-bulk-btn tg-bulk-select-all" onclick="window.targetGroups.addFeatureToGroup('${g.id}')">Add</button>
                </div>
                <div class="tg-bulk-bar">
                  <button class="tg-bulk-btn tg-bulk-archive" onclick="window.targetGroups.bulkArchive('${g.id}')">Archive All</button>
                  <button class="tg-bulk-btn tg-bulk-reset" onclick="window.targetGroups.bulkReset('${g.id}')">Clear Members</button>
                  <button class="tg-bulk-btn tg-bulk-delete" onclick="window.targetGroups.deleteGroup('${g.id}')">Delete Group</button>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  }

  function render() {
    const container = document.getElementById('target-groups-widget');
    if (!container) return;

    loadFeatures();

    container.innerHTML = `
      <div id="target-groups-card">
        <div class="card-header">
          <h3>📂 Target Groups</h3>
          <div style="display:flex;gap:6px;">
            <button class="tg-btn tg-btn-primary" onclick="window.targetGroups.showCreateForm()">Create Group</button>
          </div>
        </div>
        <div class="card-body">
          <!-- Filter bar -->
          <div class="tg-filter-bar" id="tg-filter-bar"></div>

          <!-- Groups list -->
          <div class="tg-groups-list" id="tg-groups-list"></div>

          <!-- Create form -->
          <div class="tg-create-section" id="tg-create-section">
            <div class="tg-create-row">
              <div class="tg-field" style="flex:1;">
                <label class="tg-label">Group Name</label>
                <input type="text" class="tg-input" id="tg-create-name" placeholder="e.g., Sprint 1, Core Features">
              </div>
              <div class="tg-field" style="width:50px;">
                <label class="tg-label">Color</label>
                <input type="color" class="tg-color-input" id="tg-create-color" value="#6366f1">
              </div>
            </div>
            <div class="tg-field">
              <label class="tg-label">Description (optional)</label>
              <input type="text" class="tg-input" id="tg-create-desc" placeholder="Brief description">
            </div>
            <div style="display:flex;gap:6px;">
              <button class="tg-btn tg-btn-primary" onclick="window.targetGroups.performCreate()">Create</button>
              <button class="tg-btn tg-btn-secondary" onclick="document.getElementById('tg-create-section').classList.remove('visible')">Cancel</button>
            </div>
          </div>

          <!-- Status -->
          <div class="tg-status" id="tg-status"></div>
        </div>
      </div>
    `;

    renderContent();
  }

  // --- Public API ---
  window.targetGroups = {
    createGroup,
    deleteGroup,
    renameGroup,
    addMember,
    removeMember,
    getGroup,
    getGroups: () => [...state.groups],
    setFilter,
    getFilteredFeatures,
    getActiveFilter: () => state.activeFilter,
    bulkArchive: bulkArchiveGroup,
    bulkReset: bulkResetGroup,
    toggleGroup,
    showCreateForm,
    performCreate,
    addFeatureToGroup,
    getState: () => ({ ...state }),
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
