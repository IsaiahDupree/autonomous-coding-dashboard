/**
 * Sleep/Wake Control Component for Harness
 * Displays sleep status and provides wake/sleep controls
 */

class SleepControlWidget {
  constructor(containerId = 'sleep-control-widget') {
    this.container = document.getElementById(containerId);
    this.sleepStatus = null;
    this.pollInterval = null;

    if (!this.container) {
      console.warn(`Container #${containerId} not found`);
      return;
    }

    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
    this.startPolling();
    this.loadConfig();
  }

  render() {
    this.container.innerHTML = `
      <div class="sleep-control-card">
        <div class="sleep-header">
          <h4>💤 Sleep/Wake Mode</h4>
          <span class="sleep-status-badge" id="sleep-status-badge">Unknown</span>
        </div>

        <div class="sleep-info" id="sleep-info">
          <div class="sleep-stat">
            <span class="sleep-label">Status:</span>
            <span class="sleep-value" id="sleep-state-text">Loading...</span>
          </div>
          <div class="sleep-stat">
            <span class="sleep-label">Last Activity:</span>
            <span class="sleep-value" id="last-activity-text">--</span>
          </div>
          <div class="sleep-stat">
            <span class="sleep-label">Sleep Timeout:</span>
            <span class="sleep-value" id="sleep-timeout-text">5 minutes</span>
          </div>
        </div>

        <div class="sleep-controls">
          <button class="btn btn-secondary" id="btn-force-wake" title="Wake the harness immediately">
            ⏰ Force Wake
          </button>
          <button class="btn btn-secondary" id="btn-force-sleep" title="Put harness to sleep">
            💤 Force Sleep
          </button>
          <button class="btn btn-secondary" id="btn-sleep-config" title="Configure sleep settings">
            ⚙️ Configure
          </button>
        </div>
      </div>

      <!-- Sleep Configuration Modal -->
      <div class="modal-overlay" id="sleep-config-modal" style="display: none;">
        <div class="modal-container">
          <div class="modal-header">
            <h3>Sleep/Wake Configuration</h3>
            <button class="modal-close" onclick="closeSleepConfigModal()">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label for="sleep-timeout-input">Sleep Timeout (minutes):</label>
              <input type="number" id="sleep-timeout-input" min="1" max="60" value="5"
                     class="form-control">
              <small class="form-help">Harness will sleep after this many minutes of inactivity</small>
            </div>

            <div class="form-group">
              <label class="checkbox-container">
                <input type="checkbox" id="enable-user-access-wake" checked>
                <span>Wake on dashboard access</span>
              </label>
              <small class="form-help">Wake when user accesses the dashboard</small>
            </div>

            <div class="form-group">
              <label class="checkbox-container">
                <input type="checkbox" id="enable-checkback-wake" checked>
                <span>Wake on external trigger</span>
              </label>
              <small class="form-help">Wake when .wake-harness file is created</small>
            </div>

            <div class="form-group">
              <label class="checkbox-container">
                <input type="checkbox" id="enable-scheduled-wake">
                <span>Enable scheduled wake (future feature)</span>
              </label>
              <small class="form-help">Wake at scheduled times (not yet implemented)</small>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeSleepConfigModal()">Cancel</button>
            <button class="btn btn-primary" id="btn-save-sleep-config">Save Configuration</button>
          </div>
        </div>
      </div>
    `;

    this.addStyles();
  }

