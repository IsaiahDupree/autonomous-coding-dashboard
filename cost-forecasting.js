/**
 * Cost Forecasting Widget (feat-042)
 * Predict future API costs based on historical data.
 * Projects cost based on remaining features, considers historical cost per feature,
 * provides confidence intervals, alerts on budget thresholds.
 */

class CostForecasting {
  constructor(containerId = 'cost-forecasting-widget') {
    this.container = document.getElementById(containerId);
    this.forecastData = null;
    this.API_BASE = 'http://localhost:3434';
    this.budgetLimit = null;

    if (!this.container) {
      console.warn(`Container #${containerId} not found`);
      return;
    }

    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
    this.loadForecast();
  }

  render() {
    this.container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Cost Forecasting</h3>
            <p class="card-subtitle" id="cf-subtitle">Loading forecast data...</p>
          </div>
          <div class="flex gap-1" style="align-items: center;">
            <button class="btn btn-secondary btn-sm" id="btn-cf-refresh" title="Refresh forecast">
              Refresh
            </button>
          </div>
        </div>
        <div class="card-body">

          <!-- Summary Cards -->
          <div class="cf-summary-grid" id="cf-summary-grid" style="display:none;">
            <div class="cf-stat-card">
              <div class="cf-stat-value" id="cf-total-spent">$0</div>
              <div class="cf-stat-label">Spent So Far</div>
            </div>
            <div class="cf-stat-card">
              <div class="cf-stat-value cf-color-forecast" id="cf-projected-remaining">$0</div>
              <div class="cf-stat-label">Projected Remaining</div>
            </div>
            <div class="cf-stat-card">
              <div class="cf-stat-value cf-color-total" id="cf-projected-total">$0</div>
              <div class="cf-stat-label">Projected Total</div>
            </div>
            <div class="cf-stat-card">
              <div class="cf-stat-value cf-color-rate" id="cf-cost-per-feature">$0</div>
              <div class="cf-stat-label">Cost / Feature</div>
            </div>
          </div>

          <!-- Confidence Interval -->
          <div class="cf-confidence-section" id="cf-confidence-section" style="display:none;">
            <h4 class="cf-section-title">Projected Total Cost (Confidence Interval)</h4>
            <div class="cf-confidence-bar-container" id="cf-confidence-bar-container">
              <div class="cf-confidence-labels">
                <span id="cf-ci-low" class="cf-ci-label">$0</span>
                <span id="cf-ci-mid" class="cf-ci-label cf-ci-mid-label">$0</span>
                <span id="cf-ci-high" class="cf-ci-label">$0</span>
              </div>
              <div class="cf-confidence-bar">
                <div class="cf-ci-range" id="cf-ci-range"></div>
                <div class="cf-ci-marker" id="cf-ci-marker"></div>
                <div class="cf-ci-spent" id="cf-ci-spent"></div>
              </div>
              <div class="cf-confidence-meta">
                <span>Confidence: <strong id="cf-ci-level">low</strong></span>
                <span id="cf-ci-completion"></span>
              </div>
            </div>
          </div>

          <!-- Cost Trend Chart -->
          <div class="cf-chart-section" id="cf-chart-section" style="display:none;">
            <h4 class="cf-section-title">Daily Cost Trend &amp; Forecast</h4>
            <div class="cf-chart" id="cf-daily-chart"></div>
          </div>

          <!-- Budget Alerts -->
          <div class="cf-alerts-section" id="cf-alerts-section" style="display:none;">
            <h4 class="cf-section-title">Budget Alerts</h4>
            <div class="cf-alerts-list" id="cf-alerts-list"></div>
          </div>

          <!-- Per-Project Forecasts -->
          <div class="cf-projects-section" id="cf-projects-section" style="display:none;">
            <h4 class="cf-section-title">Per-Project Cost Forecast</h4>
            <div class="cf-table-wrap">
              <table class="cf-table" id="cf-project-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Remaining</th>
                    <th>$/Feature</th>
                    <th>Spent</th>
                    <th>Projected</th>
                    <th>Forecast Bar</th>
                  </tr>
                </thead>
                <tbody id="cf-project-tbody"></tbody>
              </table>
            </div>
          </div>

          <!-- Budget Threshold Setting -->
          <div class="cf-budget-section" id="cf-budget-section" style="display:none;">
            <h4 class="cf-section-title">Budget Threshold</h4>
            <div class="cf-budget-input-row">
              <label for="cf-budget-input">Set alert threshold ($):</label>
              <input type="number" id="cf-budget-input" class="cf-budget-input" min="0" step="100" placeholder="e.g. 1000">
              <button class="btn btn-sm" id="btn-cf-set-budget">Set</button>
            </div>
            <p class="cf-budget-status" id="cf-budget-status"></p>
          </div>

        </div>
      </div>
    `;
  }

  bindEvents() {
    const refreshBtn = document.getElementById('btn-cf-refresh');
    if (refreshBtn) refreshBtn.addEventListener('click', () => this.loadForecast());

    const setBudgetBtn = document.getElementById('btn-cf-set-budget');
    if (setBudgetBtn) setBudgetBtn.addEventListener('click', () => this.setBudgetThreshold());
  }

  async loadForecast() {
    try {
      const response = await fetch(`${this.API_BASE}/api/cost-forecast`);
      const result = await response.json();
      if (result.success && result.data) {
        this.forecastData = result.data;
        this.updateUI();
      } else {
        document.getElementById('cf-subtitle').textContent = 'Failed to load forecast data';
      }
    } catch (error) {
      console.error('Failed to load cost forecast:', error);
      document.getElementById('cf-subtitle').textContent = 'Error loading forecast';
    }
  }

  updateUI() {
    const data = this.forecastData;
    if (!data) return;

    const s = data.summary;

    // Subtitle
    const subtitle = document.getElementById('cf-subtitle');
    subtitle.textContent = `${s.completedFeatures}/${s.totalFeatures} features done | ${s.remainingFeatures} remaining | ~${s.avgFeaturesPerDay} feat/day`;

    // Summary cards
    const grid = document.getElementById('cf-summary-grid');
    grid.style.display = '';
    document.getElementById('cf-total-spent').textContent = `$${s.totalCostSoFar.toFixed(2)}`;
    document.getElementById('cf-projected-remaining').textContent = `$${s.projectedCostRemaining.toFixed(2)}`;
    document.getElementById('cf-projected-total').textContent = `$${s.projectedTotalCost.toFixed(2)}`;
    document.getElementById('cf-cost-per-feature').textContent = `$${s.costPerFeature.toFixed(2)}`;

    // Confidence interval
    this.renderConfidenceInterval(data.confidenceIntervals, s);

    // Cost trend chart
    this.renderDailyChart(data.dailyCosts, s);

    // Budget alerts
    this.renderAlerts(data.budgetAlerts);

    // Per-project forecasts
    this.renderProjectForecasts(data.projectForecasts);

    // Budget section
    const budgetSection = document.getElementById('cf-budget-section');
    budgetSection.style.display = '';
    this.loadBudgetFromStorage();
  }

  renderConfidenceInterval(ci, summary) {
    const section = document.getElementById('cf-confidence-section');
    section.style.display = '';

    const low = ci.projectedCost.low;
    const mid = ci.projectedCost.mid;
    const high = ci.projectedCost.high;
    const spent = summary.totalCostSoFar;

    document.getElementById('cf-ci-low').textContent = `$${low.toFixed(0)}`;
    document.getElementById('cf-ci-mid').textContent = `$${mid.toFixed(0)}`;
    document.getElementById('cf-ci-high').textContent = `$${high.toFixed(0)}`;

    // Position the range and markers
    const maxVal = high * 1.1;
    const rangeStart = (low / maxVal) * 100;
    const rangeEnd = (high / maxVal) * 100;
    const midPos = (mid / maxVal) * 100;
    const spentPos = (spent / maxVal) * 100;

    const range = document.getElementById('cf-ci-range');
    range.style.left = rangeStart + '%';
    range.style.width = (rangeEnd - rangeStart) + '%';

    const marker = document.getElementById('cf-ci-marker');
    marker.style.left = midPos + '%';

    const spentEl = document.getElementById('cf-ci-spent');
    spentEl.style.width = Math.min(spentPos, 100) + '%';

    const level = document.getElementById('cf-ci-level');
    level.textContent = ci.level;
    level.className = `cf-ci-level-${ci.level}`;

    const completion = document.getElementById('cf-ci-completion');
    if (ci.daysToComplete) {
      const d = ci.daysToComplete;
      completion.textContent = `Est. completion: ${d.low}-${d.high} days (${summary.estimatedCompletionDate || 'N/A'})`;
    } else {
      completion.textContent = 'Est. completion: insufficient data';
    }
  }

  renderDailyChart(dailyCosts, summary) {
    const section = document.getElementById('cf-chart-section');
    section.style.display = '';
    const chart = document.getElementById('cf-daily-chart');

    if (!dailyCosts || dailyCosts.length === 0) {
      chart.innerHTML = '<p class="cf-no-data">No daily cost data available yet</p>';
      return;
    }

    const maxCost = Math.max(...dailyCosts.map(d => d.cost), 1);
    const avgCost = summary.avgDailyCost;
    const barWidth = Math.max(8, Math.min(24, Math.floor(600 / dailyCosts.length)));

    let bars = '';
    for (const day of dailyCosts) {
      const height = Math.max(2, (day.cost / maxCost) * 120);
      const isAboveAvg = day.cost > avgCost * 1.5;
      const barClass = isAboveAvg ? 'cf-bar cf-bar-high' : 'cf-bar';
      const label = day.date.slice(5); // MM-DD
      bars += `
        <div class="cf-bar-col" style="width:${barWidth}px;" title="${day.date}: $${day.cost.toFixed(2)}">
          <div class="${barClass}" style="height:${height}px;"></div>
          <div class="cf-bar-label">${label}</div>
        </div>
      `;
    }

    // Add forecast bars (dashed) for next 7 days
    for (let i = 1; i <= 7; i++) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + i);
      const label = futureDate.toISOString().slice(5, 10);
      const height = Math.max(2, (avgCost / maxCost) * 120);
      bars += `
        <div class="cf-bar-col cf-bar-forecast" style="width:${barWidth}px;" title="Forecast ${label}: ~$${avgCost.toFixed(2)}/day">
          <div class="cf-bar cf-bar-projected" style="height:${height}px;"></div>
          <div class="cf-bar-label">${label}</div>
        </div>
      `;
    }

    // Average line position
    const avgLineY = Math.max(2, (avgCost / maxCost) * 120);

    chart.innerHTML = `
      <div class="cf-chart-inner">
        <div class="cf-chart-bars">${bars}</div>
        <div class="cf-avg-line" style="bottom:${avgLineY + 20}px;">
          <span class="cf-avg-label">Avg: $${avgCost.toFixed(2)}/day</span>
        </div>
      </div>
      <div class="cf-chart-legend">
        <span class="cf-legend-item"><span class="cf-legend-dot cf-legend-actual"></span> Actual</span>
        <span class="cf-legend-item"><span class="cf-legend-dot cf-legend-projected"></span> Forecast</span>
        <span class="cf-legend-item"><span class="cf-legend-dot cf-legend-high"></span> Above avg</span>
      </div>
    `;
  }

  renderAlerts(alerts) {
    const section = document.getElementById('cf-alerts-section');
    const list = document.getElementById('cf-alerts-list');

    // Also check custom budget threshold
    const customBudget = localStorage.getItem('cf-budget-threshold');
    const allAlerts = [...(alerts || [])];
    if (customBudget && this.forecastData) {
      const threshold = parseFloat(customBudget);
      const projected = this.forecastData.summary.projectedTotalCost;
      if (projected >= threshold) {
        allAlerts.unshift({
          type: 'custom_budget',
          message: `Projected cost ($${projected.toFixed(2)}) exceeds your budget threshold ($${threshold.toFixed(2)})`,
          severity: 'critical',
        });
      } else if (this.forecastData.summary.totalCostSoFar >= threshold * 0.8) {
        allAlerts.unshift({
          type: 'custom_budget_warning',
          message: `Current spend ($${this.forecastData.summary.totalCostSoFar.toFixed(2)}) approaching budget threshold ($${threshold.toFixed(2)})`,
          severity: 'warning',
        });
      }
    }

    if (allAlerts.length === 0) {
      section.style.display = '';
      list.innerHTML = '<div class="cf-alert cf-alert-ok">No budget alerts - spending is within expected range.</div>';
      return;
    }

    section.style.display = '';
    list.innerHTML = allAlerts.map(a => `
      <div class="cf-alert cf-alert-${a.severity}">
        <span class="cf-alert-icon">${a.severity === 'critical' ? '!!!' : '!'}</span>
        <span class="cf-alert-msg">${a.message}</span>
      </div>
    `).join('');
  }

  renderProjectForecasts(forecasts) {
    const section = document.getElementById('cf-projects-section');
    const tbody = document.getElementById('cf-project-tbody');

    if (!forecasts || forecasts.length === 0) {
      section.style.display = 'none';
      return;
    }

    section.style.display = '';
    const maxProjected = Math.max(...forecasts.map(f => f.projectedCost + f.spent), 1);

    tbody.innerHTML = forecasts.map(p => {
      const spentPct = (p.spent / maxProjected) * 100;
      const projPct = (p.projectedCost / maxProjected) * 100;
      return `
        <tr>
          <td class="cf-project-name">${p.name}</td>
          <td class="cf-num">${p.remaining}</td>
          <td class="cf-num">$${p.costPerFeature.toFixed(2)}</td>
          <td class="cf-num">$${p.spent.toFixed(2)}</td>
          <td class="cf-num cf-projected-val">$${p.projectedCost.toFixed(2)}</td>
          <td>
            <div class="cf-forecast-bar">
              <div class="cf-forecast-spent" style="width:${spentPct}%"></div>
              <div class="cf-forecast-projected" style="width:${projPct}%"></div>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  setBudgetThreshold() {
    const input = document.getElementById('cf-budget-input');
    const val = parseFloat(input.value);
    if (isNaN(val) || val <= 0) {
      document.getElementById('cf-budget-status').textContent = 'Please enter a valid amount.';
      return;
    }
    localStorage.setItem('cf-budget-threshold', val.toString());
    this.budgetLimit = val;
    document.getElementById('cf-budget-status').textContent = `Budget threshold set to $${val.toFixed(2)}`;

    // Re-render alerts with new threshold
    if (this.forecastData) {
      this.renderAlerts(this.forecastData.budgetAlerts);
    }
  }

  loadBudgetFromStorage() {
    const saved = localStorage.getItem('cf-budget-threshold');
    if (saved) {
      this.budgetLimit = parseFloat(saved);
      const input = document.getElementById('cf-budget-input');
      if (input) input.value = saved;
      document.getElementById('cf-budget-status').textContent = `Current threshold: $${parseFloat(saved).toFixed(2)}`;
    }
  }
}

// Auto-instantiate
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new CostForecasting());
} else {
  new CostForecasting();
}
