// feat-083: GraphQL API Endpoint
(function () {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    #graphql-api-card {
      background: var(--color-card-bg, #1e1e2e);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .gq-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
    }
    .gq-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .gq-badge {
      font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600;
      background: #e535ab22; color: #e535ab;
    }
    .gq-tabs {
      display: flex; gap: 4px; margin-bottom: 16px;
      background: var(--color-bg, #12121a); border-radius: 8px; padding: 3px;
    }
    .gq-tab {
      flex: 1; padding: 6px 12px; border: none; background: transparent;
      color: var(--color-text-secondary, #a0a0b0); cursor: pointer; border-radius: 6px;
      font-size: 13px; transition: all 0.2s;
    }
    .gq-tab.active { background: #e535ab; color: #fff; }
    .gq-tab:hover:not(.active) { background: rgba(255,255,255,0.05); }
    .gq-stats-row {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px;
    }
    .gq-stat-card {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 12px; text-align: center;
    }
    .gq-stat-val { font-size: 20px; font-weight: 700; color: var(--color-text, #e0e0e0); }
    .gq-stat-label { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }

    /* Schema */
    .gq-schema-list { display: flex; flex-direction: column; gap: 8px; }
    .gq-type-card {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 14px;
    }
    .gq-type-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .gq-type-kind {
      font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 600;
      font-family: 'JetBrains Mono', monospace;
    }
    .gq-type-name {
      font-size: 14px; font-weight: 600; color: var(--color-text, #e0e0e0);
      font-family: 'JetBrains Mono', monospace;
    }
    .gq-field-list { display: flex; flex-direction: column; gap: 2px; }
    .gq-field {
      font-family: 'JetBrains Mono', monospace; font-size: 12px;
      color: var(--color-text-secondary, #a0a0b0); padding: 2px 0;
    }
    .gq-field-name { color: #e535ab; }
    .gq-field-type { color: #06b6d4; }

    /* Query/Mutation list */
    .gq-op-list { display: flex; flex-direction: column; gap: 8px; }
    .gq-op-item {
      background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px; padding: 14px;
    }
    .gq-op-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .gq-op-badge {
      font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 600;
    }
    .gq-op-badge.query { background: #22c55e22; color: #22c55e; }
    .gq-op-badge.mutation { background: #f59e0b22; color: #f59e0b; }
    .gq-op-name {
      font-family: 'JetBrains Mono', monospace; font-size: 13px;
      font-weight: 600; color: var(--color-text, #e0e0e0);
    }
    .gq-op-desc { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-bottom: 6px; }
    .gq-op-sig {
      font-family: 'JetBrains Mono', monospace; font-size: 12px;
      color: var(--color-text-secondary, #a0a0b0); background: rgba(0,0,0,0.2);
      padding: 6px 10px; border-radius: 4px;
    }
  `;
  document.head.appendChild(style);

  const STORAGE_KEY = 'graphql-api-config';

  const SCHEMA_TYPES = [
    {
      name: 'Feature', kind: 'type',
      fields: [
        { name: 'id', type: 'ID!', description: 'Unique feature identifier' },
        { name: 'description', type: 'String!', description: 'Feature description' },
        { name: 'category', type: 'String!', description: 'Feature category' },
        { name: 'priority', type: 'Int!', description: 'Priority level' },
        { name: 'passes', type: 'Boolean!', description: 'Whether feature passes tests' },
        { name: 'acceptanceCriteria', type: '[String!]!', description: 'List of acceptance criteria' },
        { name: 'implementedAt', type: 'DateTime', description: 'Implementation timestamp' },
      ],
    },
    {
      name: 'HarnessStatus', kind: 'type',
      fields: [
        { name: 'running', type: 'Boolean!', description: 'Whether harness is running' },
        { name: 'currentFeature', type: 'String', description: 'Feature being worked on' },
        { name: 'progress', type: 'Float!', description: 'Overall completion percent' },
        { name: 'startedAt', type: 'DateTime', description: 'When harness started' },
        { name: 'uptime', type: 'Int', description: 'Uptime in seconds' },
      ],
    },
    {
      name: 'AnalyticsData', kind: 'type',
      fields: [
        { name: 'velocity', type: 'Float!', description: 'Features per hour' },
        { name: 'totalCost', type: 'Float!', description: 'Total API cost' },
        { name: 'successRate', type: 'Float!', description: 'Feature success rate' },
        { name: 'avgTimePerFeature', type: 'Float!', description: 'Average minutes per feature' },
      ],
    },
    {
      name: 'Deployment', kind: 'type',
      fields: [
        { name: 'id', type: 'ID!', description: 'Deployment identifier' },
        { name: 'environment', type: 'String!', description: 'Target environment' },
        { name: 'status', type: 'DeployStatus!', description: 'Current status' },
        { name: 'version', type: 'String!', description: 'Deployed version' },
        { name: 'deployedAt', type: 'DateTime!', description: 'Deployment time' },
      ],
    },
    {
      name: 'DeployStatus', kind: 'enum',
      fields: [
        { name: 'PENDING', type: 'enum', description: 'Deployment pending' },
        { name: 'IN_PROGRESS', type: 'enum', description: 'Deployment in progress' },
        { name: 'SUCCESS', type: 'enum', description: 'Deployment succeeded' },
        { name: 'FAILED', type: 'enum', description: 'Deployment failed' },
        { name: 'ROLLED_BACK', type: 'enum', description: 'Deployment rolled back' },
      ],
    },
    {
      name: 'FeatureInput', kind: 'input',
      fields: [
        { name: 'description', type: 'String', description: 'Feature description' },
        { name: 'category', type: 'String', description: 'Feature category' },
        { name: 'passes', type: 'Boolean', description: 'Pass/fail status' },
      ],
    },
  ];

  const QUERIES = [
    { name: 'features', args: [{ name: 'status', type: 'Boolean' }, { name: 'category', type: 'String' }], returnType: '[Feature!]!', description: 'List all features with optional filters' },
    { name: 'feature', args: [{ name: 'id', type: 'ID!' }], returnType: 'Feature', description: 'Get a specific feature by ID' },
    { name: 'harnessStatus', args: [], returnType: 'HarnessStatus!', description: 'Get current harness status' },
    { name: 'analytics', args: [{ name: 'period', type: 'String' }], returnType: 'AnalyticsData!', description: 'Get analytics data' },
    { name: 'deployments', args: [{ name: 'environment', type: 'String' }], returnType: '[Deployment!]!', description: 'List deployments' },
    { name: 'deployment', args: [{ name: 'id', type: 'ID!' }], returnType: 'Deployment', description: 'Get specific deployment' },
  ];

  const MUTATIONS = [
    { name: 'startHarness', args: [{ name: 'target', type: 'String' }], returnType: 'HarnessStatus!', description: 'Start the coding harness' },
    { name: 'stopHarness', args: [], returnType: 'HarnessStatus!', description: 'Stop the running harness' },
    { name: 'updateFeature', args: [{ name: 'id', type: 'ID!' }, { name: 'input', type: 'FeatureInput!' }], returnType: 'Feature!', description: 'Update a feature' },
    { name: 'triggerDeploy', args: [{ name: 'environment', type: 'String!' }], returnType: 'Deployment!', description: 'Trigger a deployment' },
    { name: 'rollbackDeploy', args: [{ name: 'id', type: 'ID!' }], returnType: 'Deployment!', description: 'Rollback a deployment' },
    { name: 'clearCache', args: [], returnType: 'Boolean!', description: 'Clear application cache' },
  ];

  let state = { activeTab: 'schema' };

  function formatArgs(args) {
    if (args.length === 0) return '';
    return '(' + args.map(a => `${a.name}: ${a.type}`).join(', ') + ')';
  }

  // ── Core API ──────────────────────────────────────────────────
  function getSchema() {
    return SCHEMA_TYPES.map(t => ({
      name: t.name, kind: t.kind,
      fieldCount: t.fields.length,
      fields: t.fields,
    }));
  }

  function getType(name) {
    const t = SCHEMA_TYPES.find(t => t.name === name);
    if (!t) return null;
    return { ...t, fieldCount: t.fields.length };
  }

  function getQueries() {
    return QUERIES.map(q => ({
      name: q.name, args: q.args, returnType: q.returnType,
      description: q.description,
      signature: `${q.name}${formatArgs(q.args)}: ${q.returnType}`,
    }));
  }

  function getQuery(name) {
    const q = QUERIES.find(q => q.name === name);
    if (!q) return null;
    return { ...q, signature: `${q.name}${formatArgs(q.args)}: ${q.returnType}` };
  }

  function getMutations() {
    return MUTATIONS.map(m => ({
      name: m.name, args: m.args, returnType: m.returnType,
      description: m.description,
      signature: `${m.name}${formatArgs(m.args)}: ${m.returnType}`,
    }));
  }

  function getMutation(name) {
    const m = MUTATIONS.find(m => m.name === name);
    if (!m) return null;
    return { ...m, signature: `${m.name}${formatArgs(m.args)}: ${m.returnType}` };
  }

  function executeQuery(query, variables) {
    const trimmed = query.trim();
    if (trimmed.startsWith('query') || trimmed.startsWith('{')) {
      return {
        data: { features: [{ id: 'feat-001', description: 'Sample feature', passes: true }] },
        errors: null,
        executionTime: Math.floor(Math.random() * 50) + 5,
      };
    } else if (trimmed.startsWith('mutation')) {
      return {
        data: { updateFeature: { id: variables?.id || 'feat-001', passes: true } },
        errors: null,
        executionTime: Math.floor(Math.random() * 100) + 10,
      };
    }
    return { data: null, errors: [{ message: 'Invalid query syntax' }], executionTime: 0 };
  }

  function introspect() {
    return {
      __schema: {
        types: SCHEMA_TYPES.map(t => ({
          name: t.name, kind: t.kind.toUpperCase(),
          fields: t.fields.map(f => ({ name: f.name, type: f.type })),
        })),
        queryType: { name: 'Query', fields: QUERIES.map(q => ({ name: q.name, type: q.returnType })) },
        mutationType: { name: 'Mutation', fields: MUTATIONS.map(m => ({ name: m.name, type: m.returnType })) },
      },
    };
  }

  function getStats() {
    return {
      totalTypes: SCHEMA_TYPES.length,
      totalQueries: QUERIES.length,
      totalMutations: MUTATIONS.length,
      totalFields: SCHEMA_TYPES.reduce((s, t) => s + t.fields.length, 0),
    };
  }

  // ── Render ────────────────────────────────────────────────────
  function render() {
    const container = document.getElementById('graphql-api-widget');
    if (!container) return;
    const stats = getStats();

    container.innerHTML = `
      <div id="graphql-api-card">
        <div class="gq-header">
          <h3>GraphQL API</h3>
          <span class="gq-badge">GraphQL</span>
        </div>
        <div class="gq-stats-row" id="gq-stats">
          <div class="gq-stat-card"><div class="gq-stat-val">${stats.totalTypes}</div><div class="gq-stat-label">Types</div></div>
          <div class="gq-stat-card"><div class="gq-stat-val">${stats.totalQueries}</div><div class="gq-stat-label">Queries</div></div>
          <div class="gq-stat-card"><div class="gq-stat-val">${stats.totalMutations}</div><div class="gq-stat-label">Mutations</div></div>
          <div class="gq-stat-card"><div class="gq-stat-val">${stats.totalFields}</div><div class="gq-stat-label">Fields</div></div>
        </div>
        <div class="gq-tabs" id="gq-tabs">
          <button class="gq-tab ${state.activeTab === 'schema' ? 'active' : ''}" data-tab="schema">Schema</button>
          <button class="gq-tab ${state.activeTab === 'queries' ? 'active' : ''}" data-tab="queries">Queries</button>
          <button class="gq-tab ${state.activeTab === 'mutations' ? 'active' : ''}" data-tab="mutations">Mutations</button>
        </div>
        <div id="gq-content"></div>
      </div>
    `;

    container.querySelectorAll('.gq-tab').forEach(btn => {
      btn.addEventListener('click', () => { state.activeTab = btn.dataset.tab; saveState(); render(); });
    });
    renderContent();
  }

  function renderContent() {
    const el = document.getElementById('gq-content');
    if (!el) return;
    if (state.activeTab === 'schema') renderSchema(el);
    else if (state.activeTab === 'queries') renderQueries(el);
    else renderMutations(el);
  }

  function renderSchema(el) {
    const types = getSchema();
    const kindColors = { type: '#22c55e', enum: '#f59e0b', input: '#6366f1' };
    el.innerHTML = `
      <div class="gq-schema-list" id="gq-schema-list">
        ${types.map(t => `
          <div class="gq-type-card" data-type="${t.name}">
            <div class="gq-type-header">
              <span class="gq-type-kind" style="background:${kindColors[t.kind]}22;color:${kindColors[t.kind]}">${t.kind}</span>
              <span class="gq-type-name">${t.name}</span>
            </div>
            <div class="gq-field-list">
              ${t.fields.map(f => `
                <div class="gq-field">
                  <span class="gq-field-name">${f.name}</span>: <span class="gq-field-type">${f.type}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderQueries(el) {
    const queries = getQueries();
    el.innerHTML = `
      <div class="gq-op-list" id="gq-query-list">
        ${queries.map(q => `
          <div class="gq-op-item" data-query="${q.name}">
            <div class="gq-op-header">
              <span class="gq-op-badge query">QUERY</span>
              <span class="gq-op-name">${q.name}</span>
            </div>
            <div class="gq-op-desc">${q.description}</div>
            <div class="gq-op-sig">${q.signature}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderMutations(el) {
    const mutations = getMutations();
    el.innerHTML = `
      <div class="gq-op-list" id="gq-mutation-list">
        ${mutations.map(m => `
          <div class="gq-op-item" data-mutation="${m.name}">
            <div class="gq-op-header">
              <span class="gq-op-badge mutation">MUTATION</span>
              <span class="gq-op-name">${m.name}</span>
            </div>
            <div class="gq-op-desc">${m.description}</div>
            <div class="gq-op-sig">${m.signature}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeTab: state.activeTab })); } catch (e) {}
  }
  function loadState() {
    try { const s = localStorage.getItem(STORAGE_KEY); if (s) state.activeTab = JSON.parse(s).activeTab || state.activeTab; } catch (e) {}
  }

  window.graphqlApi = {
    getSchema, getType, getQueries, getQuery, getMutations, getMutation,
    executeQuery, introspect, getStats,
    setTab(tab) { state.activeTab = tab; saveState(); render(); },
    getState() {
      return {
        activeTab: state.activeTab,
        typeCount: SCHEMA_TYPES.length,
        queryCount: QUERIES.length,
        mutationCount: MUTATIONS.length,
      };
    },
  };

  document.addEventListener('DOMContentLoaded', () => { loadState(); render(); });
})();
