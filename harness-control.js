/**
 * Harness Control Panel Component
 * UI for controlling and monitoring agent harnesses
 */

class HarnessControlPanel {
  constructor(containerId = 'harness-control-panel') {
    this.container = document.getElementById(containerId);
    this.currentProjectId = null;
    this.status = { status: 'idle' };
    this.autoScroll = true;
    this.logsPaused = false;
    
    if (!this.container) {
      console.warn(`Container #${containerId} not found`);
      return;
    }
    
    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
    this.setupClient();
    this.loadSettings();
  }

  setupClient() {
    // Connect to harness server
    harnessClient.connect();

    // Listen for events
    harnessClient.on('connected', () => {
      this.updateConnectionStatus(true);
    });

    harnessClient.on('disconnected', () => {
      this.updateConnectionStatus(false);
    });

    harnessClient.on('harness:started', (data) => {
      this.status = { ...this.status, status: 'running', ...data };
      this.updateUI();
      this.showNotification('Harness started', 'success');
    });

    harnessClient.on('harness:stopped', (data) => {
      this.status = { ...this.status, status: 'idle', ...data };
      this.updateUI();
      this.showNotification('Harness stopped', 'info');
    });

    harnessClient.on('harness:error', (data) => {
      this.status = { ...this.status, status: 'error', error: data.error };
      this.updateUI();
      this.showNotification(`Error: ${data.error}`, 'error');
    });

    harnessClient.on('log', (entry) => {
      if (!this.logsPaused) {
        this.appendLog(entry);
      }
    });

    harnessClient.on('features:updated', (data) => {
      this.updateProgress(data);
    });

    // Poll for initial status
    this.pollStatus();
  }

