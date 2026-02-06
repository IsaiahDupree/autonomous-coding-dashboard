/**
 * Parallel Feature Execution Widget (feat-049)
 * Run multiple features simultaneously with resource limiting and conflict detection.
 */

class ParallelExec {
  constructor(containerId = 'parallel-exec-widget') {
    this.container = document.getElementById(containerId);
    this.API_BASE = 'http://localhost:3434';

    // State
    this.config = {
      maxConcurrent: 3,
      cpuLimitPercent: 80,
      memoryLimitMb: 4096,
      enableConflictDetection: true,
      autoResolveConflicts: false,
      isolationMode: 'directory' // directory | branch | container
    };
    this.slots = []; // Active execution slots
    this.queue = []; // Features queued for execution
    this.conflicts = []; // Detected conflicts
    this.executionLog = []; // Execution event history
    this.resourceUsage = { cpu: 0, memory: 0, activeSlots: 0 };

    if (!this.container) {
      console.warn(`Container #${containerId} not found`);
      return;
    }

    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
    this.loadConfig();
    this.loadStatus();
    this.refreshInterval = setInterval(() => this.loadStatus(), 10000);
  }

  render() {
    this.container.innerHTML = `
      <div class="pe-widget">
        <div class="pe-header">
          <h2 class="pe-title">⚡ Parallel Feature Execution</h2>
          <div class="pe-header-actions">
            <button class="pe-btn pe-btn-icon" id="pe-refresh-btn" title="Refresh">🔄</button>
            <button class="pe-btn pe-btn-primary" id="pe-start-btn">▶ Start Parallel</button>
            <button class="pe-btn pe-btn-danger" id="pe-stop-btn" disabled>⏹ Stop All</button>
          </div>
        </div>

        <!-- Summary Cards -->
        <div class="pe-summary">
          <div class="pe-stat-card">
            <div class="pe-stat-value" id="pe-active-count">0</div>
            <div class="pe-stat-label">Active Slots</div>
          </div>
          <div class="pe-stat-card">
            <div class="pe-stat-value" id="pe-queued-count">0</div>
            <div class="pe-stat-label">Queued</div>
          </div>
          <div class="pe-stat-card">
            <div class="pe-stat-value" id="pe-completed-count">0</div>
            <div class="pe-stat-label">Completed</div>
          </div>
          <div class="pe-stat-card">
            <div class="pe-stat-value" id="pe-conflicts-count">0</div>
            <div class="pe-stat-label">Conflicts</div>
          </div>
        </div>

        <!-- Main Layout -->
        <div class="pe-main-layout">
          <!-- Left: Configuration & Resource Limits -->
          <div class="pe-config-panel">
            <h3 class="pe-section-title">Configuration</h3>

            <div class="pe-config-group">
              <label class="pe-label">Max Concurrent Slots</label>
              <div class="pe-range-row">
                <input type="range" class="pe-slider" id="pe-max-concurrent" min="1" max="8" value="3">
                <span class="pe-range-value" id="pe-max-concurrent-val">3</span>
              </div>
            </div>

            <div class="pe-config-group">
              <label class="pe-label">CPU Limit (%)</label>
              <div class="pe-range-row">
                <input type="range" class="pe-slider" id="pe-cpu-limit" min="20" max="100" step="5" value="80">
                <span class="pe-range-value" id="pe-cpu-limit-val">80%</span>
              </div>
            </div>

            <div class="pe-config-group">
              <label class="pe-label">Memory Limit (MB)</label>
              <div class="pe-range-row">
                <input type="range" class="pe-slider" id="pe-memory-limit" min="512" max="16384" step="512" value="4096">
                <span class="pe-range-value" id="pe-memory-limit-val">4096 MB</span>
              </div>
            </div>

            <div class="pe-config-group">
              <label class="pe-label">Isolation Mode</label>
              <select class="pe-select" id="pe-isolation-mode">
                <option value="directory">Directory Isolation</option>
                <option value="branch">Git Branch Isolation</option>
                <option value="container">Container Isolation</option>
              </select>
            </div>

            <div class="pe-config-group pe-toggle-row">
              <label class="pe-label">Conflict Detection</label>
              <label class="pe-switch">
                <input type="checkbox" id="pe-conflict-detection" checked>
                <span class="pe-switch-slider"></span>
              </label>
            </div>

            <div class="pe-config-group pe-toggle-row">
              <label class="pe-label">Auto-Resolve Conflicts</label>
              <label class="pe-switch">
                <input type="checkbox" id="pe-auto-resolve">
                <span class="pe-switch-slider"></span>
              </label>
            </div>

            <button class="pe-btn pe-btn-primary pe-btn-full" id="pe-save-config-btn">Save Configuration</button>

            <!-- Resource Usage -->
            <h3 class="pe-section-title" style="margin-top: 16px;">Resource Usage</h3>
            <div class="pe-resource-bars">
              <div class="pe-resource-item">
                <div class="pe-resource-header">
                  <span>CPU</span>
                  <span id="pe-cpu-usage">0%</span>
                </div>
                <div class="pe-progress-bar">
                  <div class="pe-progress-fill pe-progress-cpu" id="pe-cpu-bar" style="width: 0%"></div>
                </div>
              </div>
              <div class="pe-resource-item">
                <div class="pe-resource-header">
                  <span>Memory</span>
                  <span id="pe-memory-usage">0 MB</span>
                </div>
                <div class="pe-progress-bar">
                  <div class="pe-progress-fill pe-progress-memory" id="pe-memory-bar" style="width: 0%"></div>
                </div>
              </div>
              <div class="pe-resource-item">
                <div class="pe-resource-header">
                  <span>Slots</span>
                  <span id="pe-slots-usage">0 / 3</span>
                </div>
                <div class="pe-progress-bar">
                  <div class="pe-progress-fill pe-progress-slots" id="pe-slots-bar" style="width: 0%"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Center: Execution Slots -->
          <div class="pe-slots-panel">
            <h3 class="pe-section-title">Execution Slots</h3>
            <div class="pe-slots-grid" id="pe-slots-grid">
              <div class="pe-empty-state">No active execution slots. Click "Start Parallel" to begin.</div>
            </div>

            <!-- Feature Queue -->
            <h3 class="pe-section-title" style="margin-top: 16px;">Feature Queue</h3>
            <div class="pe-queue-list" id="pe-queue-list">
              <div class="pe-empty-state">No features queued.</div>
            </div>
            <div class="pe-queue-actions">
              <button class="pe-btn" id="pe-add-queue-btn">+ Add Features to Queue</button>
              <button class="pe-btn" id="pe-clear-queue-btn">Clear Queue</button>
            </div>
          </div>

          <!-- Right: Conflicts & Log -->
          <div class="pe-conflicts-panel">
            <h3 class="pe-section-title">Conflict Detection</h3>
            <div class="pe-conflicts-list" id="pe-conflicts-list">
              <div class="pe-empty-state">No conflicts detected.</div>
            </div>

            <h3 class="pe-section-title" style="margin-top: 16px;">Execution Log</h3>
            <div class="pe-exec-log" id="pe-exec-log">
              <div class="pe-empty-state">No execution events yet.</div>
            </div>
            <button class="pe-btn pe-btn-full" id="pe-clear-log-btn" style="margin-top: 8px;">Clear Log</button>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // Header buttons
    document.getElementById('pe-refresh-btn').addEventListener('click', () => this.loadStatus());
    document.getElementById('pe-start-btn').addEventListener('click', () => this.startParallel());
    document.getElementById('pe-stop-btn').addEventListener('click', () => this.stopAll());

    // Configuration sliders
    const maxConcurrent = document.getElementById('pe-max-concurrent');
    maxConcurrent.addEventListener('input', (e) => {
      document.getElementById('pe-max-concurrent-val').textContent = e.target.value;
      this.config.maxConcurrent = parseInt(e.target.value);
    });

    const cpuLimit = document.getElementById('pe-cpu-limit');
    cpuLimit.addEventListener('input', (e) => {
      document.getElementById('pe-cpu-limit-val').textContent = e.target.value + '%';
      this.config.cpuLimitPercent = parseInt(e.target.value);
    });

    const memoryLimit = document.getElementById('pe-memory-limit');
    memoryLimit.addEventListener('input', (e) => {
      document.getElementById('pe-memory-limit-val').textContent = e.target.value + ' MB';
      this.config.memoryLimitMb = parseInt(e.target.value);
    });

    const isolationMode = document.getElementById('pe-isolation-mode');
    isolationMode.addEventListener('change', (e) => {
      this.config.isolationMode = e.target.value;
    });

    document.getElementById('pe-conflict-detection').addEventListener('change', (e) => {
      this.config.enableConflictDetection = e.target.checked;
    });

    document.getElementById('pe-auto-resolve').addEventListener('change', (e) => {
      this.config.autoResolveConflicts = e.target.checked;
    });

    // Save config
    document.getElementById('pe-save-config-btn').addEventListener('click', () => this.saveConfig());

    // Queue actions
    document.getElementById('pe-add-queue-btn').addEventListener('click', () => this.showAddQueueDialog());
    document.getElementById('pe-clear-queue-btn').addEventListener('click', () => this.clearQueue());

    // Clear log
    document.getElementById('pe-clear-log-btn').addEventListener('click', () => this.clearLog());
  }

  async loadConfig() {
    try {
      const res = await fetch(`${this.API_BASE}/api/parallel-exec/config`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          this.config = { ...this.config, ...data.data };
          this.updateConfigUI();
        }
      }
    } catch (e) {
      console.warn('Could not load parallel exec config:', e.message);
    }
  }

  updateConfigUI() {
    const mc = document.getElementById('pe-max-concurrent');
    mc.value = this.config.maxConcurrent;
    document.getElementById('pe-max-concurrent-val').textContent = this.config.maxConcurrent;

    const cl = document.getElementById('pe-cpu-limit');
    cl.value = this.config.cpuLimitPercent;
    document.getElementById('pe-cpu-limit-val').textContent = this.config.cpuLimitPercent + '%';

    const ml = document.getElementById('pe-memory-limit');
    ml.value = this.config.memoryLimitMb;
    document.getElementById('pe-memory-limit-val').textContent = this.config.memoryLimitMb + ' MB';

    document.getElementById('pe-isolation-mode').value = this.config.isolationMode;
    document.getElementById('pe-conflict-detection').checked = this.config.enableConflictDetection;
    document.getElementById('pe-auto-resolve').checked = this.config.autoResolveConflicts;
  }

  async saveConfig() {
    try {
      const res = await fetch(`${this.API_BASE}/api/parallel-exec/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.config)
      });
      if (res.ok) {
        this.addLogEntry('config_updated', 'Configuration saved');
      }
    } catch (e) {
      console.warn('Could not save config:', e.message);
    }
  }

  async loadStatus() {
    try {
      const res = await fetch(`${this.API_BASE}/api/parallel-exec/status`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          this.slots = data.data.slots || [];
          this.queue = data.data.queue || [];
          this.conflicts = data.data.conflicts || [];
          this.executionLog = data.data.log || [];
          this.resourceUsage = data.data.resources || { cpu: 0, memory: 0, activeSlots: 0 };
          this.updateUI();
        }
      }
    } catch (e) {
      console.warn('Could not load parallel exec status:', e.message);
    }
  }

  updateUI() {
    this.updateSummary();
    this.updateResourceBars();
    this.updateSlots();
    this.updateQueue();
    this.updateConflicts();
    this.updateLog();
    this.updateButtons();
  }

  updateSummary() {
    const active = this.slots.filter(s => s.status === 'running').length;
    const completed = this.slots.filter(s => s.status === 'completed').length +
      this.executionLog.filter(e => e.type === 'completed').length;

    document.getElementById('pe-active-count').textContent = active;
    document.getElementById('pe-queued-count').textContent = this.queue.length;
    document.getElementById('pe-completed-count').textContent = completed;
    document.getElementById('pe-conflicts-count').textContent = this.conflicts.length;
  }

  updateResourceBars() {
    const cpu = this.resourceUsage.cpu || 0;
    const memory = this.resourceUsage.memory || 0;
    const activeSlots = this.slots.filter(s => s.status === 'running').length;
    const maxSlots = this.config.maxConcurrent;

    document.getElementById('pe-cpu-usage').textContent = cpu + '%';
    document.getElementById('pe-cpu-bar').style.width = cpu + '%';
    document.getElementById('pe-cpu-bar').className = `pe-progress-fill pe-progress-cpu ${cpu > this.config.cpuLimitPercent ? 'pe-progress-warn' : ''}`;

    const memPercent = this.config.memoryLimitMb > 0 ? Math.min(100, (memory / this.config.memoryLimitMb) * 100) : 0;
    document.getElementById('pe-memory-usage').textContent = memory + ' MB';
    document.getElementById('pe-memory-bar').style.width = memPercent + '%';
    document.getElementById('pe-memory-bar').className = `pe-progress-fill pe-progress-memory ${memPercent > 90 ? 'pe-progress-warn' : ''}`;

    const slotPercent = maxSlots > 0 ? (activeSlots / maxSlots) * 100 : 0;
    document.getElementById('pe-slots-usage').textContent = `${activeSlots} / ${maxSlots}`;
    document.getElementById('pe-slots-bar').style.width = slotPercent + '%';
  }

  updateSlots() {
    const grid = document.getElementById('pe-slots-grid');
    if (this.slots.length === 0) {
      grid.innerHTML = '<div class="pe-empty-state">No active execution slots. Click "Start Parallel" to begin.</div>';
      return;
    }

    grid.innerHTML = this.slots.map((slot, i) => `
      <div class="pe-slot-card pe-slot-${slot.status}">
        <div class="pe-slot-header">
          <span class="pe-slot-id">Slot #${i + 1}</span>
          <span class="pe-slot-status pe-status-${slot.status}">${slot.status}</span>
        </div>
        <div class="pe-slot-feature">${slot.featureId || 'N/A'}: ${slot.featureName || 'Waiting...'}</div>
        <div class="pe-slot-meta">
          <span>Started: ${slot.startTime ? new Date(slot.startTime).toLocaleTimeString() : '-'}</span>
          <span>PID: ${slot.pid || '-'}</span>
        </div>
        ${slot.status === 'running' ? `
          <div class="pe-slot-progress">
            <div class="pe-progress-bar">
              <div class="pe-progress-fill pe-progress-slot-active" style="width: ${slot.progress || 0}%"></div>
            </div>
          </div>
        ` : ''}
        ${slot.status === 'running' ? `
          <button class="pe-btn pe-btn-sm pe-btn-danger" onclick="window.__parallelExec.stopSlot(${i})">Stop</button>
        ` : ''}
        ${slot.status === 'conflict' ? `
          <div class="pe-slot-conflict">⚠ ${slot.conflictDetails || 'File conflict detected'}</div>
          <button class="pe-btn pe-btn-sm" onclick="window.__parallelExec.resolveConflict(${i})">Resolve</button>
        ` : ''}
      </div>
    `).join('');
  }

  updateQueue() {
    const list = document.getElementById('pe-queue-list');
    if (this.queue.length === 0) {
      list.innerHTML = '<div class="pe-empty-state">No features queued.</div>';
      return;
    }

    list.innerHTML = this.queue.map((item, i) => `
      <div class="pe-queue-item">
        <span class="pe-queue-pos">#${i + 1}</span>
        <span class="pe-queue-feature">${item.featureId}: ${item.featureName || item.description || ''}</span>
        <span class="pe-queue-priority">P${item.priority || '-'}</span>
        <button class="pe-btn pe-btn-sm pe-btn-icon" onclick="window.__parallelExec.removeFromQueue(${i})" title="Remove">✕</button>
      </div>
    `).join('');
  }

  updateConflicts() {
    const list = document.getElementById('pe-conflicts-list');
    if (this.conflicts.length === 0) {
      list.innerHTML = '<div class="pe-empty-state">No conflicts detected.</div>';
      return;
    }

    list.innerHTML = this.conflicts.map((conflict, i) => `
      <div class="pe-conflict-item pe-conflict-${conflict.severity || 'warning'}">
        <div class="pe-conflict-header">
          <span class="pe-conflict-icon">${conflict.severity === 'critical' ? '🔴' : '🟡'}</span>
          <span class="pe-conflict-type">${conflict.type || 'file_conflict'}</span>
          <span class="pe-conflict-time">${conflict.detectedAt ? new Date(conflict.detectedAt).toLocaleTimeString() : ''}</span>
        </div>
        <div class="pe-conflict-details">
          <strong>Features:</strong> ${conflict.features ? conflict.features.join(', ') : 'Unknown'}
        </div>
        <div class="pe-conflict-files">
          <strong>Files:</strong> ${conflict.files ? conflict.files.join(', ') : 'Unknown'}
        </div>
        <div class="pe-conflict-actions">
          <button class="pe-btn pe-btn-sm" onclick="window.__parallelExec.resolveConflictById('${conflict.id}', 'pause')">Pause Later</button>
          <button class="pe-btn pe-btn-sm pe-btn-primary" onclick="window.__parallelExec.resolveConflictById('${conflict.id}', 'merge')">Auto-Merge</button>
          <button class="pe-btn pe-btn-sm pe-btn-danger" onclick="window.__parallelExec.resolveConflictById('${conflict.id}', 'abort')">Abort Conflict</button>
        </div>
      </div>
    `).join('');
  }

  updateLog() {
    const log = document.getElementById('pe-exec-log');
    if (this.executionLog.length === 0) {
      log.innerHTML = '<div class="pe-empty-state">No execution events yet.</div>';
      return;
    }

    const icons = {
      started: '▶',
      completed: '✅',
      failed: '❌',
      conflict: '⚠',
      queued: '📋',
      resource_limit: '🚫',
      config_updated: '⚙',
      stopped: '⏹',
      resolved: '✔'
    };

    log.innerHTML = this.executionLog.slice(-50).reverse().map(entry => `
      <div class="pe-log-entry pe-log-${entry.type}">
        <span class="pe-log-icon">${icons[entry.type] || '•'}</span>
        <span class="pe-log-time">${entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : ''}</span>
        <span class="pe-log-type">${entry.type}</span>
        <span class="pe-log-details">${entry.details || ''}</span>
      </div>
    `).join('');
  }

  updateButtons() {
    const hasRunning = this.slots.some(s => s.status === 'running');
    document.getElementById('pe-start-btn').disabled = hasRunning && this.slots.filter(s => s.status === 'running').length >= this.config.maxConcurrent;
    document.getElementById('pe-stop-btn').disabled = !hasRunning;
  }

  async startParallel() {
    try {
      const res = await fetch(`${this.API_BASE}/api/parallel-exec/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: this.config })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          this.addLogEntry('started', `Started ${data.data.slotsActivated || 0} parallel execution slots`);
          await this.loadStatus();
        }
      }
    } catch (e) {
      console.warn('Could not start parallel execution:', e.message);
    }
  }

  async stopAll() {
    try {
      const res = await fetch(`${this.API_BASE}/api/parallel-exec/stop`, {
        method: 'POST'
      });
      if (res.ok) {
        this.addLogEntry('stopped', 'All execution slots stopped');
        await this.loadStatus();
      }
    } catch (e) {
      console.warn('Could not stop execution:', e.message);
    }
  }

  async stopSlot(index) {
    try {
      const res = await fetch(`${this.API_BASE}/api/parallel-exec/stop-slot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotIndex: index })
      });
      if (res.ok) {
        await this.loadStatus();
      }
    } catch (e) {
      console.warn('Could not stop slot:', e.message);
    }
  }

  async resolveConflict(slotIndex) {
    try {
      const res = await fetch(`${this.API_BASE}/api/parallel-exec/resolve-conflict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotIndex, resolution: 'merge' })
      });
      if (res.ok) {
        await this.loadStatus();
      }
    } catch (e) {
      console.warn('Could not resolve conflict:', e.message);
    }
  }

  async resolveConflictById(conflictId, resolution) {
    try {
      const res = await fetch(`${this.API_BASE}/api/parallel-exec/resolve-conflict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conflictId, resolution })
      });
      if (res.ok) {
        this.addLogEntry('resolved', `Conflict ${conflictId} resolved with ${resolution}`);
        await this.loadStatus();
      }
    } catch (e) {
      console.warn('Could not resolve conflict:', e.message);
    }
  }

  async showAddQueueDialog() {
    try {
      // Fetch available features
      const res = await fetch('/feature_list.json');
      if (!res.ok) return;
      const data = await res.json();
      const features = (data.features || []).filter(f => !f.passes);

      if (features.length === 0) {
        alert('No pending features to add.');
        return;
      }

      // Build a simple selection dialog
      const overlay = document.createElement('div');
      overlay.className = 'pe-dialog-overlay';
      overlay.innerHTML = `
        <div class="pe-dialog">
          <div class="pe-dialog-header">
            <h3>Add Features to Queue</h3>
            <button class="pe-btn pe-btn-icon pe-dialog-close">✕</button>
          </div>
          <div class="pe-dialog-body">
            <div class="pe-dialog-controls">
              <button class="pe-btn pe-btn-sm" id="pe-select-all">Select All</button>
              <button class="pe-btn pe-btn-sm" id="pe-select-none">Select None</button>
              <span class="pe-dialog-count"><span id="pe-selected-count">0</span> selected</span>
            </div>
            <div class="pe-feature-list">
              ${features.map(f => `
                <label class="pe-feature-option">
                  <input type="checkbox" value="${f.id}" data-name="${f.description || f.id}" data-priority="${f.priority || 99}">
                  <span class="pe-feature-id">${f.id}</span>
                  <span class="pe-feature-desc">${f.description || ''}</span>
                  <span class="pe-feature-prio">P${f.priority || '?'}</span>
                </label>
              `).join('')}
            </div>
          </div>
          <div class="pe-dialog-footer">
            <button class="pe-btn pe-dialog-close">Cancel</button>
            <button class="pe-btn pe-btn-primary" id="pe-dialog-add">Add to Queue</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      // Update selected count
      const updateCount = () => {
        const checked = overlay.querySelectorAll('input[type="checkbox"]:checked').length;
        document.getElementById('pe-selected-count').textContent = checked;
      };

      overlay.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.addEventListener('change', updateCount));

      document.getElementById('pe-select-all').addEventListener('click', () => {
        overlay.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
        updateCount();
      });

      document.getElementById('pe-select-none').addEventListener('click', () => {
        overlay.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        updateCount();
      });

      overlay.querySelectorAll('.pe-dialog-close').forEach(btn => {
        btn.addEventListener('click', () => overlay.remove());
      });

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
      });

      document.getElementById('pe-dialog-add').addEventListener('click', async () => {
        const selected = [];
        overlay.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
          selected.push({
            featureId: cb.value,
            featureName: cb.dataset.name,
            priority: parseInt(cb.dataset.priority) || 99
          });
        });

        if (selected.length === 0) return;

        try {
          await fetch(`${this.API_BASE}/api/parallel-exec/queue`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ features: selected })
          });
          this.addLogEntry('queued', `Added ${selected.length} features to queue`);
          await this.loadStatus();
        } catch (e) {
          console.warn('Could not add to queue:', e.message);
        }

        overlay.remove();
      });
    } catch (e) {
      console.warn('Could not show queue dialog:', e.message);
    }
  }

  async clearQueue() {
    try {
      await fetch(`${this.API_BASE}/api/parallel-exec/queue`, {
        method: 'DELETE'
      });
      this.queue = [];
      this.updateQueue();
      this.updateSummary();
    } catch (e) {
      console.warn('Could not clear queue:', e.message);
    }
  }

  async clearLog() {
    try {
      await fetch(`${this.API_BASE}/api/parallel-exec/log`, {
        method: 'DELETE'
      });
      this.executionLog = [];
      this.updateLog();
    } catch (e) {
      console.warn('Could not clear log:', e.message);
    }
  }

  async removeFromQueue(index) {
    try {
      await fetch(`${this.API_BASE}/api/parallel-exec/queue/${index}`, {
        method: 'DELETE'
      });
      await this.loadStatus();
    } catch (e) {
      console.warn('Could not remove from queue:', e.message);
    }
  }

  addLogEntry(type, details) {
    this.executionLog.push({
      type,
      details,
      timestamp: new Date().toISOString()
    });
    this.updateLog();
  }
}

// Expose for inline event handlers
document.addEventListener('DOMContentLoaded', () => {
  window.__parallelExec = new ParallelExec();
});
