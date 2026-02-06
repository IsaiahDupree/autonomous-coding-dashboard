// feat-068: Cost per Feature Breakdown
(function () {
  'use strict';

  // ── CSS ──────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #cost-breakdown-card {
      background: var(--color-card-bg, #1e1e2e);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .cb-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .cb-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--color-text, #e0e0e0);
    }
    .cb-header .cb-total {
      font-size: 14px;
      color: var(--color-text-secondary, #a0a0b0);
    }
    .cb-header .cb-total strong {
      color: #22c55e;
      font-size: 18px;
    }
    .cb-tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 16px;
      background: var(--color-bg, #12121a);
      border-radius: 8px;
      padding: 3px;
    }
    .cb-tab {
      flex: 1;
      padding: 6px 12px;
      border: none;
      background: transparent;
      color: var(--color-text-secondary, #a0a0b0);
      cursor: pointer;
      border-radius: 6px;
      font-size: 13px;
      transition: all 0.2s;
    }
    .cb-tab.active {
      background: var(--color-primary, #6366f1);
      color: #fff;
    }
    .cb-tab:hover:not(.active) {
      background: rgba(255,255,255,0.05);
    }

    /* Per-feature table */
    .cb-table-wrap {
      max-height: 320px;
      overflow-y: auto;
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px;
    }
    .cb-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .cb-table th {
      position: sticky;
      top: 0;
      background: var(--color-bg, #12121a);
      color: var(--color-text-secondary, #a0a0b0);
      padding: 8px 12px;
      text-align: left;
      font-weight: 500;
      border-bottom: 1px solid var(--color-border, #2e2e3e);
    }
    .cb-table th.right, .cb-table td.right {
      text-align: right;
    }
    .cb-table td {
      padding: 8px 12px;
      color: var(--color-text, #e0e0e0);
      border-bottom: 1px solid rgba(255,255,255,0.04);
    }
    .cb-table tr:hover td {
      background: rgba(255,255,255,0.03);
    }
    .cb-cost-bar {
      height: 6px;
      background: var(--color-primary, #6366f1);
      border-radius: 3px;
      min-width: 2px;
      transition: width 0.3s;
    }
    .cb-cost-bar-bg {
      width: 80px;
      height: 6px;
      background: rgba(255,255,255,0.06);
      border-radius: 3px;
      display: inline-block;
      vertical-align: middle;
      margin-right: 6px;
    }

    /* Category breakdown */
    .cb-category-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
    }
    .cb-category-card {
      background: var(--color-bg, #12121a);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px;
      padding: 14px;
    }
    .cb-category-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--color-text, #e0e0e0);
      margin-bottom: 4px;
      text-transform: capitalize;
    }
    .cb-category-cost {
      font-size: 20px;
      font-weight: 700;
      color: #22c55e;
      margin-bottom: 6px;
    }
    .cb-category-meta {
      font-size: 12px;
      color: var(--color-text-secondary, #a0a0b0);
    }
    .cb-category-bar-track {
      height: 4px;
      background: rgba(255,255,255,0.06);
      border-radius: 2px;
      margin-top: 8px;
    }
    .cb-category-bar-fill {
      height: 4px;
      border-radius: 2px;
      transition: width 0.3s;
    }

    /* Optimization suggestions */
    .cb-suggestion {
      background: var(--color-bg, #12121a);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px;
      padding: 14px;
      margin-bottom: 10px;
    }
    .cb-suggestion-type {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .cb-suggestion-type.high {
      background: rgba(239,68,68,0.15);
      color: #ef4444;
    }
    .cb-suggestion-type.medium {
      background: rgba(245,158,11,0.15);
      color: #f59e0b;
    }
    .cb-suggestion-type.low {
      background: rgba(34,197,94,0.15);
      color: #22c55e;
    }
    .cb-suggestion-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--color-text, #e0e0e0);
      margin-bottom: 4px;
    }
    .cb-suggestion-desc {
      font-size: 13px;
      color: var(--color-text-secondary, #a0a0b0);
      line-height: 1.4;
    }
    .cb-suggestion-savings {
      font-size: 12px;
      color: #22c55e;
      font-weight: 600;
      margin-top: 6px;
    }

    /* Sort controls */
    .cb-sort-bar {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-bottom: 12px;
    }
    .cb-sort-bar label {
      font-size: 12px;
      color: var(--color-text-secondary, #a0a0b0);
    }
    .cb-sort-select {
      background: var(--color-bg, #12121a);
      border: 1px solid var(--color-border, #2e2e3e);
      color: var(--color-text, #e0e0e0);
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 12px;
    }
  `;
  document.head.appendChild(style);

  // ── State ────────────────────────────────────────────────────
  const STORAGE_KEY = 'cost-breakdown-config';
  let state = {
    activeTab: 'per-feature',
    sortBy: 'cost-desc',
    featureCosts: {},
    categoryCosts: {},
  };

  // ── Cost model (simulated from feature data) ────────────────
  const COST_RATES = {
    input_per_1k: 0.003,
    output_per_1k: 0.015,
    base_feature_tokens: { input: 2000, output: 1500 },
  };

  const CATEGORY_COLORS = {
    core: '#6366f1',
    ui: '#8b5cf6',
    analytics: '#22c55e',
    monitoring: '#f59e0b',
    notifications: '#ef4444',
    'error-handling': '#ec4899',
    integration: '#06b6d4',
    testing: '#14b8a6',
    automation: '#f97316',
    documentation: '#64748b',
  };

  function loadFeatures() {
    try {
      const el = document.getElementById('features-data');
      if (el) return JSON.parse(el.textContent);
    } catch (e) { /* ignore */ }
    if (window.dashboardData && window.dashboardData.features) {
      return window.dashboardData.features;
    }
    // Generate from feature_list if available on page
    const features = [];
    for (let i = 1; i <= 120; i++) {
      const id = 'feat-' + String(i).padStart(3, '0');
      features.push({ id, category: assignCategory(i), description: 'Feature ' + id });
    }
    return features;
  }

  function assignCategory(num) {
    const cats = ['core', 'ui', 'analytics', 'monitoring', 'notifications', 'error-handling', 'integration', 'testing', 'automation', 'documentation'];
    return cats[num % cats.length];
  }

  function generateFeatureCost(feature, index) {
    // Deterministic pseudo-random cost based on feature id
    const seed = hashCode(feature.id);
    const complexity = ((seed % 5) + 1); // 1-5
    const inputTokens = COST_RATES.base_feature_tokens.input * complexity + (seed % 3000);
    const outputTokens = COST_RATES.base_feature_tokens.output * complexity + (seed % 2000);
    const inputCost = (inputTokens / 1000) * COST_RATES.input_per_1k;
    const outputCost = (outputTokens / 1000) * COST_RATES.output_per_1k;
    const totalCost = inputCost + outputCost;
    return {
      featureId: feature.id,
      description: feature.description || feature.id,
      category: feature.category || 'core',
      inputTokens,
      outputTokens,
      inputCost: round(inputCost, 4),
      outputCost: round(outputCost, 4),
      totalCost: round(totalCost, 4),
      complexity,
    };
  }

  function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  function round(val, decimals) {
    return Math.round(val * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  // ── Core data functions ──────────────────────────────────────
  function calculateAllCosts() {
    const features = loadFeatures();
    const costs = features.map((f, i) => generateFeatureCost(f, i));
    state.featureCosts = {};
    costs.forEach(c => { state.featureCosts[c.featureId] = c; });
    return costs;
  }

  function getFeatureCosts(sortBy) {
    const costs = Object.values(state.featureCosts);
    if (costs.length === 0) calculateAllCosts();
    const all = Object.values(state.featureCosts);
    const sort = sortBy || state.sortBy;
    switch (sort) {
      case 'cost-desc': all.sort((a, b) => b.totalCost - a.totalCost); break;
      case 'cost-asc': all.sort((a, b) => a.totalCost - b.totalCost); break;
      case 'name-asc': all.sort((a, b) => a.featureId.localeCompare(b.featureId)); break;
      case 'category': all.sort((a, b) => a.category.localeCompare(b.category)); break;
      default: all.sort((a, b) => b.totalCost - a.totalCost);
    }
    return all;
  }

  function getCategoryBreakdown() {
    if (Object.keys(state.featureCosts).length === 0) calculateAllCosts();
    const categories = {};
    Object.values(state.featureCosts).forEach(c => {
      if (!categories[c.category]) {
        categories[c.category] = { name: c.category, totalCost: 0, featureCount: 0, inputTokens: 0, outputTokens: 0 };
      }
      categories[c.category].totalCost = round(categories[c.category].totalCost + c.totalCost, 4);
      categories[c.category].featureCount++;
      categories[c.category].inputTokens += c.inputTokens;
      categories[c.category].outputTokens += c.outputTokens;
    });
    const result = Object.values(categories);
    result.sort((a, b) => b.totalCost - a.totalCost);
    return result;
  }

  function getTotalCost() {
    if (Object.keys(state.featureCosts).length === 0) calculateAllCosts();
    return round(Object.values(state.featureCosts).reduce((sum, c) => sum + c.totalCost, 0), 2);
  }

  function getFeatureCost(featureId) {
    if (Object.keys(state.featureCosts).length === 0) calculateAllCosts();
    return state.featureCosts[featureId] || null;
  }

  function getOptimizationSuggestions() {
    if (Object.keys(state.featureCosts).length === 0) calculateAllCosts();
    const costs = Object.values(state.featureCosts);
    const suggestions = [];

    // Find expensive features
    const sorted = [...costs].sort((a, b) => b.totalCost - a.totalCost);
    const avgCost = getTotalCost() / costs.length;

    // High-cost features
    const expensive = sorted.filter(c => c.totalCost > avgCost * 2);
    if (expensive.length > 0) {
      const potentialSavings = round(expensive.reduce((s, c) => s + (c.totalCost - avgCost), 0), 2);
      suggestions.push({
        id: 'sug-high-cost',
        type: 'high',
        title: 'Reduce high-cost feature complexity',
        description: `${expensive.length} features cost more than 2x the average ($${round(avgCost, 4)}). Consider breaking them into smaller tasks or using cached prompts.`,
        savings: potentialSavings,
        affectedFeatures: expensive.map(c => c.featureId),
      });
    }

    // Category imbalance
    const categories = getCategoryBreakdown();
    const catAvg = getTotalCost() / categories.length;
    const overBudget = categories.filter(c => c.totalCost > catAvg * 1.5);
    if (overBudget.length > 0) {
      suggestions.push({
        id: 'sug-category-imbalance',
        type: 'medium',
        title: 'Rebalance category spending',
        description: `Categories ${overBudget.map(c => c.name).join(', ')} are over 1.5x the average category budget. Consider template reuse across similar features.`,
        savings: round(overBudget.reduce((s, c) => s + (c.totalCost - catAvg) * 0.3, 0), 2),
        affectedCategories: overBudget.map(c => c.name),
      });
    }

    // Token optimization
    const highOutput = costs.filter(c => c.outputTokens > c.inputTokens * 2);
    if (highOutput.length > 0) {
      suggestions.push({
        id: 'sug-output-heavy',
        type: 'medium',
        title: 'Optimize verbose outputs',
        description: `${highOutput.length} features have output tokens >2x input tokens. Use structured output formats to reduce token usage.`,
        savings: round(highOutput.reduce((s, c) => s + c.outputCost * 0.2, 0), 2),
        affectedFeatures: highOutput.map(c => c.featureId),
      });
    }

    // Batch processing suggestion
    suggestions.push({
      id: 'sug-batch',
      type: 'low',
      title: 'Batch similar features together',
      description: 'Group features by category for batch processing. Shared context reduces redundant prompt tokens by an estimated 15-20%.',
      savings: round(getTotalCost() * 0.15, 2),
    });

    // Caching suggestion
    suggestions.push({
      id: 'sug-caching',
      type: 'low',
      title: 'Enable prompt caching',
      description: 'Cache common system prompts and project context. Repeated context across features can be cached for up to 90% token reduction on cached portions.',
      savings: round(getTotalCost() * 0.1, 2),
    });

    return suggestions;
  }

  // ── Render ───────────────────────────────────────────────────
  function render() {
    const container = document.getElementById('cost-breakdown-widget');
    if (!container) return;

    calculateAllCosts();
    const total = getTotalCost();

    container.innerHTML = `
      <div id="cost-breakdown-card">
        <div class="cb-header">
          <h3>Cost per Feature Breakdown</h3>
          <div class="cb-total">Total: <strong>$${total.toFixed(2)}</strong></div>
        </div>
        <div class="cb-tabs" id="cb-tabs">
          <button class="cb-tab ${state.activeTab === 'per-feature' ? 'active' : ''}" data-tab="per-feature">Per Feature</button>
          <button class="cb-tab ${state.activeTab === 'category' ? 'active' : ''}" data-tab="category">By Category</button>
          <button class="cb-tab ${state.activeTab === 'optimize' ? 'active' : ''}" data-tab="optimize">Optimization</button>
        </div>
        <div id="cb-content"></div>
      </div>
    `;

    // Tab event listeners
    container.querySelectorAll('.cb-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        state.activeTab = btn.dataset.tab;
        saveState();
        render();
      });
    });

    renderContent();
  }

  function renderContent() {
    const el = document.getElementById('cb-content');
    if (!el) return;

    switch (state.activeTab) {
      case 'per-feature': renderPerFeature(el); break;
      case 'category': renderCategoryBreakdown(el); break;
      case 'optimize': renderOptimizations(el); break;
    }
  }

  function renderPerFeature(el) {
    const costs = getFeatureCosts();
    const maxCost = costs.length > 0 ? costs[0].totalCost : 1;

    el.innerHTML = `
      <div class="cb-sort-bar">
        <label>Sort by:</label>
        <select class="cb-sort-select" id="cb-sort">
          <option value="cost-desc" ${state.sortBy === 'cost-desc' ? 'selected' : ''}>Cost (High → Low)</option>
          <option value="cost-asc" ${state.sortBy === 'cost-asc' ? 'selected' : ''}>Cost (Low → High)</option>
          <option value="name-asc" ${state.sortBy === 'name-asc' ? 'selected' : ''}>Name (A → Z)</option>
          <option value="category" ${state.sortBy === 'category' ? 'selected' : ''}>Category</option>
        </select>
      </div>
      <div class="cb-table-wrap">
        <table class="cb-table" id="cb-feature-table">
          <thead>
            <tr>
              <th>Feature</th>
              <th>Category</th>
              <th class="right">Input Tokens</th>
              <th class="right">Output Tokens</th>
              <th class="right">Cost</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${costs.map(c => `
              <tr class="cb-row" data-feature="${c.featureId}">
                <td>${c.featureId}</td>
                <td>${c.category}</td>
                <td class="right">${c.inputTokens.toLocaleString()}</td>
                <td class="right">${c.outputTokens.toLocaleString()}</td>
                <td class="right">$${c.totalCost.toFixed(4)}</td>
                <td>
                  <span class="cb-cost-bar-bg">
                    <span class="cb-cost-bar" style="width:${(c.totalCost / maxCost * 100).toFixed(1)}%"></span>
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    const sortSelect = document.getElementById('cb-sort');
    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        state.sortBy = sortSelect.value;
        saveState();
        renderPerFeature(el);
      });
    }
  }

  function renderCategoryBreakdown(el) {
    const categories = getCategoryBreakdown();
    const maxCost = categories.length > 0 ? categories[0].totalCost : 1;

    el.innerHTML = `
      <div class="cb-category-grid" id="cb-category-grid">
        ${categories.map(cat => `
          <div class="cb-category-card" data-category="${cat.name}">
            <div class="cb-category-name">${cat.name}</div>
            <div class="cb-category-cost">$${cat.totalCost.toFixed(2)}</div>
            <div class="cb-category-meta">
              ${cat.featureCount} features &middot; Avg $${(cat.totalCost / cat.featureCount).toFixed(4)}/feat
            </div>
            <div class="cb-category-bar-track">
              <div class="cb-category-bar-fill" style="width:${(cat.totalCost / maxCost * 100).toFixed(1)}%;background:${CATEGORY_COLORS[cat.name] || '#6366f1'}"></div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderOptimizations(el) {
    const suggestions = getOptimizationSuggestions();

    el.innerHTML = `
      <div id="cb-suggestions">
        ${suggestions.map(s => `
          <div class="cb-suggestion" data-suggestion="${s.id}">
            <span class="cb-suggestion-type ${s.type}">${s.type} impact</span>
            <div class="cb-suggestion-title">${s.title}</div>
            <div class="cb-suggestion-desc">${s.description}</div>
            <div class="cb-suggestion-savings">Potential savings: $${s.savings.toFixed(2)}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // ── Persistence ──────────────────────────────────────────────
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        activeTab: state.activeTab,
        sortBy: state.sortBy,
      }));
    } catch (e) { /* ignore */ }
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        state.activeTab = parsed.activeTab || state.activeTab;
        state.sortBy = parsed.sortBy || state.sortBy;
      }
    } catch (e) { /* ignore */ }
  }

  // ── Public API ───────────────────────────────────────────────
  window.costBreakdown = {
    getFeatureCosts,
    getCategoryBreakdown,
    getTotalCost,
    getFeatureCost,
    getOptimizationSuggestions,
    setTab(tab) {
      state.activeTab = tab;
      saveState();
      render();
    },
    setSortBy(sortBy) {
      state.sortBy = sortBy;
      saveState();
      render();
    },
    getState() {
      return { ...state, featureCosts: undefined, categoryCosts: undefined, activeTab: state.activeTab, sortBy: state.sortBy };
    },
    refresh() {
      calculateAllCosts();
      render();
    },
  };

  // ── Init ─────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    loadState();
    calculateAllCosts();
    render();
  });
})();