  render() {
    this.container.innerHTML = `
      <div class="harness-panel">
        <div class="harness-header">
          <h3>
            <span class="harness-icon">🤖</span>
            Agent Harness Control
          </h3>
          <div class="connection-status" id="connection-status">
            <span class="status-dot disconnected"></span>
            <span>Disconnected</span>
          </div>
        </div>
        
        <div class="harness-status-bar" id="harness-status-bar">
          <div class="status-indicator">
            <span class="status-dot idle" id="harness-status-dot"></span>
            <span id="harness-status-text">Idle</span>
          </div>
          <div class="session-info" id="session-info">
            <span id="session-number">Session: --</span>
            <span id="session-type">Type: --</span>
          </div>
        </div>
        
        <div class="harness-progress" id="harness-progress">
          <div class="progress-stats">
            <span id="features-passing">0</span>
            <span class="progress-divider">/</span>
            <span id="features-total">0</span>
            <span class="progress-label">features</span>
            <span class="progress-percent" id="progress-percent">(0%)</span>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar" id="harness-progress-bar" style="width: 0%"></div>
          </div>
        </div>
        
        <div class="harness-controls">
          <div class="control-row">
            <button class="btn btn-success" id="btn-start-harness" title="Start Harness">
              <span class="btn-icon">▶</span> Start
            </button>
            <button class="btn btn-danger" id="btn-stop-harness" disabled title="Stop Harness">
              <span class="btn-icon">⏹</span> Stop
            </button>
            <button class="btn btn-secondary" id="btn-settings" title="Settings">
              <span class="btn-icon">⚙</span>
            </button>
          </div>
          
          <div class="control-options">
            <label class="checkbox-label">
              <input type="checkbox" id="continuous-mode"> Continuous Mode
            </label>
            <div class="input-group">
              <label>Max Sessions:</label>
              <input type="number" id="max-sessions" value="100" min="1" max="1000">
            </div>
          </div>
        </div>
        
        <div class="harness-logs">
          <div class="logs-header">
            <h4>Session Logs</h4>
            <div class="logs-controls">
              <button class="btn-small" id="btn-pause-logs" title="Pause logs">⏸</button>
              <button class="btn-small" id="btn-clear-logs" title="Clear logs">🗑</button>
              <label class="checkbox-label small">
                <input type="checkbox" id="auto-scroll" checked> Auto-scroll
              </label>
            </div>
          </div>
          <div class="logs-container" id="logs-container">
            <div class="logs-empty">No logs yet. Start the harness to see output.</div>
          </div>
        </div>
        
        <div class="harness-settings-modal" id="settings-modal" style="display: none;">
          <div class="modal-content">
            <h4>Harness Settings</h4>
            <div class="form-group">
              <label>Project Path:</label>
              <input type="text" id="project-path" placeholder="/path/to/project">
            </div>
            <div class="form-group">
              <label>Session Delay (ms):</label>
              <input type="number" id="session-delay" value="5000" min="1000">
            </div>
            <div class="modal-actions">
              <button class="btn btn-secondary" id="btn-cancel-settings">Cancel</button>
              <button class="btn btn-primary" id="btn-save-settings">Save</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.addStyles();
  }

  addStyles() {
    if (document.getElementById('harness-panel-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'harness-panel-styles';
    styles.textContent = `
      .harness-panel {
        background: var(--color-surface, #1a2234);
        border-radius: 12px;
        padding: 1.25rem;
        border: 1px solid var(--color-border, rgba(148, 163, 184, 0.1));
      }
      
      .harness-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }
      
      .harness-header h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      
      .harness-icon {
        font-size: 1.25rem;
      }
      
      .connection-status {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.75rem;
        color: var(--color-text-muted, #94a3b8);
      }
      
      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        display: inline-block;
      }
      
      .status-dot.connected { background: #10b981; }
      .status-dot.disconnected { background: #ef4444; }
      .status-dot.idle { background: #6b7280; }
      .status-dot.running { background: #10b981; animation: pulse 1.5s infinite; }
      .status-dot.stopping { background: #f59e0b; }
      .status-dot.error { background: #ef4444; }
      
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      
      .harness-status-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 1rem;
        background: rgba(99, 102, 241, 0.1);
        border-radius: 8px;
        margin-bottom: 1rem;
      }
      
      .status-indicator {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 600;
      }
      
      .session-info {
        display: flex;
        gap: 1rem;
        font-size: 0.85rem;
        color: var(--color-text-muted, #94a3b8);
      }
      
      .harness-progress {
        margin-bottom: 1rem;
      }
      
      .progress-stats {
        display: flex;
        align-items: baseline;
        gap: 0.25rem;
        margin-bottom: 0.5rem;
      }
      
      #features-passing {
        font-size: 1.5rem;
        font-weight: 700;
        color: #10b981;
      }
      
      .progress-divider {
        color: var(--color-text-muted, #94a3b8);
      }
      
      #features-total {
        font-size: 1.25rem;
        font-weight: 600;
      }
      
      .progress-label {
        color: var(--color-text-muted, #94a3b8);
        margin-left: 0.5rem;
      }
      
      .progress-percent {
        color: var(--color-text-muted, #94a3b8);
        font-size: 0.875rem;
      }
      
      .progress-bar-container {
        height: 8px;
        background: rgba(148, 163, 184, 0.2);
        border-radius: 4px;
        overflow: hidden;
      }
      
      .progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #6366f1, #8b5cf6);
        border-radius: 4px;
        transition: width 0.5s ease;
      }
      
      .harness-controls {
        margin-bottom: 1rem;
      }
      
      .control-row {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
      }
      
      .btn {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        transition: all 0.2s;
      }
      
      .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .btn-success {
        background: #10b981;
        color: white;
      }
      
      .btn-success:hover:not(:disabled) {
        background: #059669;
      }
      
      .btn-danger {
        background: #ef4444;
        color: white;
      }
      
      .btn-danger:hover:not(:disabled) {
        background: #dc2626;
      }
      
      .btn-secondary {
        background: rgba(148, 163, 184, 0.2);
        color: var(--color-text, #f1f5f9);
      }
      
      .btn-secondary:hover:not(:disabled) {
        background: rgba(148, 163, 184, 0.3);
      }
      
      .btn-primary {
        background: #6366f1;
        color: white;
      }
      
      .btn-primary:hover:not(:disabled) {
        background: #4f46e5;
      }
      
      .control-options {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        font-size: 0.85rem;
      }
      
      .checkbox-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
      }
      
      .checkbox-label.small {
        font-size: 0.75rem;
      }
      
      .input-group {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      
      .input-group input {
        width: 80px;
        padding: 0.25rem 0.5rem;
        border: 1px solid rgba(148, 163, 184, 0.2);
        border-radius: 4px;
        background: rgba(0, 0, 0, 0.2);
        color: var(--color-text, #f1f5f9);
        font-size: 0.85rem;
      }
      
      .harness-logs {
        border-top: 1px solid var(--color-border, rgba(148, 163, 184, 0.1));
        padding-top: 1rem;
      }
      
      .logs-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
      }
      
      .logs-header h4 {
        margin: 0;
        font-size: 0.875rem;
        font-weight: 600;
      }
      
      .logs-controls {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      
      .btn-small {
        padding: 0.25rem 0.5rem;
        font-size: 0.75rem;
        border: none;
        background: rgba(148, 163, 184, 0.2);
        border-radius: 4px;
        cursor: pointer;
      }
      
      .btn-small:hover {
        background: rgba(148, 163, 184, 0.3);
      }
      
      .logs-container {
        height: 200px;
        overflow-y: auto;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 6px;
        padding: 0.75rem;
        font-family: var(--font-family-mono, 'JetBrains Mono', monospace);
        font-size: 0.75rem;
        line-height: 1.5;
      }
      
      .logs-empty {
        color: var(--color-text-muted, #94a3b8);
        text-align: center;
        padding: 2rem;
      }
      
      .log-entry {
        display: flex;
        gap: 0.75rem;
        margin-bottom: 0.25rem;
      }
      
      .log-time {
        color: #6b7280;
        flex-shrink: 0;
      }
      
      .log-message {
        word-break: break-word;
      }
      
      .log-message.error {
        color: #ef4444;
      }
      
      .log-message.success {
        color: #10b981;
      }
      
      .log-message.info {
        color: #3b82f6;
      }
      
      .harness-settings-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }
      
      .modal-content {
        background: var(--color-surface, #1a2234);
        border-radius: 12px;
        padding: 1.5rem;
        width: 400px;
        max-width: 90vw;
        border: 1px solid var(--color-border, rgba(148, 163, 184, 0.1));
      }
      
      .modal-content h4 {
        margin: 0 0 1rem 0;
      }
      
      .form-group {
        margin-bottom: 1rem;
      }
      
      .form-group label {
        display: block;
        margin-bottom: 0.25rem;
        font-size: 0.85rem;
        color: var(--color-text-muted, #94a3b8);
      }
      
      .form-group input {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid rgba(148, 163, 184, 0.2);
        border-radius: 6px;
        background: rgba(0, 0, 0, 0.2);
        color: var(--color-text, #f1f5f9);
      }
      
      .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        margin-top: 1.5rem;
      }
      
      .notification {
        position: fixed;
        bottom: 1rem;
        right: 1rem;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        font-size: 0.875rem;
        animation: slideIn 0.3s ease;
        z-index: 1001;
      }
      
      .notification.success {
        background: #10b981;
        color: white;
      }
      
      .notification.error {
        background: #ef4444;
        color: white;
      }
      
      .notification.info {
        background: #3b82f6;
        color: white;
      }
      
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    
    document.head.appendChild(styles);
  }

  bindEvents() {
    // Start button
    document.getElementById('btn-start-harness')?.addEventListener('click', () => {
      this.startHarness();
    });

    // Stop button
    document.getElementById('btn-stop-harness')?.addEventListener('click', () => {
      this.stopHarness();
    });

    // Settings button
    document.getElementById('btn-settings')?.addEventListener('click', () => {
      document.getElementById('settings-modal').style.display = 'flex';
    });

    // Cancel settings
    document.getElementById('btn-cancel-settings')?.addEventListener('click', () => {
      document.getElementById('settings-modal').style.display = 'none';
    });

    // Save settings
    document.getElementById('btn-save-settings')?.addEventListener('click', () => {
      this.saveSettings();
    });

    // Pause logs
    document.getElementById('btn-pause-logs')?.addEventListener('click', () => {
      this.logsPaused = !this.logsPaused;
      const btn = document.getElementById('btn-pause-logs');
      btn.textContent = this.logsPaused ? '▶' : '⏸';
      btn.title = this.logsPaused ? 'Resume logs' : 'Pause logs';
    });

    // Clear logs
    document.getElementById('btn-clear-logs')?.addEventListener('click', () => {
      harnessClient.clearLogs();
      document.getElementById('logs-container').innerHTML = 
        '<div class="logs-empty">Logs cleared. Waiting for new output.</div>';
    });

    // Auto-scroll toggle
    document.getElementById('auto-scroll')?.addEventListener('change', (e) => {
      this.autoScroll = e.target.checked;
    });

    // Continuous mode toggle - persist to localStorage
    document.getElementById('continuous-mode')?.addEventListener('change', (e) => {
      localStorage.setItem('harness-continuous-mode', e.target.checked);
    });

    // Max sessions - persist to localStorage
    document.getElementById('max-sessions')?.addEventListener('change', (e) => {
      localStorage.setItem('harness-max-sessions', e.target.value);
    });
  }

  async startHarness() {
    const projectPath = document.getElementById('project-path')?.value || 
      '/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard';
    const continuous = document.getElementById('continuous-mode')?.checked || false;
    const maxSessions = parseInt(document.getElementById('max-sessions')?.value) || 100;

    try {
      // Use a default project ID or create one
      const projectId = this.currentProjectId || 'default-project';
      
      this.updateUI({ status: 'starting' });
      
      await harnessClient.startHarness(projectId, {
        projectPath,
        continuous,
        maxSessions,
      });
      
      this.currentProjectId = projectId;
      
    } catch (error) {
      this.showNotification(`Failed to start: ${error.message}`, 'error');
      this.updateUI({ status: 'error', error: error.message });
    }
  }

  async stopHarness() {
    if (!this.currentProjectId) return;
    
    try {
      this.updateUI({ status: 'stopping' });
      await harnessClient.stopHarness(this.currentProjectId);
    } catch (error) {
      this.showNotification(`Failed to stop: ${error.message}`, 'error');
    }
  }

  loadSettings() {
    // Load continuous mode preference from localStorage
    const continuousMode = localStorage.getItem('harness-continuous-mode');
    if (continuousMode !== null) {
      const checkbox = document.getElementById('continuous-mode');
      if (checkbox) {
        checkbox.checked = continuousMode === 'true';
      }
    }

    // Load max sessions preference from localStorage
    const maxSessions = localStorage.getItem('harness-max-sessions');
    if (maxSessions !== null) {
      const input = document.getElementById('max-sessions');
      if (input) {
        input.value = maxSessions;
      }
    }
  }

  saveSettings() {
    // Settings are read directly from inputs when starting
    document.getElementById('settings-modal').style.display = 'none';
    this.showNotification('Settings saved', 'success');
  }

  async pollStatus() {
    if (!this.currentProjectId) return;
    
    try {
      const status = await harnessClient.getStatus(this.currentProjectId);
      this.status = status;
      this.updateUI();
    } catch (error) {
      console.warn('Failed to poll status:', error);
    }
  }

  updateUI(overrides = {}) {
    const status = { ...this.status, ...overrides };
    
    // Update status dot and text
    const statusDot = document.getElementById('harness-status-dot');
    const statusText = document.getElementById('harness-status-text');
    
    if (statusDot) {
      statusDot.className = `status-dot ${status.status}`;
    }
    
    if (statusText) {
      const statusLabels = {
        idle: 'Idle',
        running: 'Running',
        stopping: 'Stopping...',
        starting: 'Starting...',
        error: 'Error',
      };
      statusText.textContent = statusLabels[status.status] || status.status;
    }
    
    // Update session info
    const sessionNumber = document.getElementById('session-number');
    const sessionType = document.getElementById('session-type');
    
    if (sessionNumber) {
      sessionNumber.textContent = `Session: ${status.sessionNumber || '--'}`;
    }
    
    if (sessionType) {
      sessionType.textContent = `Type: ${status.sessionType || '--'}`;
    }
    
    // Update buttons
    const startBtn = document.getElementById('btn-start-harness');
    const stopBtn = document.getElementById('btn-stop-harness');
    
    if (startBtn) {
      startBtn.disabled = status.status === 'running' || status.status === 'starting';
    }
    
    if (stopBtn) {
      stopBtn.disabled = status.status !== 'running';
    }
  }

  updateProgress(data) {
    const passing = data.passing || 0;
    const total = data.total || 0;
    const percent = total > 0 ? ((passing / total) * 100).toFixed(1) : 0;
    
    document.getElementById('features-passing').textContent = passing;
    document.getElementById('features-total').textContent = total;
    document.getElementById('progress-percent').textContent = `(${percent}%)`;
    document.getElementById('harness-progress-bar').style.width = `${percent}%`;
  }

  updateConnectionStatus(connected) {
    const indicator = document.getElementById('connection-status');
    if (indicator) {
      indicator.innerHTML = connected
        ? '<span class="status-dot connected"></span><span>Connected</span>'
        : '<span class="status-dot disconnected"></span><span>Disconnected</span>';
    }
  }

  appendLog(entry) {
    const container = document.getElementById('logs-container');
    if (!container) return;
    
    // Remove empty state message
    const emptyMsg = container.querySelector('.logs-empty');
    if (emptyMsg) emptyMsg.remove();
    
    // Determine log type for styling
    let logClass = '';
    if (entry.line.includes('[ERROR]') || entry.line.includes('error')) {
      logClass = 'error';
    } else if (entry.line.includes('✓') || entry.line.includes('✅') || entry.line.includes('success')) {
      logClass = 'success';
    } else if (entry.line.includes('Starting') || entry.line.includes('Session')) {
      logClass = 'info';
    }
    
    const logEl = document.createElement('div');
    logEl.className = 'log-entry';
    logEl.innerHTML = `
      <span class="log-time">${entry.timestamp}</span>
      <span class="log-message ${logClass}">${this.escapeHtml(entry.line)}</span>
    `;
    
    container.appendChild(logEl);
    
    // Auto-scroll
    if (this.autoScroll) {
      container.scrollTop = container.scrollHeight;
    }
    
    // Limit displayed logs
    while (container.children.length > 500) {
      container.removeChild(container.firstChild);
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Only init if container exists
  if (document.getElementById('harness-control-panel')) {
    window.harnessPanel = new HarnessControlPanel();
  }
});
