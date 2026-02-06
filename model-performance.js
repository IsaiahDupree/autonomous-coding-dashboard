/**
 * Model Performance Comparison Dashboard (feat-046)
 * Compare Claude versions, track success rate by model, cost efficiency metrics.
 */

class ModelPerformance {
  constructor(containerId = 'model-performance-widget') {
    this.container = document.getElementById(containerId);
    this.API_BASE = 'http://localhost:3434';
    this.data = null;
    this.selectedPeriod = 30;
    this.chartInstance = null;

    if (!this.container) {
      console.warn(`Container #${containerId} not found`);
      return;
    }

    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
    this.loadData();
  }

  render() {
    this.container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Model Performance Comparison</h3>
            <p class="card-subtitle" id="mp-subtitle">Loading model data...</p>
          </div>
          <div class="flex gap-1" style="align-items: center;">
            <div class="mp-period-toggle" id="mp-period-toggle">
              <button class="mp-period-btn" data-days="7">7D</button>
              <button class="mp-period-btn mp-period-active" data-days="30">30D</button>
              <button class="mp-period-btn" data-days="90">90D</button>
            </div>
            <button class="btn btn-secondary btn-sm" id="btn-mp-refresh" title="Refresh data">
              Refresh
            </button>
          </div>
        </div>
        <div class="card-body">

          <!-- Summary Cards -->
          <div class="mp-summary-grid" id="mp-summary-grid" style="display:none;">
            <div class="mp-stat-card">
              <div class="mp-stat-value" id="mp-total-models">0</div>
              <div class="mp-stat-label">Models Used</div>
            </div>
            <div class="mp-stat-card">
              <div class="mp-stat-value" id="mp-total-sessions">0</div>
              <div class="mp-stat-label">Total Sessions</div>
            </div>
            <div class="mp-stat-card">
              <div class="mp-stat-value mp-color-success" id="mp-best-success">-</div>
              <div class="mp-stat-label">Best Success Rate</div>
            </div>
            <div class="mp-stat-card">
              <div class="mp-stat-value mp-color-cost" id="mp-most-efficient">-</div>
              <div class="mp-stat-label">Most Cost-Efficient</div>
            </div>
          </div>

          <!-- Model Comparison Table -->
          <div class="mp-table-section" id="mp-table-section" style="display:none;">
            <h4 class="mp-section-title">Model Comparison</h4>
            <div class="mp-table-wrapper">
              <table class="mp-table" id="mp-comparison-table">
                <thead>
                  <tr>
                    <th>Model</th>
                    <th>Sessions</th>
                    <th>Features</th>
                    <th>Success Rate</th>
                    <th>Cost/Feature</th>
                    <th>Avg Duration</th>
                    <th>Avg Turns</th>
                    <th>Total Cost</th>
                  </tr>
                </thead>
                <tbody id="mp-table-body">
                </tbody>
              </table>
            </div>
          </div>

          <!-- Charts Row -->
          <div class="mp-charts-row" id="mp-charts-row" style="display:none;">
            <div class="mp-chart-container">
              <h4 class="mp-section-title">Success Rate by Model</h4>
              <canvas id="mp-success-chart" height="220"></canvas>
            </div>
            <div class="mp-chart-container">
              <h4 class="mp-section-title">Cost Efficiency by Model</h4>
              <canvas id="mp-cost-chart" height="220"></canvas>
            </div>
          </div>

          <!-- Token Usage Breakdown -->
          <div class="mp-token-section" id="mp-token-section" style="display:none;">
            <h4 class="mp-section-title">Token Usage & Efficiency</h4>
            <div id="mp-token-cards" class="mp-token-cards"></div>
          </div>

          <!-- No Data State -->
          <div class="mp-empty" id="mp-empty" style="display:none;">
            <p>No completed sessions found in the selected period.</p>
            <p class="mp-empty-hint">Run some harness sessions to see model performance data.</p>
          </div>

          <!-- Loading State -->
          <div class="mp-loading" id="mp-loading">
            <div class="mp-spinner"></div>
            <p>Loading model performance data...</p>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    document.getElementById('btn-mp-refresh')?.addEventListener('click', () => this.loadData());

    document.getElementById('mp-period-toggle')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.mp-period-btn');
      if (!btn) return;
      const days = parseInt(btn.dataset.days);
      if (days === this.selectedPeriod) return;
      this.selectedPeriod = days;
      document.querySelectorAll('.mp-period-btn').forEach(b => b.classList.remove('mp-period-active'));
      btn.classList.add('mp-period-active');
      this.loadData();
    });
  }

  async loadData() {
    const loading = document.getElementById('mp-loading');
    const empty = document.getElementById('mp-empty');
    if (loading) loading.style.display = '';
    if (empty) empty.style.display = 'none';

    try {
      const resp = await fetch(`${this.API_BASE}/api/model-performance/overview?days=${this.selectedPeriod}`);
      const result = await resp.json();

      if (result.success && result.data) {
        this.data = result.data;
        if (loading) loading.style.display = 'none';

        if (this.data.models.length === 0) {
          this.hideAllSections();
          if (empty) empty.style.display = '';
          document.getElementById('mp-subtitle').textContent = 'No data available';
        } else {
          if (empty) empty.style.display = 'none';
          this.updateUI();
        }
      } else {
        if (loading) loading.style.display = 'none';
        this.hideAllSections();
        if (empty) empty.style.display = '';
      }
    } catch (error) {
      console.error('Error loading model performance data:', error);
      if (loading) loading.style.display = 'none';
      this.hideAllSections();
      if (empty) {
        empty.style.display = '';
        empty.innerHTML = '<p>Failed to load model performance data.</p><p class="mp-empty-hint">Check that the backend is running on port 3434.</p>';
      }
    }
  }

  hideAllSections() {
    ['mp-summary-grid', 'mp-table-section', 'mp-charts-row', 'mp-token-section'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }

  updateUI() {
    const { models, totalSessions, periodDays } = this.data;

    // Subtitle
    document.getElementById('mp-subtitle').textContent =
      `${models.length} model${models.length !== 1 ? 's' : ''} across ${totalSessions} sessions (last ${periodDays} days)`;

    // Summary cards
    const grid = document.getElementById('mp-summary-grid');
    if (grid) grid.style.display = '';

    document.getElementById('mp-total-models').textContent = models.length;
    document.getElementById('mp-total-sessions').textContent = totalSessions;

    // Best success rate
    const bestSuccess = models.reduce((best, m) => m.successRate > best.successRate ? m : best, models[0]);
    document.getElementById('mp-best-success').textContent = bestSuccess.successRate + '%';
    document.getElementById('mp-best-success').title = this.shortModelName(bestSuccess.model);

    // Most cost-efficient (lowest cost per feature, if has features)
    const withFeatures = models.filter(m => m.featuresCompleted > 0);
    if (withFeatures.length > 0) {
      const efficient = withFeatures.reduce((best, m) => m.costPerFeature < best.costPerFeature ? m : best, withFeatures[0]);
      document.getElementById('mp-most-efficient').textContent = '$' + efficient.costPerFeature.toFixed(2) + '/feat';
      document.getElementById('mp-most-efficient').title = this.shortModelName(efficient.model);
    } else {
      document.getElementById('mp-most-efficient').textContent = '-';
    }

    // Comparison table
    this.renderTable(models);

    // Charts
    this.renderCharts(models);

    // Token usage
    this.renderTokenCards(models);
  }

  renderTable(models) {
    const section = document.getElementById('mp-table-section');
    const tbody = document.getElementById('mp-table-body');
    if (!section || !tbody) return;

    section.style.display = '';
    tbody.innerHTML = models.map(m => {
      const successClass = m.successRate >= 90 ? 'mp-good' : m.successRate >= 70 ? 'mp-warn' : 'mp-bad';
      const costClass = m.costPerFeature <= 5 ? 'mp-good' : m.costPerFeature <= 15 ? 'mp-warn' : 'mp-bad';

      return `
        <tr>
          <td>
            <div class="mp-model-name">${this.escapeHtml(this.shortModelName(m.model))}</div>
            <div class="mp-model-full">${this.escapeHtml(m.model)}</div>
          </td>
          <td>${m.sessions}</td>
          <td>${m.featuresCompleted}</td>
          <td>
            <span class="mp-badge ${successClass}">${m.successRate}%</span>
          </td>
          <td>
            <span class="mp-badge ${costClass}">$${m.costPerFeature.toFixed(2)}</span>
          </td>
          <td>${m.avgDurationMin.toFixed(1)}m</td>
          <td>${m.avgTurns.toFixed(0)}</td>
          <td>$${m.totalCost.toFixed(2)}</td>
        </tr>
      `;
    }).join('');
  }

  renderCharts(models) {
    const section = document.getElementById('mp-charts-row');
    if (!section) return;
    section.style.display = '';

    const labels = models.map(m => this.shortModelName(m.model));
    const colors = this.getModelColors(models.length);

    // Success Rate Bar Chart
    this.renderBarChart('mp-success-chart', labels, models.map(m => m.successRate), {
      label: 'Success Rate (%)',
      colors,
      maxVal: 100,
      suffix: '%'
    });

    // Cost per Feature Bar Chart
    this.renderBarChart('mp-cost-chart', labels, models.map(m => m.costPerFeature), {
      label: 'Cost per Feature ($)',
      colors,
      prefix: '$'
    });
  }

  renderBarChart(canvasId, labels, data, opts) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Destroy previous chart on this canvas
    const existingChart = Chart.getChart(canvas);
    if (existingChart) existingChart.destroy();

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: opts.label,
          data,
          backgroundColor: opts.colors.map(c => c + 'CC'),
          borderColor: opts.colors,
          borderWidth: 1,
          borderRadius: 4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const val = ctx.parsed.y;
                return `${opts.prefix || ''}${val.toFixed(opts.suffix ? 1 : 2)}${opts.suffix || ''}`;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: { color: '#94a3b8', font: { size: 11 } },
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            max: opts.maxVal || undefined,
            ticks: {
              color: '#94a3b8',
              callback: (val) => `${opts.prefix || ''}${val}${opts.suffix || ''}`
            },
            grid: { color: 'rgba(148,163,184,0.1)' }
          }
        }
      }
    });
  }

  renderTokenCards(models) {
    const section = document.getElementById('mp-token-section');
    const container = document.getElementById('mp-token-cards');
    if (!section || !container) return;

    section.style.display = '';

    container.innerHTML = models.map(m => {
      const totalTokens = m.totalInputTokens + m.totalOutputTokens;
      const inputPct = totalTokens > 0 ? (m.totalInputTokens / totalTokens * 100).toFixed(1) : 0;
      const outputPct = totalTokens > 0 ? (m.totalOutputTokens / totalTokens * 100).toFixed(1) : 0;

      return `
        <div class="mp-token-card">
          <div class="mp-token-card-header">
            <span class="mp-token-model">${this.escapeHtml(this.shortModelName(m.model))}</span>
            <span class="mp-token-total">${this.formatTokens(totalTokens)} tokens</span>
          </div>
          <div class="mp-token-bar">
            <div class="mp-token-bar-input" style="width: ${inputPct}%" title="Input: ${inputPct}%"></div>
            <div class="mp-token-bar-output" style="width: ${outputPct}%" title="Output: ${outputPct}%"></div>
          </div>
          <div class="mp-token-details">
            <span class="mp-token-detail"><span class="mp-dot mp-dot-input"></span> Input: ${this.formatTokens(m.totalInputTokens)}</span>
            <span class="mp-token-detail"><span class="mp-dot mp-dot-output"></span> Output: ${this.formatTokens(m.totalOutputTokens)}</span>
            ${m.avgContextUtilization > 0 ? `<span class="mp-token-detail">Ctx: ${m.avgContextUtilization}%</span>` : ''}
            ${m.avgCacheHitRate > 0 ? `<span class="mp-token-detail">Cache: ${m.avgCacheHitRate}%</span>` : ''}
          </div>
          <div class="mp-token-metrics">
            <span>Feat/Session: <strong>${m.featuresPerSession.toFixed(2)}</strong></span>
            <span>Avg Tokens/Session: <strong>${this.formatTokens(m.avgTokensPerSession)}</strong></span>
            ${m.testPassRate != null ? `<span>Test Pass: <strong>${m.testPassRate}%</strong></span>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  // Utility methods
  shortModelName(model) {
    if (!model) return 'unknown';
    // Shorten common model names
    const shorts = {
      'claude-opus-4-6': 'Opus 4',
      'claude-sonnet-4-6-20250205': 'Sonnet 4',
      'claude-sonnet-4-5-20250929': 'Sonnet 4.5',
      'claude-sonnet-4-20250514': 'Sonnet 4',
      'claude-3-5-sonnet-20241022': 'Sonnet 3.5',
      'claude-3-5-haiku-20241022': 'Haiku 3.5',
      'claude-3-opus-20240229': 'Opus 3',
      'claude-3-sonnet-20240229': 'Sonnet 3',
      'claude-3-haiku-20240307': 'Haiku 3',
      'sonnet': 'Sonnet',
      'haiku': 'Haiku',
    };
    return shorts[model] || model.replace(/^claude-/, '').replace(/-\d{8}$/, '');
  }

  formatTokens(n) {
    if (n == null) return '-';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
  }

  getModelColors(count) {
    const palette = [
      '#6366f1', // indigo
      '#06b6d4', // cyan
      '#f59e0b', // amber
      '#10b981', // emerald
      '#ef4444', // red
      '#8b5cf6', // violet
      '#ec4899', // pink
      '#14b8a6', // teal
    ];
    return palette.slice(0, count);
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// Auto-instantiate
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new ModelPerformance());
} else {
  new ModelPerformance();
}
