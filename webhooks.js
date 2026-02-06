// feat-082: Webhook Support for Events
(function () {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    #webhooks-card {
      background: var(--color-card-bg, #1e1e2e);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .wh-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
    }
    .wh-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .wh-tabs {
      display: flex; gap: 4px; margin-bottom: 16px;
      background: var(--color-bg, #12121a); border-radius: 8px; padding: 3px;
    }
    .wh-tab {
      flex: 1; padding: 6px 12px; border: none; background: transparent;
      color: var(--color-text-secondary, #a0a0b0); cursor: pointer; border-radius: 6px;
      font-size: 13px; transition: all 0.2s;
    }
    .wh-tab.active { background: var(--color-primary, #6366f1); color: #fff; }
    .wh-tab:hover:not(.active) { background: rgba(255,255,255,0.05); }
    .wh-stats-row {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px;
    }
    .wh-stat-card {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 12px; text-align: center;
    }
    .wh-stat-val { font-size: 20px; font-weight: 700; color: var(--color-text, #e0e0e0); }
    .wh-stat-label { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }

    .wh-hook-list { display: flex; flex-direction: column; gap: 10px; }
    .wh-hook-item {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 14px;
    }
    .wh-hook-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .wh-hook-name { font-size: 14px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .wh-hook-url {
      font-family: 'JetBrains Mono', monospace; font-size: 12px;
      color: var(--color-text-secondary, #a0a0b0); margin-bottom: 8px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .wh-hook-events { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }
    .wh-event-tag {
      font-size: 11px; padding: 2px 8px; border-radius: 12px;
      background: #6366f122; color: #6366f1;
    }
    .wh-hook-meta { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); display: flex; gap: 12px; }
    .wh-badge {
      font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600;
    }
    .wh-badge.active { background: #22c55e22; color: #22c55e; }
    .wh-badge.inactive { background: #ef444422; color: #ef4444; }

    .wh-delivery-list { display: flex; flex-direction: column; gap: 6px; }
    .wh-delivery-item {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 10px 14px; display: flex; align-items: center; gap: 10px;
    }
    .wh-delivery-status {
      width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
    }
    .wh-delivery-info { flex: 1; }
    .wh-delivery-event { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .wh-delivery-meta { font-size: 11px; color: var(--color-text-secondary, #a0a0b0); }
    .wh-delivery-code { font-size: 12px; font-weight: 600; }

    .wh-retry-section {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 16px;
    }
    .wh-retry-title { font-size: 14px; font-weight: 600; color: var(--color-text, #e0e0e0); margin-bottom: 8px; }
    .wh-retry-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-bottom: 4px; }
  `;
  document.head.appendChild(style);

  const STORAGE_KEY = 'webhooks-config';

  const EVENT_TYPES = [
    'feature.started', 'feature.completed', 'feature.failed',
    'harness.started', 'harness.stopped', 'harness.error',
    'deploy.started', 'deploy.completed', 'deploy.failed',
    'test.passed', 'test.failed',
    'alert.triggered',
  ];

  let state = {
    activeTab: 'webhooks',
    hooks: [],
    deliveries: [],
    retryConfig: {
      maxRetries: 3,
      retryDelay: 5000,
      backoffMultiplier: 2,
      timeoutMs: 10000,
    },
  };

  function generateSampleHooks() {
    return [
      {
        id: 'wh-1', name: 'Slack Notifications', url: 'https://hooks.slack.com/services/T00/B00/xxx',
        events: ['feature.completed', 'feature.failed', 'deploy.completed'],
        active: true, secret: 'whsec_abc123', createdAt: '2026-01-15T10:00:00Z',
        deliveryCount: 156, failureCount: 3, lastDelivery: new Date(Date.now() - 1800000).toISOString(),
      },
      {
        id: 'wh-2', name: 'CI/CD Pipeline', url: 'https://ci.example.com/webhooks/acd',
        events: ['feature.completed', 'test.passed', 'test.failed'],
        active: true, secret: 'whsec_def456', createdAt: '2026-01-20T14:00:00Z',
        deliveryCount: 89, failureCount: 1, lastDelivery: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'wh-3', name: 'Monitoring Alert', url: 'https://monitor.example.com/api/webhooks',
        events: ['harness.error', 'deploy.failed', 'alert.triggered'],
        active: true, secret: 'whsec_ghi789', createdAt: '2026-02-01T09:00:00Z',
        deliveryCount: 45, failureCount: 0, lastDelivery: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        id: 'wh-4', name: 'Old Integration', url: 'https://old.example.com/hook',
        events: ['feature.started'],
        active: false, secret: 'whsec_jkl012', createdAt: '2025-12-01T12:00:00Z',
        deliveryCount: 210, failureCount: 15, lastDelivery: new Date(Date.now() - 604800000).toISOString(),
      },
    ];
  }

  function generateDeliveries() {
    const deliveries = [];
    const now = Date.now();
    for (let i = 0; i < 25; i++) {
      const hook = state.hooks[i % state.hooks.length];
      const event = hook.events[i % hook.events.length];
      const isFail = i % 8 === 0;
      const isRetry = i % 12 === 0;
      deliveries.push({
        id: 'del-' + i,
        webhookId: hook.id,
        webhookName: hook.name,
        event: event,
        status: isFail ? 'failed' : 'success',
        statusCode: isFail ? 500 : 200,
        duration: 50 + Math.floor(Math.random() * 400),
        timestamp: new Date(now - i * 600000).toISOString(),
        retryCount: isRetry ? 2 : 0,
        requestBody: JSON.stringify({ event: event, timestamp: new Date(now - i * 600000).toISOString() }),
        responseBody: isFail ? '{"error": "Internal Server Error"}' : '{"ok": true}',
      });
    }
    return deliveries;
  }

  // ── Core API ──────────────────────────────────────────────────
  function getWebhooks() {
    return state.hooks.map(h => ({
      id: h.id, name: h.name, url: h.url, events: h.events,
      active: h.active, createdAt: h.createdAt,
      deliveryCount: h.deliveryCount, failureCount: h.failureCount,
      lastDelivery: h.lastDelivery,
    }));
  }

  function getWebhook(id) {
    const h = state.hooks.find(h => h.id === id);
    if (!h) return null;
    return { ...h };
  }

  function createWebhook(name, url, events) {
    const hook = {
      id: 'wh-' + Math.random().toString(36).substring(2, 8),
      name, url, events: events || [],
      active: true, secret: 'whsec_' + Math.random().toString(36).substring(2, 10),
      createdAt: new Date().toISOString(),
      deliveryCount: 0, failureCount: 0, lastDelivery: null,
    };
    state.hooks.push(hook);
    saveState();
    render();
    return hook.id;
  }

  function updateWebhook(id, updates) {
    const h = state.hooks.find(h => h.id === id);
    if (!h) return false;
    if (updates.name) h.name = updates.name;
    if (updates.url) h.url = updates.url;
    if (updates.events) h.events = updates.events;
    if (updates.active !== undefined) h.active = updates.active;
    saveState();
    render();
    return true;
  }

  function deleteWebhook(id) {
    const idx = state.hooks.findIndex(h => h.id === id);
    if (idx === -1) return false;
    state.hooks.splice(idx, 1);
    saveState();
    render();
    return true;
  }

  function toggleWebhook(id) {
    const h = state.hooks.find(h => h.id === id);
    if (!h) return false;
    h.active = !h.active;
    saveState();
    render();
    return h.active;
  }

  function getEventTypes() {
    return EVENT_TYPES.map(e => {
      const [category, action] = e.split('.');
      return { id: e, category, action };
    });
  }

  function getWebhooksForEvent(event) {
    return state.hooks.filter(h => h.active && h.events.includes(event));
  }

  function getDeliveries(filter) {
    let deliveries = [...state.deliveries];
    if (filter?.webhookId) deliveries = deliveries.filter(d => d.webhookId === filter.webhookId);
    if (filter?.status) deliveries = deliveries.filter(d => d.status === filter.status);
    if (filter?.event) deliveries = deliveries.filter(d => d.event === filter.event);
    if (filter?.limit) deliveries = deliveries.slice(0, filter.limit);
    return deliveries;
  }

  function getDelivery(id) {
    return state.deliveries.find(d => d.id === id) || null;
  }

  function retryDelivery(id) {
    const d = state.deliveries.find(d => d.id === id);
    if (!d || d.status !== 'failed') return false;
    d.retryCount++;
    d.status = 'success';
    d.statusCode = 200;
    d.responseBody = '{"ok": true, "retried": true}';
    saveState();
    render();
    return true;
  }

  function getRetryConfig() {
    return { ...state.retryConfig };
  }

  function updateRetryConfig(config) {
    Object.assign(state.retryConfig, config);
    saveState();
    render();
    return state.retryConfig;
  }

  function getStats() {
    const active = state.hooks.filter(h => h.active).length;
    const failedDeliveries = state.deliveries.filter(d => d.status === 'failed').length;
    return {
      totalWebhooks: state.hooks.length,
      activeWebhooks: active,
      totalDeliveries: state.deliveries.length,
      failedDeliveries: failedDeliveries,
    };
  }

  // ── Render ────────────────────────────────────────────────────
  function render() {
    const container = document.getElementById('webhooks-widget');
    if (!container) return;
    const stats = getStats();

    container.innerHTML = `
      <div id="webhooks-card">
        <div class="wh-header"><h3>Webhooks</h3></div>
        <div class="wh-stats-row" id="wh-stats">
          <div class="wh-stat-card"><div class="wh-stat-val">${stats.totalWebhooks}</div><div class="wh-stat-label">Webhooks</div></div>
          <div class="wh-stat-card"><div class="wh-stat-val">${stats.activeWebhooks}</div><div class="wh-stat-label">Active</div></div>
          <div class="wh-stat-card"><div class="wh-stat-val">${stats.totalDeliveries}</div><div class="wh-stat-label">Deliveries</div></div>
          <div class="wh-stat-card"><div class="wh-stat-val">${stats.failedDeliveries}</div><div class="wh-stat-label">Failed</div></div>
        </div>
        <div class="wh-tabs" id="wh-tabs">
          <button class="wh-tab ${state.activeTab === 'webhooks' ? 'active' : ''}" data-tab="webhooks">Webhooks</button>
          <button class="wh-tab ${state.activeTab === 'deliveries' ? 'active' : ''}" data-tab="deliveries">Deliveries</button>
          <button class="wh-tab ${state.activeTab === 'retry' ? 'active' : ''}" data-tab="retry">Retry Config</button>
        </div>
        <div id="wh-content"></div>
      </div>
    `;

    container.querySelectorAll('.wh-tab').forEach(btn => {
      btn.addEventListener('click', () => { state.activeTab = btn.dataset.tab; saveState(); render(); });
    });
    renderContent();
  }

  function renderContent() {
    const el = document.getElementById('wh-content');
    if (!el) return;
    if (state.activeTab === 'webhooks') renderHooks(el);
    else if (state.activeTab === 'deliveries') renderDeliveries(el);
    else renderRetry(el);
  }

  function renderHooks(el) {
    const hooks = getWebhooks();
    el.innerHTML = `
      <div class="wh-hook-list" id="wh-hook-list">
        ${hooks.map(h => `
          <div class="wh-hook-item" data-hook="${h.id}">
            <div class="wh-hook-top">
              <div class="wh-hook-name">${h.name}</div>
              <span class="wh-badge ${h.active ? 'active' : 'inactive'}">${h.active ? 'Active' : 'Inactive'}</span>
            </div>
            <div class="wh-hook-url">${h.url}</div>
            <div class="wh-hook-events">
              ${h.events.map(e => `<span class="wh-event-tag">${e}</span>`).join('')}
            </div>
            <div class="wh-hook-meta">
              <span>Deliveries: ${h.deliveryCount}</span>
              <span>Failures: ${h.failureCount}</span>
              ${h.lastDelivery ? `<span>Last: ${new Date(h.lastDelivery).toLocaleString()}</span>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderDeliveries(el) {
    const deliveries = getDeliveries({ limit: 20 });
    el.innerHTML = `
      <div class="wh-delivery-list" id="wh-delivery-list">
        ${deliveries.map(d => `
          <div class="wh-delivery-item" data-delivery="${d.id}">
            <div class="wh-delivery-status" style="background:${d.status === 'success' ? '#22c55e' : '#ef4444'}"></div>
            <div class="wh-delivery-info">
              <div class="wh-delivery-event">${d.event} → ${d.webhookName}</div>
              <div class="wh-delivery-meta">${new Date(d.timestamp).toLocaleString()} · ${d.duration}ms${d.retryCount > 0 ? ` · ${d.retryCount} retries` : ''}</div>
            </div>
            <span class="wh-delivery-code" style="color:${d.statusCode < 400 ? '#22c55e' : '#ef4444'}">${d.statusCode}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderRetry(el) {
    const cfg = state.retryConfig;
    el.innerHTML = `
      <div class="wh-retry-section" id="wh-retry-section">
        <div class="wh-retry-title">Retry Configuration</div>
        <div class="wh-retry-detail">Max Retries: ${cfg.maxRetries}</div>
        <div class="wh-retry-detail">Initial Delay: ${cfg.retryDelay}ms</div>
        <div class="wh-retry-detail">Backoff Multiplier: ${cfg.backoffMultiplier}x</div>
        <div class="wh-retry-detail">Timeout: ${cfg.timeoutMs}ms</div>
        <div class="wh-retry-detail" style="margin-top:12px">
          Retry Schedule: ${Array.from({length: cfg.maxRetries}, (_, i) =>
            `${cfg.retryDelay * Math.pow(cfg.backoffMultiplier, i)}ms`
          ).join(' → ')}
        </div>
      </div>
    `;
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        activeTab: state.activeTab,
        hooks: state.hooks,
        retryConfig: state.retryConfig,
      }));
    } catch (e) {}
  }

  function loadState() {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) {
        const parsed = JSON.parse(s);
        state.activeTab = parsed.activeTab || state.activeTab;
        if (parsed.hooks?.length > 0) state.hooks = parsed.hooks;
        if (parsed.retryConfig) Object.assign(state.retryConfig, parsed.retryConfig);
      }
    } catch (e) {}
  }

  window.webhooks = {
    getWebhooks, getWebhook, createWebhook, updateWebhook, deleteWebhook, toggleWebhook,
    getEventTypes, getWebhooksForEvent,
    getDeliveries, getDelivery, retryDelivery,
    getRetryConfig, updateRetryConfig, getStats,
    setTab(tab) { state.activeTab = tab; saveState(); render(); },
    getState() {
      return {
        activeTab: state.activeTab,
        webhookCount: state.hooks.length,
        deliveryCount: state.deliveries.length,
        retryConfig: { ...state.retryConfig },
      };
    },
  };

  document.addEventListener('DOMContentLoaded', () => {
    loadState();
    if (state.hooks.length === 0) state.hooks = generateSampleHooks();
    state.deliveries = generateDeliveries();
    saveState();
    render();
  });
})();
