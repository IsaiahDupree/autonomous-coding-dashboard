/**
 * Real-Time Log Streaming Widget (feat-051)
 * WebSocket-based log streaming with level filtering and search functionality.
 */

class LogStreaming {
  constructor(containerId = 'log-streaming-widget') {
    this.container = document.getElementById(containerId);
    this.API_BASE = 'http://localhost:3434';

    // State
    this.entries = [];
    this.filteredEntries = [];
    this.levelFilter = 'all';
    this.sourceFilter = 'all';
    this.searchQuery = '';
    this.autoScroll = true;
    this.paused = false;
    this.connected = false;
    this.socket = null;
    this.sources = [];
    this.stats = { total: 0, byLevel: {} };
    this.maxDisplayEntries = 500;

    if (!this.container) {
      console.warn(`Container #${containerId} not found`);
      return;
    }

    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
    this.loadInitialLogs();
    this.connectWebSocket();
    this.refreshInterval = setInterval(() => this.loadStats(), 15000);
  }

  render() {
    this.container.innerHTML = `
      <div class="ls-widget">
        <div class="ls-header">
          <h2 class="ls-title">📡 Real-Time Log Streaming</h2>
          <div class="ls-header-actions">
            <span class="ls-connection-status" id="ls-conn-status">● Disconnected</span>
            <button class="ls-btn ls-btn-icon" id="ls-demo-btn" title="Generate Demo Logs">🎲</button>
            <button class="ls-btn ls-btn-icon" id="ls-clear-btn" title="Clear Logs">🗑️</button>
            <button class="ls-btn ls-btn-icon" id="ls-pause-btn" title="Pause/Resume">⏸️</button>
          </div>
        </div>

        <!-- Stats Bar -->
        <div class="ls-stats-bar" id="ls-stats-bar">
          <div class="ls-stat ls-stat-total">
            <span class="ls-stat-count" id="ls-stat-total">0</span>
            <span class="ls-stat-label">Total</span>
          </div>
          <div class="ls-stat ls-stat-error">
            <span class="ls-stat-count" id="ls-stat-error">0</span>
            <span class="ls-stat-label">Errors</span>
          </div>
          <div class="ls-stat ls-stat-warn">
            <span class="ls-stat-count" id="ls-stat-warn">0</span>
            <span class="ls-stat-label">Warnings</span>
          </div>
          <div class="ls-stat ls-stat-info">
            <span class="ls-stat-count" id="ls-stat-info">0</span>
            <span class="ls-stat-label">Info</span>
          </div>
          <div class="ls-stat ls-stat-debug">
            <span class="ls-stat-count" id="ls-stat-debug">0</span>
            <span class="ls-stat-label">Debug</span>
          </div>
        </div>

        <!-- Filter Controls -->
        <div class="ls-controls">
          <div class="ls-filter-group">
            <label class="ls-filter-label">Level:</label>
            <select id="ls-level-filter" class="ls-select">
              <option value="all">All Levels</option>
              <option value="error">Error</option>
              <option value="warn">Warning</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
              <option value="trace">Trace</option>
            </select>
          </div>
          <div class="ls-filter-group">
            <label class="ls-filter-label">Source:</label>
            <select id="ls-source-filter" class="ls-select">
              <option value="all">All Sources</option>
            </select>
          </div>
          <div class="ls-search-group">
            <input type="text" id="ls-search-input" class="ls-search-input" placeholder="Search logs..." />
            <button class="ls-btn ls-btn-icon ls-search-clear" id="ls-search-clear" title="Clear search">✕</button>
          </div>
          <div class="ls-filter-group">
            <label class="ls-checkbox-label">
              <input type="checkbox" id="ls-auto-scroll" checked /> Auto-scroll
            </label>
          </div>
        </div>

        <!-- Log Output -->
        <div class="ls-log-container" id="ls-log-container">
          <div class="ls-log-output" id="ls-log-output">
            <div class="ls-empty-state" id="ls-empty-state">
              <span class="ls-empty-icon">📋</span>
              <p>No log entries yet. Logs will appear here in real-time.</p>
              <button class="ls-btn ls-btn-primary" id="ls-empty-demo-btn">Generate Demo Logs</button>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="ls-footer">
          <span id="ls-entry-count">0 entries</span>
          <span id="ls-filtered-count"></span>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // Level filter
    const levelFilter = document.getElementById('ls-level-filter');
    if (levelFilter) {
      levelFilter.addEventListener('change', (e) => {
        this.levelFilter = e.target.value;
        this.applyFilters();
      });
    }

    // Source filter
    const sourceFilter = document.getElementById('ls-source-filter');
    if (sourceFilter) {
      sourceFilter.addEventListener('change', (e) => {
        this.sourceFilter = e.target.value;
        this.applyFilters();
      });
    }

    // Search
    const searchInput = document.getElementById('ls-search-input');
    if (searchInput) {
      let debounce;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          this.searchQuery = e.target.value;
          this.applyFilters();
        }, 200);
      });
    }

    const searchClear = document.getElementById('ls-search-clear');
    if (searchClear) {
      searchClear.addEventListener('click', () => {
        const input = document.getElementById('ls-search-input');
        if (input) input.value = '';
        this.searchQuery = '';
        this.applyFilters();
      });
    }

    // Auto-scroll
    const autoScroll = document.getElementById('ls-auto-scroll');
    if (autoScroll) {
      autoScroll.addEventListener('change', (e) => {
        this.autoScroll = e.target.checked;
      });
    }

    // Pause button
    const pauseBtn = document.getElementById('ls-pause-btn');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        this.paused = !this.paused;
        pauseBtn.textContent = this.paused ? '▶️' : '⏸️';
        pauseBtn.title = this.paused ? 'Resume' : 'Pause';
      });
    }

    // Clear button
    const clearBtn = document.getElementById('ls-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearLogs());
    }

    // Demo button
    const demoBtn = document.getElementById('ls-demo-btn');
    if (demoBtn) {
      demoBtn.addEventListener('click', () => this.generateDemo());
    }

    // Empty state demo button
    const emptyDemoBtn = document.getElementById('ls-empty-demo-btn');
    if (emptyDemoBtn) {
      emptyDemoBtn.addEventListener('click', () => this.generateDemo());
    }

    // Detect manual scroll
    const logContainer = document.getElementById('ls-log-container');
    if (logContainer) {
      logContainer.addEventListener('scroll', () => {
        const atBottom = logContainer.scrollTop + logContainer.clientHeight >= logContainer.scrollHeight - 20;
        if (!atBottom && this.autoScroll) {
          // User scrolled up, temporarily disable auto-scroll
        }
      });
    }
  }

  async loadInitialLogs() {
    try {
      const res = await fetch(`${this.API_BASE}/api/logs?limit=200`);
      const data = await res.json();
      if (data.success && data.data.entries) {
        this.entries = data.data.entries;
        if (data.data.sources) {
          this.updateSources(data.data.sources);
        }
        this.applyFilters();
        this.updateStats();
      }
    } catch (e) {
      // API might not be available yet
    }
  }

  async loadStats() {
    try {
      const res = await fetch(`${this.API_BASE}/api/logs/stats`);
      const data = await res.json();
      if (data.success) {
        this.stats = data.data;
        this.updateStatsDisplay();
      }
    } catch (e) {}
  }

  connectWebSocket() {
    // Check if Socket.IO client is available
    if (typeof io === 'undefined') {
      // Load Socket.IO client dynamically
      const script = document.createElement('script');
      script.src = `${this.API_BASE}/socket.io/socket.io.js`;
      script.onload = () => this._initSocket();
      script.onerror = () => {
        this.updateConnectionStatus(false);
      };
      document.head.appendChild(script);
    } else {
      this._initSocket();
    }
  }

  _initSocket() {
    try {
      this.socket = io(this.API_BASE, { transports: ['websocket', 'polling'] });

      this.socket.on('connect', () => {
        this.connected = true;
        this.updateConnectionStatus(true);
        this.socket.emit('subscribe_logs');
      });

      this.socket.on('disconnect', () => {
        this.connected = false;
        this.updateConnectionStatus(false);
      });

      this.socket.on('log_backfill', (entries) => {
        // Merge backfill with existing, avoiding duplicates
        const existingIds = new Set(this.entries.map(e => e.id));
        const newEntries = entries.filter(e => !existingIds.has(e.id));
        this.entries = [...this.entries, ...newEntries];
        this.trimEntries();
        this.applyFilters();
        this.updateStats();
      });

      this.socket.on('log_entry', (entry) => {
        if (this.paused) return;
        this.entries.push(entry);
        this.trimEntries();

        // Update source list if new source
        if (entry.source && !this.sources.includes(entry.source)) {
          this.sources.push(entry.source);
          this.updateSourceSelect();
        }

        // Check if entry matches current filters
        if (this.matchesFilters(entry)) {
          this.filteredEntries.push(entry);
          this.appendLogEntry(entry);
        }

        this.updateStats();
      });

      this.socket.on('log_cleared', () => {
        this.entries = [];
        this.filteredEntries = [];
        this.renderLogEntries();
        this.updateStats();
      });
    } catch (e) {
      this.updateConnectionStatus(false);
    }
  }

  trimEntries() {
    if (this.entries.length > this.maxDisplayEntries) {
      this.entries = this.entries.slice(-this.maxDisplayEntries);
    }
  }

  matchesFilters(entry) {
    // Level filter
    if (this.levelFilter !== 'all') {
      const levels = { error: 0, warn: 1, info: 2, debug: 3, trace: 4 };
      const maxPriority = levels[this.levelFilter] ?? 4;
      if ((levels[entry.level] ?? 4) > maxPriority) return false;
    }

    // Source filter
    if (this.sourceFilter !== 'all' && entry.source !== this.sourceFilter) return false;

    // Search filter
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      if (!entry.message.toLowerCase().includes(q) &&
          !entry.source.toLowerCase().includes(q) &&
          !entry.level.toLowerCase().includes(q)) {
        return false;
      }
    }

    return true;
  }

  applyFilters() {
    this.filteredEntries = this.entries.filter(e => this.matchesFilters(e));
    this.renderLogEntries();
  }

  renderLogEntries() {
    const output = document.getElementById('ls-log-output');
    const emptyState = document.getElementById('ls-empty-state');

    if (!output) return;

    if (this.filteredEntries.length === 0) {
      output.innerHTML = `
        <div class="ls-empty-state" id="ls-empty-state">
          <span class="ls-empty-icon">📋</span>
          <p>${this.entries.length > 0 ? 'No entries match current filters.' : 'No log entries yet. Logs will appear here in real-time.'}</p>
          ${this.entries.length === 0 ? '<button class="ls-btn ls-btn-primary" id="ls-empty-demo-btn">Generate Demo Logs</button>' : ''}
        </div>
      `;
      // Re-bind empty demo button
      const emptyDemoBtn = document.getElementById('ls-empty-demo-btn');
      if (emptyDemoBtn) {
        emptyDemoBtn.addEventListener('click', () => this.generateDemo());
      }
    } else {
      const html = this.filteredEntries.map(entry => this.renderEntry(entry)).join('');
      output.innerHTML = html;

      // Highlight search matches
      if (this.searchQuery) {
        this.highlightSearchMatches(output);
      }
    }

    this.updateFooter();
    this.scrollToBottom();
  }

  renderEntry(entry) {
    const time = this.formatTimestamp(entry.timestamp);
    const levelClass = `ls-level-${entry.level}`;
    const levelBadge = entry.level.toUpperCase().padEnd(5);

    return `<div class="ls-log-entry ${levelClass}" data-id="${entry.id}">` +
      `<span class="ls-entry-time">${this.escapeHtml(time)}</span>` +
      `<span class="ls-entry-level">${this.escapeHtml(levelBadge)}</span>` +
      `<span class="ls-entry-source">[${this.escapeHtml(entry.source)}]</span>` +
      `<span class="ls-entry-message">${this.escapeHtml(entry.message)}</span>` +
      `</div>`;
  }

  appendLogEntry(entry) {
    const output = document.getElementById('ls-log-output');
    if (!output) return;

    // Remove empty state if present
    const emptyState = output.querySelector('.ls-empty-state');
    if (emptyState) emptyState.remove();

    const div = document.createElement('div');
    div.innerHTML = this.renderEntry(entry);
    output.appendChild(div.firstElementChild);

    // Trim DOM nodes if too many
    while (output.children.length > this.maxDisplayEntries) {
      output.removeChild(output.firstChild);
    }

    this.updateFooter();
    this.scrollToBottom();
  }

  scrollToBottom() {
    if (!this.autoScroll) return;
    const container = document.getElementById('ls-log-container');
    if (container) {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  }

  formatTimestamp(ts) {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
        '.' + String(d.getMilliseconds()).padStart(3, '0');
    } catch {
      return ts;
    }
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  highlightSearchMatches(container) {
    if (!this.searchQuery) return;
    const messages = container.querySelectorAll('.ls-entry-message');
    const query = this.searchQuery.toLowerCase();
    messages.forEach(el => {
      const text = el.textContent;
      const lowerText = text.toLowerCase();
      const idx = lowerText.indexOf(query);
      if (idx >= 0) {
        const before = text.slice(0, idx);
        const match = text.slice(idx, idx + this.searchQuery.length);
        const after = text.slice(idx + this.searchQuery.length);
        el.innerHTML = this.escapeHtml(before) +
          `<mark class="ls-highlight">${this.escapeHtml(match)}</mark>` +
          this.escapeHtml(after);
      }
    });
  }

  updateConnectionStatus(connected) {
    const el = document.getElementById('ls-conn-status');
    if (el) {
      el.textContent = connected ? '● Connected' : '● Disconnected';
      el.className = `ls-connection-status ${connected ? 'ls-connected' : 'ls-disconnected'}`;
    }
  }

  updateSources(sources) {
    this.sources = sources;
    this.updateSourceSelect();
  }

  updateSourceSelect() {
    const select = document.getElementById('ls-source-filter');
    if (!select) return;
    const current = select.value;
    select.innerHTML = '<option value="all">All Sources</option>' +
      this.sources.map(s => `<option value="${this.escapeHtml(s)}">${this.escapeHtml(s)}</option>`).join('');
    select.value = current;
  }

  updateStats() {
    const byLevel = {};
    for (const entry of this.entries) {
      byLevel[entry.level] = (byLevel[entry.level] || 0) + 1;
    }
    this.stats = { total: this.entries.length, byLevel };
    this.updateStatsDisplay();
  }

  updateStatsDisplay() {
    const setCount = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    setCount('ls-stat-total', this.stats.total || 0);
    setCount('ls-stat-error', this.stats.byLevel?.error || 0);
    setCount('ls-stat-warn', this.stats.byLevel?.warn || 0);
    setCount('ls-stat-info', this.stats.byLevel?.info || 0);
    setCount('ls-stat-debug', this.stats.byLevel?.debug || 0);
  }

  updateFooter() {
    const entryCount = document.getElementById('ls-entry-count');
    const filteredCount = document.getElementById('ls-filtered-count');
    if (entryCount) {
      entryCount.textContent = `${this.entries.length} entries`;
    }
    if (filteredCount) {
      if (this.filteredEntries.length !== this.entries.length) {
        filteredCount.textContent = `(${this.filteredEntries.length} shown)`;
      } else {
        filteredCount.textContent = '';
      }
    }
  }

  async clearLogs() {
    try {
      await fetch(`${this.API_BASE}/api/logs/clear`, { method: 'POST' });
      this.entries = [];
      this.filteredEntries = [];
      this.renderLogEntries();
      this.updateStats();
    } catch (e) {}
  }

  async generateDemo() {
    try {
      await fetch(`${this.API_BASE}/api/logs/demo`, { method: 'POST' });
    } catch (e) {}
  }

  destroy() {
    if (this.socket) {
      this.socket.emit('unsubscribe_logs');
      this.socket.disconnect();
    }
    if (this.refreshInterval) clearInterval(this.refreshInterval);
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.__logStreaming = new LogStreaming();
});
