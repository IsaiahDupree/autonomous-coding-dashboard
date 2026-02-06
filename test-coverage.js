/**
 * Test Coverage Dashboard Widget (feat-040)
 * Visualize test coverage per feature - shows which features have tests,
 * displays coverage percentage per category, highlights features without tests,
 * and links to test files.
 */

class TestCoverageDashboard {
  constructor(containerId = 'test-coverage-widget') {
    this.container = document.getElementById(containerId);
    this.coverageData = null;
    this.filterCategory = 'all';
    this.filterCoverage = 'all'; // 'all', 'covered', 'uncovered'
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
    this.loadCoverage();
  }

  render() {
    this.container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Test Coverage</h3>
            <p class="card-subtitle" id="tc-summary-text">Loading coverage data...</p>
          </div>
          <div class="flex gap-1" style="align-items: center;">
            <button class="btn btn-secondary btn-sm" id="btn-tc-refresh" title="Refresh coverage data">
              Refresh
            </button>
          </div>
        </div>
        <div class="card-body">
          <!-- Overall Coverage Bar -->
          <div class="tc-overall" id="tc-overall" style="display:none;">
            <div class="tc-overall-label">
              <span>Overall Test Coverage</span>
              <span id="tc-overall-pct" class="tc-pct">0%</span>
            </div>
            <div class="tc-progress-bar">
              <div class="tc-progress-fill" id="tc-overall-fill" style="width:0%"></div>
            </div>
          </div>

          <!-- Category Breakdown -->
          <div class="tc-categories" id="tc-categories" style="display:none;">
            <h4 class="tc-section-title">Coverage by Category</h4>
            <div class="tc-cat-grid" id="tc-cat-grid"></div>
          </div>

          <!-- Filters -->
          <div class="tc-filters" id="tc-filters" style="display:none;">
            <select id="tc-filter-category" class="tc-select">
              <option value="all">All Categories</option>
            </select>
            <select id="tc-filter-coverage" class="tc-select">
              <option value="all">All Features</option>
              <option value="covered">With Tests</option>
              <option value="uncovered">Without Tests</option>
            </select>
          </div>

          <!-- Feature Table -->
          <div class="tc-table-wrap" id="tc-table-wrap" style="display:none;">
            <table class="tc-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Feature</th>
                  <th>Category</th>
                  <th>Tests</th>
                  <th>Files</th>
                </tr>
              </thead>
              <tbody id="tc-table-body"></tbody>
            </table>
          </div>

          <!-- Loading State -->
          <div class="tc-loading" id="tc-loading">
            <div class="e2e-spinner"></div>
            <span>Scanning test files...</span>
          </div>

          <!-- Error State -->
          <div class="tc-error" id="tc-error" style="display:none;">
            <p id="tc-error-msg">Failed to load coverage data</p>
            <button class="btn btn-secondary btn-sm" id="btn-tc-retry">Retry</button>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    document.getElementById('btn-tc-refresh')?.addEventListener('click', () => this.loadCoverage());
    document.getElementById('btn-tc-retry')?.addEventListener('click', () => this.loadCoverage());
    document.getElementById('tc-filter-category')?.addEventListener('change', (e) => {
      this.filterCategory = e.target.value;
      this.renderFeatureTable();
    });
    document.getElementById('tc-filter-coverage')?.addEventListener('change', (e) => {
      this.filterCoverage = e.target.value;
      this.renderFeatureTable();
    });
  }

  async loadCoverage() {
    const loading = document.getElementById('tc-loading');
    const error = document.getElementById('tc-error');
    if (loading) loading.style.display = 'flex';
    if (error) error.style.display = 'none';

    try {
      const response = await fetch(`${this.API_BASE}/api/test-coverage`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Unknown error');

      this.coverageData = result.data;
      if (loading) loading.style.display = 'none';
      this.renderCoverage();
    } catch (err) {
      console.error('Failed to load test coverage:', err);
      if (loading) loading.style.display = 'none';
      if (error) {
        error.style.display = 'flex';
        const msg = document.getElementById('tc-error-msg');
        if (msg) msg.textContent = `Failed to load coverage: ${err.message}`;
      }
    }
  }

  renderCoverage() {
    if (!this.coverageData) return;

    const { overall, categories, features } = this.coverageData;

    // Summary text
    const summaryEl = document.getElementById('tc-summary-text');
    if (summaryEl) {
      summaryEl.textContent = `${overall.covered}/${overall.total} features have tests (${overall.percentage}%)`;
    }

    // Overall bar
    const overallEl = document.getElementById('tc-overall');
    if (overallEl) overallEl.style.display = 'block';
    const pctEl = document.getElementById('tc-overall-pct');
    if (pctEl) pctEl.textContent = `${overall.percentage}%`;
    const fillEl = document.getElementById('tc-overall-fill');
    if (fillEl) {
      fillEl.style.width = `${overall.percentage}%`;
      fillEl.className = 'tc-progress-fill ' + this.getCoverageClass(overall.percentage);
    }

    // Categories
    this.renderCategories(categories);

    // Populate category filter
    const catFilter = document.getElementById('tc-filter-category');
    if (catFilter) {
      const currentVal = catFilter.value;
      catFilter.innerHTML = '<option value="all">All Categories</option>';
      categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.name;
        opt.textContent = `${cat.name} (${cat.covered}/${cat.total})`;
        catFilter.appendChild(opt);
      });
      catFilter.value = currentVal;
    }

