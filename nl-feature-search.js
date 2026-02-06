// feat-095: Natural Language Feature Search
(function () {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    #nl-search-card {
      background: var(--color-card-bg, #1e1e2e);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .nls-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .nls-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .nls-search-box { display: flex; gap: 8px; margin-bottom: 16px; }
    .nls-input { flex: 1; padding: 10px 14px; border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; background: var(--color-bg, #12121a); color: var(--color-text, #e0e0e0); font-size: 14px; outline: none; }
    .nls-input:focus { border-color: var(--color-primary, #6366f1); }
    .nls-input::placeholder { color: var(--color-text-secondary, #a0a0b0); }
    .nls-btn { padding: 10px 18px; border: none; border-radius: 8px; background: var(--color-primary, #6366f1); color: #fff; cursor: pointer; font-size: 13px; font-weight: 600; transition: background 0.2s; }
    .nls-btn:hover { background: var(--color-primary-dark, #4f46e5); }
    .nls-stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
    .nls-stat-card { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 12px; text-align: center; }
    .nls-stat-val { font-size: 20px; font-weight: 700; color: var(--color-text, #e0e0e0); }
    .nls-stat-label { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }
    .nls-tabs { display: flex; gap: 4px; margin-bottom: 16px; background: var(--color-bg, #12121a); border-radius: 8px; padding: 3px; }
    .nls-tab { flex: 1; padding: 6px 12px; border: none; background: transparent; color: var(--color-text-secondary, #a0a0b0); cursor: pointer; border-radius: 6px; font-size: 13px; transition: all 0.2s; }
    .nls-tab.active { background: var(--color-primary, #6366f1); color: #fff; }
    .nls-tab:hover:not(.active) { background: rgba(255,255,255,0.05); }
    .nls-list { display: flex; flex-direction: column; gap: 8px; }
    .nls-result-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 14px; }
    .nls-result-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .nls-result-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .nls-badge { font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600; }
    .nls-result-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
    .nls-history-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 14px; }
    .nls-history-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .nls-history-query { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .nls-history-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
    .nls-suggestion-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 14px; cursor: pointer; transition: border-color 0.2s; }
    .nls-suggestion-item:hover { border-color: var(--color-primary, #6366f1); }
    .nls-suggestion-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .nls-suggestion-text { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .nls-suggestion-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
  `;
  document.head.appendChild(style);

  const STORAGE_KEY = 'nl-search-config';

  let state = { activeTab: 'results', lastQuery: '', lastResults: [] };

  // Feature index for searching
  function getFeatureIndex() {
    return [
      { id: 'feat-001', name: 'Dashboard Layout', category: 'ui', description: 'Main dashboard grid layout with responsive design', tags: ['layout', 'grid', 'responsive', 'ui'], status: 'complete' },
      { id: 'feat-010', name: 'Feature Progress Tracking', category: 'tracking', description: 'Track feature implementation progress with visual indicators', tags: ['progress', 'tracking', 'status', 'visual'], status: 'complete' },
      { id: 'feat-020', name: 'Real-time Updates', category: 'data', description: 'Live data updates without page refresh using WebSocket', tags: ['realtime', 'websocket', 'live', 'updates'], status: 'complete' },
      { id: 'feat-030', name: 'Error Handling', category: 'reliability', description: 'Comprehensive error handling with user-friendly messages', tags: ['error', 'handling', 'reliability', 'messages'], status: 'complete' },
      { id: 'feat-040', name: 'Dark Mode Theme', category: 'ui', description: 'Dark mode color scheme with theme switching support', tags: ['dark', 'theme', 'color', 'switch'], status: 'complete' },
      { id: 'feat-050', name: 'Smart Feature Ordering', category: 'ai', description: 'AI-powered feature ordering based on dependencies', tags: ['ai', 'ordering', 'dependencies', 'smart'], status: 'complete' },
      { id: 'feat-060', name: 'Export Reports', category: 'data', description: 'Export dashboard reports in multiple formats', tags: ['export', 'reports', 'pdf', 'csv'], status: 'complete' },
      { id: 'feat-070', name: 'User Authentication', category: 'security', description: 'Secure user login with role-based access control', tags: ['auth', 'login', 'security', 'rbac'], status: 'complete' },
      { id: 'feat-080', name: 'API Integration', category: 'integration', description: 'REST API endpoints for external tool integration', tags: ['api', 'rest', 'integration', 'external'], status: 'complete' },
      { id: 'feat-085', name: 'Database Query Optimizer', category: 'performance', description: 'Optimize database queries for faster dashboard loading', tags: ['database', 'query', 'optimizer', 'performance'], status: 'complete' },
      { id: 'feat-090', name: 'Mobile Responsive', category: 'mobile', description: 'Mobile-responsive dashboard with touch controls', tags: ['mobile', 'responsive', 'touch', 'controls'], status: 'complete' },
      { id: 'feat-092', name: 'AI Error Diagnosis', category: 'ai', description: 'AI-powered error analysis with fix suggestions', tags: ['ai', 'error', 'diagnosis', 'fix'], status: 'complete' },
      { id: 'feat-094', name: 'Code Quality Analysis', category: 'ai', description: 'Analyze code quality with scoring and improvements', tags: ['code', 'quality', 'analysis', 'scoring'], status: 'complete' },
      { id: 'feat-095', name: 'Natural Language Search', category: 'ai', description: 'Search features using natural language queries', tags: ['search', 'natural', 'language', 'nlp'], status: 'in-progress' },
      { id: 'feat-096', name: 'API Documentation', category: 'documentation', description: 'Auto-generate API documentation from code', tags: ['api', 'documentation', 'auto', 'generate'], status: 'planned' },
      { id: 'feat-100', name: 'Rate Limiting', category: 'scheduling', description: 'Rate limiting for API calls to prevent abuse', tags: ['rate', 'limit', 'api', 'throttle'], status: 'planned' },
    ];
  }

  // NLP search engine
  function tokenize(text) {
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(t => t.length > 1);
  }

  function computeRelevance(feature, tokens) {
    let score = 0;
    const featureText = `${feature.name} ${feature.description} ${feature.tags.join(' ')} ${feature.category}`.toLowerCase();
    for (const token of tokens) {
      if (feature.name.toLowerCase().includes(token)) score += 10;
      if (feature.description.toLowerCase().includes(token)) score += 5;
      if (feature.tags.some(t => t.includes(token))) score += 8;
      if (feature.category.toLowerCase().includes(token)) score += 6;
      if (featureText.includes(token)) score += 1;
    }
    return Math.min(score, 100);
  }

  function search(query) {
    if (!query || query.trim().length === 0) return [];
    const tokens = tokenize(query);
    if (tokens.length === 0) return [];
    const features = getFeatureIndex();
    const results = features.map(f => ({
      featureId: f.id,
      name: f.name,
      category: f.category,
      description: f.description,
      status: f.status,
      relevance: computeRelevance(f, tokens),
      matchedTerms: tokens.filter(t => `${f.name} ${f.description} ${f.tags.join(' ')} ${f.category}`.toLowerCase().includes(t)),
    })).filter(r => r.relevance > 0).sort((a, b) => b.relevance - a.relevance);
    state.lastQuery = query;
    state.lastResults = results;
    addToHistory(query, results.length);
    saveState();
    return results;
  }

  function getSearchResult(featureId) {
    return state.lastResults.find(r => r.featureId === featureId) || null;
  }

  // Search history
  let searchHistory = [
    { id: 'sh-001', query: 'show me all AI features', resultCount: 4, timestamp: new Date(Date.now() - 3600000).toISOString() },
    { id: 'sh-002', query: 'find mobile related features', resultCount: 2, timestamp: new Date(Date.now() - 7200000).toISOString() },
    { id: 'sh-003', query: 'which features handle errors', resultCount: 3, timestamp: new Date(Date.now() - 10800000).toISOString() },
    { id: 'sh-004', query: 'features about performance optimization', resultCount: 2, timestamp: new Date(Date.now() - 14400000).toISOString() },
    { id: 'sh-005', query: 'security and authentication', resultCount: 1, timestamp: new Date(Date.now() - 18000000).toISOString() },
    { id: 'sh-006', query: 'documentation features', resultCount: 1, timestamp: new Date(Date.now() - 21600000).toISOString() },
  ];

  function addToHistory(query, resultCount) {
    searchHistory.unshift({
      id: `sh-${String(searchHistory.length + 1).padStart(3, '0')}`,
      query,
      resultCount,
      timestamp: new Date().toISOString(),
    });
  }

  function getSearchHistory() {
    return searchHistory;
  }

  function clearHistory() {
    searchHistory = [];
    saveState();
  }

  // Search suggestions
  function getSuggestions() {
    return [
      { id: 'sug-001', text: 'Show all AI-powered features', category: 'ai', description: 'Find features using artificial intelligence' },
      { id: 'sug-002', text: 'Find mobile features', category: 'mobile', description: 'Search for mobile-related functionality' },
      { id: 'sug-003', text: 'What handles errors?', category: 'reliability', description: 'Discover error handling features' },
      { id: 'sug-004', text: 'Performance optimizations', category: 'performance', description: 'Find performance-related features' },
      { id: 'sug-005', text: 'Security features', category: 'security', description: 'Search for security and auth features' },
      { id: 'sug-006', text: 'Data export options', category: 'data', description: 'Find data export and report features' },
      { id: 'sug-007', text: 'UI and theme features', category: 'ui', description: 'Find user interface features' },
      { id: 'sug-008', text: 'Integration capabilities', category: 'integration', description: 'Search for integration features' },
    ];
  }

  function getSuggestion(id) {
    return getSuggestions().find(s => s.id === id) || null;
  }

  // Stats
  function getSearchStats() {
    return {
      totalFeatures: getFeatureIndex().length,
      searchCount: searchHistory.length,
      avgResults: searchHistory.length > 0 ? Math.round(searchHistory.reduce((s, h) => s + h.resultCount, 0) / searchHistory.length) : 0,
      suggestionCount: getSuggestions().length,
    };
  }

  // ── Render ────────────────────────────────────────────────────
  function render() {
    const container = document.getElementById('nl-search-widget');
    if (!container) return;
    const stats = getSearchStats();

    container.innerHTML = `
      <div id="nl-search-card">
        <div class="nls-header"><h3>Natural Language Feature Search</h3></div>
        <div class="nls-search-box">
          <input type="text" id="nls-search-input" class="nls-input" placeholder="Search features in natural language..." value="${state.lastQuery}" />
          <button id="nls-search-btn" class="nls-btn">Search</button>
        </div>
        <div class="nls-stats-row">
          <div class="nls-stat-card"><div class="nls-stat-val">${stats.totalFeatures}</div><div class="nls-stat-label">Features</div></div>
          <div class="nls-stat-card"><div class="nls-stat-val">${stats.searchCount}</div><div class="nls-stat-label">Searches</div></div>
          <div class="nls-stat-card"><div class="nls-stat-val">${stats.avgResults}</div><div class="nls-stat-label">Avg Results</div></div>
          <div class="nls-stat-card"><div class="nls-stat-val">${stats.suggestionCount}</div><div class="nls-stat-label">Suggestions</div></div>
        </div>
        <div class="nls-tabs">
          <button class="nls-tab ${state.activeTab === 'results' ? 'active' : ''}" data-tab="results">Results</button>
          <button class="nls-tab ${state.activeTab === 'history' ? 'active' : ''}" data-tab="history">History</button>
          <button class="nls-tab ${state.activeTab === 'suggestions' ? 'active' : ''}" data-tab="suggestions">Suggestions</button>
        </div>
        <div id="nls-content"></div>
      </div>
    `;

    container.querySelectorAll('.nls-tab').forEach(btn => {
      btn.addEventListener('click', () => { state.activeTab = btn.dataset.tab; saveState(); render(); });
    });

    document.getElementById('nls-search-btn').addEventListener('click', () => {
      const q = document.getElementById('nls-search-input').value;
      if (q.trim()) { search(q); render(); }
    });

    document.getElementById('nls-search-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = e.target.value;
        if (q.trim()) { search(q); render(); }
      }
    });

    renderContent();
  }

  function renderContent() {
    const el = document.getElementById('nls-content');
    if (!el) return;
    if (state.activeTab === 'results') renderResults(el);
    else if (state.activeTab === 'history') renderHistory(el);
    else renderSuggestions(el);
  }

  function renderResults(el) {
    const results = state.lastResults;
    const relColors = { high: '#22c55e', medium: '#f59e0b', low: '#ef4444' };
    el.innerHTML = `
      <div class="nls-list" id="nls-results-list">
        ${results.length === 0 ? '<div class="nls-result-detail" style="text-align:center;padding:20px">Type a query and click Search to find features</div>' : results.map(r => {
          const level = r.relevance >= 20 ? 'high' : r.relevance >= 10 ? 'medium' : 'low';
          return `
          <div class="nls-result-item" data-id="${r.featureId}">
            <div class="nls-result-top">
              <div class="nls-result-name">${r.featureId}: ${r.name}</div>
              <span class="nls-badge" style="background:${relColors[level]}22;color:${relColors[level]}">${r.relevance}%</span>
            </div>
            <div class="nls-result-detail">${r.description} · ${r.category} · ${r.status} · Matched: ${r.matchedTerms.join(', ')}</div>
          </div>`;
        }).join('')}
      </div>
    `;
  }

  function renderHistory(el) {
    el.innerHTML = `
      <div id="nls-history-section">
        <div class="nls-list" id="nls-history-list">
          ${searchHistory.map(h => `
            <div class="nls-history-item" data-id="${h.id}">
              <div class="nls-history-top">
                <div class="nls-history-query">${h.query}</div>
                <span class="nls-badge" style="background:#6366f122;color:#6366f1">${h.resultCount} results</span>
              </div>
              <div class="nls-history-detail">${new Date(h.timestamp).toLocaleString()}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderSuggestions(el) {
    el.innerHTML = `
      <div id="nls-suggestions-section">
        <div class="nls-list" id="nls-suggestions-list">
          ${getSuggestions().map(s => `
            <div class="nls-suggestion-item" data-id="${s.id}">
              <div class="nls-suggestion-top">
                <div class="nls-suggestion-text">${s.text}</div>
                <span class="nls-badge" style="background:#22c55e22;color:#22c55e">${s.category}</span>
              </div>
              <div class="nls-suggestion-detail">${s.description}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeTab: state.activeTab, lastQuery: state.lastQuery })); } catch (e) {}
  }
  function loadState() {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) { const p = JSON.parse(s); state.activeTab = p.activeTab || state.activeTab; state.lastQuery = p.lastQuery || ''; }
    } catch (e) {}
  }

  window.nlFeatureSearch = {
    search, getSearchResult,
    getSearchHistory, clearHistory,
    getSuggestions, getSuggestion,
    getFeatureIndex, getSearchStats,
    setTab(tab) { state.activeTab = tab; saveState(); render(); },
    getState() {
      return {
        activeTab: state.activeTab,
        totalFeatures: getFeatureIndex().length,
        searchCount: searchHistory.length,
        lastQuery: state.lastQuery,
      };
    },
  };

  document.addEventListener('DOMContentLoaded', () => { loadState(); render(); });
})();
