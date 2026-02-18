// feat-114: Global Search Across All Entities
(function () {
  'use strict';
  const style = document.createElement('style');
  style.textContent = `
    #global-search-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 10000; align-items: flex-start; justify-content: center; padding-top: 80px; }
    #global-search-overlay.open { display: flex; }
    #global-search-modal { background: var(--color-card-bg, #1e1e2e); border: 1px solid var(--color-border, #2e2e3e); border-radius: 14px; width: 100%; max-width: 620px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.6); }
    .gs-input-wrap { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-bottom: 1px solid var(--color-border, #2e2e3e); }
    .gs-search-icon { font-size: 16px; color: var(--color-text-secondary, #a0a0b0); flex-shrink: 0; }
    #gs-input { flex: 1; background: transparent; border: none; outline: none; font-size: 16px; color: var(--color-text, #e0e0e0); }
    #gs-input::placeholder { color: var(--color-text-secondary, #a0a0b0); }
    .gs-close-key { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 4px; font-size: 11px; color: var(--color-text-secondary, #a0a0b0); padding: 2px 7px; cursor: pointer; font-family: monospace; }
    .gs-results { max-height: 420px; overflow-y: auto; padding: 10px; }
    .gs-section-title { font-size: 11px; font-weight: 700; color: var(--color-text-secondary, #a0a0b0); text-transform: uppercase; letter-spacing: 0.7px; padding: 6px 8px 4px; }
    .gs-result { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 8px; cursor: pointer; transition: background 0.15s; }
    .gs-result:hover, .gs-result.focused { background: rgba(99,102,241,0.12); }
    .gs-result-icon { font-size: 16px; flex-shrink: 0; }
    .gs-result-body { flex: 1; min-width: 0; }
    .gs-result-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .gs-result-sub { font-size: 11px; color: var(--color-text-secondary, #a0a0b0); }
    .gs-result-tag { font-size: 11px; padding: 2px 8px; border-radius: 4px; border: 1px solid var(--color-border, #2e2e3e); color: var(--color-text-secondary, #a0a0b0); flex-shrink: 0; }
    .gs-empty { text-align: center; padding: 32px 16px; color: var(--color-text-secondary, #a0a0b0); font-size: 14px; }
    .gs-footer { border-top: 1px solid var(--color-border, #2e2e3e); padding: 8px 18px; display: flex; gap: 16px; align-items: center; }
    .gs-footer-hint { font-size: 11px; color: var(--color-text-secondary, #a0a0b0); display: flex; align-items: center; gap: 4px; }
    .gs-key { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 3px; font-size: 10px; padding: 1px 6px; font-family: monospace; }
    .gs-highlight { color: var(--color-primary, #6366f1); font-weight: 700; }

    #global-search-card { background: var(--color-card-bg, #1e1e2e); border: 1px solid var(--color-border, #2e2e3e); border-radius: 12px; padding: 20px; margin-bottom: 16px; }
    .gsc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
    .gsc-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .gsc-badge { background: var(--color-primary, #6366f1); color: #fff; font-size: 11px; padding: 3px 10px; border-radius: 20px; }
    .gsc-open-btn { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 10px 16px; font-size: 14px; color: var(--color-text-secondary, #a0a0b0); cursor: pointer; width: 100%; text-align: left; display: flex; align-items: center; justify-content: space-between; transition: border-color 0.2s; margin-bottom: 14px; }
    .gsc-open-btn:hover { border-color: var(--color-primary, #6366f1); }
    .gsc-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .gsc-stat { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 10px; text-align: center; }
    .gsc-stat-val { font-size: 22px; font-weight: 700; color: var(--color-text, #e0e0e0); }
    .gsc-stat-label { font-size: 11px; color: var(--color-text-secondary, #a0a0b0); margin-top: 2px; }
  `;
  document.head.appendChild(style);

  const STORAGE_KEY = 'global-search-config';

  // Build search index from various data sources
  function buildIndex() {
    const items = [];

    // Pages
    const pages = [
      { name: 'Dashboard', href: 'index.html', icon: '📊', type: 'Page' },
      { name: 'Project Queue', href: 'queue.html', icon: '📋', type: 'Page' },
      { name: 'Control Panel', href: 'control.html', icon: '🎮', type: 'Page' },
      { name: 'Ad Creative (PCT)', href: 'pct.html', icon: '🎯', type: 'Page' },
      { name: 'Content Factory', href: 'cf.html', icon: '🏭', type: 'Page' },
    ];
    pages.forEach(p => items.push({ ...p, category: 'Pages', action: () => { window.location.href = p.href; } }));

    // Actions
    const actions = [
      { name: 'Open Settings', icon: '⚙️', type: 'Action', action: () => { if (typeof openSettingsModal === 'function') openSettingsModal(); } },
      { name: 'Open Help', icon: '❓', type: 'Action', action: () => { if (typeof openHelpModal === 'function') openHelpModal(); } },
      { name: 'Add Requirement (PRD)', icon: '➕', type: 'Action', action: () => { if (typeof openPrdInputModal === 'function') openPrdInputModal(); } },
      { name: 'Toggle Theme', icon: '🌙', type: 'Action', action: () => { const btn = document.getElementById('theme-toggle'); if (btn) btn.click(); } },
      { name: 'Start Harness', icon: '▶️', type: 'Action', action: () => { if (typeof startHarness === 'function') startHarness(); } },
      { name: 'Stop Harness', icon: '⏹️', type: 'Action', action: () => { if (typeof stopHarness === 'function') stopHarness(); } },
    ];
    actions.forEach(a => items.push({ ...a, category: 'Actions' }));

    // Features from DOM table
    const rows = document.querySelectorAll('#features-table tbody tr, .feature-row');
    rows.forEach(row => {
      const id = row.dataset.id || row.querySelector('[data-id]')?.dataset.id;
      const desc = row.querySelector('.feature-description, td:nth-child(2)')?.textContent?.trim();
      if (desc) {
        items.push({ name: desc, icon: '✅', type: 'Feature', category: 'Features', sub: id || '', action: () => { row.scrollIntoView({ behavior: 'smooth', block: 'center' }); row.style.outline = '2px solid var(--color-primary,#6366f1)'; setTimeout(() => row.style.outline = '', 3000); } });
      }
    });

    // Logs from visible log viewer
    const logLines = document.querySelectorAll('.log-line');
    let logCount = 0;
    logLines.forEach(line => {
      if (logCount > 20) return;
      const text = line.textContent?.trim();
      if (text && text.length > 5) {
        items.push({ name: text.substring(0, 80), icon: '📋', type: 'Log', category: 'Logs', sub: 'Log entry', action: () => { line.scrollIntoView({ behavior: 'smooth', block: 'center' }); } });
        logCount++;
      }
    });

    return items;
  }

  function fuzzyMatch(text, query) {
    if (!query) return true;
    const t = text.toLowerCase();
    const q = query.toLowerCase();
    let qi = 0;
    for (let i = 0; i < t.length && qi < q.length; i++) {
      if (t[i] === q[qi]) qi++;
    }
    return qi === q.length;
  }

  function search(query) {
    if (!query || query.length < 1) return [];
    const index = buildIndex();
    return index.filter(item => fuzzyMatch(item.name, query) || (item.sub && fuzzyMatch(item.sub, query))).slice(0, 40);
  }

  function highlight(text, query) {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx < 0) return text;
    return text.substring(0, idx) + `<span class="gs-highlight">${text.substring(idx, idx + query.length)}</span>` + text.substring(idx + query.length);
  }

  let isOpen = false;
  let currentResults = [];
  let focusedIdx = -1;

  function open() {
    const overlay = document.getElementById('global-search-overlay');
    if (overlay) { overlay.classList.add('open'); const input = document.getElementById('gs-input'); if (input) { input.value = ''; input.focus(); renderResults(''); } }
    isOpen = true;
  }

  function close() {
    const overlay = document.getElementById('global-search-overlay');
    if (overlay) overlay.classList.remove('open');
    isOpen = false; focusedIdx = -1;
  }

  function selectResult(idx) {
    const r = currentResults[idx];
    if (r && r.action) { r.action(); close(); }
  }

  function renderResults(query) {
    const container = document.getElementById('gs-results-container');
    if (!container) return;
    const results = search(query);
    currentResults = results;
    focusedIdx = -1;
    if (!query) { container.innerHTML = `<div class="gs-empty">Start typing to search features, pages, actions, and logs...</div>`; return; }
    if (!results.length) { container.innerHTML = `<div class="gs-empty">No results for "<strong>${query}</strong>"</div>`; return; }

    const grouped = {};
    results.forEach((r, i) => {
      if (!grouped[r.category]) grouped[r.category] = [];
      grouped[r.category].push({ ...r, _idx: i });
    });

    const html = Object.entries(grouped).map(([cat, items]) => `
      <div class="gs-section-title">${cat} (${items.length})</div>
      ${items.map(r => `
        <div class="gs-result" data-idx="${r._idx}" onclick="window.globalSearch._select(${r._idx})">
          <div class="gs-result-icon">${r.icon}</div>
          <div class="gs-result-body">
            <div class="gs-result-name">${highlight(r.name, query)}</div>
            ${r.sub ? `<div class="gs-result-sub">${r.sub}</div>` : ''}
          </div>
          <div class="gs-result-tag">${r.type}</div>
        </div>`).join('')}
    `).join('');
    container.innerHTML = html;
  }

  function handleKey(e) {
    if (!isOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    if (e.key === 'Enter' && focusedIdx >= 0) { e.preventDefault(); selectResult(focusedIdx); }
    if (e.key === 'ArrowDown') { e.preventDefault(); focusedIdx = Math.min(focusedIdx + 1, currentResults.length - 1); updateFocus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); focusedIdx = Math.max(focusedIdx - 1, 0); updateFocus(); }
  }

  function updateFocus() {
    document.querySelectorAll('.gs-result').forEach((el, i) => el.classList.toggle('focused', i === focusedIdx));
    const focused = document.querySelector('.gs-result.focused');
    if (focused) focused.scrollIntoView({ block: 'nearest' });
  }

  function initOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'global-search-overlay';
    overlay.innerHTML = `
      <div id="global-search-modal">
        <div class="gs-input-wrap">
          <span class="gs-search-icon">🔍</span>
          <input id="gs-input" placeholder="Search features, pages, actions, logs..." autocomplete="off" oninput="window.globalSearch._input(this.value)">
          <span class="gs-close-key" onclick="window.globalSearch.close()">Esc</span>
        </div>
        <div class="gs-results" id="gs-results-container"></div>
        <div class="gs-footer">
          <span class="gs-footer-hint"><span class="gs-key">↑↓</span> Navigate</span>
          <span class="gs-footer-hint"><span class="gs-key">↵</span> Select</span>
          <span class="gs-footer-hint"><span class="gs-key">Esc</span> Close</span>
        </div>
      </div>`;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.body.appendChild(overlay);
  }

  function initCard() {
    const main = document.querySelector('main.container');
    if (!main) return;
    const card = document.createElement('div');
    card.id = 'global-search-card';
    const index = buildIndex();
    const pages = index.filter(i => i.category === 'Pages').length;
    const actions = index.filter(i => i.category === 'Actions').length;
    const features = index.filter(i => i.category === 'Features').length;
    card.innerHTML = `
      <div class="gsc-header">
        <h3>🔍 Global Search</h3>
        <span class="gsc-badge">Fuzzy Match</span>
      </div>
      <button class="gsc-open-btn" onclick="window.globalSearch.open()">
        <span>🔍 Search everything...</span>
        <span style="font-size:12px;font-family:monospace">Ctrl+K</span>
      </button>
      <div class="gsc-stats">
        <div class="gsc-stat"><div class="gsc-stat-val">${pages}</div><div class="gsc-stat-label">Pages</div></div>
        <div class="gsc-stat"><div class="gsc-stat-val">${actions}</div><div class="gsc-stat-label">Actions</div></div>
        <div class="gsc-stat"><div class="gsc-stat-val">${features}</div><div class="gsc-stat-label">Features</div></div>
      </div>`;
    main.insertBefore(card, main.firstChild);
  }

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); isOpen ? close() : open(); }
    handleKey(e);
  });

  window.globalSearch = {
    open,
    close,
    search,
    getIndex: () => buildIndex(),
    _input: (v) => renderResults(v),
    _select: (i) => selectResult(i),
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { initOverlay(); initCard(); });
  } else {
    initOverlay(); initCard();
  }
})();
