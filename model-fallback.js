/**
 * Model Fallback Chain Widget (feat-047)
 * Define fallback order, auto-switch on errors, log fallback events.
 */

class ModelFallback {
  constructor(containerId = 'model-fallback-widget') {
    this.container = document.getElementById(containerId);
    this.API_BASE = 'http://localhost:3434';
    this.config = null;
    this.status = null;
    this.log = [];
    this.refreshInterval = null;

    if (!this.container) {
      console.warn(`Container #${containerId} not found`);
      return;
    }

    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
    this.loadAll();
    this.refreshInterval = setInterval(() => this.loadStatus(), 15000);
  }

  async loadAll() {
    await Promise.all([this.loadConfig(), this.loadStatus(), this.loadLog()]);
  }

  async loadConfig() {
    try {
      const res = await fetch(`${this.API_BASE}/api/model-fallback/config`);
      const json = await res.json();
      if (json.success) {
        this.config = json.data;
        this.renderConfig();
      }
    } catch (e) {
      console.warn('Failed to load fallback config:', e);
    }
  }

  async loadStatus() {
    try {
      const res = await fetch(`${this.API_BASE}/api/model-fallback/status`);
      const json = await res.json();
      if (json.success) {
        this.status = json.data;
        this.renderStatus();
      }
    } catch (e) {
      console.warn('Failed to load fallback status:', e);
    }
  }

  async loadLog() {
    try {
      const res = await fetch(`${this.API_BASE}/api/model-fallback/log?limit=50`);
      const json = await res.json();
      if (json.success) {
        this.log = json.data;
        this.renderLog();
      }
    } catch (e) {
      console.warn('Failed to load fallback log:', e);
    }
  }

