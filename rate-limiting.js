// feat-100: Rate Limiting for API Calls
(function () {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    #rate-limit-card {
      background: var(--color-card-bg, #1e1e2e);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .rl-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .rl-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .rl-tabs { display: flex; gap: 4px; margin-bottom: 16px; background: var(--color-bg, #12121a); border-radius: 8px; padding: 3px; }
    .rl-tab { flex: 1; padding: 6px 12px; border: none; background: transparent; color: var(--color-text-secondary, #a0a0b0); cursor: pointer; border-radius: 6px; font-size: 13px; transition: all 0.2s; }
    .rl-tab.active { background: var(--color-primary, #6366f1); color: #fff; }
    .rl-tab:hover:not(.active) { background: rgba(255,255,255,0.05); }
    .rl-stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
    .rl-stat-card { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 12px; text-align: center; }
    .rl-stat-val { font-size: 20px; font-weight: 700; color: var(--color-text, #e0e0e0); }
    .rl-stat-label { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }
    .rl-list { display: flex; flex-direction: column; gap: 8px; }
    .rl-rule-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 14px; }
    .rl-rule-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .rl-rule-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .rl-badge { font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600; }
    .rl-rule-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
    .rl-usage-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 14px; }
    .rl-usage-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .rl-usage-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .rl-usage-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
    .rl-violation-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 14px; border-left: 3px solid #ef4444; }
    .rl-violation-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .rl-violation-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .rl-violation-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
  `;
  document.head.appendChild(style);

  const STORAGE_KEY = 'rate-limit-config';
  let state = { activeTab: 'rules' };

  function getRules() {
    return [
      { id: 'rule-001', name: 'Global Rate Limit', endpoint: '*', limit: 1000, window: 3600, strategy: 'sliding-window', enabled: true, action: 'throttle' },
      { id: 'rule-002', name: 'Auth Endpoint Limit', endpoint: '/api/auth/*', limit: 10, window: 60, strategy: 'fixed-window', enabled: true, action: 'block' },
      { id: 'rule-003', name: 'Feature API Limit', endpoint: '/api/features/*', limit: 100, window: 60, strategy: 'sliding-window', enabled: true, action: 'throttle' },
      { id: 'rule-004', name: 'Webhook Limit', endpoint: '/api/webhooks/*', limit: 50, window: 3600, strategy: 'token-bucket', enabled: true, action: 'throttle' },
      { id: 'rule-005', name: 'Harness Control Limit', endpoint: '/api/harness/*', limit: 20, window: 300, strategy: 'fixed-window', enabled: true, action: 'block' },
      { id: 'rule-006', name: 'Metrics Limit', endpoint: '/api/metrics/*', limit: 200, window: 60, strategy: 'sliding-window', enabled: false, action: 'throttle' },
    ];
  }

  function getRule(id) {
    return getRules().find(r => r.id === id) || null;
  }

  function getActiveRules() {
    return getRules().filter(r => r.enabled);
  }

  function getUsageStats() {
    return [
      { endpoint: '/api/features', currentUsage: 45, limit: 100, window: 60, remaining: 55, resetAt: new Date(Date.now() + 30000).toISOString(), percentage: 45 },
      { endpoint: '/api/status', currentUsage: 320, limit: 1000, window: 3600, remaining: 680, resetAt: new Date(Date.now() + 1800000).toISOString(), percentage: 32 },
      { endpoint: '/api/harness/start', currentUsage: 5, limit: 20, window: 300, remaining: 15, resetAt: new Date(Date.now() + 120000).toISOString(), percentage: 25 },
      { endpoint: '/api/webhooks', currentUsage: 12, limit: 50, window: 3600, remaining: 38, resetAt: new Date(Date.now() + 2400000).toISOString(), percentage: 24 },
      { endpoint: '/api/auth/login', currentUsage: 3, limit: 10, window: 60, remaining: 7, resetAt: new Date(Date.now() + 45000).toISOString(), percentage: 30 },
      { endpoint: '/api/metrics', currentUsage: 87, limit: 200, window: 60, remaining: 113, resetAt: new Date(Date.now() + 20000).toISOString(), percentage: 43.5 },
    ];
  }

  function getUsageForEndpoint(endpoint) {
    return getUsageStats().find(u => u.endpoint === endpoint) || null;
  }

  function getViolations() {
    return [
      { id: 'viol-001', endpoint: '/api/auth/login', timestamp: new Date(Date.now() - 3600000).toISOString(), ip: '192.168.1.45', ruleId: 'rule-002', attempts: 15, action: 'blocked', severity: 'high' },
      { id: 'viol-002', endpoint: '/api/features', timestamp: new Date(Date.now() - 7200000).toISOString(), ip: '10.0.0.22', ruleId: 'rule-003', attempts: 112, action: 'throttled', severity: 'medium' },
      { id: 'viol-003', endpoint: '/api/webhooks', timestamp: new Date(Date.now() - 14400000).toISOString(), ip: '172.16.0.8', ruleId: 'rule-004', attempts: 55, action: 'throttled', severity: 'low' },
      { id: 'viol-004', endpoint: '/api/harness/start', timestamp: new Date(Date.now() - 21600000).toISOString(), ip: '192.168.1.100', ruleId: 'rule-005', attempts: 25, action: 'blocked', severity: 'high' },
      { id: 'viol-005', endpoint: '/api/features', timestamp: new Date(Date.now() - 28800000).toISOString(), ip: '10.0.0.15', ruleId: 'rule-001', attempts: 1050, action: 'throttled', severity: 'medium' },
    ];
  }

  function getViolation(id) {
    return getViolations().find(v => v.id === id) || null;
  }

  function checkRateLimit(endpoint) {
    const usage = getUsageForEndpoint(endpoint);
    if (!usage) return { allowed: true, remaining: -1 };
    return {
      allowed: usage.remaining > 0,
      remaining: usage.remaining,
      limit: usage.limit,
      resetAt: usage.resetAt,
    };
  }

  function getRateLimitStats() {
    const rules = getRules();
    const violations = getViolations();
    return {
      totalRules: rules.length,
      activeRules: rules.filter(r => r.enabled).length,
      totalViolations: violations.length,
      endpointsMonitored: getUsageStats().length,
    };
  }

  // ── Render ────────────────────────────────────────────────────
  function render() {
    const container = document.getElementById('rate-limit-widget');
    if (!container) return;
    const stats = getRateLimitStats();

    container.innerHTML = `
      <div id="rate-limit-card">
        <div class="rl-header"><h3>API Rate Limiting</h3></div>
        <div class="rl-stats-row">
          <div class="rl-stat-card"><div class="rl-stat-val">${stats.totalRules}</div><div class="rl-stat-label">Rules</div></div>
          <div class="rl-stat-card"><div class="rl-stat-val">${stats.activeRules}</div><div class="rl-stat-label">Active</div></div>
          <div class="rl-stat-card"><div class="rl-stat-val">${stats.totalViolations}</div><div class="rl-stat-label">Violations</div></div>
          <div class="rl-stat-card"><div class="rl-stat-val">${stats.endpointsMonitored}</div><div class="rl-stat-label">Monitored</div></div>
        </div>
        <div class="rl-tabs">
          <button class="rl-tab ${state.activeTab === 'rules' ? 'active' : ''}" data-tab="rules">Rules</button>
          <button class="rl-tab ${state.activeTab === 'usage' ? 'active' : ''}" data-tab="usage">Usage</button>
          <button class="rl-tab ${state.activeTab === 'violations' ? 'active' : ''}" data-tab="violations">Violations</button>
        </div>
        <div id="rl-content"></div>
      </div>
    `;

    container.querySelectorAll('.rl-tab').forEach(btn => {
      btn.addEventListener('click', () => { state.activeTab = btn.dataset.tab; saveState(); render(); });
    });
    renderContent();
  }

  function renderContent() {
    const el = document.getElementById('rl-content');
    if (!el) return;
    if (state.activeTab === 'rules') renderRules(el);
    else if (state.activeTab === 'usage') renderUsage(el);
    else renderViolations(el);
  }

  function renderRules(el) {
    const rules = getRules();
    el.innerHTML = `
      <div class="rl-list" id="rl-rule-list">
        ${rules.map(r => `
          <div class="rl-rule-item" data-id="${r.id}">
            <div class="rl-rule-top">
              <div class="rl-rule-name">${r.name}</div>
              <span class="rl-badge" style="background:${r.enabled ? '#22c55e' : '#ef4444'}22;color:${r.enabled ? '#22c55e' : '#ef4444'}">${r.enabled ? 'Active' : 'Disabled'}</span>
            </div>
            <div class="rl-rule-detail">${r.endpoint} · ${r.limit} req/${r.window}s · ${r.strategy} · ${r.action}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderUsage(el) {
    const usage = getUsageStats();
    el.innerHTML = `
      <div id="rl-usage-section">
        <div class="rl-list" id="rl-usage-list">
          ${usage.map(u => {
            const color = u.percentage > 80 ? '#ef4444' : u.percentage > 50 ? '#f59e0b' : '#22c55e';
            return `
            <div class="rl-usage-item" data-endpoint="${u.endpoint}">
              <div class="rl-usage-top">
                <div class="rl-usage-name">${u.endpoint}</div>
                <span class="rl-badge" style="background:${color}22;color:${color}">${u.percentage}%</span>
              </div>
              <div class="rl-usage-detail">${u.currentUsage}/${u.limit} used · ${u.remaining} remaining · Window: ${u.window}s</div>
            </div>`;
          }).join('')}
        </div>
      </div>
    `;
  }

  function renderViolations(el) {
    const violations = getViolations();
    const sevColors = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };
    el.innerHTML = `
      <div id="rl-violations-section">
        <div class="rl-list" id="rl-violation-list">
          ${violations.map(v => `
            <div class="rl-violation-item" data-id="${v.id}">
              <div class="rl-violation-top">
                <div class="rl-violation-name">${v.endpoint}</div>
                <span class="rl-badge" style="background:${sevColors[v.severity]}22;color:${sevColors[v.severity]}">${v.severity}</span>
              </div>
              <div class="rl-violation-detail">IP: ${v.ip} · ${v.attempts} attempts · ${v.action} · Rule: ${v.ruleId}</div>
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

  window.rateLimiting = {
    getRules, getRule, getActiveRules,
    getUsageStats, getUsageForEndpoint,
    getViolations, getViolation,
    checkRateLimit, getRateLimitStats,
    setTab(tab) { state.activeTab = tab; saveState(); render(); },
    getState() {
      return {
        activeTab: state.activeTab,
        ruleCount: getRules().length,
        activeRuleCount: getActiveRules().length,
        violationCount: getViolations().length,
        monitoredCount: getUsageStats().length,
      };
    },
  };

  document.addEventListener('DOMContentLoaded', () => { loadState(); render(); });
})();
