/**
 * Deployment Status Tracker (feat-044)
 * Track Netlify/Vercel deployments per project
 */
class DeploymentTracker {
  constructor(containerId = 'deployment-tracker-widget') {
    this.container = document.getElementById(containerId);
    this.API_BASE = 'http://localhost:3434';
    this.data = null;

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
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
          <h3 class="card-title">Deployment Status Tracker</h3>
          <div style="display:flex; gap:8px; align-items:center;">
            <button class="btn btn-sm btn-secondary" id="dt-refresh-btn" title="Refresh all">Refresh All</button>
          </div>
        </div>
        <div class="card-body">
          <!-- Summary Cards -->
          <div class="dt-summary-grid">
            <div class="dt-summary-card">
              <div class="dt-summary-value" id="dt-total-targets">-</div>
              <div class="dt-summary-label">Total Targets</div>
            </div>
            <div class="dt-summary-card">
              <div class="dt-summary-value" id="dt-configured" style="color: var(--color-primary, #818cf8);">-</div>
              <div class="dt-summary-label">Configured</div>
            </div>
            <div class="dt-summary-card">
              <div class="dt-summary-value" id="dt-deployed" style="color: var(--color-success, #34d399);">-</div>
              <div class="dt-summary-label">Live</div>
            </div>
            <div class="dt-summary-card">
              <div class="dt-summary-value" id="dt-failed" style="color: var(--color-error, #f87171);">-</div>
              <div class="dt-summary-label">Failed</div>
            </div>
          </div>

          <!-- Deployments Table -->
          <table class="dt-table" id="dt-deployments-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Provider</th>
                <th>Status</th>
                <th>Preview URL</th>
                <th>Branch</th>
                <th>Last Deploy</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="dt-table-body">
              <tr><td colspan="7" style="text-align:center; padding:24px; color:var(--text-secondary, #94a3b8);">Loading...</td></tr>
            </tbody>
          </table>

          <!-- Config Form -->
          <div id="dt-config-panel" style="display:none; margin-top:16px;">
            <h4 class="dt-panel-title" id="dt-config-title">Configure Deployment</h4>
            <div class="dt-form-grid">
              <div class="dt-form-group">
                <label class="dt-label">Target Project</label>
                <select class="dt-input" id="dt-config-target">
                  <option value="">Select target...</option>
                </select>
              </div>
              <div class="dt-form-group">
                <label class="dt-label">Provider</label>
                <select class="dt-input" id="dt-config-provider">
                  <option value="netlify">Netlify</option>
                  <option value="vercel">Vercel</option>
                </select>
              </div>
              <div class="dt-form-group">
                <label class="dt-label">API Token</label>
                <input type="password" class="dt-input" id="dt-config-token" placeholder="API token or personal access token">
              </div>
              <div class="dt-form-group" id="dt-site-id-group">
                <label class="dt-label">Site ID <span style="font-size:0.75rem; color:var(--text-secondary,#94a3b8);">(Netlify)</span></label>
                <input type="text" class="dt-input" id="dt-config-site-id" placeholder="e.g. abc123-def456">
              </div>
              <div class="dt-form-group" id="dt-project-id-group" style="display:none;">
                <label class="dt-label">Project ID <span style="font-size:0.75rem; color:var(--text-secondary,#94a3b8);">(Vercel)</span></label>
                <input type="text" class="dt-input" id="dt-config-project-id" placeholder="e.g. prj_xxxxx">
              </div>
              <div class="dt-form-group" id="dt-team-id-group" style="display:none;">
                <label class="dt-label">Team ID <span style="font-size:0.75rem; color:var(--text-secondary,#94a3b8);">(optional)</span></label>
                <input type="text" class="dt-input" id="dt-config-team-id" placeholder="e.g. team_xxxxx">
              </div>
            </div>
            <div class="dt-form-actions">
              <button class="btn btn-sm btn-primary" id="dt-save-config-btn">Save & Test</button>
              <button class="btn btn-sm btn-secondary" id="dt-cancel-config-btn">Cancel</button>
              <span class="dt-status-msg" id="dt-config-status"></span>
            </div>
          </div>

          <!-- Build Log Panel -->
          <div id="dt-log-panel" style="display:none; margin-top:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <h4 class="dt-panel-title" id="dt-log-title">Build Log</h4>
              <button class="btn btn-sm btn-secondary" id="dt-close-log-btn">Close</button>
            </div>
            <pre class="dt-build-log" id="dt-build-log-content">Loading...</pre>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    document.getElementById('dt-refresh-btn')?.addEventListener('click', () => this.refreshAll());
    document.getElementById('dt-save-config-btn')?.addEventListener('click', () => this.saveConfig());
    document.getElementById('dt-cancel-config-btn')?.addEventListener('click', () => this.hideConfigPanel());
    document.getElementById('dt-close-log-btn')?.addEventListener('click', () => this.hideLogPanel());

    document.getElementById('dt-config-provider')?.addEventListener('change', (e) => {
      const isNetlify = e.target.value === 'netlify';
      document.getElementById('dt-site-id-group').style.display = isNetlify ? '' : 'none';
      document.getElementById('dt-project-id-group').style.display = isNetlify ? 'none' : '';
      document.getElementById('dt-team-id-group').style.display = isNetlify ? 'none' : '';
    });
  }

