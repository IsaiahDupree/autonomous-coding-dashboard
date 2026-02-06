// feat-098: In-app Help System
(function () {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    #help-system-card {
      background: var(--color-card-bg, #1e1e2e);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .hs-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .hs-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .hs-tabs { display: flex; gap: 4px; margin-bottom: 16px; background: var(--color-bg, #12121a); border-radius: 8px; padding: 3px; }
    .hs-tab { flex: 1; padding: 6px 12px; border: none; background: transparent; color: var(--color-text-secondary, #a0a0b0); cursor: pointer; border-radius: 6px; font-size: 13px; transition: all 0.2s; }
    .hs-tab.active { background: var(--color-primary, #6366f1); color: #fff; }
    .hs-tab:hover:not(.active) { background: rgba(255,255,255,0.05); }
    .hs-stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
    .hs-stat-card { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 12px; text-align: center; }
    .hs-stat-val { font-size: 20px; font-weight: 700; color: var(--color-text, #e0e0e0); }
    .hs-stat-label { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }
    .hs-list { display: flex; flex-direction: column; gap: 8px; }
    .hs-article-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 14px; }
    .hs-article-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .hs-article-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .hs-badge { font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600; }
    .hs-article-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
    .hs-faq-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 14px; }
    .hs-faq-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .hs-faq-question { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .hs-faq-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
    .hs-tour-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 14px; }
    .hs-tour-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .hs-tour-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .hs-tour-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
  `;
  document.head.appendChild(style);

  const STORAGE_KEY = 'help-system-config';
  let state = { activeTab: 'articles' };

  function getArticles() {
    return [
      { id: 'art-001', title: 'Getting Started with the Dashboard', category: 'quickstart', content: 'Learn how to set up and configure your autonomous coding dashboard for first use.', tags: ['setup', 'beginner', 'config'], readTime: 3, views: 245 },
      { id: 'art-002', title: 'Understanding Feature Tracking', category: 'features', content: 'Features are tracked in feature_list.json with pass/fail status updated by automated tests.', tags: ['features', 'tracking', 'testing'], readTime: 5, views: 189 },
      { id: 'art-003', title: 'Configuring the Harness Runner', category: 'harness', content: 'The harness runner manages autonomous coding agents. Configure mode, timeouts, and retry policies.', tags: ['harness', 'config', 'agents'], readTime: 7, views: 312 },
      { id: 'art-004', title: 'Working with Webhooks', category: 'integration', content: 'Set up webhook endpoints to receive notifications about feature pass/fail events in real-time.', tags: ['webhooks', 'integration', 'notifications'], readTime: 4, views: 156 },
      { id: 'art-005', title: 'API Reference Guide', category: 'api', content: 'Complete reference for all REST API endpoints including authentication, rate limits, and examples.', tags: ['api', 'rest', 'reference'], readTime: 10, views: 428 },
      { id: 'art-006', title: 'Troubleshooting Common Issues', category: 'troubleshooting', content: 'Solutions for common problems including connection errors, timeout issues, and agent failures.', tags: ['troubleshooting', 'errors', 'fixes'], readTime: 6, views: 367 },
      { id: 'art-007', title: 'Mobile Dashboard Usage', category: 'mobile', content: 'Access the dashboard on mobile devices with touch controls and responsive layout.', tags: ['mobile', 'responsive', 'touch'], readTime: 3, views: 98 },
      { id: 'art-008', title: 'Security Best Practices', category: 'security', content: 'Secure your dashboard with authentication, role-based access, and API key management.', tags: ['security', 'auth', 'best-practices'], readTime: 8, views: 201 },
    ];
  }

  function getArticle(id) {
    return getArticles().find(a => a.id === id) || null;
  }

  function getArticlesByCategory(category) {
    return getArticles().filter(a => a.category === category);
  }

  function searchArticles(query) {
    if (!query) return [];
    const q = query.toLowerCase();
    return getArticles().filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.content.toLowerCase().includes(q) ||
      a.tags.some(t => t.includes(q))
    );
  }

  function getFAQs() {
    return [
      { id: 'faq-001', question: 'How do I start the harness?', answer: 'Run ./init.sh to start the dev environment, then use the dashboard controls or POST /api/harness/start.', category: 'harness', helpful: 45 },
      { id: 'faq-002', question: 'Why are tests failing?', answer: 'Check console errors, verify the dev server is running, and ensure all dependencies are installed with npm install.', category: 'troubleshooting', helpful: 67 },
      { id: 'faq-003', question: 'How do I add a new feature?', answer: 'Add a new entry to feature_list.json with a unique ID, description, category, and passes: false.', category: 'features', helpful: 38 },
      { id: 'faq-004', question: 'Can I use the API without authentication?', answer: 'GET endpoints are public. POST/PUT/DELETE require a Bearer token in the Authorization header.', category: 'api', helpful: 52 },
      { id: 'faq-005', question: 'How do I configure webhooks?', answer: 'Use POST /api/webhooks with your endpoint URL and event types to register a new webhook.', category: 'integration', helpful: 29 },
      { id: 'faq-006', question: 'Is mobile access supported?', answer: 'Yes, the dashboard is fully responsive with touch controls for swipe, pinch-zoom, and pull-to-refresh.', category: 'mobile', helpful: 41 },
    ];
  }

  function getFAQ(id) {
    return getFAQs().find(f => f.id === id) || null;
  }

  function getTours() {
    return [
      { id: 'tour-001', name: 'Dashboard Overview', steps: 5, description: 'Learn the main dashboard layout and key widgets', target: 'dashboard', completed: false },
      { id: 'tour-002', name: 'Feature Management', steps: 4, description: 'How to track, manage, and test features', target: 'features', completed: false },
      { id: 'tour-003', name: 'Harness Controls', steps: 3, description: 'Start, stop, and configure the coding harness', target: 'harness', completed: true },
      { id: 'tour-004', name: 'API Explorer', steps: 6, description: 'Explore API endpoints and test them interactively', target: 'api', completed: false },
      { id: 'tour-005', name: 'Monitoring Setup', steps: 4, description: 'Set up alerts, notifications, and monitoring', target: 'monitoring', completed: false },
    ];
  }

  function getTour(id) {
    return getTours().find(t => t.id === id) || null;
  }

  function startTour(id) {
    const tour = getTour(id);
    if (!tour) return null;
    return { tourId: id, currentStep: 1, totalSteps: tour.steps, status: 'active' };
  }

  function getHelpStats() {
    return {
      articleCount: getArticles().length,
      faqCount: getFAQs().length,
      tourCount: getTours().length,
      categoryCount: [...new Set(getArticles().map(a => a.category))].length,
    };
  }

  // ── Render ────────────────────────────────────────────────────
  function render() {
    const container = document.getElementById('help-system-widget');
    if (!container) return;
    const stats = getHelpStats();

    container.innerHTML = `
      <div id="help-system-card">
        <div class="hs-header"><h3>Help Center</h3></div>
        <div class="hs-stats-row">
          <div class="hs-stat-card"><div class="hs-stat-val">${stats.articleCount}</div><div class="hs-stat-label">Articles</div></div>
          <div class="hs-stat-card"><div class="hs-stat-val">${stats.faqCount}</div><div class="hs-stat-label">FAQs</div></div>
          <div class="hs-stat-card"><div class="hs-stat-val">${stats.tourCount}</div><div class="hs-stat-label">Tours</div></div>
          <div class="hs-stat-card"><div class="hs-stat-val">${stats.categoryCount}</div><div class="hs-stat-label">Categories</div></div>
        </div>
        <div class="hs-tabs">
          <button class="hs-tab ${state.activeTab === 'articles' ? 'active' : ''}" data-tab="articles">Articles</button>
          <button class="hs-tab ${state.activeTab === 'faqs' ? 'active' : ''}" data-tab="faqs">FAQs</button>
          <button class="hs-tab ${state.activeTab === 'tours' ? 'active' : ''}" data-tab="tours">Tours</button>
        </div>
        <div id="hs-content"></div>
      </div>
    `;

    container.querySelectorAll('.hs-tab').forEach(btn => {
      btn.addEventListener('click', () => { state.activeTab = btn.dataset.tab; saveState(); render(); });
    });
    renderContent();
  }

  function renderContent() {
    const el = document.getElementById('hs-content');
    if (!el) return;
    if (state.activeTab === 'articles') renderArticles(el);
    else if (state.activeTab === 'faqs') renderFAQs(el);
    else renderTours(el);
  }

  const catColors = { quickstart: '#22c55e', features: '#3b82f6', harness: '#f59e0b', integration: '#8b5cf6', api: '#ec4899', troubleshooting: '#ef4444', mobile: '#06b6d4', security: '#f97316' };

  function renderArticles(el) {
    const articles = getArticles();
    el.innerHTML = `
      <div class="hs-list" id="hs-article-list">
        ${articles.map(a => `
          <div class="hs-article-item" data-id="${a.id}">
            <div class="hs-article-top">
              <div class="hs-article-name">${a.title}</div>
              <span class="hs-badge" style="background:${catColors[a.category] || '#6366f1'}22;color:${catColors[a.category] || '#6366f1'}">${a.category}</span>
            </div>
            <div class="hs-article-detail">${a.readTime} min read · ${a.views} views · ${a.tags.join(', ')}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderFAQs(el) {
    const faqs = getFAQs();
    el.innerHTML = `
      <div id="hs-faq-section">
        <div class="hs-list" id="hs-faq-list">
          ${faqs.map(f => `
            <div class="hs-faq-item" data-id="${f.id}">
              <div class="hs-faq-top">
                <div class="hs-faq-question">${f.question}</div>
                <span class="hs-badge" style="background:#22c55e22;color:#22c55e">${f.helpful} helpful</span>
              </div>
              <div class="hs-faq-detail">${f.answer}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderTours(el) {
    const tours = getTours();
    el.innerHTML = `
      <div id="hs-tour-section">
        <div class="hs-list" id="hs-tour-list">
          ${tours.map(t => `
            <div class="hs-tour-item" data-id="${t.id}">
              <div class="hs-tour-top">
                <div class="hs-tour-name">${t.name}</div>
                <span class="hs-badge" style="background:${t.completed ? '#22c55e' : '#6366f1'}22;color:${t.completed ? '#22c55e' : '#6366f1'}">${t.completed ? 'Done' : `${t.steps} steps`}</span>
              </div>
              <div class="hs-tour-detail">${t.description} · Target: ${t.target}</div>
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

  window.helpSystem = {
    getArticles, getArticle, getArticlesByCategory, searchArticles,
    getFAQs, getFAQ,
    getTours, getTour, startTour,
    getHelpStats,
    setTab(tab) { state.activeTab = tab; saveState(); render(); },
    getState() {
      return {
        activeTab: state.activeTab,
        articleCount: getArticles().length,
        faqCount: getFAQs().length,
        tourCount: getTours().length,
      };
    },
  };

  document.addEventListener('DOMContentLoaded', () => { loadState(); render(); });
})();
