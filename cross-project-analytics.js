/**
 * Cross-Project Analytics Widget (feat-041)
 * Aggregate metrics across all targets - total features completed,
 * cost breakdown by project, velocity comparison chart, project health scores.
 */

class CrossProjectAnalytics {
  constructor(containerId = 'cross-project-analytics-widget') {
    this.container = document.getElementById(containerId);
    this.analyticsData = null;
    this.sortField = 'name';
    this.sortAsc = true;
    this.API_BASE = 'http://localhost:3434';

    if (!this.container) {
      console.warn(`Container #${containerId} not found`);
      return;
    }

    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
    this.loadAnalytics();
  }

  render() {
    this.container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Cross-Project Analytics</h3>
            <p class="card-subtitle" id="cpa-summary-text">Loading analytics data...</p>
          </div>
          <div class="flex gap-1" style="align-items: center;">
            <button class="btn btn-secondary btn-sm" id="btn-cpa-refresh" title="Refresh analytics">
              Refresh
            </button>
          </div>
        </div>
        <div class="card-body">

          <!-- Summary Cards -->
          <div class="cpa-summary-grid" id="cpa-summary-grid" style="display:none;">
            <div class="cpa-stat-card">
              <div class="cpa-stat-value" id="cpa-total-features">0</div>
              <div class="cpa-stat-label">Total Features</div>
            </div>
            <div class="cpa-stat-card">
              <div class="cpa-stat-value cpa-color-success" id="cpa-total-completed">0</div>
              <div class="cpa-stat-label">Completed</div>
            </div>
            <div class="cpa-stat-card">
              <div class="cpa-stat-value cpa-color-warn" id="cpa-total-pending">0</div>
              <div class="cpa-stat-label">Pending</div>
            </div>
            <div class="cpa-stat-card">
              <div class="cpa-stat-value cpa-color-cost" id="cpa-total-cost">$0</div>
              <div class="cpa-stat-label">Total Cost</div>
            </div>
          </div>

          <!-- Overall Progress Bar -->
          <div class="cpa-overall" id="cpa-overall" style="display:none;">
            <div class="cpa-overall-label">
              <span>Overall Completion</span>
              <span id="cpa-overall-pct" class="cpa-pct">0%</span>
            </div>
            <div class="cpa-progress-bar">
              <div class="cpa-progress-fill" id="cpa-overall-fill" style="width:0%"></div>
            </div>
          </div>

          <!-- Velocity Chart -->
          <div class="cpa-velocity-section" id="cpa-velocity-section" style="display:none;">
            <h4 class="cpa-section-title">Velocity Comparison (features/day)</h4>
            <div class="cpa-velocity-chart" id="cpa-velocity-chart"></div>
          </div>

          <!-- Cost Breakdown -->
          <div class="cpa-cost-section" id="cpa-cost-section" style="display:none;">
            <h4 class="cpa-section-title">Cost Breakdown by Project</h4>
            <div class="cpa-cost-chart" id="cpa-cost-chart"></div>
          </div>

          <!-- Health Scores -->
          <div class="cpa-health-section" id="cpa-health-section" style="display:none;">
            <h4 class="cpa-section-title">Project Health Scores</h4>
            <div class="cpa-health-grid" id="cpa-health-grid"></div>
          </div>

          <!-- Projects Table -->
          <div class="cpa-table-section" id="cpa-table-section" style="display:none;">
            <h4 class="cpa-section-title">All Projects</h4>
            <div class="cpa-table-wrap">
              <table class="cpa-table">
                <thead>
                  <tr>
                    <th class="cpa-sortable" data-sort="name">Project</th>
                    <th class="cpa-sortable" data-sort="features">Features</th>
                    <th class="cpa-sortable" data-sort="percent">Progress</th>
                    <th class="cpa-sortable" data-sort="cost">Cost</th>
                    <th class="cpa-sortable" data-sort="velocity">Velocity</th>
                    <th class="cpa-sortable" data-sort="health">Health</th>
                  </tr>
                </thead>
                <tbody id="cpa-table-body"></tbody>
              </table>
            </div>
          </div>

          <!-- Loading State -->
          <div class="cpa-loading" id="cpa-loading">
            <div class="e2e-spinner"></div>
            <span>Loading cross-project analytics...</span>
          </div>

          <!-- Error State -->
          <div class="cpa-error" id="cpa-error" style="display:none;">
            <p id="cpa-error-msg">Failed to load analytics data</p>
            <button class="btn btn-secondary btn-sm" id="btn-cpa-retry">Retry</button>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    document.getElementById('btn-cpa-refresh')?.addEventListener('click', () => this.loadAnalytics());
    document.getElementById('btn-cpa-retry')?.addEventListener('click', () => this.loadAnalytics());

    // Sortable headers
    this.container.querySelectorAll('.cpa-sortable').forEach(th => {
      th.addEventListener('click', () => {
        const field = th.dataset.sort;
        if (this.sortField === field) {
          this.sortAsc = !this.sortAsc;
        } else {
          this.sortField = field;
          this.sortAsc = true;
        }
        this.renderTable();
      });
    });
  }

