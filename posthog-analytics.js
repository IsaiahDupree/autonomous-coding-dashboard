/**
 * PostHog/Analytics Integration (feat-045)
 * View analytics from target apps via PostHog API
 */
class PostHogAnalytics {
  constructor(containerId = 'posthog-analytics-widget') {
    this.container = document.getElementById(containerId);
    this.API_BASE = 'http://localhost:3434';
    this.data = null;
    this.eventTimeline = null;
    this.chartCanvas = null;
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
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
          <h3 class="card-title">PostHog Analytics</h3>
          <div style="display:flex; gap:8px; align-items:center;">
            <select class="ph-select" id="ph-project-select">
              <option value="">All Projects</option>
            </select>
            <button class="btn btn-sm btn-secondary" id="ph-refresh-btn" title="Refresh data">Refresh</button>
            <button class="btn btn-sm btn-primary" id="ph-config-btn" title="Configure PostHog">Configure</button>
          </div>
        </div>
        <div class="card-body">
          <!-- Summary Metrics -->
          <div class="ph-metrics-grid">
            <div class="ph-metric-card">
              <div class="ph-metric-value" id="ph-total-users">-</div>
              <div class="ph-metric-label">Users</div>
              <div class="ph-metric-change" id="ph-users-change"></div>
            </div>
            <div class="ph-metric-card">
              <div class="ph-metric-value" id="ph-total-sessions">-</div>
              <div class="ph-metric-label">Sessions</div>
              <div class="ph-metric-change" id="ph-sessions-change"></div>
            </div>
            <div class="ph-metric-card">
              <div class="ph-metric-value" id="ph-total-events">-</div>
              <div class="ph-metric-label">Events</div>
              <div class="ph-metric-change" id="ph-events-change"></div>
            </div>
            <div class="ph-metric-card">
              <div class="ph-metric-value" id="ph-conversions">-</div>
              <div class="ph-metric-label">Conversions</div>
              <div class="ph-metric-change" id="ph-conversions-change"></div>
            </div>
          </div>

          <!-- Chart Area -->
          <div class="ph-chart-container">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <h4 class="ph-section-title">Event Trends</h4>
              <div class="ph-chart-controls">
                <button class="ph-chart-btn ph-chart-btn-active" data-range="7d">7D</button>
                <button class="ph-chart-btn" data-range="30d">30D</button>
                <button class="ph-chart-btn" data-range="90d">90D</button>
              </div>
            </div>
            <canvas id="ph-trends-chart" height="200"></canvas>
          </div>

          <!-- Event Timeline -->
          <div class="ph-timeline-section">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <h4 class="ph-section-title">Event Timeline</h4>
              <div class="ph-timeline-controls">
                <select class="ph-select ph-select-sm" id="ph-event-filter">
                  <option value="">All Events</option>
                  <option value="$pageview">Pageviews</option>
                  <option value="$autocapture">Clicks</option>
                  <option value="conversion">Conversions</option>
                  <option value="error">Errors</option>
                </select>
              </div>
            </div>
            <div id="ph-event-timeline" class="ph-timeline-list">
              <div class="ph-timeline-empty">Loading events...</div>
            </div>
          </div>

          <!-- Connected Projects Table -->
          <div class="ph-projects-section" style="margin-top:16px;">
            <h4 class="ph-section-title">Connected Projects</h4>
            <table class="ph-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>PostHog Project</th>
                  <th>Status</th>
                  <th>Users</th>
                  <th>Events (24h)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="ph-projects-table-body">
                <tr><td colspan="6" style="text-align:center; padding:24px; color:var(--text-secondary, #94a3b8);">Loading...</td></tr>
              </tbody>
            </table>
          </div>

          <!-- Config Panel -->
          <div id="ph-config-panel" style="display:none; margin-top:16px;">
            <h4 class="ph-section-title" id="ph-config-title">Configure PostHog Connection</h4>
            <div class="ph-form-grid">
              <div class="ph-form-group">
                <label class="ph-label">Target Project</label>
                <select class="ph-input" id="ph-config-target">
                  <option value="">Select target...</option>
                </select>
              </div>
              <div class="ph-form-group">
                <label class="ph-label">PostHog Host</label>
                <input type="text" class="ph-input" id="ph-config-host" placeholder="https://app.posthog.com" value="https://app.posthog.com">
              </div>
              <div class="ph-form-group">
                <label class="ph-label">Project API Key</label>
                <input type="password" class="ph-input" id="ph-config-api-key" placeholder="phc_xxxxxxxxxxxxx">
              </div>
              <div class="ph-form-group">
                <label class="ph-label">Personal API Key <span style="font-size:0.75rem; color:var(--text-secondary,#94a3b8);">(for read access)</span></label>
                <input type="password" class="ph-input" id="ph-config-personal-key" placeholder="phx_xxxxxxxxxxxxx">
              </div>
              <div class="ph-form-group">
                <label class="ph-label">Project ID</label>
                <input type="number" class="ph-input" id="ph-config-project-id" placeholder="e.g. 12345">
              </div>
            </div>
            <div class="ph-form-actions">
              <button class="btn btn-sm btn-primary" id="ph-save-config-btn">Save & Test</button>
              <button class="btn btn-sm btn-secondary" id="ph-cancel-config-btn">Cancel</button>
              <span class="ph-status-msg" id="ph-config-status"></span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    document.getElementById('ph-refresh-btn')?.addEventListener('click', () => this.loadData());
    document.getElementById('ph-config-btn')?.addEventListener('click', () => this.showConfigPanel());
    document.getElementById('ph-save-config-btn')?.addEventListener('click', () => this.saveConfig());
    document.getElementById('ph-cancel-config-btn')?.addEventListener('click', () => this.hideConfigPanel());

    document.getElementById('ph-project-select')?.addEventListener('change', (e) => {
      this.loadData(e.target.value || null);
    });

    document.getElementById('ph-event-filter')?.addEventListener('change', (e) => {
      this.filterTimeline(e.target.value);
    });

    // Chart range buttons
    this.container.querySelectorAll('.ph-chart-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.container.querySelectorAll('.ph-chart-btn').forEach(b => b.classList.remove('ph-chart-btn-active'));
        e.target.classList.add('ph-chart-btn-active');
        this.loadTrends(e.target.dataset.range);
      });
    });
  }

  async loadData(targetId = null) {
    try {
      const url = targetId
        ? `${this.API_BASE}/api/posthog/overview?targetId=${encodeURIComponent(targetId)}`
        : `${this.API_BASE}/api/posthog/overview`;
      const resp = await fetch(url);
      const result = await resp.json();
      if (result.success && result.data) {
        this.data = result.data;
        this.updateMetrics();
        this.updateProjectsTable();
        this.updateProjectSelect();
        this.loadTrends('7d');
        this.loadEvents(targetId);
      }
    } catch (error) {
      console.error('PostHogAnalytics: Error loading data:', error);
    }
  }

  updateMetrics() {
    if (!this.data || !this.data.metrics) return;
    const m = this.data.metrics;

    document.getElementById('ph-total-users').textContent = this.formatNumber(m.users);
    document.getElementById('ph-total-sessions').textContent = this.formatNumber(m.sessions);
    document.getElementById('ph-total-events').textContent = this.formatNumber(m.events);
    document.getElementById('ph-conversions').textContent = this.formatNumber(m.conversions);

    this.setChange('ph-users-change', m.usersChange);
    this.setChange('ph-sessions-change', m.sessionsChange);
    this.setChange('ph-events-change', m.eventsChange);
    this.setChange('ph-conversions-change', m.conversionsChange);
  }

  setChange(elId, pct) {
    const el = document.getElementById(elId);
    if (!el) return;
    if (pct === undefined || pct === null) { el.textContent = ''; return; }
    const sign = pct >= 0 ? '+' : '';
    el.textContent = `${sign}${pct.toFixed(1)}%`;
    el.className = 'ph-metric-change ' + (pct >= 0 ? 'ph-change-up' : 'ph-change-down');
  }

  updateProjectsTable() {
    const tbody = document.getElementById('ph-projects-table-body');
    if (!this.data || !this.data.targets || this.data.targets.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:24px; color:var(--text-secondary,#94a3b8);">No projects configured</td></tr>';
      return;
    }

    tbody.innerHTML = this.data.targets.map(t => {
      const statusDot = t.connected
        ? '<span class="ph-status-dot ph-status-connected"></span> Connected'
        : '<span class="ph-status-dot ph-status-disconnected"></span> Not configured';
      const users = t.connected ? this.formatNumber(t.users || 0) : '-';
      const events = t.connected ? this.formatNumber(t.events24h || 0) : '-';
      const phProject = t.posthogProjectName || t.posthogProjectId || '-';

      return `<tr>
        <td><strong>${this.escapeHtml(t.name)}</strong></td>
        <td>${this.escapeHtml(String(phProject))}</td>
        <td>${statusDot}</td>
        <td>${users}</td>
        <td>${events}</td>
        <td>
          ${t.connected
            ? `<button class="btn btn-sm btn-secondary ph-action-btn" onclick="window._phAnalytics.checkConnection('${this.escapeHtml(t.id)}')">Test</button>
               <button class="btn btn-sm btn-secondary ph-action-btn" onclick="window._phAnalytics.editConfig('${this.escapeHtml(t.id)}')">Edit</button>
               <button class="btn btn-sm btn-secondary ph-action-btn ph-btn-danger" onclick="window._phAnalytics.removeConfig('${this.escapeHtml(t.id)}')">Remove</button>`
            : `<button class="btn btn-sm btn-primary ph-action-btn" onclick="window._phAnalytics.editConfig('${this.escapeHtml(t.id)}')">Connect</button>`
          }
        </td>
      </tr>`;
    }).join('');
  }

  updateProjectSelect() {
    const select = document.getElementById('ph-project-select');
    if (!select || !this.data || !this.data.targets) return;
    const current = select.value;
    select.innerHTML = '<option value="">All Projects</option>';
    this.data.targets.filter(t => t.connected).forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.name;
      select.appendChild(opt);
    });
    select.value = current;
  }

  async loadTrends(range = '7d') {
    try {
      const targetId = document.getElementById('ph-project-select')?.value || '';
      const url = `${this.API_BASE}/api/posthog/trends?range=${range}${targetId ? '&targetId=' + encodeURIComponent(targetId) : ''}`;
      const resp = await fetch(url);
      const result = await resp.json();
      if (result.success && result.data) {
        this.renderChart(result.data);
      }
    } catch (error) {
      console.error('PostHogAnalytics: Error loading trends:', error);
    }
  }

  renderChart(trendData) {
    const canvas = document.getElementById('ph-trends-chart');
    if (!canvas) return;

    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = null;
    }

    const ctx = canvas.getContext('2d');
    const labels = trendData.labels || [];
    const datasets = trendData.datasets || [];

    if (typeof Chart !== 'undefined') {
      this.chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: datasets.map((ds, i) => ({
            label: ds.label,
            data: ds.data,
            borderColor: this.getColor(i),
            backgroundColor: this.getColor(i, 0.1),
            tension: 0.3,
            fill: i === 0,
            pointRadius: 2,
            borderWidth: 2
          }))
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: { color: '#94a3b8', font: { size: 11 } } }
          },
          scales: {
            x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(100,116,139,0.1)' } },
            y: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(100,116,139,0.1)' }, beginAtZero: true }
          }
        }
      });
    } else {
      // Fallback: simple text-based chart
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px monospace';
      if (datasets.length > 0 && datasets[0].data.length > 0) {
        const maxVal = Math.max(...datasets[0].data, 1);
        const barWidth = Math.max(4, Math.floor((canvas.width - 60) / datasets[0].data.length) - 2);
        datasets[0].data.forEach((val, idx) => {
          const height = (val / maxVal) * (canvas.height - 40);
          const x = 40 + idx * (barWidth + 2);
          ctx.fillStyle = 'rgba(129, 140, 248, 0.6)';
          ctx.fillRect(x, canvas.height - 20 - height, barWidth, height);
        });
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(datasets[0].label || 'Events', 4, 14);
      } else {
        ctx.fillText('No trend data available', 10, canvas.height / 2);
      }
    }
  }

  async loadEvents(targetId = null) {
    try {
      const filter = document.getElementById('ph-event-filter')?.value || '';
      const url = `${this.API_BASE}/api/posthog/events?${targetId ? 'targetId=' + encodeURIComponent(targetId) + '&' : ''}${filter ? 'event=' + encodeURIComponent(filter) : ''}`;
      const resp = await fetch(url);
      const result = await resp.json();
      if (result.success && result.data) {
        this.eventTimeline = result.data.events || [];
        this.renderTimeline();
      }
    } catch (error) {
      console.error('PostHogAnalytics: Error loading events:', error);
    }
  }

  renderTimeline() {
    const container = document.getElementById('ph-event-timeline');
    if (!container) return;
    if (!this.eventTimeline || this.eventTimeline.length === 0) {
      container.innerHTML = '<div class="ph-timeline-empty">No events found</div>';
      return;
    }

    container.innerHTML = this.eventTimeline.slice(0, 50).map(ev => {
      const icon = this.getEventIcon(ev.event);
      const time = this.timeAgo(ev.timestamp);
      const person = ev.person || ev.distinct_id || 'Anonymous';
      const props = ev.properties ? Object.keys(ev.properties).slice(0, 3).map(k =>
        `<span class="ph-prop-tag">${this.escapeHtml(k)}: ${this.escapeHtml(String(ev.properties[k]).substring(0, 30))}</span>`
      ).join('') : '';

      return `<div class="ph-timeline-item">
        <div class="ph-timeline-icon">${icon}</div>
        <div class="ph-timeline-content">
          <div class="ph-timeline-event">${this.escapeHtml(ev.event)}</div>
          <div class="ph-timeline-meta">${this.escapeHtml(String(person))} &middot; ${time}</div>
          ${props ? `<div class="ph-timeline-props">${props}</div>` : ''}
        </div>
      </div>`;
    }).join('');
  }

  filterTimeline(eventType) {
    const targetId = document.getElementById('ph-project-select')?.value || null;
    this.loadEvents(targetId);
  }

  showConfigPanel(targetId = null) {
    const panel = document.getElementById('ph-config-panel');
    panel.style.display = '';
    this.populateTargetSelect();

    if (targetId) {
      document.getElementById('ph-config-target').value = targetId;
      document.getElementById('ph-config-title').textContent = 'Edit PostHog Connection';
    } else {
      document.getElementById('ph-config-title').textContent = 'Configure PostHog Connection';
      document.getElementById('ph-config-target').value = '';
      document.getElementById('ph-config-host').value = 'https://app.posthog.com';
      document.getElementById('ph-config-api-key').value = '';
      document.getElementById('ph-config-personal-key').value = '';
      document.getElementById('ph-config-project-id').value = '';
    }
    document.getElementById('ph-config-status').textContent = '';
  }

  hideConfigPanel() {
    document.getElementById('ph-config-panel').style.display = 'none';
  }

  async populateTargetSelect() {
    try {
      const resp = await fetch(`${this.API_BASE}/api/posthog/overview`);
      const result = await resp.json();
      const select = document.getElementById('ph-config-target');
      select.innerHTML = '<option value="">Select target...</option>';
      if (result.success && result.data && result.data.targets) {
        result.data.targets.forEach(t => {
          const opt = document.createElement('option');
          opt.value = t.id;
          opt.textContent = t.name;
          select.appendChild(opt);
        });
      }
    } catch (e) {
      console.error('PostHogAnalytics: Failed to populate targets:', e);
    }
  }

  async saveConfig() {
    const targetId = document.getElementById('ph-config-target').value;
    const host = document.getElementById('ph-config-host').value.trim();
    const apiKey = document.getElementById('ph-config-api-key').value.trim();
    const personalKey = document.getElementById('ph-config-personal-key').value.trim();
    const projectId = document.getElementById('ph-config-project-id').value.trim();
    const statusEl = document.getElementById('ph-config-status');

    if (!targetId) {
      statusEl.textContent = 'Please select a target project';
      statusEl.className = 'ph-status-msg ph-status-error';
      return;
    }
    if (!host || !apiKey || !projectId) {
      statusEl.textContent = 'Host, API Key, and Project ID are required';
      statusEl.className = 'ph-status-msg ph-status-error';
      return;
    }

    statusEl.textContent = 'Saving & testing...';
    statusEl.className = 'ph-status-msg';

    try {
      const resp = await fetch(`${this.API_BASE}/api/posthog/config/${encodeURIComponent(targetId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, apiKey, personalKey, projectId: parseInt(projectId) })
      });
      const result = await resp.json();
      if (result.success) {
        statusEl.textContent = result.data?.connected ? 'Connected successfully!' : 'Saved (connection test failed - check credentials)';
        statusEl.className = 'ph-status-msg ' + (result.data?.connected ? 'ph-status-success' : 'ph-status-error');
        this.loadData();
        if (result.data?.connected) {
          setTimeout(() => this.hideConfigPanel(), 1500);
        }
      } else {
        statusEl.textContent = result.error || 'Save failed';
        statusEl.className = 'ph-status-msg ph-status-error';
      }
    } catch (error) {
      statusEl.textContent = 'Network error: ' + error.message;
      statusEl.className = 'ph-status-msg ph-status-error';
    }
  }

  async checkConnection(targetId) {
    try {
      const resp = await fetch(`${this.API_BASE}/api/posthog/test/${encodeURIComponent(targetId)}`, { method: 'POST' });
      const result = await resp.json();
      if (result.success && result.data?.connected) {
        alert('Connection successful!');
      } else {
        alert('Connection failed: ' + (result.error || 'Unknown error'));
      }
    } catch (e) {
      alert('Connection test error: ' + e.message);
    }
  }

  editConfig(targetId) {
    this.showConfigPanel(targetId);
    // Pre-fill from existing config
    if (this.data && this.data.targets) {
      const t = this.data.targets.find(x => x.id === targetId);
      if (t) {
        document.getElementById('ph-config-host').value = t.posthogHost || 'https://app.posthog.com';
        document.getElementById('ph-config-project-id').value = t.posthogProjectId || '';
      }
    }
  }

  async removeConfig(targetId) {
    if (!confirm('Remove PostHog configuration for this project?')) return;
    try {
      await fetch(`${this.API_BASE}/api/posthog/config/${encodeURIComponent(targetId)}`, { method: 'DELETE' });
      this.loadData();
    } catch (e) {
      console.error('PostHogAnalytics: Remove failed:', e);
    }
  }

  // Utility methods
  getColor(index, alpha = 1) {
    const colors = [
      `rgba(129, 140, 248, ${alpha})`,
      `rgba(52, 211, 153, ${alpha})`,
      `rgba(251, 191, 36, ${alpha})`,
      `rgba(248, 113, 113, ${alpha})`,
      `rgba(167, 139, 250, ${alpha})`
    ];
    return colors[index % colors.length];
  }

  getEventIcon(eventName) {
    if (!eventName) return '&#9679;';
    if (eventName === '$pageview') return '&#128065;';
    if (eventName === '$autocapture' || eventName.includes('click')) return '&#128433;';
    if (eventName.includes('conversion') || eventName.includes('purchase')) return '&#10003;';
    if (eventName.includes('error') || eventName.includes('exception')) return '&#9888;';
    if (eventName.includes('sign') || eventName.includes('login')) return '&#128100;';
    return '&#9679;';
  }

  formatNumber(n) {
    if (n === null || n === undefined) return '-';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
  }

  timeAgo(dateStr) {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = now - then;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    return Math.floor(diff / 86400000) + 'd ago';
  }

  escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }
}

// Expose to global scope for inline onclick handlers
document.addEventListener('DOMContentLoaded', () => {
  window._phAnalytics = new PostHogAnalytics();
});
