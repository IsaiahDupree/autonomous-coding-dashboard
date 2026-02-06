/**
 * E2E Test Runner Dashboard Widget (feat-039)
 * Trigger E2E tests from dashboard, display results with pass/fail status,
 * show screenshots on failure, and link test results to features.
 */

class E2ETestRunner {
  constructor(containerId = 'e2e-test-runner-widget') {
    this.container = document.getElementById(containerId);
    this.testResults = [];
    this.isRunning = false;
    this.pollInterval = null;
    this.currentRunId = null;
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
    this.loadLatestResults();
  }

  render() {
    this.container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">E2E Test Runner</h3>
            <p class="card-subtitle" id="e2e-run-status">No tests run yet</p>
          </div>
          <div class="flex gap-1" style="align-items: center;">
            <span class="badge" id="e2e-status-badge" style="display:none;">Idle</span>
            <button class="btn btn-primary" id="btn-run-all-e2e" title="Run all E2E tests">
              Run All Tests
            </button>
            <button class="btn btn-secondary" id="btn-run-feature-e2e" title="Run tests for a specific feature">
              Run by Feature
            </button>
          </div>
        </div>
        <div class="card-body">
          <!-- Summary Stats -->
          <div class="e2e-summary" id="e2e-summary" style="display:none;">
            <div class="grid grid-4" style="gap: 1rem; margin-bottom: 1rem;">
              <div class="e2e-stat">
                <span class="e2e-stat-value" id="e2e-total">0</span>
                <span class="e2e-stat-label">Total</span>
              </div>
              <div class="e2e-stat e2e-stat-pass">
                <span class="e2e-stat-value" id="e2e-passed">0</span>
                <span class="e2e-stat-label">Passed</span>
              </div>
              <div class="e2e-stat e2e-stat-fail">
                <span class="e2e-stat-value" id="e2e-failed">0</span>
                <span class="e2e-stat-label">Failed</span>
              </div>
              <div class="e2e-stat e2e-stat-skip">
                <span class="e2e-stat-value" id="e2e-skipped">0</span>
                <span class="e2e-stat-label">Skipped</span>
              </div>
            </div>
            <div class="progress-bar" style="margin-bottom: 0.5rem;">
              <div class="progress-fill e2e-progress-pass" id="e2e-progress-pass" style="width: 0%;"></div>
              <div class="progress-fill e2e-progress-fail" id="e2e-progress-fail" style="width: 0%; background: var(--color-error);"></div>
            </div>
            <div style="font-size: 0.8rem; color: var(--color-text-secondary);" id="e2e-run-info"></div>
          </div>

          <!-- Running indicator -->
          <div class="e2e-running" id="e2e-running" style="display:none;">
            <div class="e2e-spinner"></div>
            <span>Running E2E tests...</span>
            <span id="e2e-running-progress"></span>
          </div>

          <!-- Feature Filter -->
          <div class="e2e-feature-filter" id="e2e-feature-filter" style="display:none;">
            <div class="form-group" style="margin-bottom: 0.5rem;">
              <label for="e2e-feature-select" style="font-size: 0.85rem;">Select Feature to Test</label>
              <select id="e2e-feature-select" class="e2e-select">
                <option value="">-- Select a feature --</option>
              </select>
            </div>
            <div class="flex gap-1">
              <button class="btn btn-primary btn-sm" id="btn-run-selected-feature">Run Test</button>
              <button class="btn btn-secondary btn-sm" id="btn-cancel-feature-select">Cancel</button>
            </div>
          </div>

          <!-- Test Results Table -->
          <div class="table-container" id="e2e-results-container" style="display:none;">
            <table class="e2e-results-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Test Name</th>
                  <th>Feature</th>
                  <th>Duration</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody id="e2e-results-tbody">
              </tbody>
            </table>
          </div>

          <!-- Empty State -->
          <div class="e2e-empty" id="e2e-empty">
            <p style="color: var(--color-text-secondary); text-align: center; padding: 2rem 0;">
              No test results yet. Click "Run All Tests" to start E2E testing.
            </p>
          </div>
        </div>
      </div>

      <!-- Screenshot Modal -->
      <div class="modal-overlay" id="e2e-screenshot-modal" style="display:none;">
        <div class="modal-content modal-large">
          <div class="modal-header">
            <h2 id="e2e-screenshot-title">Test Failure Screenshot</h2>
            <button class="modal-close" id="btn-close-screenshot">&times;</button>
          </div>
          <div class="modal-body">
            <div id="e2e-screenshot-error" style="margin-bottom: 1rem; padding: 0.75rem; background: var(--color-error-bg, rgba(239,68,68,0.1)); border-radius: 8px; border: 1px solid var(--color-error, #ef4444); font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; white-space: pre-wrap;"></div>
            <div id="e2e-screenshot-wrapper" style="text-align: center;">
              <img id="e2e-screenshot-img" style="max-width: 100%; border-radius: 8px; border: 1px solid var(--color-border);" />
            </div>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    const runAllBtn = document.getElementById('btn-run-all-e2e');
    const runFeatureBtn = document.getElementById('btn-run-feature-e2e');
    const runSelectedBtn = document.getElementById('btn-run-selected-feature');
    const cancelFeatureBtn = document.getElementById('btn-cancel-feature-select');
    const closeScreenshotBtn = document.getElementById('btn-close-screenshot');
    const screenshotModal = document.getElementById('e2e-screenshot-modal');

    if (runAllBtn) runAllBtn.addEventListener('click', () => this.runAllTests());
    if (runFeatureBtn) runFeatureBtn.addEventListener('click', () => this.showFeatureFilter());
    if (runSelectedBtn) runSelectedBtn.addEventListener('click', () => this.runFeatureTest());
    if (cancelFeatureBtn) cancelFeatureBtn.addEventListener('click', () => this.hideFeatureFilter());
    if (closeScreenshotBtn) closeScreenshotBtn.addEventListener('click', () => this.closeScreenshot());
    if (screenshotModal) screenshotModal.addEventListener('click', (e) => {
      if (e.target === screenshotModal) this.closeScreenshot();
    });
  }

