/**
 * Approval Gates UI Component
 * ===========================
 * 
 * Displays approval requests and handles user responses.
 * Integrates with browser notifications for alerts.
 */

class ApprovalUI {
  constructor() {
    this.pendingApprovals = [];
    this.notificationPermission = 'default';
    this.soundEnabled = true;
    this.init();
  }

  init() {
    this.requestNotificationPermission();
    this.createModalContainer();
    this.setupEventListeners();
    this.addStyles();
  }

  async requestNotificationPermission() {
    if ('Notification' in window) {
      this.notificationPermission = await Notification.requestPermission();
    }
  }

  createModalContainer() {
    // Create approval modal container if it doesn't exist
    if (!document.getElementById('approval-modal-container')) {
      const container = document.createElement('div');
      container.id = 'approval-modal-container';
      document.body.appendChild(container);
    }

    // Create notification badge
    if (!document.getElementById('approval-badge')) {
      const badge = document.createElement('div');
      badge.id = 'approval-badge';
      badge.className = 'approval-badge hidden';
      badge.innerHTML = `
        <span class="badge-icon">🔔</span>
        <span class="badge-count">0</span>
      `;
      badge.addEventListener('click', () => this.showPendingList());
      document.body.appendChild(badge);
    }
  }

  setupEventListeners() {
    // Listen for approval events from harness client
    if (window.harnessClient) {
      harnessClient.on('approval:requested', (gate) => this.handleApprovalRequest(gate));
      harnessClient.on('approval:resolved', (gate) => this.handleApprovalResolved(gate));
    }

    // Also listen via Socket.IO directly
    if (typeof io !== 'undefined' && window.harnessClient?.socket) {
      harnessClient.socket.on('approval:requested', (gate) => this.handleApprovalRequest(gate));
    }
  }

  handleApprovalRequest(gate) {
    // Add to pending list
    this.pendingApprovals.push(gate);
    this.updateBadge();

    // Show browser notification
    this.showBrowserNotification(gate);

    // Play sound
    this.playNotificationSound();

    // Show modal immediately for high-priority gates
    if (['error_recovery', 'destructive_action', 'test_failure'].includes(gate.type)) {
      this.showApprovalModal(gate);
    }
  }

  handleApprovalResolved(gate) {
    // Remove from pending list
    this.pendingApprovals = this.pendingApprovals.filter(g => g.id !== gate.id);
    this.updateBadge();

    // Close modal if it's showing this gate
    const modal = document.querySelector(`[data-gate-id="${gate.id}"]`);
    if (modal) {
      modal.remove();
    }
  }

  updateBadge() {
    const badge = document.getElementById('approval-badge');
    const count = this.pendingApprovals.length;
    
    if (badge) {
      badge.querySelector('.badge-count').textContent = count;
      badge.classList.toggle('hidden', count === 0);
      badge.classList.toggle('pulse', count > 0);
    }
  }

  showBrowserNotification(gate) {
    if (this.notificationPermission !== 'granted') return;

    const notification = new Notification('Approval Required', {
      body: gate.title,
      icon: '🤖',
      tag: gate.id,
      requireInteraction: true,
    });

    notification.onclick = () => {
      window.focus();
      this.showApprovalModal(gate);
      notification.close();
    };
  }

