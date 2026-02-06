// feat-093: Smart Feature Prioritization
(function () {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    #smart-priority-card {
      background: var(--color-card-bg, #1e1e2e);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .sp-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .sp-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .sp-tabs { display: flex; gap: 4px; margin-bottom: 16px; background: var(--color-bg, #12121a); border-radius: 8px; padding: 3px; }
    .sp-tab { flex: 1; padding: 6px 12px; border: none; background: transparent; color: var(--color-text-secondary, #a0a0b0); cursor: pointer; border-radius: 6px; font-size: 13px; transition: all 0.2s; }
    .sp-tab.active { background: var(--color-primary, #6366f1); color: #fff; }
    .sp-tab:hover:not(.active) { background: rgba(255,255,255,0.05); }
    .sp-stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
    .sp-stat-card { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 12px; text-align: center; }
    .sp-stat-val { font-size: 20px; font-weight: 700; color: var(--color-text, #e0e0e0); }
    .sp-stat-label { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }
    .sp-list { display: flex; flex-direction: column; gap: 8px; }
    .sp-dep-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 14px; }
    .sp-item-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .sp-item-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .sp-badge { font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600; }
    .sp-item-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
    .sp-order-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 14px; }
    .sp-order-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .sp-order-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .sp-order-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
    .sp-complexity-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 14px; }
    .sp-complexity-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .sp-complexity-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .sp-complexity-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
  `;
  document.head.appendChild(style);

  const STORAGE_KEY = 'smart-priority-config';

  let state = { activeTab: 'dependencies' };

  function getDependencies() {
    return [
      { id: 'dep-001', featureId: 'feat-093', dependsOn: ['feat-050'], type: 'hard', description: 'Requires feature ordering system' },
      { id: 'dep-002', featureId: 'feat-094', dependsOn: ['feat-092'], type: 'hard', description: 'Requires AI error diagnosis for predictions' },
      { id: 'dep-003', featureId: 'feat-095', dependsOn: ['feat-085', 'feat-086'], type: 'soft', description: 'Benefits from DB and memory optimization' },
      { id: 'dep-004', featureId: 'feat-096', dependsOn: ['feat-090', 'feat-091'], type: 'hard', description: 'Requires mobile responsive and notifications' },
      { id: 'dep-005', featureId: 'feat-097', dependsOn: ['feat-082', 'feat-081'], type: 'hard', description: 'Requires webhook and REST API systems' },
      { id: 'dep-006', featureId: 'feat-098', dependsOn: ['feat-088'], type: 'soft', description: 'Benefits from config export/import' },
      { id: 'dep-007', featureId: 'feat-099', dependsOn: ['feat-089', 'feat-087'], type: 'hard', description: 'Requires versioning and backup systems' },
      { id: 'dep-008', featureId: 'feat-100', dependsOn: ['feat-092', 'feat-093'], type: 'soft', description: 'Benefits from AI diagnosis and prioritization' },
    ];
  }

  function getFeatureDependencies(featureId) {
    return getDependencies().filter(d => d.featureId === featureId);
  }

  function getDependentsOf(featureId) {
    return getDependencies().filter(d => d.dependsOn.includes(featureId));
  }

  function getSuggestedOrder() {
    return [
      { rank: 1, featureId: 'feat-093', name: 'Smart Feature Prioritization', score: 95, reason: 'No unmet dependencies, high impact', complexity: 'medium', category: 'ai' },
      { rank: 2, featureId: 'feat-094', name: 'Predictive Failure Detection', score: 88, reason: 'Depends on feat-092 (done), high value', complexity: 'high', category: 'ai' },
      { rank: 3, featureId: 'feat-095', name: 'Code Quality Dashboard', score: 85, reason: 'Soft deps met, useful for monitoring', complexity: 'medium', category: 'ai' },
      { rank: 4, featureId: 'feat-096', name: 'PWA Support', score: 82, reason: 'Mobile features complete, natural next step', complexity: 'medium', category: 'mobile' },
      { rank: 5, featureId: 'feat-097', name: 'Integration Marketplace', score: 78, reason: 'API systems ready, extends platform', complexity: 'high', category: 'integration' },
      { rank: 6, featureId: 'feat-098', name: 'Multi-tenant Support', score: 72, reason: 'Config system ready, moderate complexity', complexity: 'high', category: 'enterprise' },
      { rank: 7, featureId: 'feat-099', name: 'Disaster Recovery', score: 68, reason: 'Backup systems ready, important for stability', complexity: 'high', category: 'backup' },
      { rank: 8, featureId: 'feat-100', name: 'Self-Healing System', score: 62, reason: 'Depends on AI features being complete', complexity: 'very_high', category: 'ai' },
    ];
  }

  function getComplexityAnalysis() {
    return [
      { featureId: 'feat-093', name: 'Smart Prioritization', complexity: 'medium', score: 5, factors: { codeChanges: 3, dependencies: 2, riskLevel: 2, testingEffort: 3 }, estimatedFiles: 3 },
      { featureId: 'feat-094', name: 'Predictive Failure', complexity: 'high', score: 7, factors: { codeChanges: 5, dependencies: 4, riskLevel: 3, testingEffort: 4 }, estimatedFiles: 5 },
      { featureId: 'feat-095', name: 'Code Quality', complexity: 'medium', score: 5, factors: { codeChanges: 4, dependencies: 2, riskLevel: 2, testingEffort: 3 }, estimatedFiles: 3 },
      { featureId: 'feat-096', name: 'PWA Support', complexity: 'medium', score: 6, factors: { codeChanges: 4, dependencies: 3, riskLevel: 2, testingEffort: 3 }, estimatedFiles: 4 },
      { featureId: 'feat-097', name: 'Integration Marketplace', complexity: 'high', score: 8, factors: { codeChanges: 6, dependencies: 4, riskLevel: 4, testingEffort: 5 }, estimatedFiles: 6 },
      { featureId: 'feat-098', name: 'Multi-tenant', complexity: 'high', score: 8, factors: { codeChanges: 7, dependencies: 3, riskLevel: 5, testingEffort: 5 }, estimatedFiles: 7 },
      { featureId: 'feat-099', name: 'Disaster Recovery', complexity: 'high', score: 7, factors: { codeChanges: 5, dependencies: 4, riskLevel: 4, testingEffort: 4 }, estimatedFiles: 5 },
      { featureId: 'feat-100', name: 'Self-Healing', complexity: 'very_high', score: 9, factors: { codeChanges: 8, dependencies: 5, riskLevel: 5, testingEffort: 6 }, estimatedFiles: 8 },
    ];
  }

  function getComplexityForFeature(featureId) {
    return getComplexityAnalysis().find(c => c.featureId === featureId) || null;
  }

  function getPrioritizationStats() {
    const order = getSuggestedOrder();
    const complexity = getComplexityAnalysis();
    return {
      totalFeatures: order.length,
      avgScore: Math.round(order.reduce((s, o) => s + o.score, 0) / order.length),
      highComplexity: complexity.filter(c => c.complexity === 'high' || c.complexity === 'very_high').length,
      dependencyCount: getDependencies().length,
    };
  }

  // ── Render ────────────────────────────────────────────────────
  function render() {
    const container = document.getElementById('smart-priority-widget');
    if (!container) return;
    const stats = getPrioritizationStats();

    container.innerHTML = `
      <div id="smart-priority-card">
        <div class="sp-header"><h3>Smart Feature Prioritization</h3></div>
        <div class="sp-stats-row">
          <div class="sp-stat-card"><div class="sp-stat-val">${stats.totalFeatures}</div><div class="sp-stat-label">Queued</div></div>
          <div class="sp-stat-card"><div class="sp-stat-val">${stats.avgScore}</div><div class="sp-stat-label">Avg Score</div></div>
          <div class="sp-stat-card"><div class="sp-stat-val">${stats.highComplexity}</div><div class="sp-stat-label">High Complexity</div></div>
          <div class="sp-stat-card"><div class="sp-stat-val">${stats.dependencyCount}</div><div class="sp-stat-label">Dependencies</div></div>
        </div>
        <div class="sp-tabs">
          <button class="sp-tab ${state.activeTab === 'dependencies' ? 'active' : ''}" data-tab="dependencies">Dependencies</button>
          <button class="sp-tab ${state.activeTab === 'order' ? 'active' : ''}" data-tab="order">Suggested Order</button>
          <button class="sp-tab ${state.activeTab === 'complexity' ? 'active' : ''}" data-tab="complexity">Complexity</button>
        </div>
        <div id="sp-content"></div>
      </div>
    `;

    container.querySelectorAll('.sp-tab').forEach(btn => {
      btn.addEventListener('click', () => { state.activeTab = btn.dataset.tab; saveState(); render(); });
    });
    renderContent();
  }

  function renderContent() {
    const el = document.getElementById('sp-content');
    if (!el) return;
    if (state.activeTab === 'dependencies') renderDeps(el);
    else if (state.activeTab === 'order') renderOrder(el);
    else renderComplexity(el);
  }

  function renderDeps(el) {
    const deps = getDependencies();
    el.innerHTML = `
      <div class="sp-list" id="sp-dep-list">
        ${deps.map(d => `
          <div class="sp-dep-item" data-id="${d.id}">
            <div class="sp-item-top">
              <div class="sp-item-name">${d.featureId}</div>
              <span class="sp-badge" style="background:${d.type === 'hard' ? '#ef4444' : '#f59e0b'}22;color:${d.type === 'hard' ? '#ef4444' : '#f59e0b'}">${d.type}</span>
            </div>
            <div class="sp-item-detail">Depends on: ${d.dependsOn.join(', ')} · ${d.description}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderOrder(el) {
    const order = getSuggestedOrder();
    el.innerHTML = `
      <div id="sp-order-section">
        <div class="sp-list" id="sp-order-list">
          ${order.map(o => `
            <div class="sp-order-item" data-rank="${o.rank}">
              <div class="sp-order-top">
                <div class="sp-order-name">#${o.rank} ${o.featureId}: ${o.name}</div>
                <span class="sp-badge" style="background:#22c55e22;color:#22c55e">${o.score}</span>
              </div>
              <div class="sp-order-detail">${o.reason} · ${o.complexity} · ${o.category}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderComplexity(el) {
    const analysis = getComplexityAnalysis();
    const compColors = { medium: '#f59e0b', high: '#ef4444', very_high: '#dc2626' };
    el.innerHTML = `
      <div id="sp-complexity-section">
        <div class="sp-list" id="sp-complexity-list">
          ${analysis.map(a => `
            <div class="sp-complexity-item" data-id="${a.featureId}">
              <div class="sp-complexity-top">
                <div class="sp-complexity-name">${a.featureId}: ${a.name}</div>
                <span class="sp-badge" style="background:${compColors[a.complexity] || '#6366f1'}22;color:${compColors[a.complexity] || '#6366f1'}">${a.complexity} (${a.score}/10)</span>
              </div>
              <div class="sp-complexity-detail">Code: ${a.factors.codeChanges} · Deps: ${a.factors.dependencies} · Risk: ${a.factors.riskLevel} · Testing: ${a.factors.testingEffort} · ~${a.estimatedFiles} files</div>
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

  window.smartPrioritization = {
    getDependencies, getFeatureDependencies, getDependentsOf,
    getSuggestedOrder, getComplexityAnalysis, getComplexityForFeature,
    getPrioritizationStats,
    setTab(tab) { state.activeTab = tab; saveState(); render(); },
    getState() {
      return {
        activeTab: state.activeTab,
        dependencyCount: getDependencies().length,
        suggestedCount: getSuggestedOrder().length,
        avgScore: getPrioritizationStats().avgScore,
      };
    },
  };

  document.addEventListener('DOMContentLoaded', () => { loadState(); render(); });
})();
