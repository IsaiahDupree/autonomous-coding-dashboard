// feat-112: Quick Actions Menu
(function () {
  'use strict';
  const style = document.createElement('style');
  style.textContent = `
    #quick-actions-fab { position: fixed; bottom: 28px; right: 28px; z-index: 9000; display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }
    .qa-trigger { width: 52px; height: 52px; border-radius: 50%; background: var(--color-primary, #6366f1); border: none; color: #fff; font-size: 22px; cursor: pointer; box-shadow: 0 4px 16px rgba(99,102,241,0.5); transition: transform 0.2s, opacity 0.2s; display: flex; align-items: center; justify-content: center; }
    .qa-trigger:hover { transform: scale(1.1); }
    .qa-trigger.open { transform: rotate(45deg); }
    .qa-menu { display: none; flex-direction: column; gap: 6px; align-items: flex-end; }
    .qa-menu.open { display: flex; }
    .qa-item { display: flex; align-items: center; gap: 10px; cursor: pointer; }
    .qa-label { background: var(--color-card-bg, #1e1e2e); border: 1px solid var(--color-border, #2e2e3e); color: var(--color-text, #e0e0e0); font-size: 13px; padding: 5px 12px; border-radius: 6px; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
    .qa-icon-btn { width: 38px; height: 38px; border-radius: 50%; background: var(--color-card-bg, #1e1e2e); border: 1px solid var(--color-border, #2e2e3e); display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); transition: background 0.2s; }
    .qa-icon-btn:hover { background: var(--color-primary, #6366f1); }

    #quick-actions-card { background: var(--color-card-bg, #1e1e2e); border: 1px solid var(--color-border, #2e2e3e); border-radius: 12px; padding: 20px; margin-bottom: 16px; }
    .qac-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .qac-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .qac-shortcut { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); padding: 2px 8px; border-radius: 4px; font-family: monospace; }
    .qac-search { width: 100%; box-sizing: border-box; background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 9px 14px; font-size: 14px; color: var(--color-text, #e0e0e0); margin-bottom: 14px; outline: none; }
    .qac-search:focus { border-color: var(--color-primary, #6366f1); }
    .qac-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
    .qac-action { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 9px; padding: 14px 12px; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: border-color 0.2s, background 0.2s; }
    .qac-action:hover { border-color: var(--color-primary, #6366f1); background: rgba(99,102,241,0.08); }
    .qac-action-icon { font-size: 18px; }
    .qac-action-body {}
    .qac-action-name { font-size: 13px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .qac-action-keys { font-size: 11px; color: var(--color-text-secondary, #a0a0b0); font-family: monospace; }
    .qac-no-results { text-align: center; color: var(--color-text-secondary, #a0a0b0); font-size: 13px; padding: 16px 0; }
  `;
  document.head.appendChild(style);

  const STORAGE_KEY = 'quick-actions-config';

  const ACTIONS = [
    { id: 'qa-dashboard', icon: '📊', name: 'Go to Dashboard', shortcut: 'Alt+D', fn: () => { window.location.href = 'index.html'; } },
    { id: 'qa-queue', icon: '📋', name: 'Project Queue', shortcut: 'Alt+Q', fn: () => { window.location.href = 'queue.html'; } },
    { id: 'qa-control', icon: '🎮', name: 'Control Panel', shortcut: 'Alt+C', fn: () => { window.location.href = 'control.html'; } },
    { id: 'qa-pct', icon: '🎯', name: 'Ad Creative', shortcut: 'Alt+A', fn: () => { window.location.href = 'pct.html'; } },
    { id: 'qa-factory', icon: '🏭', name: 'Content Factory', shortcut: 'Alt+F', fn: () => { window.location.href = 'cf.html'; } },
    { id: 'qa-settings', icon: '⚙️', name: 'Open Settings', shortcut: 'Alt+S', fn: () => { if (typeof openSettingsModal === 'function') openSettingsModal(); } },
    { id: 'qa-help', icon: '❓', name: 'Open Help', shortcut: 'Alt+H', fn: () => { if (typeof openHelpModal === 'function') openHelpModal(); } },
    { id: 'qa-harness', icon: '▶️', name: 'Start Harness', shortcut: 'Alt+R', fn: () => { if (typeof startHarness === 'function') startHarness(); } },
    { id: 'qa-search', icon: '🔍', name: 'Global Search', shortcut: 'Ctrl+K', fn: () => { if (typeof window.globalSearch !== 'undefined') window.globalSearch.open(); } },
    { id: 'qa-prd', icon: '➕', name: 'Add Requirement', shortcut: 'Alt+N', fn: () => { if (typeof openPrdInputModal === 'function') openPrdInputModal(); } },
    { id: 'qa-theme', icon: '🌙', name: 'Toggle Theme', shortcut: 'Alt+T', fn: () => { const btn = document.getElementById('theme-toggle'); if (btn) btn.click(); } },
    { id: 'qa-notif', icon: '🔔', name: 'Notifications', shortcut: 'Alt+Bell', fn: () => { const cb = document.getElementById('notifications-toggle'); if (cb) { cb.click(); } } },
  ];

  let menuOpen = false;
  let filterQuery = '';

  function state() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
  }

  function saveState(s) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

  function toggleFab() {
    menuOpen = !menuOpen;
    const trigger = document.getElementById('qa-fab-trigger');
    const menu = document.getElementById('qa-fab-menu');
    if (trigger) trigger.classList.toggle('open', menuOpen);
    if (menu) menu.classList.toggle('open', menuOpen);
  }

  function runAction(id) {
    const action = ACTIONS.find(a => a.id === id);
    if (action) { action.fn(); menuOpen = false; const menu = document.getElementById('qa-fab-menu'); if (menu) menu.classList.remove('open'); const trigger = document.getElementById('qa-fab-trigger'); if (trigger) trigger.classList.remove('open'); }
  }

  function filterActions(q) {
    filterQuery = q.toLowerCase();
    renderCard();
  }

  function getFilteredActions() {
    if (!filterQuery) return ACTIONS;
    return ACTIONS.filter(a => a.name.toLowerCase().includes(filterQuery) || a.shortcut.toLowerCase().includes(filterQuery));
  }

  function renderCard() {
    const card = document.getElementById('quick-actions-card');
    if (!card) return;
    const filtered = getFilteredActions();
    const grid = filtered.map(a => `
      <div class="qac-action" onclick="window.quickActions.run('${a.id}')" title="${a.shortcut}">
        <div class="qac-action-icon">${a.icon}</div>
        <div class="qac-action-body">
          <div class="qac-action-name">${a.name}</div>
          <div class="qac-action-keys">${a.shortcut}</div>
        </div>
      </div>`).join('');
    card.innerHTML = `
      <div class="qac-header">
        <h3>⚡ Quick Actions</h3>
        <span class="qac-shortcut">Ctrl+K</span>
      </div>
      <input class="qac-search" id="qac-search-input" placeholder="Search actions..." value="${filterQuery}" oninput="window.quickActions.filter(this.value)">
      <div class="qac-grid">${grid || '<div class="qac-no-results">No actions match "' + filterQuery + '"</div>'}</div>`;
  }

  function initFab() {
    const fab = document.createElement('div');
    fab.id = 'quick-actions-fab';
    fab.innerHTML = `
      <div class="qa-menu" id="qa-fab-menu">
        ${ACTIONS.slice(0, 6).map(a => `
          <div class="qa-item" onclick="window.quickActions.run('${a.id}')">
            <div class="qa-label">${a.name}</div>
            <div class="qa-icon-btn">${a.icon}</div>
          </div>`).join('')}
      </div>
      <button class="qa-trigger" id="qa-fab-trigger" onclick="window.quickActions.toggleFab()" title="Quick Actions (Ctrl+K)">+</button>`;
    document.body.appendChild(fab);
  }

  function initCard() {
    const main = document.querySelector('main.container');
    if (!main) return;
    const card = document.createElement('div');
    card.id = 'quick-actions-card';
    main.insertBefore(card, main.firstChild);
    renderCard();
  }

  function handleKeydown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const input = document.getElementById('qac-search-input');
      if (input) input.focus();
    }
    if (e.altKey) {
      const map = { 'd': 'qa-dashboard', 'q': 'qa-queue', 'c': 'qa-control', 'a': 'qa-pct', 'f': 'qa-factory', 's': 'qa-settings', 'h': 'qa-help', 'r': 'qa-harness', 'n': 'qa-prd', 't': 'qa-theme' };
      if (map[e.key.toLowerCase()]) { e.preventDefault(); runAction(map[e.key.toLowerCase()]); }
    }
  }

  window.quickActions = {
    toggleFab,
    run: runAction,
    filter: filterActions,
    getActions: () => ACTIONS.map(a => ({ id: a.id, name: a.name, shortcut: a.shortcut, icon: a.icon })),
    getAction: (id) => ACTIONS.find(a => a.id === id) || null,
    getFilteredActions,
    open: () => { const input = document.getElementById('qac-search-input'); if (input) input.focus(); },
  };

  document.addEventListener('keydown', handleKeydown);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { initCard(); initFab(); });
  } else {
    initCard(); initFab();
  }
})();