  async loadData() {
    try {
      const resp = await fetch(`${this.API_BASE}/api/deployments/overview`);
      const result = await resp.json();
      if (result.success && result.data) {
        this.data = result.data;
        this.updateUI();
      }
    } catch (error) {
      console.error('DeploymentTracker: Error loading data:', error);
    }
  }

  updateUI() {
    if (!this.data) return;
    const { summary, targets } = this.data;

    // Update summary cards
    document.getElementById('dt-total-targets').textContent = summary.totalTargets;
    document.getElementById('dt-configured').textContent = summary.configured;
    document.getElementById('dt-deployed').textContent = summary.deployed;
    document.getElementById('dt-failed').textContent = summary.failed;

    // Update table
    const tbody = document.getElementById('dt-table-body');
    if (!targets || targets.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--text-secondary,#94a3b8);">No targets found</td></tr>';
      return;
    }

    tbody.innerHTML = targets.map(t => {
      const statusDot = this.getStatusDot(t);
      const statusLabel = this.getStatusLabel(t);
      const previewLink = t.deployment?.previewUrl
        ? `<a href="${this.escapeHtml(t.deployment.previewUrl)}" target="_blank" class="dt-link">${this.truncateUrl(t.deployment.previewUrl)}</a>`
        : '<span class="dt-muted">-</span>';
      const branch = t.deployment?.branch || '-';
      const lastDeploy = t.deployment?.createdAt
        ? this.timeAgo(t.deployment.createdAt)
        : '-';

      const providerBadge = t.provider
        ? `<span class="dt-provider-badge dt-provider-${t.provider}">${t.provider}</span>`
        : '<span class="dt-muted">Not set</span>';

      return `<tr>
        <td><strong>${this.escapeHtml(t.name)}</strong></td>
        <td>${providerBadge}</td>
        <td>${statusDot} ${statusLabel}</td>
        <td>${previewLink}</td>
        <td><code class="dt-branch">${this.escapeHtml(branch)}</code></td>
        <td>${lastDeploy}</td>
        <td class="dt-actions">
          ${t.configured ? `
            <button class="dt-action-btn" data-action="check" data-id="${t.id}" title="Check status">Check</button>
            <button class="dt-action-btn" data-action="redeploy" data-id="${t.id}" title="Trigger redeploy">Redeploy</button>
            ${t.deployment?.status === 'error' ? `<button class="dt-action-btn dt-action-logs" data-action="logs" data-id="${t.id}" title="View build log">Logs</button>` : ''}
            <button class="dt-action-btn dt-action-edit" data-action="edit" data-id="${t.id}" title="Edit config">Edit</button>
            <button class="dt-action-btn dt-action-remove" data-action="remove" data-id="${t.id}" title="Remove config">Remove</button>
          ` : `
            <button class="dt-action-btn dt-action-configure" data-action="configure" data-id="${t.id}" title="Configure deployment">Configure</button>
          `}
        </td>
      </tr>`;
    }).join('');

    // Bind row action events
    tbody.querySelectorAll('.dt-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        const id = e.target.dataset.id;
        this.handleAction(action, id);
      });
    });
  }

  getStatusDot(target) {
    if (!target.configured) return '<span class="dt-status-dot dt-status-unconfigured"></span>';
    if (!target.deployment) return '<span class="dt-status-dot dt-status-unknown"></span>';
    const status = target.deployment.status;
    if (status === 'ready') return '<span class="dt-status-dot dt-status-live"></span>';
    if (status === 'error') return '<span class="dt-status-dot dt-status-error"></span>';
    if (status === 'building') return '<span class="dt-status-dot dt-status-building"></span>';
    return '<span class="dt-status-dot dt-status-unknown"></span>';
  }

  getStatusLabel(target) {
    if (!target.configured) return '<span class="dt-muted">Not configured</span>';
    if (!target.deployment) return '<span class="dt-muted">No deploys</span>';
    const status = target.deployment.status;
    if (status === 'ready') return '<span style="color:var(--color-success,#34d399);">Live</span>';
    if (status === 'error') return '<span style="color:var(--color-error,#f87171);">Failed</span>';
    if (status === 'building') return '<span style="color:var(--color-warning,#fbbf24);">Building</span>';
    return `<span class="dt-muted">${status}</span>`;
  }

  async handleAction(action, targetId) {
    const statusEl = document.getElementById('dt-config-status');

    switch (action) {
      case 'configure':
        this.showConfigPanel(targetId, false);
        break;
      case 'edit':
        this.showConfigPanel(targetId, true);
        break;
      case 'check':
        await this.checkDeployment(targetId);
        break;
      case 'redeploy':
        await this.triggerRedeploy(targetId);
        break;
      case 'logs':
        await this.showBuildLogs(targetId);
        break;
      case 'remove':
        await this.removeConfig(targetId);
        break;
    }
  }

  showConfigPanel(targetId, isEdit) {
    const panel = document.getElementById('dt-config-panel');
    const title = document.getElementById('dt-config-title');
    const targetSelect = document.getElementById('dt-config-target');
    const statusEl = document.getElementById('dt-config-status');

    title.textContent = isEdit ? `Edit Deployment Config - ${targetId}` : 'Configure Deployment';
    statusEl.textContent = '';

    // Populate target dropdown
    if (this.data?.targets) {
      targetSelect.innerHTML = this.data.targets.map(t =>
        `<option value="${t.id}" ${t.id === targetId ? 'selected' : ''}>${t.name} (${t.id})</option>`
      ).join('');
    }

    // If editing, pre-fill known values
    if (isEdit) {
      const target = this.data?.targets?.find(t => t.id === targetId);
      if (target) {
        document.getElementById('dt-config-provider').value = target.provider || 'netlify';
        document.getElementById('dt-config-token').value = '';
        document.getElementById('dt-config-token').placeholder = target.apiToken || 'Enter new token';
        document.getElementById('dt-config-site-id').value = target.siteId || '';
        document.getElementById('dt-config-project-id').value = target.projectId || '';

        const isNetlify = target.provider === 'netlify';
        document.getElementById('dt-site-id-group').style.display = isNetlify ? '' : 'none';
        document.getElementById('dt-project-id-group').style.display = isNetlify ? 'none' : '';
        document.getElementById('dt-team-id-group').style.display = isNetlify ? 'none' : '';
      }
    } else {
      document.getElementById('dt-config-provider').value = 'netlify';
      document.getElementById('dt-config-token').value = '';
      document.getElementById('dt-config-token').placeholder = 'API token or personal access token';
      document.getElementById('dt-config-site-id').value = '';
      document.getElementById('dt-config-project-id').value = '';
      document.getElementById('dt-config-team-id').value = '';
      document.getElementById('dt-site-id-group').style.display = '';
      document.getElementById('dt-project-id-group').style.display = 'none';
      document.getElementById('dt-team-id-group').style.display = 'none';
    }

    panel.style.display = '';
  }

  hideConfigPanel() {
    document.getElementById('dt-config-panel').style.display = 'none';
  }

  hideLogPanel() {
    document.getElementById('dt-log-panel').style.display = 'none';
  }

  async saveConfig() {
    const statusEl = document.getElementById('dt-config-status');
    const targetId = document.getElementById('dt-config-target').value;
    const provider = document.getElementById('dt-config-provider').value;
    const apiToken = document.getElementById('dt-config-token').value;
    const siteId = document.getElementById('dt-config-site-id').value;
    const projectId = document.getElementById('dt-config-project-id').value;
    const teamId = document.getElementById('dt-config-team-id').value;

    if (!targetId) {
      statusEl.textContent = 'Please select a target';
      statusEl.style.color = 'var(--color-error, #f87171)';
      return;
    }

    if (!apiToken) {
      statusEl.textContent = 'API token is required';
      statusEl.style.color = 'var(--color-error, #f87171)';
      return;
    }

    statusEl.textContent = 'Saving...';
    statusEl.style.color = 'var(--text-secondary, #94a3b8)';

    try {
      const resp = await fetch(`${this.API_BASE}/api/deployments/config/${targetId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiToken, siteId, projectId, teamId })
      });
      const result = await resp.json();

      if (result.success) {
        statusEl.textContent = 'Saved! Checking deployment...';
        statusEl.style.color = 'var(--color-success, #34d399)';

        // Auto-check deployment status after saving
        await this.checkDeployment(targetId);
        this.hideConfigPanel();
      } else {
        statusEl.textContent = result.error || 'Save failed';
        statusEl.style.color = 'var(--color-error, #f87171)';
      }
    } catch (error) {
      statusEl.textContent = 'Network error: ' + error.message;
      statusEl.style.color = 'var(--color-error, #f87171)';
    }
  }

  async checkDeployment(targetId) {
    try {
      const resp = await fetch(`${this.API_BASE}/api/deployments/check/${targetId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await resp.json();
      if (result.success) {
        await this.loadData();
      }
    } catch (error) {
      console.error('Check deployment error:', error);
    }
  }

  async triggerRedeploy(targetId) {
    const target = this.data?.targets?.find(t => t.id === targetId);
    if (!confirm(`Trigger redeploy for ${target?.name || targetId}?`)) return;

    try {
      const resp = await fetch(`${this.API_BASE}/api/deployments/redeploy/${targetId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await resp.json();
      if (result.success) {
        await this.loadData();
      } else {
        alert('Redeploy failed: ' + (result.data?.result?.error || result.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Redeploy error: ' + error.message);
    }
  }

  async showBuildLogs(targetId) {
    const logPanel = document.getElementById('dt-log-panel');
    const logTitle = document.getElementById('dt-log-title');
    const logContent = document.getElementById('dt-build-log-content');
    const target = this.data?.targets?.find(t => t.id === targetId);

    logTitle.textContent = `Build Log - ${target?.name || targetId}`;
    logContent.textContent = 'Loading...';
    logPanel.style.display = '';

    try {
      const resp = await fetch(`${this.API_BASE}/api/deployments/logs/${targetId}`);
      const result = await resp.json();
      if (result.success && result.data) {
        logContent.textContent = result.data.buildLog || 'No log data available';
      } else {
        logContent.textContent = result.error || 'Failed to load logs';
      }
    } catch (error) {
      logContent.textContent = 'Error: ' + error.message;
    }
  }

  async removeConfig(targetId) {
    const target = this.data?.targets?.find(t => t.id === targetId);
    if (!confirm(`Remove deployment config for ${target?.name || targetId}?`)) return;

    try {
      const resp = await fetch(`${this.API_BASE}/api/deployments/config/${targetId}`, {
        method: 'DELETE'
      });
      const result = await resp.json();
      if (result.success) {
        await this.loadData();
      }
    } catch (error) {
      console.error('Remove config error:', error);
    }
  }

  async refreshAll() {
    if (!this.data?.targets) return;
    const configured = this.data.targets.filter(t => t.configured);
    for (const target of configured) {
      await this.checkDeployment(target.id);
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  truncateUrl(url) {
    if (!url) return '';
    try {
      const u = new URL(url);
      return u.hostname + (u.pathname !== '/' ? u.pathname : '');
    } catch {
      return url.length > 40 ? url.substring(0, 37) + '...' : url;
    }
  }

  timeAgo(dateStr) {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const seconds = Math.floor((now - d) / 1000);
      if (seconds < 60) return 'just now';
      if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
      if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
      return Math.floor(seconds / 86400) + 'd ago';
    } catch {
      return dateStr;
    }
  }
}

// Auto-instantiate
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new DeploymentTracker());
} else {
  new DeploymentTracker();
}
