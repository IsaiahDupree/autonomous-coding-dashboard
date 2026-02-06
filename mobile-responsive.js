// feat-090: Mobile-Responsive Dashboard
(function () {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    #mobile-responsive-card {
      background: var(--color-card-bg, #1e1e2e);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .mr-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
    }
    .mr-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .mr-tabs {
      display: flex; gap: 4px; margin-bottom: 16px;
      background: var(--color-bg, #12121a); border-radius: 8px; padding: 3px;
    }
    .mr-tab {
      flex: 1; padding: 6px 12px; border: none; background: transparent;
      color: var(--color-text-secondary, #a0a0b0); cursor: pointer; border-radius: 6px;
      font-size: 13px; transition: all 0.2s;
    }
    .mr-tab.active { background: var(--color-primary, #6366f1); color: #fff; }
    .mr-tab:hover:not(.active) { background: rgba(255,255,255,0.05); }
    .mr-stats-row {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px;
    }
    .mr-stat-card {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 12px; text-align: center;
    }
    .mr-stat-val { font-size: 20px; font-weight: 700; color: var(--color-text, #e0e0e0); }
    .mr-stat-label { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }
    .mr-list { display: flex; flex-direction: column; gap: 8px; }
    .mr-breakpoint-item {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 14px;
    }
    .mr-item-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .mr-item-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .mr-badge { font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600; }
    .mr-item-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
    .mr-touch-item {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 14px;
    }
    .mr-touch-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .mr-touch-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .mr-touch-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
    .mr-metric-item {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 14px;
    }
    .mr-metric-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .mr-metric-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .mr-metric-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
  `;
  document.head.appendChild(style);

  const STORAGE_KEY = 'mobile-responsive-config';

  let state = {
    activeTab: 'breakpoints',
    currentBreakpoint: 'desktop',
  };

  function getBreakpoints() {
    return [
      { id: 'bp-phone-sm', name: 'Small Phone', device: 'phone', minWidth: 0, maxWidth: 375, columns: 1, fontSize: 14, touchTarget: 44, active: false },
      { id: 'bp-phone', name: 'Phone', device: 'phone', minWidth: 376, maxWidth: 480, columns: 1, fontSize: 14, touchTarget: 44, active: false },
      { id: 'bp-phone-lg', name: 'Large Phone', device: 'phone', minWidth: 481, maxWidth: 640, columns: 1, fontSize: 15, touchTarget: 44, active: false },
      { id: 'bp-tablet-sm', name: 'Small Tablet', device: 'tablet', minWidth: 641, maxWidth: 768, columns: 2, fontSize: 15, touchTarget: 40, active: false },
      { id: 'bp-tablet', name: 'Tablet', device: 'tablet', minWidth: 769, maxWidth: 1024, columns: 2, fontSize: 16, touchTarget: 40, active: false },
      { id: 'bp-desktop', name: 'Desktop', device: 'desktop', minWidth: 1025, maxWidth: 1440, columns: 3, fontSize: 16, touchTarget: 32, active: true },
      { id: 'bp-desktop-lg', name: 'Large Desktop', device: 'desktop', minWidth: 1441, maxWidth: 9999, columns: 4, fontSize: 16, touchTarget: 32, active: false },
    ];
  }

  function getCurrentBreakpoint() {
    const w = window.innerWidth || 1280;
    const bps = getBreakpoints();
    for (const bp of bps) {
      if (w >= bp.minWidth && w <= bp.maxWidth) return { ...bp, active: true };
    }
    return bps[bps.length - 1];
  }

  function getBreakpointForWidth(width) {
    const bps = getBreakpoints();
    for (const bp of bps) {
      if (width >= bp.minWidth && width <= bp.maxWidth) return { ...bp, active: true };
    }
    return bps[bps.length - 1];
  }

  function getTouchControls() {
    return [
      { id: 'tc-tap', name: 'Tap', gesture: 'tap', action: 'Select/Activate', minTarget: 44, enabled: true, description: 'Single tap to select items and activate buttons' },
      { id: 'tc-swipe', name: 'Swipe', gesture: 'swipe', action: 'Navigate', minTarget: 0, enabled: true, description: 'Swipe left/right to navigate between tabs' },
      { id: 'tc-long-press', name: 'Long Press', gesture: 'longpress', action: 'Context Menu', minTarget: 44, enabled: true, description: 'Long press for additional options' },
      { id: 'tc-pinch', name: 'Pinch', gesture: 'pinch', action: 'Zoom', minTarget: 0, enabled: true, description: 'Pinch to zoom on charts and data views' },
      { id: 'tc-pull-refresh', name: 'Pull to Refresh', gesture: 'pull', action: 'Refresh Data', minTarget: 0, enabled: true, description: 'Pull down to refresh dashboard data' },
      { id: 'tc-double-tap', name: 'Double Tap', gesture: 'doubletap', action: 'Quick Expand', minTarget: 44, enabled: true, description: 'Double tap to expand widget details' },
    ];
  }

  function toggleTouchControl(id) {
    const controls = getTouchControls();
    const control = controls.find(c => c.id === id);
    if (!control) return false;
    control.enabled = !control.enabled;
    return control.enabled;
  }

  function getKeyMetrics() {
    return [
      { id: 'km-features', name: 'Features Passing', value: '88/120', percent: 73, priority: 'high', visible: true, mobileOptimized: true },
      { id: 'km-active', name: 'Active Agents', value: '3', percent: 75, priority: 'high', visible: true, mobileOptimized: true },
      { id: 'km-uptime', name: 'System Uptime', value: '99.8%', percent: 99.8, priority: 'high', visible: true, mobileOptimized: true },
      { id: 'km-errors', name: 'Recent Errors', value: '2', percent: 2, priority: 'medium', visible: true, mobileOptimized: true },
      { id: 'km-memory', name: 'Memory Usage', value: '45%', percent: 45, priority: 'medium', visible: true, mobileOptimized: true },
      { id: 'km-build', name: 'Build Status', value: 'Passing', percent: 100, priority: 'high', visible: true, mobileOptimized: true },
      { id: 'km-coverage', name: 'Test Coverage', value: '87%', percent: 87, priority: 'low', visible: true, mobileOptimized: false },
      { id: 'km-deploy', name: 'Last Deploy', value: '2h ago', percent: 0, priority: 'low', visible: true, mobileOptimized: false },
    ];
  }

  function getMetric(id) {
    return getKeyMetrics().find(m => m.id === id) || null;
  }

  function toggleMetricVisibility(id) {
    const metrics = getKeyMetrics();
    const metric = metrics.find(m => m.id === id);
    if (!metric) return false;
    metric.visible = !metric.visible;
    return !metric.visible;
  }

  function getResponsiveStatus() {
    const bp = getCurrentBreakpoint();
    const controls = getTouchControls();
    const metrics = getKeyMetrics();
    return {
      currentDevice: bp.device,
      breakpoint: bp.name,
      columns: bp.columns,
      touchEnabled: bp.device !== 'desktop',
      touchControls: controls.filter(c => c.enabled).length,
      visibleMetrics: metrics.filter(m => m.visible).length,
      mobileOptimized: metrics.filter(m => m.mobileOptimized).length,
    };
  }

  // ── Render ────────────────────────────────────────────────────
  function render() {
    const container = document.getElementById('mobile-responsive-widget');
    if (!container) return;
    const status = getResponsiveStatus();

    container.innerHTML = `
      <div id="mobile-responsive-card">
        <div class="mr-header"><h3>Mobile-Responsive Dashboard</h3></div>
        <div class="mr-stats-row">
          <div class="mr-stat-card"><div class="mr-stat-val">${status.breakpoint}</div><div class="mr-stat-label">Breakpoint</div></div>
          <div class="mr-stat-card"><div class="mr-stat-val">${status.columns} Col</div><div class="mr-stat-label">Layout</div></div>
          <div class="mr-stat-card"><div class="mr-stat-val">${status.touchControls}</div><div class="mr-stat-label">Touch Controls</div></div>
          <div class="mr-stat-card"><div class="mr-stat-val">${status.visibleMetrics}</div><div class="mr-stat-label">Visible Metrics</div></div>
        </div>
        <div class="mr-tabs">
          <button class="mr-tab ${state.activeTab === 'breakpoints' ? 'active' : ''}" data-tab="breakpoints">Breakpoints</button>
          <button class="mr-tab ${state.activeTab === 'touch' ? 'active' : ''}" data-tab="touch">Touch Controls</button>
          <button class="mr-tab ${state.activeTab === 'metrics' ? 'active' : ''}" data-tab="metrics">Key Metrics</button>
        </div>
        <div id="mr-content"></div>
      </div>
    `;

    container.querySelectorAll('.mr-tab').forEach(btn => {
      btn.addEventListener('click', () => { state.activeTab = btn.dataset.tab; saveState(); render(); });
    });
    renderContent();
  }

  function renderContent() {
    const el = document.getElementById('mr-content');
    if (!el) return;
    if (state.activeTab === 'breakpoints') renderBreakpoints(el);
    else if (state.activeTab === 'touch') renderTouch(el);
    else renderMetrics(el);
  }

  function renderBreakpoints(el) {
    const bps = getBreakpoints();
    const current = getCurrentBreakpoint();
    el.innerHTML = `
      <div class="mr-list" id="mr-breakpoint-list">
        ${bps.map(bp => `
          <div class="mr-breakpoint-item" data-id="${bp.id}">
            <div class="mr-item-top">
              <div class="mr-item-name">${bp.name}</div>
              <span class="mr-badge" style="background:${bp.id === current.id ? '#22c55e' : '#6b7280'}22;color:${bp.id === current.id ? '#22c55e' : '#6b7280'}">${bp.id === current.id ? 'Active' : bp.device}</span>
            </div>
            <div class="mr-item-detail">${bp.minWidth}-${bp.maxWidth}px · ${bp.columns} col · ${bp.fontSize}px · ${bp.touchTarget}px touch</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderTouch(el) {
    const controls = getTouchControls();
    el.innerHTML = `
      <div id="mr-touch-section">
        <div class="mr-list" id="mr-touch-list">
          ${controls.map(c => `
            <div class="mr-touch-item" data-id="${c.id}">
              <div class="mr-touch-top">
                <div class="mr-touch-name">${c.name}</div>
                <span class="mr-badge" style="background:${c.enabled ? '#22c55e' : '#6b7280'}22;color:${c.enabled ? '#22c55e' : '#6b7280'}">${c.enabled ? 'Enabled' : 'Disabled'}</span>
              </div>
              <div class="mr-touch-detail">${c.gesture} → ${c.action}${c.minTarget > 0 ? ' · Min target: ' + c.minTarget + 'px' : ''}</div>
              <div class="mr-touch-detail">${c.description}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderMetrics(el) {
    const metrics = getKeyMetrics();
    el.innerHTML = `
      <div id="mr-metrics-section">
        <div class="mr-list" id="mr-metric-list">
          ${metrics.map(m => `
            <div class="mr-metric-item" data-id="${m.id}">
              <div class="mr-metric-top">
                <div class="mr-metric-name">${m.name}</div>
                <span class="mr-badge" style="background:${m.mobileOptimized ? '#22c55e' : '#f59e0b'}22;color:${m.mobileOptimized ? '#22c55e' : '#f59e0b'}">${m.value}</span>
              </div>
              <div class="mr-metric-detail">Priority: ${m.priority} · ${m.visible ? 'Visible' : 'Hidden'} · ${m.mobileOptimized ? 'Mobile optimized' : 'Desktop only'}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeTab: state.activeTab })); } catch (e) {}
  }
  function loadState() {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) { const p = JSON.parse(s); state.activeTab = p.activeTab || state.activeTab; }
    } catch (e) {}
  }

  window.mobileResponsive = {
    getBreakpoints, getCurrentBreakpoint, getBreakpointForWidth,
    getTouchControls, toggleTouchControl,
    getKeyMetrics, getMetric, toggleMetricVisibility,
    getResponsiveStatus,
    setTab(tab) { state.activeTab = tab; saveState(); render(); },
    getState() {
      return {
        activeTab: state.activeTab,
        currentBreakpoint: getCurrentBreakpoint().name,
        breakpointCount: getBreakpoints().length,
        touchControlCount: getTouchControls().length,
        metricCount: getKeyMetrics().length,
      };
    },
  };

  document.addEventListener('DOMContentLoaded', () => { loadState(); render(); });
})();