  async loadAnalytics() {
    const loading = document.getElementById('cpa-loading');
    const error = document.getElementById('cpa-error');
    if (loading) loading.style.display = 'flex';
    if (error) error.style.display = 'none';

    try {
      const response = await fetch(`${this.API_BASE}/api/cross-project-analytics`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Unknown error');

      this.analyticsData = result.data;
      if (loading) loading.style.display = 'none';
      this.renderAnalytics();
    } catch (err) {
      console.error('Failed to load cross-project analytics:', err);
      if (loading) loading.style.display = 'none';
      if (error) {
        error.style.display = 'flex';
        const msg = document.getElementById('cpa-error-msg');
        if (msg) msg.textContent = `Failed to load analytics: ${err.message}`;
      }
    }
  }

  renderAnalytics() {
    if (!this.analyticsData) return;

    const { summary, projects } = this.analyticsData;

    // Summary text
    const summaryEl = document.getElementById('cpa-summary-text');
    if (summaryEl) {
      summaryEl.textContent = `${summary.totalProjects} projects | ${summary.totalCompleted}/${summary.totalFeatures} features completed (${summary.overallPercent}%)`;
    }

    // Summary cards
    const grid = document.getElementById('cpa-summary-grid');
    if (grid) grid.style.display = 'grid';
    this.setText('cpa-total-features', summary.totalFeatures.toLocaleString());
    this.setText('cpa-total-completed', summary.totalCompleted.toLocaleString());
    this.setText('cpa-total-pending', summary.totalPending.toLocaleString());
    this.setText('cpa-total-cost', `$${summary.totalCost.toFixed(2)}`);

    // Overall progress bar
    const overallEl = document.getElementById('cpa-overall');
    if (overallEl) overallEl.style.display = 'block';
    this.setText('cpa-overall-pct', `${summary.overallPercent}%`);
    const fillEl = document.getElementById('cpa-overall-fill');
    if (fillEl) {
      fillEl.style.width = `${summary.overallPercent}%`;
      fillEl.className = 'cpa-progress-fill ' + this.getHealthClass(summary.overallPercent);
    }

    // Velocity chart
    this.renderVelocityChart(projects);

    // Cost breakdown
    this.renderCostChart(projects);

    // Health scores
    this.renderHealthGrid(projects);

    // Projects table
    this.renderTable();
  }

  renderVelocityChart(projects) {
    const section = document.getElementById('cpa-velocity-section');
    const chart = document.getElementById('cpa-velocity-chart');
    if (!section || !chart) return;

    // Show projects with velocity data, sorted by avg velocity
    const withVelocity = projects
      .filter(p => p.velocity.avgDaily > 0)
      .sort((a, b) => b.velocity.avgDaily - a.velocity.avgDaily)
      .slice(0, 12);

    if (withVelocity.length === 0) {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';
    const maxVelocity = Math.max(...withVelocity.map(p => p.velocity.avgDaily));

    chart.innerHTML = withVelocity.map(p => {
      const barWidth = maxVelocity > 0 ? (p.velocity.avgDaily / maxVelocity) * 100 : 0;
      const cls = this.getHealthClass(p.percentComplete);
      return `
        <div class="cpa-vel-row">
          <div class="cpa-vel-label" title="${this.escapeHtml(p.name)}">${this.escapeHtml(p.name)}</div>
          <div class="cpa-vel-bar-wrap">
            <div class="cpa-vel-bar ${cls}" style="width: ${barWidth}%"></div>
          </div>
          <div class="cpa-vel-value">${p.velocity.avgDaily}</div>
        </div>
      `;
    }).join('');
  }

  renderCostChart(projects) {
    const section = document.getElementById('cpa-cost-section');
    const chart = document.getElementById('cpa-cost-chart');
    if (!section || !chart) return;

    const withCosts = projects
      .filter(p => p.cost.total > 0)
      .sort((a, b) => b.cost.total - a.cost.total);

    if (withCosts.length === 0) {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';
    const maxCost = Math.max(...withCosts.map(p => p.cost.total));

    chart.innerHTML = withCosts.map(p => {
      const barWidth = maxCost > 0 ? (p.cost.total / maxCost) * 100 : 0;
      return `
        <div class="cpa-cost-row">
          <div class="cpa-cost-label" title="${this.escapeHtml(p.name)}">${this.escapeHtml(p.name)}</div>
          <div class="cpa-cost-bar-wrap">
            <div class="cpa-cost-bar" style="width: ${barWidth}%"></div>
          </div>
          <div class="cpa-cost-value">$${p.cost.total.toFixed(2)}</div>
        </div>
      `;
    }).join('');
  }

  renderHealthGrid(projects) {
    const section = document.getElementById('cpa-health-section');
    const grid = document.getElementById('cpa-health-grid');
    if (!section || !grid) return;

    section.style.display = 'block';

    // Sort by health score descending
    const sorted = [...projects].sort((a, b) => b.health.score - a.health.score);

    grid.innerHTML = sorted.map(p => {
      const cls = this.getHealthClass(p.health.score);
      return `
        <div class="cpa-health-card ${cls}">
          <div class="cpa-health-name" title="${this.escapeHtml(p.name)}">${this.escapeHtml(p.name)}</div>
          <div class="cpa-health-score-ring">
            <svg viewBox="0 0 36 36" class="cpa-ring">
              <path class="cpa-ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path class="cpa-ring-fill ${cls}" stroke-dasharray="${p.health.score}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <text x="18" y="20.5" class="cpa-ring-text">${p.health.score}</text>
            </svg>
          </div>
          <div class="cpa-health-label ${cls}">${p.health.label}</div>
        </div>
      `;
    }).join('');
  }

  renderTable() {
    if (!this.analyticsData) return;

    const tbody = document.getElementById('cpa-table-body');
    const section = document.getElementById('cpa-table-section');
    if (!tbody || !section) return;

    section.style.display = 'block';

    let projects = [...this.analyticsData.projects];

    // Sort
    projects.sort((a, b) => {
      let va, vb;
      switch (this.sortField) {
        case 'name': va = a.name.toLowerCase(); vb = b.name.toLowerCase(); break;
        case 'features': va = a.features.total; vb = b.features.total; break;
        case 'percent': va = a.percentComplete; vb = b.percentComplete; break;
        case 'cost': va = a.cost.total; vb = b.cost.total; break;
        case 'velocity': va = a.velocity.avgDaily; vb = b.velocity.avgDaily; break;
        case 'health': va = a.health.score; vb = b.health.score; break;
        default: va = a.name; vb = b.name;
      }
      if (va < vb) return this.sortAsc ? -1 : 1;
      if (va > vb) return this.sortAsc ? 1 : -1;
      return 0;
    });

    // Update sort indicators
    this.container.querySelectorAll('.cpa-sortable').forEach(th => {
      th.classList.remove('cpa-sort-asc', 'cpa-sort-desc');
      if (th.dataset.sort === this.sortField) {
        th.classList.add(this.sortAsc ? 'cpa-sort-asc' : 'cpa-sort-desc');
      }
    });

    tbody.innerHTML = projects.map(p => {
      const healthCls = this.getHealthClass(p.health.score);
      const pctBar = `<div class="cpa-mini-bar"><div class="cpa-mini-fill ${healthCls}" style="width:${p.percentComplete}%"></div></div>`;

      return `
        <tr>
          <td class="cpa-name-cell">
            <span class="cpa-proj-name">${this.escapeHtml(p.name)}</span>
          </td>
          <td>
            <span class="cpa-feat-count">${p.features.passing}</span>
            <span class="cpa-feat-total">/ ${p.features.total}</span>
          </td>
          <td>
            ${pctBar}
            <span class="cpa-pct-text">${p.percentComplete}%</span>
          </td>
          <td>
            <span class="cpa-cost-val">${p.cost.total > 0 ? '$' + p.cost.total.toFixed(2) : '-'}</span>
            ${p.cost.costPerFeature > 0 ? `<span class="cpa-cost-per">($${p.cost.costPerFeature}/feat)</span>` : ''}
          </td>
          <td>
            <span class="cpa-vel-val">${p.velocity.avgDaily > 0 ? p.velocity.avgDaily + '/day' : '-'}</span>
          </td>
          <td>
            <span class="cpa-health-badge ${healthCls}">${p.health.score}</span>
            <span class="cpa-health-text ${healthCls}">${p.health.label}</span>
          </td>
        </tr>
      `;
    }).join('');
  }

  getHealthClass(score) {
    if (score >= 80) return 'cpa-excellent';
    if (score >= 60) return 'cpa-good';
    if (score >= 40) return 'cpa-fair';
    return 'cpa-poor';
  }

  setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new CrossProjectAnalytics());
} else {
  new CrossProjectAnalytics();
}
