/**
 * Session Replay Widget (feat-048)
 * Record all prompts/responses, replay sessions, export for analysis.
 */

class SessionReplay {
  constructor(containerId = 'session-replay-widget') {
    this.container = document.getElementById(containerId);
    this.API_BASE = 'http://localhost:3434';
    this.sessions = [];
    this.currentSession = null;
    this.currentStep = 0;
    this.isPlaying = false;
    this.playTimer = null;
    this.playSpeed = 1000; // ms per step
    this.searchQuery = '';
    this.page = 1;
    this.totalPages = 1;
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
    this.loadSessions();
    this.refreshInterval = setInterval(() => this.loadSessions(), 30000);
  }

  async loadSessions() {
    try {
      const params = new URLSearchParams({
        page: this.page.toString(),
        limit: '10',
        search: this.searchQuery,
      });
      const res = await fetch(`${this.API_BASE}/api/session-replay/sessions?${params}`);
      const json = await res.json();
      if (json.success) {
        this.sessions = json.data.sessions;
        this.totalPages = json.data.totalPages;
        this.renderSessionList();
        this.renderSummary();
      }
    } catch (e) {
      console.warn('Failed to load sessions:', e);
    }
  }

  async loadSession(sessionId) {
    try {
      const res = await fetch(`${this.API_BASE}/api/session-replay/sessions/${sessionId}`);
      const json = await res.json();
      if (json.success) {
        this.currentSession = json.data;
        this.currentStep = 0;
        this.stopPlayback();
        this.renderReplayView();
      }
    } catch (e) {
      console.warn('Failed to load session:', e);
    }
  }

  async deleteSession(sessionId) {
    try {
      await fetch(`${this.API_BASE}/api/session-replay/sessions/${sessionId}`, { method: 'DELETE' });
      if (this.currentSession && this.currentSession.id === sessionId) {
        this.currentSession = null;
        this.renderReplayView();
      }
      this.loadSessions();
    } catch (e) {
      console.warn('Failed to delete session:', e);
    }
  }

  async generateDemo() {
    try {
      const res = await fetch(`${this.API_BASE}/api/session-replay/demo`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        this.loadSessions();
      }
    } catch (e) {
      console.warn('Failed to generate demo data:', e);
    }
  }

  exportSession(sessionId, format = 'json') {
    window.open(`${this.API_BASE}/api/session-replay/export/${sessionId}?format=${format}`, '_blank');
  }

  // Playback controls
  startPlayback() {
    if (!this.currentSession || !this.currentSession.messages.length) return;
    this.isPlaying = true;
    this.renderPlaybackControls();
    this.advanceStep();
  }

  stopPlayback() {
    this.isPlaying = false;
    if (this.playTimer) {
      clearTimeout(this.playTimer);
      this.playTimer = null;
    }
    this.renderPlaybackControls();
  }

  advanceStep() {
    if (!this.isPlaying || !this.currentSession) return;
    if (this.currentStep < this.currentSession.messages.length - 1) {
      this.currentStep++;
      this.renderCurrentMessage();
      this.renderTimeline();
      this.playTimer = setTimeout(() => this.advanceStep(), this.playSpeed);
    } else {
      this.stopPlayback();
    }
  }

  goToStep(step) {
    if (!this.currentSession) return;
    this.stopPlayback();
    this.currentStep = Math.max(0, Math.min(step, this.currentSession.messages.length - 1));
    this.renderCurrentMessage();
    this.renderTimeline();
  }

  stepForward() {
    if (!this.currentSession) return;
    this.stopPlayback();
    if (this.currentStep < this.currentSession.messages.length - 1) {
      this.currentStep++;
      this.renderCurrentMessage();
      this.renderTimeline();
    }
  }

  stepBack() {
    if (!this.currentSession) return;
    this.stopPlayback();
    if (this.currentStep > 0) {
      this.currentStep--;
      this.renderCurrentMessage();
      this.renderTimeline();
    }
  }

