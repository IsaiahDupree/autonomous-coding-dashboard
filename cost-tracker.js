/**
 * Cost Tracker UI Component
 * =========================
 * 
 * Displays cost tracking information for harness runs.
 * Shows token usage, cost estimates, and budget alerts.
 */

class CostTracker {
  constructor(containerId = 'cost-tracker') {
    this.container = document.getElementById(containerId);
    this.baseUrl = 'http://localhost:4545';
    this.projectId = 'default';
    this.summary = null;
    this.pricing = null;
    
    if (this.container) {
      this.init();
    }
  }

  async init() {
    await this.fetchPricing();
    await this.fetchSummary();
    this.render();
    this.addStyles();
  }

  async fetchPricing() {
    try {
      const response = await fetch(`${this.baseUrl}/api/costs/pricing`);
      const result = await response.json();
      this.pricing = result.data;
    } catch (error) {
      console.error('Failed to fetch pricing:', error);
    }
  }

  async fetchSummary() {
    try {
      const response = await fetch(`${this.baseUrl}/api/projects/${this.projectId}/costs/summary`);
      const result = await response.json();
      this.summary = result.data;
    } catch (error) {
      console.error('Failed to fetch cost summary:', error);
    }
  }

  async estimateCost(model, sessions, avgInputTokens, avgOutputTokens) {
    try {
      const response = await fetch(`${this.baseUrl}/api/costs/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          sessions,
          avgTokens: { input: avgInputTokens, output: avgOutputTokens },
        }),
      });
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Failed to estimate cost:', error);
      return null;
    }
  }

  render() {
    if (!this.container) return;

    const summary = this.summary || {
      totalCost: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      entriesCount: 0,
    };

    this.container.innerHTML = `
      <div class="cost-tracker-panel">
        <div class="cost-header">
          <h3>💰 Cost Tracking</h3>
          <button class="btn-small" onclick="costTracker.refresh()">↻ Refresh</button>
        </div>
        
        <div class="cost-summary">
          <div class="cost-main">
            <span class="cost-value">$${summary.totalCost.toFixed(2)}</span>
            <span class="cost-label">Total Cost (30d)</span>
          </div>
          
          <div class="cost-stats">
            <div class="cost-stat">
              <span class="stat-value">${this.formatTokens(summary.totalInputTokens)}</span>
              <span class="stat-label">Input Tokens</span>
            </div>
            <div class="cost-stat">
              <span class="stat-value">${this.formatTokens(summary.totalOutputTokens)}</span>
              <span class="stat-label">Output Tokens</span>
            </div>
            <div class="cost-stat">
              <span class="stat-value">${summary.entriesCount}</span>
              <span class="stat-label">API Calls</span>
            </div>
          </div>
        </div>
        
        ${this.renderDailyCosts(summary.dailyCosts)}
        
        <div class="cost-estimator">
          <h4>Cost Estimator</h4>
          <div class="estimator-form">
            <select id="estimate-model">
              <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
              <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
              <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4o-mini">GPT-4o Mini</option>
            </select>
            <input type="number" id="estimate-sessions" placeholder="Sessions" value="10" min="1">
            <button class="btn-primary" onclick="costTracker.runEstimate()">Estimate</button>
          </div>
          <div id="estimate-result" class="estimate-result"></div>
        </div>
        
        <div class="cost-budget">
          <h4>Budget Settings</h4>
          <div class="budget-form">
            <div class="budget-input">
              <label>Daily Limit ($)</label>
              <input type="number" id="budget-daily" placeholder="No limit" min="0" step="1">
            </div>
            <div class="budget-input">
              <label>Monthly Limit ($)</label>
              <input type="number" id="budget-monthly" placeholder="No limit" min="0" step="10">
            </div>
            <button class="btn-secondary" onclick="costTracker.saveBudget()">Save Budget</button>
          </div>
        </div>
      </div>
    `;
  }

  renderDailyCosts(dailyCosts) {
    if (!dailyCosts || dailyCosts.length === 0) {
      return '<div class="no-data">No cost data yet</div>';
    }

    const maxCost = Math.max(...dailyCosts.map(d => d.cost));
    const last7Days = dailyCosts.slice(-7);

    return `
      <div class="daily-costs">
        <h4>Daily Costs (Last 7 Days)</h4>
        <div class="daily-chart">
          ${last7Days.map(day => `
            <div class="daily-bar-container">
              <div class="daily-bar" style="height: ${maxCost > 0 ? (day.cost / maxCost) * 100 : 0}%">
                <span class="bar-value">$${day.cost.toFixed(2)}</span>
              </div>
              <span class="bar-date">${new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  formatTokens(tokens) {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    } else if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  }

  async runEstimate() {
    const model = document.getElementById('estimate-model').value;
    const sessions = parseInt(document.getElementById('estimate-sessions').value) || 10;
    
    // Average tokens per session (reasonable defaults)
    const avgInput = 50000;
    const avgOutput = 10000;
    
    const estimate = await this.estimateCost(model, sessions, avgInput, avgOutput);
    
    const resultEl = document.getElementById('estimate-result');
    if (estimate) {
      resultEl.innerHTML = `
        <div class="estimate-card">
          <div class="estimate-total">
            <span class="estimate-label">Estimated Total</span>
            <span class="estimate-value">$${estimate.totalCost.toFixed(2)}</span>
          </div>
          <div class="estimate-per-session">
            ~$${estimate.perSession.toFixed(4)} per session
          </div>
        </div>
      `;
    } else {
      resultEl.innerHTML = '<div class="error">Failed to estimate</div>';
    }
  }

  async saveBudget() {
    const daily = parseFloat(document.getElementById('budget-daily').value) || null;
    const monthly = parseFloat(document.getElementById('budget-monthly').value) || null;
    
    try {
      const response = await fetch(`${this.baseUrl}/api/projects/${this.projectId}/budget`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dailyLimit: daily,
          monthlyLimit: monthly,
          alertThreshold: 0.8,
          pauseOnExceed: false,
        }),
      });
      
      if (response.ok) {
        this.showToast('Budget saved', 'success');
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      this.showToast('Failed to save budget', 'error');
    }
  }

  async refresh() {
    await this.fetchSummary();
    this.render();
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `cost-toast cost-toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  addStyles() {
    if (document.getElementById('cost-tracker-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'cost-tracker-styles';
    styles.textContent = `
      .cost-tracker-panel {
        background: var(--color-surface, #1a2234);
        border-radius: 12px;
        padding: 1.25rem;
        border: 1px solid var(--color-border, rgba(148, 163, 184, 0.1));
      }
      
      .cost-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }
      
      .cost-header h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
      }
      
      .cost-summary {
        background: rgba(99, 102, 241, 0.1);
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 1rem;
      }
      
      .cost-main {
        text-align: center;
        margin-bottom: 1rem;
      }
      
      .cost-value {
        font-size: 2rem;
        font-weight: 700;
        color: #10b981;
        display: block;
      }
      
      .cost-label {
        font-size: 0.85rem;
        color: var(--color-text-muted, #94a3b8);
      }
      
      .cost-stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1rem;
        text-align: center;
      }
      
      .cost-stat .stat-value {
        font-size: 1.25rem;
        font-weight: 600;
        display: block;
      }
      
      .cost-stat .stat-label {
        font-size: 0.75rem;
        color: var(--color-text-muted, #94a3b8);
      }
      
      .daily-costs {
        margin-bottom: 1rem;
      }
      
      .daily-costs h4 {
        font-size: 0.875rem;
        margin: 0 0 0.75rem 0;
        color: var(--color-text-muted, #94a3b8);
      }
      
      .daily-chart {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        height: 100px;
        gap: 0.5rem;
      }
      
      .daily-bar-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        height: 100%;
      }
      
      .daily-bar {
        width: 100%;
        background: linear-gradient(to top, #6366f1, #8b5cf6);
        border-radius: 4px 4px 0 0;
        min-height: 4px;
        position: relative;
        transition: height 0.3s ease;
      }
      
      .bar-value {
        position: absolute;
        top: -20px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 0.65rem;
        white-space: nowrap;
        opacity: 0;
        transition: opacity 0.2s;
      }
      
      .daily-bar-container:hover .bar-value {
        opacity: 1;
      }
      
      .bar-date {
        font-size: 0.7rem;
        color: var(--color-text-muted, #94a3b8);
        margin-top: 0.25rem;
      }
      
      .cost-estimator, .cost-budget {
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid rgba(148, 163, 184, 0.1);
      }
      
      .cost-estimator h4, .cost-budget h4 {
        font-size: 0.875rem;
        margin: 0 0 0.75rem 0;
      }
      
      .estimator-form, .budget-form {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      
      .estimator-form select, .estimator-form input {
        flex: 1;
        min-width: 100px;
        padding: 0.5rem;
        border: 1px solid rgba(148, 163, 184, 0.2);
        border-radius: 6px;
        background: rgba(0, 0, 0, 0.2);
        color: var(--color-text, #f1f5f9);
        font-size: 0.85rem;
      }
      
      .budget-input {
        flex: 1;
        min-width: 120px;
      }
      
      .budget-input label {
        display: block;
        font-size: 0.75rem;
        color: var(--color-text-muted, #94a3b8);
        margin-bottom: 0.25rem;
      }
      
      .budget-input input {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid rgba(148, 163, 184, 0.2);
        border-radius: 6px;
        background: rgba(0, 0, 0, 0.2);
        color: var(--color-text, #f1f5f9);
        font-size: 0.85rem;
      }
      
      .btn-primary, .btn-secondary {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 6px;
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .btn-primary {
        background: #6366f1;
        color: white;
      }
      
      .btn-primary:hover {
        background: #4f46e5;
      }
      
      .btn-secondary {
        background: rgba(148, 163, 184, 0.2);
        color: var(--color-text, #f1f5f9);
      }
      
      .btn-secondary:hover {
        background: rgba(148, 163, 184, 0.3);
      }
      
      .btn-small {
        padding: 0.25rem 0.5rem;
        font-size: 0.75rem;
        border: none;
        background: rgba(148, 163, 184, 0.2);
        border-radius: 4px;
        cursor: pointer;
        color: var(--color-text, #f1f5f9);
      }
      
      .estimate-result {
        margin-top: 0.75rem;
      }
      
      .estimate-card {
        background: rgba(16, 185, 129, 0.1);
        border-radius: 8px;
        padding: 0.75rem;
        text-align: center;
      }
      
      .estimate-total {
        margin-bottom: 0.25rem;
      }
      
      .estimate-label {
        font-size: 0.75rem;
        color: var(--color-text-muted, #94a3b8);
        display: block;
      }
      
      .estimate-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: #10b981;
      }
      
      .estimate-per-session {
        font-size: 0.75rem;
        color: var(--color-text-muted, #94a3b8);
      }
      
      .no-data {
        text-align: center;
        padding: 1rem;
        color: var(--color-text-muted, #94a3b8);
        font-size: 0.85rem;
      }
      
      .cost-toast {
        position: fixed;
        bottom: 2rem;
        left: 50%;
        transform: translateX(-50%) translateY(20px);
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-size: 0.875rem;
        opacity: 0;
        transition: all 0.3s ease;
        z-index: 1002;
      }
      
      .cost-toast.visible {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
      
      .cost-toast-success {
        background: #10b981;
        color: white;
      }
      
      .cost-toast-error {
        background: #ef4444;
        color: white;
      }
    `;

    document.head.appendChild(styles);
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('cost-tracker')) {
    window.costTracker = new CostTracker();
  }
});

window.CostTracker = CostTracker;