  playNotificationSound() {
    if (!this.soundEnabled) return;
    
    // Create a simple beep using Web Audio API
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
      // Audio not supported
    }
  }

  showApprovalModal(gate) {
    const container = document.getElementById('approval-modal-container');
    
    // Check if modal already exists
    if (document.querySelector(`[data-gate-id="${gate.id}"]`)) return;

    const typeIcons = {
      pre_feature: '🚀',
      post_feature: '✅',
      error_recovery: '⚠️',
      milestone: '🏁',
      test_failure: '❌',
      destructive_action: '🗑️',
      session_handoff: '🔄',
      custom: '📋',
    };

    const typeColors = {
      pre_feature: '#6366f1',
      post_feature: '#10b981',
      error_recovery: '#f59e0b',
      milestone: '#8b5cf6',
      test_failure: '#ef4444',
      destructive_action: '#ef4444',
      session_handoff: '#3b82f6',
      custom: '#6b7280',
    };

    const modal = document.createElement('div');
    modal.className = 'approval-modal';
    modal.dataset.gateId = gate.id;
    modal.innerHTML = `
      <div class="approval-modal-content" style="border-top: 4px solid ${typeColors[gate.type] || '#6366f1'}">
        <div class="approval-header">
          <span class="approval-icon">${typeIcons[gate.type] || '📋'}</span>
          <div class="approval-title-area">
            <h3>${this.escapeHtml(gate.title)}</h3>
            <span class="approval-type-badge">${gate.type.replace(/_/g, ' ')}</span>
          </div>
          <button class="approval-close" onclick="approvalUI.dismissModal('${gate.id}')">&times;</button>
        </div>
        
        <div class="approval-body">
          <p class="approval-description">${this.escapeHtml(gate.description)}</p>
          
          ${this.renderContext(gate.context)}
        </div>
        
        <div class="approval-actions">
          ${gate.options.map(opt => `
            <button 
              class="approval-btn approval-btn-${opt.style || 'secondary'}"
              onclick="approvalUI.resolveGate('${gate.id}', '${opt.action}', '${opt.id}')"
            >
              ${this.escapeHtml(opt.label)}
            </button>
          `).join('')}
        </div>
        
        <div class="approval-footer">
          <span class="approval-time">Requested ${this.formatTime(gate.createdAt)}</span>
          ${gate.timeoutMs > 0 ? `<span class="approval-timeout">Auto-timeout in ${Math.round(gate.timeoutMs / 1000)}s</span>` : ''}
        </div>
      </div>
    `;

    container.appendChild(modal);
    
    // Animate in
    requestAnimationFrame(() => {
      modal.classList.add('visible');
    });
  }

  renderContext(context) {
    if (!context || Object.keys(context).length === 0) return '';

    const items = [];

    if (context.featureTitle) {
      items.push(`<div class="context-item"><strong>Feature:</strong> ${this.escapeHtml(context.featureTitle)}</div>`);
    }
    if (context.sessionNumber) {
      items.push(`<div class="context-item"><strong>Session:</strong> #${context.sessionNumber}</div>`);
    }
    if (context.errorMessage) {
      items.push(`<div class="context-item context-error"><strong>Error:</strong> ${this.escapeHtml(context.errorMessage)}</div>`);
    }
    if (context.testResults) {
      items.push(`<div class="context-item"><strong>Tests:</strong> ${context.testResults.passed} passed, ${context.testResults.failed} failed</div>`);
    }
    if (context.filesAffected && context.filesAffected.length > 0) {
      items.push(`
        <div class="context-item">
          <strong>Files affected:</strong>
          <ul class="files-list">
            ${context.filesAffected.map(f => `<li>${this.escapeHtml(f)}</li>`).join('')}
          </ul>
        </div>
      `);
    }
    if (context.percentComplete !== undefined) {
      items.push(`<div class="context-item"><strong>Progress:</strong> ${context.percentComplete}% complete</div>`);
    }

    return items.length > 0 ? `<div class="approval-context">${items.join('')}</div>` : '';
  }

  async resolveGate(gateId, action, optionId) {
    const status = (action === 'approve' || action === 'skip' || action === 'retry') ? 'approved' : 'rejected';
    
    try {
      const response = await fetch(`http://localhost:4545/api/approvals/${gateId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, resolution: optionId }),
      });

      if (!response.ok) {
        throw new Error('Failed to resolve approval');
      }

      this.dismissModal(gateId);
      this.showToast(`Approval ${status}`, status === 'approved' ? 'success' : 'info');
    } catch (error) {
      this.showToast(`Error: ${error.message}`, 'error');
    }
  }

  dismissModal(gateId) {
    const modal = document.querySelector(`[data-gate-id="${gateId}"]`);
    if (modal) {
      modal.classList.remove('visible');
      setTimeout(() => modal.remove(), 300);
    }
  }

  showPendingList() {
    if (this.pendingApprovals.length === 0) {
      this.showToast('No pending approvals', 'info');
      return;
    }

    // Show all pending approvals
    this.pendingApprovals.forEach(gate => this.showApprovalModal(gate));
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `approval-toast approval-toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('visible'));
    
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  formatTime(date) {
    const d = new Date(date);
    return d.toLocaleTimeString();
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Fetch pending approvals from server
  async fetchPending(projectId) {
    try {
      const response = await fetch(`http://localhost:4545/api/projects/${projectId}/approvals/pending`);
      const result = await response.json();
      
      if (result.data) {
        this.pendingApprovals = result.data;
        this.updateBadge();
        
        // Show modals for any pending approvals
        result.data.forEach(gate => {
          if (!document.querySelector(`[data-gate-id="${gate.id}"]`)) {
            this.showApprovalModal(gate);
          }
        });
      }
    } catch (error) {
      console.error('Failed to fetch pending approvals:', error);
    }
  }

  // Create a test approval (for demo purposes)
  async createTestApproval(projectId = 'test', type = 'milestone') {
    try {
      const response = await fetch(`http://localhost:4545/api/projects/${projectId}/approvals/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      
      const result = await response.json();
      
      if (result.data && result.data.length > 0) {
        result.data.forEach(gate => this.handleApprovalRequest(gate));
      }
      
      return result;
    } catch (error) {
      console.error('Failed to create test approval:', error);
      throw error;
    }
  }

  addStyles() {
    if (document.getElementById('approval-ui-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'approval-ui-styles';
    styles.textContent = `
      .approval-badge {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        width: 56px;
        height: 56px;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
        z-index: 1000;
        transition: transform 0.2s, box-shadow 0.2s;
      }

      .approval-badge:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 24px rgba(99, 102, 241, 0.5);
      }

      .approval-badge.hidden {
        display: none;
      }

      .approval-badge.pulse {
        animation: badgePulse 2s infinite;
      }

      @keyframes badgePulse {
        0%, 100% { box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4); }
        50% { box-shadow: 0 4px 30px rgba(239, 68, 68, 0.6); }
      }

      .badge-icon {
        font-size: 1.5rem;
      }

      .badge-count {
        position: absolute;
        top: -4px;
        right: -4px;
        background: #ef4444;
        color: white;
        font-size: 0.75rem;
        font-weight: 600;
        min-width: 20px;
        height: 20px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 4px;
      }

      #approval-modal-container {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        width: 420px;
        max-width: 100vw;
        z-index: 1001;
        pointer-events: none;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 1rem;
        overflow-y: auto;
      }

      .approval-modal {
        pointer-events: auto;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
      }

      .approval-modal.visible {
        opacity: 1;
        transform: translateX(0);
      }

      .approval-modal-content {
        background: var(--color-surface, #1a2234);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        overflow: hidden;
      }

      .approval-header {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        padding: 1rem;
        background: rgba(0, 0, 0, 0.2);
      }

      .approval-icon {
        font-size: 1.5rem;
        flex-shrink: 0;
      }

      .approval-title-area {
        flex: 1;
      }

      .approval-title-area h3 {
        margin: 0 0 0.25rem 0;
        font-size: 1rem;
        font-weight: 600;
        color: var(--color-text, #f1f5f9);
      }

      .approval-type-badge {
        font-size: 0.7rem;
        text-transform: uppercase;
        color: var(--color-text-muted, #94a3b8);
        letter-spacing: 0.05em;
      }

      .approval-close {
        background: none;
        border: none;
        font-size: 1.25rem;
        color: var(--color-text-muted, #94a3b8);
        cursor: pointer;
        padding: 0;
        line-height: 1;
      }

      .approval-close:hover {
        color: var(--color-text, #f1f5f9);
      }

      .approval-body {
        padding: 1rem;
      }

      .approval-description {
        margin: 0 0 1rem 0;
        font-size: 0.9rem;
        color: var(--color-text-secondary, #cbd5e1);
        line-height: 1.5;
      }

      .approval-context {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 8px;
        padding: 0.75rem;
        font-size: 0.85rem;
      }

      .context-item {
        margin-bottom: 0.5rem;
      }

      .context-item:last-child {
        margin-bottom: 0;
      }

      .context-item strong {
        color: var(--color-text-muted, #94a3b8);
      }

      .context-error {
        color: #ef4444;
      }

      .files-list {
        margin: 0.25rem 0 0 1rem;
        padding: 0;
        font-family: var(--font-family-mono, monospace);
        font-size: 0.8rem;
      }

      .approval-actions {
        display: flex;
        gap: 0.5rem;
        padding: 1rem;
        border-top: 1px solid rgba(148, 163, 184, 0.1);
      }

      .approval-btn {
        flex: 1;
        padding: 0.6rem 1rem;
        border: none;
        border-radius: 6px;
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }

      .approval-btn-primary {
        background: #6366f1;
        color: white;
      }

      .approval-btn-primary:hover {
        background: #4f46e5;
      }

      .approval-btn-success {
        background: #10b981;
        color: white;
      }

      .approval-btn-success:hover {
        background: #059669;
      }

      .approval-btn-danger {
        background: #ef4444;
        color: white;
      }

      .approval-btn-danger:hover {
        background: #dc2626;
      }

      .approval-btn-warning {
        background: #f59e0b;
        color: white;
      }

      .approval-btn-warning:hover {
        background: #d97706;
      }

      .approval-btn-secondary {
        background: rgba(148, 163, 184, 0.2);
        color: var(--color-text, #f1f5f9);
      }

      .approval-btn-secondary:hover {
        background: rgba(148, 163, 184, 0.3);
      }

      .approval-footer {
        display: flex;
        justify-content: space-between;
        padding: 0.5rem 1rem;
        font-size: 0.75rem;
        color: var(--color-text-muted, #94a3b8);
        background: rgba(0, 0, 0, 0.1);
      }

      .approval-toast {
        position: fixed;
        bottom: 6rem;
        right: 2rem;
        padding: 0.75rem 1.25rem;
        border-radius: 8px;
        font-size: 0.875rem;
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.3s ease;
        z-index: 1002;
      }

      .approval-toast.visible {
        opacity: 1;
        transform: translateY(0);
      }

      .approval-toast-success {
        background: #10b981;
        color: white;
      }

      .approval-toast-error {
        background: #ef4444;
        color: white;
      }

      .approval-toast-info {
        background: #3b82f6;
        color: white;
      }
    `;

    document.head.appendChild(styles);
  }
}

// Initialize
const approvalUI = new ApprovalUI();
window.approvalUI = approvalUI;