  async runAllTests() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.updateRunningState(true);

    try {
      const response = await fetch(`${this.API_BASE}/api/e2e/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'all' })
      });
      const result = await response.json();
      if (result.success && result.data?.runId) {
        this.currentRunId = result.data.runId;
        this.startPolling();
      } else {
        this.showError(result.error || 'Failed to start tests');
        this.updateRunningState(false);
      }
    } catch (err) {
      this.showError('Failed to connect to backend: ' + err.message);
      this.updateRunningState(false);
    }
  }

  async runFeatureTest() {
    const select = document.getElementById('e2e-feature-select');
    const featureId = select?.value;
    if (!featureId) return;

    this.hideFeatureFilter();
    if (this.isRunning) return;
    this.isRunning = true;
    this.updateRunningState(true);

    try {
      const response = await fetch(`${this.API_BASE}/api/e2e/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'feature', featureId })
      });
      const result = await response.json();
      if (result.success && result.data?.runId) {
        this.currentRunId = result.data.runId;
        this.startPolling();
      } else {
        this.showError(result.error || 'Failed to start tests');
        this.updateRunningState(false);
      }
    } catch (err) {
      this.showError('Failed to connect to backend: ' + err.message);
      this.updateRunningState(false);
    }
  }

  startPolling() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(() => this.pollResults(), 2000);
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  async pollResults() {
    if (!this.currentRunId) return;
    try {
      const response = await fetch(`${this.API_BASE}/api/e2e/results/${this.currentRunId}`);
      const result = await response.json();
      if (result.success && result.data) {
        this.testResults = result.data.tests || [];
        this.renderResults(result.data);

        if (result.data.status === 'completed' || result.data.status === 'error') {
          this.stopPolling();
          this.isRunning = false;
          this.updateRunningState(false);
        }
      }
    } catch (err) {
      console.error('Poll error:', err);
    }
  }

  async loadLatestResults() {
    try {
      const response = await fetch(`${this.API_BASE}/api/e2e/results/latest`);
      const result = await response.json();
      if (result.success && result.data && result.data.tests?.length > 0) {
        this.testResults = result.data.tests;
        this.renderResults(result.data);
      }
    } catch (err) {
      // No results yet, that's fine
    }
  }

  renderResults(data) {
    const summary = document.getElementById('e2e-summary');
    const resultsContainer = document.getElementById('e2e-results-container');
    const empty = document.getElementById('e2e-empty');
    const tbody = document.getElementById('e2e-results-tbody');
    const runStatus = document.getElementById('e2e-run-status');

    if (!data.tests || data.tests.length === 0) {
      if (summary) summary.style.display = 'none';
      if (resultsContainer) resultsContainer.style.display = 'none';
      if (empty) empty.style.display = 'block';
      return;
    }

    if (empty) empty.style.display = 'none';
    if (summary) summary.style.display = 'block';
    if (resultsContainer) resultsContainer.style.display = 'block';

    // Update stats
    const total = data.tests.length;
    const passed = data.tests.filter(t => t.status === 'passed').length;
    const failed = data.tests.filter(t => t.status === 'failed').length;
    const skipped = data.tests.filter(t => t.status === 'skipped').length;

    document.getElementById('e2e-total').textContent = total;
    document.getElementById('e2e-passed').textContent = passed;
    document.getElementById('e2e-failed').textContent = failed;
    document.getElementById('e2e-skipped').textContent = skipped;

    // Progress bar
    const passPercent = total > 0 ? (passed / total) * 100 : 0;
    const failPercent = total > 0 ? (failed / total) * 100 : 0;
    document.getElementById('e2e-progress-pass').style.width = passPercent + '%';
    document.getElementById('e2e-progress-fail').style.width = failPercent + '%';

    // Run info
    const runInfo = document.getElementById('e2e-run-info');
    if (runInfo && data.startTime) {
      const duration = data.endTime
        ? ((new Date(data.endTime) - new Date(data.startTime)) / 1000).toFixed(1) + 's'
        : 'running...';
      runInfo.textContent = `Run: ${new Date(data.startTime).toLocaleTimeString()} | Duration: ${duration}`;
    }

    // Status badge
    const badge = document.getElementById('e2e-status-badge');
    if (badge) {
      badge.style.display = 'inline-flex';
      if (data.status === 'running') {
        badge.className = 'badge badge-warning';
        badge.textContent = 'Running';
      } else if (failed > 0) {
        badge.className = 'badge badge-error';
        badge.textContent = `${failed} Failed`;
      } else {
        badge.className = 'badge badge-success';
        badge.textContent = 'All Passed';
      }
    }

    // Status text
    if (runStatus) {
      runStatus.textContent = `${passed}/${total} passed${failed > 0 ? `, ${failed} failed` : ''}`;
    }

    // Results table
    if (tbody) {
      tbody.innerHTML = data.tests.map(test => {
        const statusIcon = test.status === 'passed' ? '<span class="e2e-icon-pass">&#10003;</span>'
          : test.status === 'failed' ? '<span class="e2e-icon-fail">&#10007;</span>'
          : '<span class="e2e-icon-skip">&#8722;</span>';

        const statusClass = test.status === 'passed' ? 'e2e-row-pass'
          : test.status === 'failed' ? 'e2e-row-fail'
          : 'e2e-row-skip';

        const duration = test.duration ? `${(test.duration / 1000).toFixed(1)}s` : '-';
        const featureLink = test.featureId ? `<span class="badge badge-info" style="font-size: 0.75rem;">${test.featureId}</span>` : '-';

        const detailsBtn = test.status === 'failed'
          ? `<button class="btn btn-secondary btn-sm e2e-details-btn" data-test-id="${test.id}" title="View failure details">
              ${test.screenshot ? 'Screenshot' : 'Details'}
            </button>`
          : '';

        return `
          <tr class="${statusClass}">
            <td>${statusIcon}</td>
            <td class="e2e-test-name">${this.escapeHtml(test.name)}</td>
            <td>${featureLink}</td>
            <td>${duration}</td>
            <td>${detailsBtn}</td>
          </tr>
        `;
      }).join('');

      // Bind detail buttons
      tbody.querySelectorAll('.e2e-details-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const testId = btn.getAttribute('data-test-id');
          const test = data.tests.find(t => t.id === testId);
          if (test) this.showScreenshot(test);
        });
      });
    }
  }

  showScreenshot(test) {
    const modal = document.getElementById('e2e-screenshot-modal');
    const title = document.getElementById('e2e-screenshot-title');
    const errorDiv = document.getElementById('e2e-screenshot-error');
    const img = document.getElementById('e2e-screenshot-img');
    const wrapper = document.getElementById('e2e-screenshot-wrapper');

    if (!modal) return;

    if (title) title.textContent = `Failed: ${test.name}`;
    if (errorDiv) {
      errorDiv.textContent = test.error || 'No error message available';
      errorDiv.style.display = test.error ? 'block' : 'none';
    }
    if (img && wrapper) {
      if (test.screenshot) {
        img.src = `${this.API_BASE}/api/e2e/screenshots/${test.screenshot}`;
        img.alt = `Failure screenshot for ${test.name}`;
        wrapper.style.display = 'block';
      } else {
        wrapper.style.display = 'none';
      }
    }

    modal.style.display = 'flex';
  }

  closeScreenshot() {
    const modal = document.getElementById('e2e-screenshot-modal');
    if (modal) modal.style.display = 'none';
  }

  async showFeatureFilter() {
    const filter = document.getElementById('e2e-feature-filter');
    const select = document.getElementById('e2e-feature-select');
    if (!filter || !select) return;

    // Load features
    try {
      const response = await fetch(`${this.API_BASE}/api/e2e/features`);
      const result = await response.json();
      if (result.success && result.data) {
        select.innerHTML = '<option value="">-- Select a feature --</option>' +
          result.data.map(f =>
            `<option value="${f.id}">${f.id}: ${this.escapeHtml(f.name || f.description || '')}</option>`
          ).join('');
      }
    } catch (err) {
      select.innerHTML = '<option value="">Failed to load features</option>';
    }

    filter.style.display = 'block';
  }

  hideFeatureFilter() {
    const filter = document.getElementById('e2e-feature-filter');
    if (filter) filter.style.display = 'none';
  }

  updateRunningState(running) {
    const runningDiv = document.getElementById('e2e-running');
    const runAllBtn = document.getElementById('btn-run-all-e2e');
    const runFeatureBtn = document.getElementById('btn-run-feature-e2e');

    if (runningDiv) runningDiv.style.display = running ? 'flex' : 'none';
    if (runAllBtn) {
      runAllBtn.disabled = running;
      runAllBtn.textContent = running ? 'Running...' : 'Run All Tests';
    }
    if (runFeatureBtn) runFeatureBtn.disabled = running;
  }

  showError(message) {
    const runStatus = document.getElementById('e2e-run-status');
    if (runStatus) runStatus.textContent = `Error: ${message}`;
    console.error('E2E Test Error:', message);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new E2ETestRunner());
} else {
  new E2ETestRunner();
}