  // Rendering
  render() {
    this.container.innerHTML = `
      <div class="sr-widget">
        <div class="sr-header">
          <h2 class="sr-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
            </svg>
            Session Replay
          </h2>
          <div class="sr-header-actions">
            <button class="sr-btn sr-btn-sm" id="sr-generate-demo">Generate Demo Data</button>
            <button class="sr-btn sr-btn-sm sr-btn-primary" id="sr-refresh">Refresh</button>
          </div>
        </div>

        <div class="sr-summary" id="sr-summary">
          <div class="sr-stat-card">
            <div class="sr-stat-value" id="sr-total-sessions">0</div>
            <div class="sr-stat-label">Recorded Sessions</div>
          </div>
          <div class="sr-stat-card">
            <div class="sr-stat-value" id="sr-total-messages">0</div>
            <div class="sr-stat-label">Total Messages</div>
          </div>
          <div class="sr-stat-card">
            <div class="sr-stat-value" id="sr-total-tools">0</div>
            <div class="sr-stat-label">Tool Calls</div>
          </div>
          <div class="sr-stat-card">
            <div class="sr-stat-value" id="sr-completed-rate">0%</div>
            <div class="sr-stat-label">Success Rate</div>
          </div>
        </div>

        <div class="sr-main-layout">
          <!-- Session List Panel -->
          <div class="sr-session-list-panel">
            <div class="sr-search-bar">
              <input type="text" id="sr-search" class="sr-input" placeholder="Search sessions...">
            </div>
            <div class="sr-session-list" id="sr-session-list">
              <div class="sr-empty-state">No recorded sessions yet. Click "Generate Demo Data" to create sample sessions.</div>
            </div>
            <div class="sr-pagination" id="sr-pagination"></div>
          </div>

          <!-- Replay Panel -->
          <div class="sr-replay-panel" id="sr-replay-panel">
            <div class="sr-empty-state">Select a session from the list to replay it.</div>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    this.container.querySelector('#sr-refresh').addEventListener('click', () => this.loadSessions());
    this.container.querySelector('#sr-generate-demo').addEventListener('click', () => this.generateDemo());

    let searchTimeout;
    this.container.querySelector('#sr-search').addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.searchQuery = e.target.value;
        this.page = 1;
        this.loadSessions();
      }, 300);
    });
  }

  renderSummary() {
    const totalMessages = this.sessions.reduce((a, s) => a + (s.messageCount || 0), 0);
    const totalTools = this.sessions.reduce((a, s) => a + (s.toolCallCount || 0), 0);
    const completed = this.sessions.filter(s => s.status === 'completed').length;
    const rate = this.sessions.length > 0 ? Math.round((completed / this.sessions.length) * 100) : 0;

    this.container.querySelector('#sr-total-sessions').textContent = this.sessions.length;
    this.container.querySelector('#sr-total-messages').textContent = totalMessages;
    this.container.querySelector('#sr-total-tools').textContent = totalTools;
    this.container.querySelector('#sr-completed-rate').textContent = `${rate}%`;
  }

  renderSessionList() {
    const list = this.container.querySelector('#sr-session-list');

    if (!this.sessions.length) {
      list.innerHTML = '<div class="sr-empty-state">No recorded sessions yet. Click "Generate Demo Data" to create sample sessions.</div>';
      this.container.querySelector('#sr-pagination').innerHTML = '';
      return;
    }

    list.innerHTML = this.sessions.map(s => {
      const duration = this.formatDuration(s.startedAt, s.endedAt);
      const shortModel = this.shortModelName(s.model);
      const statusClass = s.status === 'completed' ? 'sr-status-success' : s.status === 'failed' ? 'sr-status-error' : 'sr-status-info';
      const isActive = this.currentSession && this.currentSession.id === s.id;

      return `
        <div class="sr-session-item ${isActive ? 'sr-session-active' : ''}" data-id="${this.escapeHtml(s.id)}">
          <div class="sr-session-item-header">
            <span class="sr-badge ${statusClass}">${this.escapeHtml(s.status)}</span>
            <span class="sr-session-model">${this.escapeHtml(shortModel)}</span>
          </div>
          <div class="sr-session-item-feature">${this.escapeHtml(s.feature || 'N/A')}</div>
          <div class="sr-session-item-meta">
            <span title="Messages">${s.messageCount || 0} msgs</span>
            <span title="Tool calls">${s.toolCallCount || 0} tools</span>
            <span title="Duration">${duration}</span>
          </div>
          <div class="sr-session-item-time">${this.formatTimestamp(s.startedAt)}</div>
          <div class="sr-session-item-actions">
            <button class="sr-btn-icon sr-replay-btn" data-id="${this.escapeHtml(s.id)}" title="Replay">&#9654;</button>
            <button class="sr-btn-icon sr-export-json-btn" data-id="${this.escapeHtml(s.id)}" title="Export JSON">&#128229;</button>
            <button class="sr-btn-icon sr-export-csv-btn" data-id="${this.escapeHtml(s.id)}" title="Export CSV">&#128196;</button>
            <button class="sr-btn-icon sr-delete-btn" data-id="${this.escapeHtml(s.id)}" title="Delete">&#128465;</button>
          </div>
        </div>
      `;
    }).join('');

    // Bind session item events
    list.querySelectorAll('.sr-replay-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.loadSession(btn.dataset.id);
      });
    });
    list.querySelectorAll('.sr-session-item').forEach(item => {
      item.addEventListener('click', () => this.loadSession(item.dataset.id));
    });
    list.querySelectorAll('.sr-export-json-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.exportSession(btn.dataset.id, 'json');
      });
    });
    list.querySelectorAll('.sr-export-csv-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.exportSession(btn.dataset.id, 'csv');
      });
    });
    list.querySelectorAll('.sr-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteSession(btn.dataset.id);
      });
    });

    // Pagination
    const pagination = this.container.querySelector('#sr-pagination');
    if (this.totalPages > 1) {
      let html = '';
      if (this.page > 1) html += `<button class="sr-btn sr-btn-sm sr-page-btn" data-page="${this.page - 1}">&laquo; Prev</button>`;
      html += `<span class="sr-page-info">Page ${this.page} of ${this.totalPages}</span>`;
      if (this.page < this.totalPages) html += `<button class="sr-btn sr-btn-sm sr-page-btn" data-page="${this.page + 1}">Next &raquo;</button>`;
      pagination.innerHTML = html;
      pagination.querySelectorAll('.sr-page-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.page = parseInt(btn.dataset.page);
          this.loadSessions();
        });
      });
    } else {
      pagination.innerHTML = '';
    }
  }

  renderReplayView() {
    const panel = this.container.querySelector('#sr-replay-panel');

    if (!this.currentSession) {
      panel.innerHTML = '<div class="sr-empty-state">Select a session from the list to replay it.</div>';
      return;
    }

    const s = this.currentSession;
    const duration = this.formatDuration(s.startedAt, s.endedAt);
    const shortModel = this.shortModelName(s.model);

    panel.innerHTML = `
      <div class="sr-replay-header">
        <div class="sr-replay-info">
          <h3>${this.escapeHtml(s.feature || s.id)}</h3>
          <div class="sr-replay-meta">
            <span class="sr-badge sr-status-info">${this.escapeHtml(shortModel)}</span>
            <span class="sr-badge ${s.status === 'completed' ? 'sr-status-success' : 'sr-status-error'}">${this.escapeHtml(s.status)}</span>
            <span>${s.messageCount} messages</span>
            <span>${s.toolCallCount} tool calls</span>
            <span>${duration}</span>
          </div>
        </div>
        <div class="sr-replay-export">
          <button class="sr-btn sr-btn-sm" id="sr-export-json">Export JSON</button>
          <button class="sr-btn sr-btn-sm" id="sr-export-csv">Export CSV</button>
        </div>
      </div>

      <!-- Playback Controls -->
      <div class="sr-playback-controls" id="sr-playback-controls">
        <button class="sr-btn sr-btn-sm" id="sr-step-back" title="Previous step">&#9664;&#9664;</button>
        <button class="sr-btn sr-btn-sm sr-btn-primary" id="sr-play-pause" title="Play/Pause">&#9654; Play</button>
        <button class="sr-btn sr-btn-sm" id="sr-step-forward" title="Next step">&#9654;&#9654;</button>
        <div class="sr-playback-progress">
          <input type="range" id="sr-progress-slider" min="0" max="${s.messages.length - 1}" value="${this.currentStep}" class="sr-slider">
          <span class="sr-step-counter" id="sr-step-counter">${this.currentStep + 1} / ${s.messages.length}</span>
        </div>
        <div class="sr-speed-control">
          <label>Speed:</label>
          <select id="sr-speed-select" class="sr-select">
            <option value="2000" ${this.playSpeed === 2000 ? 'selected' : ''}>0.5x</option>
            <option value="1000" ${this.playSpeed === 1000 ? 'selected' : ''}>1x</option>
            <option value="500" ${this.playSpeed === 500 ? 'selected' : ''}>2x</option>
            <option value="250" ${this.playSpeed === 250 ? 'selected' : ''}>4x</option>
          </select>
        </div>
      </div>

      <!-- Timeline -->
      <div class="sr-timeline" id="sr-timeline">
        ${this.renderTimelineHtml()}
      </div>

      <!-- Current Message Display -->
      <div class="sr-message-display" id="sr-message-display">
        ${this.renderMessageHtml(this.currentStep)}
      </div>
    `;

    // Bind replay events
    panel.querySelector('#sr-export-json').addEventListener('click', () => this.exportSession(s.id, 'json'));
    panel.querySelector('#sr-export-csv').addEventListener('click', () => this.exportSession(s.id, 'csv'));
    panel.querySelector('#sr-step-back').addEventListener('click', () => this.stepBack());
    panel.querySelector('#sr-step-forward').addEventListener('click', () => this.stepForward());
    panel.querySelector('#sr-play-pause').addEventListener('click', () => {
      if (this.isPlaying) this.stopPlayback(); else this.startPlayback();
    });
    panel.querySelector('#sr-progress-slider').addEventListener('input', (e) => {
      this.goToStep(parseInt(e.target.value));
    });
    panel.querySelector('#sr-speed-select').addEventListener('change', (e) => {
      this.playSpeed = parseInt(e.target.value);
    });

    // Bind timeline item clicks
    panel.querySelectorAll('.sr-timeline-item').forEach((item, idx) => {
      item.addEventListener('click', () => this.goToStep(idx));
    });
  }

  renderTimelineHtml() {
    if (!this.currentSession) return '';
    return this.currentSession.messages.map((m, i) => {
      const roleIcon = this.getRoleIcon(m.role);
      const isActive = i === this.currentStep;
      return `<div class="sr-timeline-item ${isActive ? 'sr-timeline-active' : ''} sr-timeline-${m.role}" data-step="${i}" title="${m.role}: step ${i + 1}">
        <span class="sr-timeline-icon">${roleIcon}</span>
      </div>`;
    }).join('');
  }

  renderTimeline() {
    const timeline = this.container.querySelector('#sr-timeline');
    if (timeline) {
      timeline.innerHTML = this.renderTimelineHtml();
      timeline.querySelectorAll('.sr-timeline-item').forEach((item, idx) => {
        item.addEventListener('click', () => this.goToStep(idx));
      });
      // Scroll active item into view
      const active = timeline.querySelector('.sr-timeline-active');
      if (active) active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
    // Update slider and counter
    const slider = this.container.querySelector('#sr-progress-slider');
    if (slider) slider.value = this.currentStep;
    const counter = this.container.querySelector('#sr-step-counter');
    if (counter && this.currentSession) counter.textContent = `${this.currentStep + 1} / ${this.currentSession.messages.length}`;
  }

  renderCurrentMessage() {
    const display = this.container.querySelector('#sr-message-display');
    if (display) {
      display.innerHTML = this.renderMessageHtml(this.currentStep);
    }
  }

  renderMessageHtml(step) {
    if (!this.currentSession || !this.currentSession.messages[step]) {
      return '<div class="sr-empty-state">No message to display.</div>';
    }

    const m = this.currentSession.messages[step];
    const roleClass = `sr-msg-${m.role}`;
    const roleIcon = this.getRoleIcon(m.role);
    const content = this.escapeHtml(m.content || '(no content)');

    let toolHtml = '';
    if (m.toolCalls && m.toolCalls.length > 0) {
      toolHtml = `
        <div class="sr-tool-calls">
          <div class="sr-tool-calls-header">Tool Calls (${m.toolCalls.length})</div>
          ${m.toolCalls.map(tc => `
            <div class="sr-tool-call">
              <div class="sr-tool-name">${this.escapeHtml(tc.tool || 'unknown')}</div>
              <pre class="sr-tool-input">${this.escapeHtml(typeof tc.input === 'object' ? JSON.stringify(tc.input, null, 2) : String(tc.input || ''))}</pre>
              ${tc.output ? `<pre class="sr-tool-output">${this.escapeHtml(typeof tc.output === 'object' ? JSON.stringify(tc.output, null, 2) : String(tc.output))}</pre>` : ''}
            </div>
          `).join('')}
        </div>
      `;
    }

    return `
      <div class="sr-message ${roleClass}">
        <div class="sr-message-header">
          <span class="sr-message-role">${roleIcon} ${this.escapeHtml(m.role)}</span>
          <span class="sr-message-time">${m.timestamp ? this.formatTimestamp(m.timestamp) : ''}</span>
          ${m.tokens ? `<span class="sr-message-tokens">${m.tokens} tokens</span>` : ''}
        </div>
        <div class="sr-message-content"><pre>${content}</pre></div>
        ${toolHtml}
      </div>
    `;
  }

  renderPlaybackControls() {
    const btn = this.container.querySelector('#sr-play-pause');
    if (btn) {
      btn.innerHTML = this.isPlaying ? '&#9646;&#9646; Pause' : '&#9654; Play';
    }
  }

  // Utility methods
  getRoleIcon(role) {
    const icons = {
      system: '&#9881;',   // gear
      user: '&#128100;',    // person
      assistant: '&#129302;', // robot
      tool: '&#128295;',    // wrench
    };
    return icons[role] || '&#8226;';
  }

  shortModelName(model) {
    const map = {
      'claude-opus-4-6': 'Opus 4',
      'claude-opus-4-5-20250929': 'Opus 4.5',
      'claude-sonnet-4-6-20250205': 'Sonnet 4.6',
      'claude-sonnet-4-5-20250929': 'Sonnet 4.5',
      'sonnet': 'Sonnet',
      'haiku': 'Haiku',
    };
    return map[model] || model || 'Unknown';
  }

  formatDuration(start, end) {
    if (!start || !end) return 'N/A';
    const ms = new Date(end) - new Date(start);
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  }

  formatTimestamp(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new SessionReplay();
});