  async saveConfig() {
    if (!this.config) return;
    try {
      const res = await fetch(`${this.API_BASE}/api/model-fallback/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.config),
      });
      const json = await res.json();
      if (json.success) {
        this.showToast('Configuration saved');
        this.loadAll();
      } else {
        this.showToast('Failed to save: ' + json.error, true);
      }
    } catch (e) {
      this.showToast('Failed to save config', true);
    }
  }

  render() {
    this.container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Model Fallback Chain</h3>
            <p class="card-subtitle" id="mf-subtitle">Configure automatic model switching on errors</p>
          </div>
          <div class="flex gap-1" style="align-items: center;">
            <button class="btn btn-secondary btn-sm" id="btn-mf-refresh" title="Refresh">Refresh</button>
          </div>
        </div>
        <div class="card-body">

          <!-- Status Summary -->
          <div class="mf-summary-grid" id="mf-summary-grid">
            <div class="mf-stat-card">
              <div class="mf-stat-value" id="mf-active-model">-</div>
              <div class="mf-stat-label">Active Model</div>
            </div>
            <div class="mf-stat-card">
              <div class="mf-stat-value" id="mf-auto-switch">-</div>
              <div class="mf-stat-label">Auto-Switch</div>
            </div>
            <div class="mf-stat-card">
              <div class="mf-stat-value" id="mf-fallback-count">0</div>
              <div class="mf-stat-label">Fallback Events</div>
            </div>
            <div class="mf-stat-card">
              <div class="mf-stat-value" id="mf-error-count">0</div>
              <div class="mf-stat-label">Total Errors</div>
            </div>
          </div>

          <!-- Fallback Order Configuration -->
          <div class="mf-section" id="mf-config-section">
            <div class="mf-section-header">
              <h4 class="mf-section-title">Fallback Order</h4>
              <div class="flex gap-1" style="align-items: center;">
                <label class="mf-toggle-label">
                  <input type="checkbox" id="mf-auto-switch-toggle" checked>
                  <span>Auto-switch on errors</span>
                </label>
                <button class="btn btn-primary btn-sm" id="btn-mf-save">Save</button>
              </div>
            </div>
            <p class="mf-hint">Drag to reorder. Models are tried in order when errors occur.</p>
            <div class="mf-model-list" id="mf-model-list">
              <!-- Model entries rendered dynamically -->
            </div>
            <div class="mf-config-row" style="margin-top: 0.75rem;">
              <label class="mf-config-label">Rate limit cooldown (minutes):</label>
              <input type="number" id="mf-cooldown" class="mf-input-sm" min="1" max="120" value="30">
              <label class="mf-config-label" style="margin-left: 1rem;">Max retries per model:</label>
              <input type="number" id="mf-max-retries" class="mf-input-sm" min="1" max="10" value="3">
            </div>
          </div>

          <!-- Model Status -->
          <div class="mf-section" id="mf-status-section">
            <h4 class="mf-section-title">Model Status</h4>
            <div class="mf-status-grid" id="mf-status-grid">
              <!-- Status cards rendered dynamically -->
            </div>
          </div>

          <!-- Fallback Event Log -->
          <div class="mf-section" id="mf-log-section">
            <div class="mf-section-header">
              <h4 class="mf-section-title">Fallback Event Log</h4>
              <button class="btn btn-secondary btn-sm" id="btn-mf-clear-log">Clear</button>
            </div>
            <div class="mf-log-container" id="mf-log-container">
              <div class="mf-log-empty" id="mf-log-empty">No fallback events recorded yet</div>
              <div class="mf-log-list" id="mf-log-list"></div>
            </div>
          </div>

        </div>
      </div>
      <div class="mf-toast" id="mf-toast" style="display:none;"></div>
    `;
  }

  bindEvents() {
    this.container.querySelector('#btn-mf-refresh')?.addEventListener('click', () => this.loadAll());
    this.container.querySelector('#btn-mf-save')?.addEventListener('click', () => this.onSave());
    this.container.querySelector('#btn-mf-clear-log')?.addEventListener('click', () => this.clearLog());
    this.container.querySelector('#mf-auto-switch-toggle')?.addEventListener('change', (e) => {
      if (this.config) this.config.autoSwitchEnabled = e.target.checked;
    });
    this.container.querySelector('#mf-cooldown')?.addEventListener('change', (e) => {
      if (this.config) this.config.rateLimitCooldownMinutes = parseInt(e.target.value) || 30;
    });
    this.container.querySelector('#mf-max-retries')?.addEventListener('change', (e) => {
      if (this.config) this.config.maxRetriesPerModel = parseInt(e.target.value) || 3;
    });
  }

  onSave() {
    if (!this.config) return;
    // Read current order from DOM
    const items = this.container.querySelectorAll('.mf-model-item');
    const newOrder = [];
    items.forEach((item, idx) => {
      const modelId = item.dataset.model;
      const enabled = item.querySelector('.mf-model-enabled')?.checked ?? true;
      const existing = this.config.fallbackOrder.find(m => m.model === modelId);
      newOrder.push({
        model: modelId,
        enabled,
        label: existing?.label || modelId,
        priority: idx + 1,
      });
    });
    this.config.fallbackOrder = newOrder;
    this.config.rateLimitCooldownMinutes = parseInt(this.container.querySelector('#mf-cooldown')?.value) || 30;
    this.config.maxRetriesPerModel = parseInt(this.container.querySelector('#mf-max-retries')?.value) || 3;
    this.config.autoSwitchEnabled = this.container.querySelector('#mf-auto-switch-toggle')?.checked ?? true;
    this.saveConfig();
  }

  renderConfig() {
    if (!this.config) return;

    const list = this.container.querySelector('#mf-model-list');
    if (!list) return;

    const toggle = this.container.querySelector('#mf-auto-switch-toggle');
    if (toggle) toggle.checked = this.config.autoSwitchEnabled;

    const cooldown = this.container.querySelector('#mf-cooldown');
    if (cooldown) cooldown.value = this.config.rateLimitCooldownMinutes || 30;

    const retries = this.container.querySelector('#mf-max-retries');
    if (retries) retries.value = this.config.maxRetriesPerModel || 3;

    const sorted = [...this.config.fallbackOrder].sort((a, b) => a.priority - b.priority);

    list.innerHTML = sorted.map((m, idx) => `
      <div class="mf-model-item" data-model="${m.model}" draggable="true">
        <div class="mf-model-drag">&#x2630;</div>
        <div class="mf-model-priority">${idx + 1}</div>
        <div class="mf-model-name">${this.escapeHtml(m.label)}</div>
        <div class="mf-model-id">${this.escapeHtml(m.model)}</div>
        <label class="mf-model-toggle">
          <input type="checkbox" class="mf-model-enabled" ${m.enabled ? 'checked' : ''}>
          <span>${m.enabled ? 'Enabled' : 'Disabled'}</span>
        </label>
      </div>
    `).join('');

    // Setup drag-and-drop reordering
    this.setupDragDrop(list);

    // Toggle label update
    list.querySelectorAll('.mf-model-enabled').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const span = e.target.parentElement.querySelector('span');
        span.textContent = e.target.checked ? 'Enabled' : 'Disabled';
      });
    });
  }

  setupDragDrop(list) {
    let dragItem = null;

    list.querySelectorAll('.mf-model-item').forEach(item => {
      item.addEventListener('dragstart', (e) => {
        dragItem = item;
        item.classList.add('mf-dragging');
        e.dataTransfer.effectAllowed = 'move';
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('mf-dragging');
        dragItem = null;
        // Update priority numbers
        list.querySelectorAll('.mf-model-item').forEach((el, idx) => {
          el.querySelector('.mf-model-priority').textContent = idx + 1;
        });
      });

      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragItem && dragItem !== item) {
          const rect = item.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          if (e.clientY < midY) {
            list.insertBefore(dragItem, item);
          } else {
            list.insertBefore(dragItem, item.nextSibling);
          }
        }
      });
    });
  }

  renderStatus() {
    if (!this.status) return;

    // Summary
    const shortName = this.getShortModelName(this.status.activeModel);
    const activeEl = this.container.querySelector('#mf-active-model');
    if (activeEl) activeEl.textContent = shortName;

    const switchEl = this.container.querySelector('#mf-auto-switch');
    if (switchEl) {
      switchEl.textContent = this.status.autoSwitchEnabled ? 'ON' : 'OFF';
      switchEl.className = `mf-stat-value ${this.status.autoSwitchEnabled ? 'mf-color-success' : 'mf-color-error'}`;
    }

    const fbCount = this.container.querySelector('#mf-fallback-count');
    if (fbCount) fbCount.textContent = this.status.totalFallbackEvents || 0;

    const errCount = this.container.querySelector('#mf-error-count');
    if (errCount) errCount.textContent = this.status.totalErrors || 0;

    // Model status grid
    const grid = this.container.querySelector('#mf-status-grid');
    if (!grid || !this.status.models) return;

    const models = Object.values(this.status.models);
    grid.innerHTML = models.map(m => {
      const statusClass = m.status === 'available' ? 'mf-status-available' :
                          m.status === 'rate_limited' ? 'mf-status-rate-limited' :
                          'mf-status-disabled';
      const statusText = m.status === 'available' ? 'Available' :
                         m.status === 'rate_limited' ? 'Rate Limited' :
                         'Disabled';
      const activeClass = m.activeModel ? 'mf-model-active' : '';

      return `
        <div class="mf-status-card ${activeClass}">
          <div class="mf-status-card-header">
            <span class="mf-status-model-name">${this.escapeHtml(m.label)}</span>
            <span class="mf-status-badge ${statusClass}">${statusText}</span>
          </div>
          ${m.activeModel ? '<div class="mf-active-indicator">ACTIVE</div>' : ''}
          <div class="mf-status-details">
            <div class="mf-status-detail">
              <span class="mf-detail-label">Switches away</span>
              <span class="mf-detail-value">${m.switchAwayCount || 0}</span>
            </div>
            <div class="mf-status-detail">
              <span class="mf-detail-label">Errors</span>
              <span class="mf-detail-value">${m.errorCount || 0}</span>
            </div>
            <div class="mf-status-detail">
              <span class="mf-detail-label">Last rate limit</span>
              <span class="mf-detail-value">${m.lastRateLimit ? this.timeAgo(m.lastRateLimit) : 'Never'}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  renderLog() {
    const empty = this.container.querySelector('#mf-log-empty');
    const list = this.container.querySelector('#mf-log-list');
    if (!list) return;

    if (!this.log || this.log.length === 0) {
      if (empty) empty.style.display = 'block';
      list.innerHTML = '';
      return;
    }

    if (empty) empty.style.display = 'none';

    list.innerHTML = this.log.map(entry => {
      const icon = this.getEventIcon(entry.event);
      const cls = this.getEventClass(entry.event);
      const time = entry.timestamp ? this.formatTime(entry.timestamp) : '';
      const detail = this.formatLogDetail(entry);

      return `
        <div class="mf-log-entry ${cls}">
          <span class="mf-log-icon">${icon}</span>
          <span class="mf-log-time">${time}</span>
          <span class="mf-log-event">${this.escapeHtml(entry.event)}</span>
          <span class="mf-log-detail">${detail}</span>
        </div>
      `;
    }).join('');
  }

  formatLogDetail(entry) {
    if (entry.details) return this.escapeHtml(entry.details);
    if (entry.fromModel && entry.toModel) {
      return `${this.getShortModelName(entry.fromModel)} → ${this.getShortModelName(entry.toModel)}`;
    }
    if (entry.reason) return this.escapeHtml(entry.reason);
    return '';
  }

  getEventIcon(event) {
    switch (event) {
      case 'model_switch': return '&#x1F504;';
      case 'rate_limit': return '&#x26A0;';
      case 'error': return '&#x274C;';
      case 'session_start': return '&#x25B6;';
      case 'session_success': return '&#x2705;';
      case 'config_updated': return '&#x2699;';
      default: return '&#x2022;';
    }
  }

  getEventClass(event) {
    switch (event) {
      case 'model_switch': return 'mf-log-switch';
      case 'rate_limit': return 'mf-log-warning';
      case 'error': return 'mf-log-error';
      case 'session_success': return 'mf-log-success';
      case 'config_updated': return 'mf-log-config';
      default: return '';
    }
  }

  async clearLog() {
    // Post a clear event - the backend keeps last 500 so we just mark the clear
    try {
      await fetch(`${this.API_BASE}/api/model-fallback/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'log_cleared', details: 'Log cleared by user' }),
      });
      this.log = [];
      this.renderLog();
      this.showToast('Log cleared');
    } catch (e) {
      this.showToast('Failed to clear log', true);
    }
  }

  getShortModelName(model) {
    const names = {
      'claude-opus-4-6': 'Opus 4',
      'claude-sonnet-4-6-20250205': 'Sonnet 4.6',
      'claude-sonnet-4-5-20250929': 'Sonnet 4.5',
      'sonnet': 'Sonnet',
      'haiku': 'Haiku',
    };
    return names[model] || model;
  }

  timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    return Math.floor(diff / 86400000) + 'd ago';
  }

  formatTime(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  showToast(message, isError = false) {
    const toast = this.container.querySelector('#mf-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `mf-toast ${isError ? 'mf-toast-error' : 'mf-toast-success'}`;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3000);
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  new ModelFallback();
});