    // Show filters and table
    const filtersEl = document.getElementById('tc-filters');
    if (filtersEl) filtersEl.style.display = 'flex';
    const tableWrap = document.getElementById('tc-table-wrap');
    if (tableWrap) tableWrap.style.display = 'block';

    this.renderFeatureTable();
  }

  renderCategories(categories) {
    const grid = document.getElementById('tc-cat-grid');
    const section = document.getElementById('tc-categories');
    if (!grid || !section) return;

    section.style.display = 'block';
    grid.innerHTML = categories.map(cat => {
      const pct = cat.total > 0 ? Math.round((cat.covered / cat.total) * 100) : 0;
      const cls = this.getCoverageClass(pct);
      return `
        <div class="tc-cat-card" data-category="${cat.name}">
          <div class="tc-cat-name">${cat.name}</div>
          <div class="tc-cat-stats">
            <span class="tc-cat-count">${cat.covered}/${cat.total}</span>
            <span class="tc-cat-pct ${cls}">${pct}%</span>
          </div>
          <div class="tc-progress-bar tc-progress-sm">
            <div class="tc-progress-fill ${cls}" style="width:${pct}%"></div>
          </div>
        </div>
      `;
    }).join('');

    // Click category cards to filter
    grid.querySelectorAll('.tc-cat-card').forEach(card => {
      card.addEventListener('click', () => {
        const catName = card.dataset.category;
        this.filterCategory = catName;
        const catFilter = document.getElementById('tc-filter-category');
        if (catFilter) catFilter.value = catName;
        this.renderFeatureTable();
      });
    });
  }

  renderFeatureTable() {
    if (!this.coverageData) return;

    const tbody = document.getElementById('tc-table-body');
    if (!tbody) return;

    let features = this.coverageData.features;

    // Apply filters
    if (this.filterCategory !== 'all') {
      features = features.filter(f => f.category === this.filterCategory);
    }
    if (this.filterCoverage === 'covered') {
      features = features.filter(f => f.testFiles.length > 0);
    } else if (this.filterCoverage === 'uncovered') {
      features = features.filter(f => f.testFiles.length === 0);
    }

    if (features.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="tc-empty">No features match the current filters</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = features.map(f => {
      const hasCoverage = f.testFiles.length > 0;
      const statusIcon = hasCoverage ? '<span class="tc-icon-covered" title="Has tests">&#10003;</span>' : '<span class="tc-icon-uncovered" title="No tests">&#10007;</span>';
      const rowClass = hasCoverage ? 'tc-row-covered' : 'tc-row-uncovered';
      const fileLinks = f.testFiles.length > 0
        ? f.testFiles.map(tf => `<a class="tc-file-link" href="#" data-path="${this.escapeHtml(tf.path)}" title="${this.escapeHtml(tf.path)}">${this.escapeHtml(tf.name)}</a>`).join(', ')
        : '<span class="tc-no-tests">No test files</span>';

      return `
        <tr class="${rowClass}">
          <td class="tc-status-cell">${statusIcon}</td>
          <td>
            <span class="tc-feat-id">${f.id}</span>
            <span class="tc-feat-desc">${this.escapeHtml(f.description)}</span>
          </td>
          <td><span class="tc-cat-badge">${f.category}</span></td>
          <td class="tc-test-count">${f.testFiles.length}</td>
          <td class="tc-files-cell">${fileLinks}</td>
        </tr>
      `;
    }).join('');
  }

  getCoverageClass(pct) {
    if (pct >= 75) return 'tc-high';
    if (pct >= 40) return 'tc-medium';
    return 'tc-low';
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new TestCoverageDashboard());
} else {
  new TestCoverageDashboard();
}
