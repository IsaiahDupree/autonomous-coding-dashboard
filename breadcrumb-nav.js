// feat-113: Breadcrumb Navigation
(function () {
  'use strict';
  const style = document.createElement('style');
  style.textContent = `
    #breadcrumb-nav-bar { background: var(--color-card-bg, #1e1e2e); border-bottom: 1px solid var(--color-border, #2e2e3e); padding: 8px 0; position: sticky; top: 0; z-index: 100; }
    .bn-container { max-width: 1400px; margin: 0 auto; padding: 0 24px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .bn-crumbs { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .bn-crumb { font-size: 13px; color: var(--color-text-secondary, #a0a0b0); cursor: pointer; text-decoration: none; transition: color 0.2s; white-space: nowrap; }
    .bn-crumb:hover { color: var(--color-primary, #6366f1); text-decoration: underline; }
    .bn-crumb.active { color: var(--color-text, #e0e0e0); font-weight: 600; cursor: default; pointer-events: none; text-decoration: none; }
    .bn-sep { font-size: 12px; color: var(--color-border, #2e2e3e); user-select: none; }
    .bn-meta { display: flex; align-items: center; gap: 8px; }
    .bn-back { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 6px; padding: 4px 10px; font-size: 12px; color: var(--color-text-secondary, #a0a0b0); cursor: pointer; transition: border-color 0.2s, color 0.2s; }
    .bn-back:hover { border-color: var(--color-primary, #6366f1); color: var(--color-text, #e0e0e0); }
    .bn-page-title { font-size: 13px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .bn-section-label { font-size: 11px; color: var(--color-text-secondary, #a0a0b0); background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); padding: 2px 8px; border-radius: 4px; }

    #breadcrumb-nav-card { background: var(--color-card-bg, #1e1e2e); border: 1px solid var(--color-border, #2e2e3e); border-radius: 12px; padding: 20px; margin-bottom: 16px; }
    .bnc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .bnc-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .bnc-badge { background: var(--color-primary, #6366f1); color: #fff; font-size: 11px; padding: 3px 10px; border-radius: 20px; }
    .bnc-preview { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 10px 16px; margin-bottom: 14px; }
    .bnc-preview .bn-crumbs { flex-wrap: wrap; }
    .bnc-history { display: flex; flex-direction: column; gap: 6px; }
    .bnc-hist-item { display: flex; align-items: center; justify-content: space-between; background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 7px; padding: 10px 14px; }
    .bnc-hist-path { font-size: 12px; color: var(--color-text, #e0e0e0); font-family: monospace; }
    .bnc-hist-time { font-size: 11px; color: var(--color-text-secondary, #a0a0b0); }
    .bnc-clear { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); cursor: pointer; text-decoration: underline; }
    .bnc-section-title { font-size: 12px; font-weight: 600; color: var(--color-text-secondary, #a0a0b0); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
  `;
  document.head.appendChild(style);

  const STORAGE_KEY = 'breadcrumb-nav-config';

  const PAGE_MAP = {
    'index.html': [{ label: 'Dashboard', href: 'index.html' }],
    'queue.html': [{ label: 'Dashboard', href: 'index.html' }, { label: 'Project Queue', href: 'queue.html' }],
    'control.html': [{ label: 'Dashboard', href: 'index.html' }, { label: 'Control Panel', href: 'control.html' }],
    'pct.html': [{ label: 'Dashboard', href: 'index.html' }, { label: 'Ad Creative', href: 'pct.html' }],
    'cf.html': [{ label: 'Dashboard', href: 'index.html' }, { label: 'Content Factory', href: 'cf.html' }],
  };

  function getPageName() {
    const path = window.location.pathname;
    const file = path.split('/').pop() || 'index.html';
    return file;
  }

  function getCrumbs() {
    const page = getPageName();
    return PAGE_MAP[page] || [{ label: 'Dashboard', href: 'index.html' }, { label: page, href: page }];
  }

  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY + '-history')) || []; } catch { return []; }
  }

  function saveHistory(h) { localStorage.setItem(STORAGE_KEY + '-history', JSON.stringify(h.slice(0, 20))); }

  function recordVisit() {
    const history = loadHistory();
    const page = getPageName();
    const crumbs = getCrumbs();
    const path = crumbs.map(c => c.label).join(' / ');
    const now = new Date().toISOString();
    history.unshift({ page, path, time: now });
    saveHistory(history);
  }

  function formatTime(iso) {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function clearHistory() {
    localStorage.removeItem(STORAGE_KEY + '-history');
    renderCard();
  }

  function navigateUp() {
    const crumbs = getCrumbs();
    if (crumbs.length > 1) {
      window.location.href = crumbs[crumbs.length - 2].href;
    }
  }

  function renderBar() {
    const bar = document.getElementById('breadcrumb-nav-bar');
    if (!bar) return;
    const crumbs = getCrumbs();
    const crumbHtml = crumbs.map((c, i) => {
      const isLast = i === crumbs.length - 1;
      const sep = i > 0 ? '<span class="bn-sep">/</span>' : '';
      return `${sep}<a class="bn-crumb${isLast ? ' active' : ''}" href="${c.href}">${c.label}</a>`;
    }).join('');
    const canGoUp = crumbs.length > 1;
    bar.innerHTML = `<div class="bn-container">
      <div class="bn-crumbs">${crumbHtml}</div>
      <div class="bn-meta">
        ${canGoUp ? `<button class="bn-back" onclick="window.breadcrumbNav.navigateUp()">← Up</button>` : ''}
        <span class="bn-section-label">${getPageName()}</span>
      </div>
    </div>`;
  }

  function renderCard() {
    const card = document.getElementById('breadcrumb-nav-card');
    if (!card) return;
    const history = loadHistory();
    const histHtml = history.slice(0, 8).map(h => `
      <div class="bnc-hist-item">
        <span class="bnc-hist-path">${h.path}</span>
        <span class="bnc-hist-time">${formatTime(h.time)}</span>
      </div>`).join('') || '<div style="color:var(--color-text-secondary,#a0a0b0);font-size:13px;text-align:center;padding:10px">No history yet</div>';
    const crumbs = getCrumbs();
    const previewHtml = crumbs.map((c, i) => {
      const isLast = i === crumbs.length - 1;
      const sep = i > 0 ? '<span class="bn-sep">/</span>' : '';
      return `${sep}<span class="bn-crumb${isLast ? ' active' : ''}">${c.label}</span>`;
    }).join('');

    card.innerHTML = `
      <div class="bnc-header">
        <h3>🗺️ Breadcrumb Navigation</h3>
        <span class="bnc-badge">Active</span>
      </div>
      <div class="bnc-section-title">Current Location</div>
      <div class="bnc-preview"><div class="bn-crumbs">${previewHtml}</div></div>
      <div class="bnc-section-title" style="display:flex;justify-content:space-between;align-items:center">
        <span>Navigation History</span>
        <span class="bnc-clear" onclick="window.breadcrumbNav.clearHistory()">Clear</span>
      </div>
      <div class="bnc-history">${histHtml}</div>`;
  }

  function init() {
    // Sticky breadcrumb bar (insert after header)
    const header = document.querySelector('header.header');
    const bar = document.createElement('div');
    bar.id = 'breadcrumb-nav-bar';
    if (header && header.nextSibling) {
      header.parentNode.insertBefore(bar, header.nextSibling);
    } else {
      document.body.insertBefore(bar, document.body.firstChild);
    }
    renderBar();

    // Card in main
    const main = document.querySelector('main.container');
    if (main) {
      const card = document.createElement('div');
      card.id = 'breadcrumb-nav-card';
      main.insertBefore(card, main.firstChild);
      renderCard();
    }

    recordVisit();
  }

  window.breadcrumbNav = {
    getCrumbs,
    navigateUp,
    clearHistory,
    getHistory: () => loadHistory(),
    getCurrentPage: () => getPageName(),
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
