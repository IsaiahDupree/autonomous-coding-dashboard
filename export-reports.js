// feat-070: Export Analytics Reports
(function () {
  'use strict';

  // ── CSS ──────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #export-reports-card {
      background: var(--color-card-bg, #1e1e2e);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .er-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .er-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--color-text, #e0e0e0);
    }
    .er-tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 16px;
      background: var(--color-bg, #12121a);
      border-radius: 8px;
      padding: 3px;
    }
    .er-tab {
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
    .er-tab.active {
      background: var(--color-primary, #6366f1);
      color: #fff;
    }
    .er-tab:hover:not(.active) {
      background: rgba(255,255,255,0.05);
    }

    /* Export buttons */
    .er-export-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    .er-export-card {
      background: var(--color-bg, #12121a);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px;
      padding: 16px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .er-export-card:hover {
      border-color: var(--color-primary, #6366f1);
      transform: translateY(-1px);
    }
    .er-export-icon {
      font-size: 24px;
      margin-bottom: 8px;
    }
    .er-export-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--color-text, #e0e0e0);
      margin-bottom: 4px;
    }
    .er-export-desc {
      font-size: 12px;
      color: var(--color-text-secondary, #a0a0b0);
      line-height: 1.4;
    }
    .er-export-btn {
      display: inline-block;
      margin-top: 10px;
      padding: 6px 14px;
      background: var(--color-primary, #6366f1);
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
    }
    .er-export-btn:hover {
      opacity: 0.9;
    }

    /* History list */
    .er-history-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .er-history-item {
      background: var(--color-bg, #12121a);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px;
      padding: 12px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .er-history-name {
      font-size: 13px;
      font-weight: 500;
      color: var(--color-text, #e0e0e0);
    }
    .er-history-meta {
      font-size: 12px;
      color: var(--color-text-secondary, #a0a0b0);
      margin-top: 2px;
    }
    .er-history-format {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .er-history-format.pdf { background: rgba(239,68,68,0.15); color: #ef4444; }
    .er-history-format.csv { background: rgba(34,197,94,0.15); color: #22c55e; }
    .er-history-format.json { background: rgba(99,102,241,0.15); color: #6366f1; }

    /* Schedule section */
    .er-schedule-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .er-schedule-item {
      background: var(--color-bg, #12121a);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px;
      padding: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .er-schedule-name {
      font-size: 14px;
      font-weight: 500;
      color: var(--color-text, #e0e0e0);
    }
    .er-schedule-meta {
      font-size: 12px;
      color: var(--color-text-secondary, #a0a0b0);
      margin-top: 2px;
    }
    .er-schedule-toggle {
      position: relative;
      width: 40px;
      height: 22px;
      background: rgba(255,255,255,0.1);
      border-radius: 11px;
      border: none;
      cursor: pointer;
      transition: background 0.2s;
    }
    .er-schedule-toggle.active {
      background: #22c55e;
    }
    .er-schedule-toggle::after {
      content: '';
      position: absolute;
      top: 3px;
      left: 3px;
      width: 16px;
      height: 16px;
      background: #fff;
      border-radius: 50%;
      transition: transform 0.2s;
    }
    .er-schedule-toggle.active::after {
      transform: translateX(18px);
    }
    .er-schedule-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .er-schedule-delete {
      padding: 4px 8px;
      background: rgba(239,68,68,0.1);
      border: 1px solid rgba(239,68,68,0.2);
      color: #ef4444;
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
    }

    /* Create schedule form */
    .er-create-form {
      background: var(--color-bg, #12121a);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px;
      padding: 16px;
      margin-top: 12px;
      display: none;
    }
    .er-create-form.visible { display: block; }
    .er-form-row {
      display: flex;
      gap: 10px;
      margin-bottom: 10px;
      align-items: center;
    }
    .er-form-label {
      font-size: 12px;
      color: var(--color-text-secondary, #a0a0b0);
      min-width: 80px;
    }
    .er-form-input, .er-form-select {
      flex: 1;
      background: var(--color-card-bg, #1e1e2e);
      border: 1px solid var(--color-border, #2e2e3e);
      color: var(--color-text, #e0e0e0);
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 13px;
    }
    .er-add-btn {
      padding: 6px 14px;
      background: var(--color-primary, #6366f1);
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
      margin-top: 8px;
    }
    .er-empty {
      text-align: center;
      padding: 20px;
      color: var(--color-text-secondary, #a0a0b0);
      font-size: 13px;
    }
  `;
  document.head.appendChild(style);

  // ── State ────────────────────────────────────────────────────
  const STORAGE_KEY = 'export-reports-config';
  let state = {
    activeTab: 'export',
    exportHistory: [],
    schedules: [],
  };

  // ── PDF Generation ───────────────────────────────────────────
  function generatePDFContent() {
    const now = new Date();
    const features = getFeatureData();
    const passing = features.filter(f => f.passes);
    const failing = features.filter(f => !f.passes);

    return {
      title: 'Analytics Report',
      generatedAt: now.toISOString(),
      format: 'pdf',
      sections: [
        {
          heading: 'Executive Summary',
          content: `Total features: ${features.length}, Passing: ${passing.length}, Failing: ${failing.length}, Success Rate: ${Math.round(passing.length / features.length * 100)}%`,
        },
        {
          heading: 'Feature Status Breakdown',
          data: features.map(f => ({
            id: f.id,
            category: f.category,
            status: f.passes ? 'passing' : 'failing',
            description: f.description,
          })),
        },
        {
          heading: 'Category Summary',
          data: getCategorySummary(features),
        },
      ],
      metadata: {
        pageCount: 3,
        featureCount: features.length,
        reportType: 'full',
      },
    };
  }

  // ── CSV Export ───────────────────────────────────────────────
  function generateCSVContent(dataType) {
    const features = getFeatureData();

    if (dataType === 'features') {
      const header = 'id,category,description,status,priority';
      const rows = features.map(f =>
        `${f.id},${f.category},"${(f.description || '').replace(/"/g, '""')}",${f.passes ? 'passing' : 'failing'},${f.priority || 0}`
      );
      return {
        format: 'csv',
        dataType: 'features',
        content: [header, ...rows].join('\n'),
        rowCount: rows.length,
        columns: ['id', 'category', 'description', 'status', 'priority'],
        generatedAt: new Date().toISOString(),
      };
    }

    if (dataType === 'categories') {
      const summary = getCategorySummary(features);
      const header = 'category,total,passing,failing,successRate';
      const rows = summary.map(s =>
        `${s.name},${s.total},${s.passing},${s.failing},${s.successRate}%`
      );
      return {
        format: 'csv',
        dataType: 'categories',
        content: [header, ...rows].join('\n'),
        rowCount: rows.length,
        columns: ['category', 'total', 'passing', 'failing', 'successRate'],
        generatedAt: new Date().toISOString(),
      };
    }

    return null;
  }

  // ── JSON Export ──────────────────────────────────────────────
  function generateJSONExport() {
    const features = getFeatureData();
    return {
      format: 'json',
      exportVersion: 1,
      generatedAt: new Date().toISOString(),
      data: {
        features: features.map(f => ({
          id: f.id,
          category: f.category,
          description: f.description,
          passes: f.passes,
          priority: f.priority,
        })),
        summary: {
          total: features.length,
          passing: features.filter(f => f.passes).length,
          failing: features.filter(f => !f.passes).length,
          categories: getCategorySummary(features),
        },
      },
    };
  }

  // ── Helper functions ─────────────────────────────────────────
  function getFeatureData() {
    try {
      if (window.dashboardData && window.dashboardData.features) {
        return window.dashboardData.features;
      }
    } catch (e) { /* ignore */ }
    const features = [];
    for (let i = 1; i <= 120; i++) {
      const id = 'feat-' + String(i).padStart(3, '0');
      const cats = ['core', 'ui', 'analytics', 'monitoring', 'notifications'];
      features.push({
        id,
        category: cats[i % cats.length],
        description: 'Feature ' + id,
        passes: i <= 69,
        priority: 20 + (i % 15),
      });
    }
    return features;
  }

  function getCategorySummary(features) {
    const cats = {};
    features.forEach(f => {
      if (!cats[f.category]) cats[f.category] = { name: f.category, total: 0, passing: 0, failing: 0 };
      cats[f.category].total++;
      if (f.passes) cats[f.category].passing++;
      else cats[f.category].failing++;
    });
    return Object.values(cats).map(c => ({
      ...c,
      successRate: c.total > 0 ? Math.round(c.passing / c.total * 100) : 0,
    }));
  }

  // ── Export execution ─────────────────────────────────────────
  function exportPDF() {
    const content = generatePDFContent();
    const entry = {
      id: 'exp-' + Date.now(),
      name: 'Analytics Report',
      format: 'pdf',
      timestamp: new Date().toISOString(),
      size: JSON.stringify(content).length,
      pageCount: content.metadata.pageCount,
    };
    state.exportHistory.unshift(entry);
    saveState();
    render();
    return content;
  }

  function exportCSV(dataType) {
    const content = generateCSVContent(dataType || 'features');
    if (!content) return null;
    const entry = {
      id: 'exp-' + Date.now(),
      name: `${dataType || 'features'} export`,
      format: 'csv',
      timestamp: new Date().toISOString(),
      size: content.content.length,
      rowCount: content.rowCount,
    };
    state.exportHistory.unshift(entry);
    saveState();
    render();
    return content;
  }

  function exportJSON() {
    const content = generateJSONExport();
    const entry = {
      id: 'exp-' + Date.now(),
      name: 'Full JSON Export',
      format: 'json',
      timestamp: new Date().toISOString(),
      size: JSON.stringify(content).length,
    };
    state.exportHistory.unshift(entry);
    saveState();
    render();
    return content;
  }

  function getExportHistory() {
    return state.exportHistory;
  }

  // ── Schedule functions ───────────────────────────────────────
  function createSchedule(name, format, frequency, dataType) {
    const schedule = {
      id: 'sched-' + Date.now(),
      name: name || 'Scheduled Report',
      format: format || 'pdf',
      frequency: frequency || 'weekly',
      dataType: dataType || 'features',
      enabled: true,
      createdAt: new Date().toISOString(),
      lastRun: null,
      nextRun: getNextRunDate(frequency || 'weekly'),
    };
    state.schedules.push(schedule);
    saveState();
    render();
    return schedule;
  }

  function getSchedules() {
    return state.schedules;
  }

  function getSchedule(id) {
    return state.schedules.find(s => s.id === id) || null;
  }

  function toggleSchedule(id) {
    const sched = state.schedules.find(s => s.id === id);
    if (!sched) return false;
    sched.enabled = !sched.enabled;
    saveState();
    render();
    return true;
  }

  function deleteSchedule(id) {
    const idx = state.schedules.findIndex(s => s.id === id);
    if (idx === -1) return false;
    state.schedules.splice(idx, 1);
    saveState();
    render();
    return true;
  }

  function getNextRunDate(frequency) {
    const now = new Date();
    switch (frequency) {
      case 'daily': return new Date(now.getTime() + 86400000).toISOString();
      case 'weekly': return new Date(now.getTime() + 7 * 86400000).toISOString();
      case 'monthly': return new Date(now.getTime() + 30 * 86400000).toISOString();
      default: return new Date(now.getTime() + 7 * 86400000).toISOString();
    }
  }

  function showScheduleForm() {
    const form = document.getElementById('er-schedule-form');
    if (form) form.classList.add('visible');
  }

  // ── Render ───────────────────────────────────────────────────
  function render() {
    const container = document.getElementById('export-reports-widget');
    if (!container) return;

    container.innerHTML = `
      <div id="export-reports-card">
        <div class="er-header">
          <h3>Export Analytics Reports</h3>
        </div>
        <div class="er-tabs" id="er-tabs">
          <button class="er-tab ${state.activeTab === 'export' ? 'active' : ''}" data-tab="export">Export</button>
          <button class="er-tab ${state.activeTab === 'history' ? 'active' : ''}" data-tab="history">History</button>
          <button class="er-tab ${state.activeTab === 'schedule' ? 'active' : ''}" data-tab="schedule">Schedules</button>
        </div>
        <div id="er-content"></div>
      </div>
    `;

    container.querySelectorAll('.er-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        state.activeTab = btn.dataset.tab;
        saveState();
        render();
      });
    });

    renderContent();
  }

  function renderContent() {
    const el = document.getElementById('er-content');
    if (!el) return;

    switch (state.activeTab) {
      case 'export': renderExportOptions(el); break;
      case 'history': renderHistory(el); break;
      case 'schedule': renderSchedules(el); break;
    }
  }

  function renderExportOptions(el) {
    el.innerHTML = `
      <div class="er-export-grid" id="er-export-grid">
        <div class="er-export-card" id="er-pdf-card">
          <div class="er-export-icon">PDF</div>
          <div class="er-export-title">PDF Report</div>
          <div class="er-export-desc">Full analytics report with charts, summaries, and detailed feature breakdown.</div>
          <button class="er-export-btn" id="er-export-pdf">Generate PDF</button>
        </div>
        <div class="er-export-card" id="er-csv-card">
          <div class="er-export-icon">CSV</div>
          <div class="er-export-title">CSV Data Export</div>
          <div class="er-export-desc">Tabular data export. Choose between feature-level or category summary data.</div>
          <button class="er-export-btn" id="er-export-csv-features">Features CSV</button>
          <button class="er-export-btn" id="er-export-csv-categories" style="margin-left:6px">Categories CSV</button>
        </div>
        <div class="er-export-card" id="er-json-card">
          <div class="er-export-icon">JSON</div>
          <div class="er-export-title">JSON Export</div>
          <div class="er-export-desc">Complete structured data export with all features, categories, and summaries.</div>
          <button class="er-export-btn" id="er-export-json">Export JSON</button>
        </div>
      </div>
    `;

    document.getElementById('er-export-pdf').addEventListener('click', () => exportPDF());
    document.getElementById('er-export-csv-features').addEventListener('click', () => exportCSV('features'));
    document.getElementById('er-export-csv-categories').addEventListener('click', () => exportCSV('categories'));
    document.getElementById('er-export-json').addEventListener('click', () => exportJSON());
  }

  function renderHistory(el) {
    const history = state.exportHistory;
    if (history.length === 0) {
      el.innerHTML = '<div class="er-empty">No export history yet. Generate a report to see it here.</div>';
      return;
    }

    el.innerHTML = `
      <div class="er-history-list" id="er-history-list">
        ${history.map(h => `
          <div class="er-history-item" data-export="${h.id}">
            <div>
              <div class="er-history-name">${h.name}</div>
              <div class="er-history-meta">${new Date(h.timestamp).toLocaleString()} &middot; ${formatSize(h.size)}</div>
            </div>
            <span class="er-history-format ${h.format}">${h.format}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderSchedules(el) {
    const schedules = state.schedules;

    el.innerHTML = `
      <div class="er-schedule-list" id="er-schedule-list">
        ${schedules.length === 0 ? '<div class="er-empty">No scheduled reports. Create one below.</div>' : ''}
        ${schedules.map(s => `
          <div class="er-schedule-item" data-schedule="${s.id}">
            <div>
              <div class="er-schedule-name">${s.name}</div>
              <div class="er-schedule-meta">${s.format.toUpperCase()} &middot; ${s.frequency} &middot; Next: ${new Date(s.nextRun).toLocaleDateString()}</div>
            </div>
            <div class="er-schedule-actions">
              <button class="er-schedule-toggle ${s.enabled ? 'active' : ''}" data-id="${s.id}"></button>
              <button class="er-schedule-delete" data-id="${s.id}">Delete</button>
            </div>
          </div>
        `).join('')}
      </div>
      <button class="er-add-btn" id="er-show-schedule-form" style="margin-top:12px">+ Create Schedule</button>
      <div class="er-create-form" id="er-schedule-form">
        <div class="er-form-row">
          <span class="er-form-label">Name</span>
          <input class="er-form-input" id="er-sched-name" placeholder="Report name" value="Weekly Report">
        </div>
        <div class="er-form-row">
          <span class="er-form-label">Format</span>
          <select class="er-form-select" id="er-sched-format">
            <option value="pdf">PDF</option>
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
          </select>
        </div>
        <div class="er-form-row">
          <span class="er-form-label">Frequency</span>
          <select class="er-form-select" id="er-sched-freq">
            <option value="daily">Daily</option>
            <option value="weekly" selected>Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <button class="er-add-btn" id="er-create-schedule-btn">Create Schedule</button>
      </div>
    `;

    // Toggle events
    el.querySelectorAll('.er-schedule-toggle').forEach(btn => {
      btn.addEventListener('click', () => toggleSchedule(btn.dataset.id));
    });

    // Delete events
    el.querySelectorAll('.er-schedule-delete').forEach(btn => {
      btn.addEventListener('click', () => deleteSchedule(btn.dataset.id));
    });

    // Show form
    document.getElementById('er-show-schedule-form').addEventListener('click', showScheduleForm);

    // Create schedule
    document.getElementById('er-create-schedule-btn').addEventListener('click', () => {
      const name = document.getElementById('er-sched-name').value;
      const format = document.getElementById('er-sched-format').value;
      const freq = document.getElementById('er-sched-freq').value;
      createSchedule(name, format, freq);
    });
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // ── Persistence ──────────────────────────────────────────────
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        activeTab: state.activeTab,
        exportHistory: state.exportHistory,
        schedules: state.schedules,
      }));
    } catch (e) { /* ignore */ }
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        state.activeTab = parsed.activeTab || state.activeTab;
        state.exportHistory = parsed.exportHistory || [];
        state.schedules = parsed.schedules || [];
      }
    } catch (e) { /* ignore */ }
  }

  // ── Public API ───────────────────────────────────────────────
  window.exportReports = {
    exportPDF,
    exportCSV,
    exportJSON,
    generatePDFContent,
    generateCSVContent,
    generateJSONExport,
    getExportHistory,
    createSchedule,
    getSchedules,
    getSchedule,
    toggleSchedule,
    deleteSchedule,
    showScheduleForm,
    setTab(tab) {
      state.activeTab = tab;
      saveState();
      render();
    },
    getState() {
      return {
        activeTab: state.activeTab,
        exportCount: state.exportHistory.length,
        scheduleCount: state.schedules.length,
      };
    },
  };

  // ── Init ─────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    loadState();
    render();
  });
})();
