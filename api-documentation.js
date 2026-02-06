// feat-096: Auto-generate API Documentation
(function () {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    #api-docs-card {
      background: var(--color-card-bg, #1e1e2e);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .apid-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .apid-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .apid-tabs { display: flex; gap: 4px; margin-bottom: 16px; background: var(--color-bg, #12121a); border-radius: 8px; padding: 3px; }
    .apid-tab { flex: 1; padding: 6px 12px; border: none; background: transparent; color: var(--color-text-secondary, #a0a0b0); cursor: pointer; border-radius: 6px; font-size: 13px; transition: all 0.2s; }
    .apid-tab.active { background: var(--color-primary, #6366f1); color: #fff; }
    .apid-tab:hover:not(.active) { background: rgba(255,255,255,0.05); }
    .apid-stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
    .apid-stat-card { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 12px; text-align: center; }
    .apid-stat-val { font-size: 20px; font-weight: 700; color: var(--color-text, #e0e0e0); }
    .apid-stat-label { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }
    .apid-list { display: flex; flex-direction: column; gap: 8px; }
    .apid-endpoint-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 14px; }
    .apid-endpoint-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .apid-endpoint-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .apid-badge { font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600; }
    .apid-endpoint-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
    .apid-schema-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 14px; }
    .apid-schema-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .apid-schema-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .apid-schema-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
    .apid-example-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 14px; }
    .apid-example-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .apid-example-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .apid-example-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
  `;
  document.head.appendChild(style);

  const STORAGE_KEY = 'api-docs-config';

  let state = { activeTab: 'endpoints' };

  function getEndpoints() {
    return [
      { id: 'ep-001', method: 'GET', path: '/api/status', description: 'Get current harness status', category: 'harness', auth: false, params: [], response: { type: 'object', fields: ['status', 'uptime', 'version'] } },
      { id: 'ep-002', method: 'POST', path: '/api/harness/start', description: 'Start the coding harness', category: 'harness', auth: true, params: [{ name: 'mode', type: 'string', required: false }], response: { type: 'object', fields: ['success', 'sessionId'] } },
      { id: 'ep-003', method: 'POST', path: '/api/harness/stop', description: 'Stop the running harness', category: 'harness', auth: true, params: [], response: { type: 'object', fields: ['success', 'duration'] } },
      { id: 'ep-004', method: 'GET', path: '/api/features', description: 'Get all features with status', category: 'features', auth: false, params: [{ name: 'category', type: 'string', required: false }], response: { type: 'array', fields: ['id', 'name', 'passes', 'category'] } },
      { id: 'ep-005', method: 'GET', path: '/api/features/:id', description: 'Get a specific feature by ID', category: 'features', auth: false, params: [{ name: 'id', type: 'string', required: true }], response: { type: 'object', fields: ['id', 'name', 'description', 'passes'] } },
      { id: 'ep-006', method: 'PUT', path: '/api/features/:id', description: 'Update feature status', category: 'features', auth: true, params: [{ name: 'passes', type: 'boolean', required: true }], response: { type: 'object', fields: ['success', 'feature'] } },
      { id: 'ep-007', method: 'GET', path: '/api/metrics', description: 'Get dashboard metrics', category: 'metrics', auth: false, params: [{ name: 'period', type: 'string', required: false }], response: { type: 'object', fields: ['totalFeatures', 'passing', 'failing', 'rate'] } },
      { id: 'ep-008', method: 'POST', path: '/api/webhooks', description: 'Register a webhook endpoint', category: 'webhooks', auth: true, params: [{ name: 'url', type: 'string', required: true }, { name: 'events', type: 'array', required: true }], response: { type: 'object', fields: ['success', 'webhookId'] } },
    ];
  }

  function getEndpoint(id) {
    return getEndpoints().find(e => e.id === id) || null;
  }

  function getEndpointsByCategory(category) {
    return getEndpoints().filter(e => e.category === category);
  }

  function getSchemas() {
    return [
      { id: 'sch-001', name: 'Feature', description: 'Feature object schema', fields: [{ name: 'id', type: 'string', required: true }, { name: 'name', type: 'string', required: true }, { name: 'description', type: 'string', required: true }, { name: 'passes', type: 'boolean', required: true }, { name: 'category', type: 'string', required: true }] },
      { id: 'sch-002', name: 'HarnessStatus', description: 'Harness status response', fields: [{ name: 'status', type: 'string', required: true }, { name: 'uptime', type: 'number', required: true }, { name: 'version', type: 'string', required: true }, { name: 'sessionId', type: 'string', required: false }] },
      { id: 'sch-003', name: 'Metric', description: 'Dashboard metric object', fields: [{ name: 'totalFeatures', type: 'number', required: true }, { name: 'passing', type: 'number', required: true }, { name: 'failing', type: 'number', required: true }, { name: 'rate', type: 'number', required: true }] },
      { id: 'sch-004', name: 'Webhook', description: 'Webhook configuration', fields: [{ name: 'id', type: 'string', required: true }, { name: 'url', type: 'string', required: true }, { name: 'events', type: 'array', required: true }, { name: 'active', type: 'boolean', required: true }] },
      { id: 'sch-005', name: 'Error', description: 'API error response', fields: [{ name: 'code', type: 'number', required: true }, { name: 'message', type: 'string', required: true }, { name: 'details', type: 'string', required: false }] },
      { id: 'sch-006', name: 'Session', description: 'Harness session object', fields: [{ name: 'sessionId', type: 'string', required: true }, { name: 'startedAt', type: 'string', required: true }, { name: 'duration', type: 'number', required: false }, { name: 'status', type: 'string', required: true }] },
    ];
  }

  function getSchema(id) {
    return getSchemas().find(s => s.id === id) || null;
  }

  function getExamples() {
    return [
      { id: 'ex-001', endpointId: 'ep-001', name: 'Get Status', request: { method: 'GET', url: '/api/status', headers: {} }, response: { status: 200, body: { status: 'running', uptime: 3600, version: '2.1.0' } } },
      { id: 'ex-002', endpointId: 'ep-002', name: 'Start Harness', request: { method: 'POST', url: '/api/harness/start', headers: { Authorization: 'Bearer token' }, body: { mode: 'continuous' } }, response: { status: 200, body: { success: true, sessionId: 'sess-001' } } },
      { id: 'ex-003', endpointId: 'ep-004', name: 'List Features', request: { method: 'GET', url: '/api/features?category=ai', headers: {} }, response: { status: 200, body: [{ id: 'feat-092', name: 'AI Error Diagnosis', passes: true, category: 'ai' }] } },
      { id: 'ex-004', endpointId: 'ep-006', name: 'Update Feature', request: { method: 'PUT', url: '/api/features/feat-001', headers: { Authorization: 'Bearer token' }, body: { passes: true } }, response: { status: 200, body: { success: true, feature: { id: 'feat-001', passes: true } } } },
      { id: 'ex-005', endpointId: 'ep-007', name: 'Get Metrics', request: { method: 'GET', url: '/api/metrics?period=7d', headers: {} }, response: { status: 200, body: { totalFeatures: 120, passing: 95, failing: 25, rate: 79.2 } } },
      { id: 'ex-006', endpointId: 'ep-008', name: 'Register Webhook', request: { method: 'POST', url: '/api/webhooks', headers: { Authorization: 'Bearer token' }, body: { url: 'https://example.com/hook', events: ['feature.passed', 'harness.complete'] } }, response: { status: 201, body: { success: true, webhookId: 'wh-001' } } },
      { id: 'ex-007', endpointId: 'ep-005', name: 'Get Feature', request: { method: 'GET', url: '/api/features/feat-092', headers: {} }, response: { status: 200, body: { id: 'feat-092', name: 'AI Error Diagnosis', description: 'AI-powered error diagnosis', passes: true } } },
      { id: 'ex-008', endpointId: 'ep-003', name: 'Stop Harness', request: { method: 'POST', url: '/api/harness/stop', headers: { Authorization: 'Bearer token' } }, response: { status: 200, body: { success: true, duration: 7200 } } },
    ];
  }

  function getExample(id) {
    return getExamples().find(e => e.id === id) || null;
  }

  function getExamplesForEndpoint(endpointId) {
    return getExamples().filter(e => e.endpointId === endpointId);
  }

  function generateDocumentation() {
    const endpoints = getEndpoints();
    const schemas = getSchemas();
    const examples = getExamples();
    return {
      title: 'Autonomous Coding Dashboard API',
      version: '2.1.0',
      baseUrl: '/api',
      endpointCount: endpoints.length,
      schemaCount: schemas.length,
      exampleCount: examples.length,
      categories: [...new Set(endpoints.map(e => e.category))],
      generated: new Date().toISOString(),
    };
  }

  function getDocStats() {
    const endpoints = getEndpoints();
    const schemas = getSchemas();
    return {
      endpointCount: endpoints.length,
      schemaCount: schemas.length,
      exampleCount: getExamples().length,
      categoryCount: [...new Set(endpoints.map(e => e.category))].length,
    };
  }

  // ── Render ────────────────────────────────────────────────────
  function render() {
    const container = document.getElementById('api-docs-widget');
    if (!container) return;
    const stats = getDocStats();

    container.innerHTML = `
      <div id="api-docs-card">
        <div class="apid-header"><h3>API Documentation</h3></div>
        <div class="apid-stats-row">
          <div class="apid-stat-card"><div class="apid-stat-val">${stats.endpointCount}</div><div class="apid-stat-label">Endpoints</div></div>
          <div class="apid-stat-card"><div class="apid-stat-val">${stats.schemaCount}</div><div class="apid-stat-label">Schemas</div></div>
          <div class="apid-stat-card"><div class="apid-stat-val">${stats.exampleCount}</div><div class="apid-stat-label">Examples</div></div>
          <div class="apid-stat-card"><div class="apid-stat-val">${stats.categoryCount}</div><div class="apid-stat-label">Categories</div></div>
        </div>
        <div class="apid-tabs">
          <button class="apid-tab ${state.activeTab === 'endpoints' ? 'active' : ''}" data-tab="endpoints">Endpoints</button>
          <button class="apid-tab ${state.activeTab === 'schemas' ? 'active' : ''}" data-tab="schemas">Schemas</button>
          <button class="apid-tab ${state.activeTab === 'examples' ? 'active' : ''}" data-tab="examples">Examples</button>
        </div>
        <div id="apid-content"></div>
      </div>
    `;

    container.querySelectorAll('.apid-tab').forEach(btn => {
      btn.addEventListener('click', () => { state.activeTab = btn.dataset.tab; saveState(); render(); });
    });
    renderContent();
  }

  function renderContent() {
    const el = document.getElementById('apid-content');
    if (!el) return;
    if (state.activeTab === 'endpoints') renderEndpoints(el);
    else if (state.activeTab === 'schemas') renderSchemas(el);
    else renderExamples(el);
  }

  const methodColors = { GET: '#22c55e', POST: '#3b82f6', PUT: '#f59e0b', DELETE: '#ef4444' };

  function renderEndpoints(el) {
    const endpoints = getEndpoints();
    el.innerHTML = `
      <div class="apid-list" id="apid-endpoint-list">
        ${endpoints.map(e => `
          <div class="apid-endpoint-item" data-id="${e.id}">
            <div class="apid-endpoint-top">
              <div class="apid-endpoint-name"><span class="apid-badge" style="background:${methodColors[e.method]}22;color:${methodColors[e.method]}">${e.method}</span> ${e.path}</div>
              <span class="apid-badge" style="background:#6366f122;color:#6366f1">${e.category}</span>
            </div>
            <div class="apid-endpoint-detail">${e.description} · Auth: ${e.auth ? 'Required' : 'None'} · Params: ${e.params.length}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderSchemas(el) {
    const schemas = getSchemas();
    el.innerHTML = `
      <div id="apid-schema-section">
        <div class="apid-list" id="apid-schema-list">
          ${schemas.map(s => `
            <div class="apid-schema-item" data-id="${s.id}">
              <div class="apid-schema-top">
                <div class="apid-schema-name">${s.name}</div>
                <span class="apid-badge" style="background:#22c55e22;color:#22c55e">${s.fields.length} fields</span>
              </div>
              <div class="apid-schema-detail">${s.description} · Fields: ${s.fields.map(f => f.name).join(', ')}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderExamples(el) {
    const examples = getExamples();
    el.innerHTML = `
      <div id="apid-examples-section">
        <div class="apid-list" id="apid-example-list">
          ${examples.map(e => `
            <div class="apid-example-item" data-id="${e.id}">
              <div class="apid-example-top">
                <div class="apid-example-name">${e.name}</div>
                <span class="apid-badge" style="background:${methodColors[e.request.method]}22;color:${methodColors[e.request.method]}">${e.request.method} ${e.request.url}</span>
              </div>
              <div class="apid-example-detail">Response: ${e.response.status} · Endpoint: ${e.endpointId}</div>
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

  window.apiDocumentation = {
    getEndpoints, getEndpoint, getEndpointsByCategory,
    getSchemas, getSchema,
    getExamples, getExample, getExamplesForEndpoint,
    generateDocumentation, getDocStats,
    setTab(tab) { state.activeTab = tab; saveState(); render(); },
    getState() {
      return {
        activeTab: state.activeTab,
        endpointCount: getEndpoints().length,
        schemaCount: getSchemas().length,
        exampleCount: getExamples().length,
      };
    },
  };

  document.addEventListener('DOMContentLoaded', () => { loadState(); render(); });
})();