  addStyles() {
    if (document.getElementById('sleep-control-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'sleep-control-styles';
    styles.textContent = `
      .sleep-control-card {
        background: var(--color-surface);
        border-radius: 8px;
        padding: 1.25rem;
        border: 1px solid var(--color-border);
      }

      .sleep-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        padding-bottom: 0.75rem;
        border-bottom: 1px solid var(--color-border);
      }

      .sleep-header h4 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
      }

      .sleep-status-badge {
        padding: 0.25rem 0.75rem;
        border-radius: 1rem;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
      }

      .sleep-status-badge.awake {
        background: var(--color-success-bg);
        color: var(--color-success);
      }

      .sleep-status-badge.sleeping {
        background: var(--color-warning-bg);
        color: var(--color-warning);
      }

      .sleep-status-badge.unknown {
        background: var(--color-border);
        color: var(--color-text-secondary);
      }

      .sleep-info {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 1rem;
      }

      .sleep-stat {
        display: flex;
        justify-content: space-between;
        font-size: 0.875rem;
      }

      .sleep-label {
        color: var(--color-text-secondary);
      }

      .sleep-value {
        font-weight: 500;
        color: var(--color-text);
      }

      .sleep-controls {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .sleep-controls button {
        flex: 1;
        min-width: 100px;
        font-size: 0.875rem;
      }

      @media (max-width: 768px) {
        .sleep-controls button {
          flex: 1 1 100%;
        }
      }
    `;

    document.head.appendChild(styles);
  }

  bindEvents() {
    document.getElementById('btn-force-wake')?.addEventListener('click', () => this.forceWake());
    document.getElementById('btn-force-sleep')?.addEventListener('click', () => this.forceSleep());
    document.getElementById('btn-sleep-config')?.addEventListener('click', () => this.openConfigModal());
    document.getElementById('btn-save-sleep-config')?.addEventListener('click', () => this.saveConfig());
  }

  async startPolling() {
    // Poll every 10 seconds
    this.pollInterval = setInterval(() => this.fetchStatus(), 10000);

    // Initial fetch
    this.fetchStatus();
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  async fetchStatus() {
    try {
      const response = await fetch('http://localhost:3434/api/harness/sleep/status');
      if (!response.ok) throw new Error('Failed to fetch sleep status');

      const result = await response.json();
      this.sleepStatus = result.data;
      this.updateUI();
    } catch (error) {
      console.error('Failed to fetch sleep status:', error);
    }
  }

  async loadConfig() {
    try {
      const response = await fetch('http://localhost:3434/api/harness/sleep/config');
      if (!response.ok) throw new Error('Failed to load config');

      const result = await response.json();
      const config = result.data;

      // Update timeout display
      const timeoutMinutes = Math.floor(config.sleepTimeoutMs / 60000);
      document.getElementById('sleep-timeout-text').textContent = `${timeoutMinutes} minutes`;

      // Update form if modal exists
      if (document.getElementById('sleep-timeout-input')) {
        document.getElementById('sleep-timeout-input').value = timeoutMinutes;
        document.getElementById('enable-user-access-wake').checked = config.enableUserAccessWake;
        document.getElementById('enable-checkback-wake').checked = config.enableCheckbackWake;
        document.getElementById('enable-scheduled-wake').checked = config.enableScheduledWake || false;
      }
    } catch (error) {
      console.error('Failed to load sleep config:', error);
    }
  }

  updateUI() {
    if (!this.sleepStatus) return;

    const badge = document.getElementById('sleep-status-badge');
    const stateText = document.getElementById('sleep-state-text');
    const lastActivityText = document.getElementById('last-activity-text');

    if (this.sleepStatus.isSleeping) {
      badge.className = 'sleep-status-badge sleeping';
      badge.textContent = 'Sleeping';
      stateText.textContent = 'Harness is in sleep mode';

      const sleepDuration = Date.now() - new Date(this.sleepStatus.sleepStartTime).getTime();
      lastActivityText.textContent = `Sleeping for ${this.formatDuration(sleepDuration)}`;
    } else {
      badge.className = 'sleep-status-badge awake';
      badge.textContent = 'Awake';
      stateText.textContent = 'Harness is active';

      const inactiveTime = Date.now() - this.sleepStatus.lastActivityTime;
      lastActivityText.textContent = this.formatDuration(inactiveTime) + ' ago';
    }
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  }

  async forceWake() {
    try {
      const response = await fetch('http://localhost:3434/api/harness/sleep/wake', {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Failed to wake harness');

      const result = await response.json();
      this.showNotification('Harness wake signal sent', 'success');

      // Refresh status immediately
      setTimeout(() => this.fetchStatus(), 1000);
    } catch (error) {
      console.error('Failed to wake harness:', error);
      this.showNotification('Failed to wake harness', 'error');
    }
  }

  async forceSleep() {
    try {
      const response = await fetch('http://localhost:3434/api/harness/sleep/force-sleep', {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Failed to sleep harness');

      const result = await response.json();
      this.showNotification('Harness forced into sleep mode', 'success');

      // Refresh status immediately
      setTimeout(() => this.fetchStatus(), 1000);
    } catch (error) {
      console.error('Failed to sleep harness:', error);
      this.showNotification('Failed to put harness to sleep', 'error');
    }
  }

  openConfigModal() {
    const modal = document.getElementById('sleep-config-modal');
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  async saveConfig() {
    try {
      const timeoutMinutes = parseInt(document.getElementById('sleep-timeout-input').value);
      const config = {
        sleepTimeoutMs: timeoutMinutes * 60000,
        enableUserAccessWake: document.getElementById('enable-user-access-wake').checked,
        enableCheckbackWake: document.getElementById('enable-checkback-wake').checked,
        enableScheduledWake: document.getElementById('enable-scheduled-wake').checked
      };

      const response = await fetch('http://localhost:3434/api/harness/sleep/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (!response.ok) throw new Error('Failed to save config');

      this.showNotification('Sleep configuration saved', 'success');
      this.closeSleepConfigModal();

      // Reload config
      this.loadConfig();
    } catch (error) {
      console.error('Failed to save sleep config:', error);
      this.showNotification('Failed to save configuration', 'error');
    }
  }

  closeSleepConfigModal() {
    const modal = document.getElementById('sleep-config-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  showNotification(message, type = 'info') {
    // Use existing notification system if available
    if (window.showInfo && type === 'info') {
      window.showInfo(message);
    } else if (window.showErrorToast && type === 'error') {
      window.showErrorToast(message);
    } else if (window.showWarning && type === 'warning') {
      window.showWarning(message);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  destroy() {
    this.stopPolling();
  }
}

// Global function to close modal (called from HTML onclick)
function closeSleepConfigModal() {
  if (window.sleepControlWidget) {
    window.sleepControlWidget.closeSleepConfigModal();
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('sleep-control-widget')) {
      window.sleepControlWidget = new SleepControlWidget();
    }
  });
} else {
  if (document.getElementById('sleep-control-widget')) {
    window.sleepControlWidget = new SleepControlWidget();
  }
}
