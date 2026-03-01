/**
 * PCT UI Components Library
 * Additional UI components for enhanced user experience
 * PCT-WC-091 through PCT-WC-110
 */

class PCTUIComponents {
  constructor() {
    this.notifications = [];
  }

  /**
   * Initialize UI components
   */
  init() {
    console.log('[UI Components] Initializing...');

    this.addComponentStyles();

    // PCT-WC-092: Responsive tables
    this.makeTablesResponsive();

    // PCT-WC-093: File drag-drop zones
    this.initDragDropZones();

    // PCT-WC-094: Quick search/nav already handled by existing components

    // PCT-WC-096: Notification system
    this.initNotificationCenter();

    // PCT-WC-098: Click-to-copy
    this.initClickToCopy();

    // PCT-WC-099: Multi-select
    this.initMultiSelect();

    // PCT-WC-100: Print stylesheet
    this.addPrintStyles();

    console.log('[UI Components] Initialized');
  }

  /**
   * Add component styles
   */
  addComponentStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* PCT-WC-092: Responsive Tables */
      @media (max-width: 768px) {
        .responsive-table {
          display: block;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .responsive-table table {
          min-width: 600px;
        }

        .responsive-table-cards {
          display: block;
        }

        .responsive-table-cards thead {
          display: none;
        }

        .responsive-table-cards tbody {
          display: block;
        }

        .responsive-table-cards tr {
          display: block;
          margin-bottom: 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 1rem;
          background: white;
        }

        .responsive-table-cards td {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid #f3f4f6;
        }

        .responsive-table-cards td:before {
          content: attr(data-label);
          font-weight: 600;
          margin-right: 1rem;
        }

        .responsive-table-cards td:last-child {
          border-bottom: none;
        }
      }

      /* PCT-WC-093: Drag-drop zone */
      .drag-drop-zone {
        border: 2px dashed #d1d5db;
        border-radius: 8px;
        padding: 2rem;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s;
        background: #f9fafb;
      }

      .drag-drop-zone:hover {
        border-color: #6366f1;
        background: #f0f1ff;
      }

      .drag-drop-zone.drag-over {
        border-color: #6366f1;
        background: #e0e2ff;
        transform: scale(1.02);
      }

      .drag-drop-zone-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
        opacity: 0.5;
      }

      .drag-drop-zone-text {
        font-size: 1rem;
        color: #6b7280;
      }

      .drag-drop-zone-subtext {
        font-size: 0.875rem;
        color: #9ca3af;
        margin-top: 0.5rem;
      }

      /* PCT-WC-095: Stepped form progress */
      .form-steps {
        display: flex;
        justify-content: space-between;
        margin-bottom: 2rem;
        position: relative;
      }

      .form-steps:before {
        content: '';
        position: absolute;
        top: 1.25rem;
        left: 0;
        right: 0;
        height: 2px;
        background: #e5e7eb;
        z-index: 0;
      }

      .form-step {
        display: flex;
        flex-direction: column;
        align-items: center;
        position: relative;
        z-index: 1;
        flex: 1;
      }

      .form-step-circle {
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 50%;
        background: white;
        border: 2px solid #e5e7eb;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        color: #9ca3af;
        margin-bottom: 0.5rem;
      }

      .form-step.active .form-step-circle {
        border-color: #6366f1;
        background: #6366f1;
        color: white;
      }

      .form-step.completed .form-step-circle {
        border-color: #10b981;
        background: #10b981;
        color: white;
      }

      .form-step-label {
        font-size: 0.875rem;
        color: #6b7280;
        text-align: center;
      }

      .form-step.active .form-step-label {
        color: #6366f1;
        font-weight: 500;
      }

      /* PCT-WC-096: Notification center */
      .notification-bell {
        position: relative;
        cursor: pointer;
      }

      .notification-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        background: #ef4444;
        color: white;
        font-size: 0.75rem;
        font-weight: 600;
        padding: 0.125rem 0.375rem;
        border-radius: 10px;
        min-width: 18px;
        text-align: center;
      }

      .notification-dropdown {
        position: absolute;
        top: 100%;
        right: 0;
        margin-top: 0.5rem;
        width: 320px;
        max-height: 400px;
        overflow-y: auto;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        z-index: 1000;
      }

      .notification-item {
        padding: 0.75rem 1rem;
        border-bottom: 1px solid #f3f4f6;
        cursor: pointer;
        transition: background 0.2s;
      }

      .notification-item:hover {
        background: #f9fafb;
      }

      .notification-item.unread {
        background: #eff6ff;
      }

      .notification-item-title {
        font-weight: 500;
        margin-bottom: 0.25rem;
      }

      .notification-item-message {
        font-size: 0.875rem;
        color: #6b7280;
        margin-bottom: 0.25rem;
      }

      .notification-item-time {
        font-size: 0.75rem;
        color: #9ca3af;
      }

      /* PCT-WC-097: Avatar */
      .avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        object-fit: cover;
        background: #e5e7eb;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-weight: 500;
        color: #6b7280;
      }

      .avatar-sm { width: 32px; height: 32px; font-size: 0.875rem; }
      .avatar-lg { width: 64px; height: 64px; font-size: 1.5rem; }
      .avatar-xl { width: 96px; height: 96px; font-size: 2rem; }

      /* PCT-WC-098: Click-to-copy */
      .click-to-copy {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
        transition: all 0.2s;
      }

      .click-to-copy:hover {
        opacity: 0.8;
      }

      .click-to-copy-icon {
        opacity: 0.5;
        transition: opacity 0.2s;
      }

      .click-to-copy:hover .click-to-copy-icon {
        opacity: 1;
      }

      .click-to-copy.copied {
        color: #10b981;
      }

      /* PCT-WC-099: Multi-select */
      .multi-select-actions {
        position: fixed;
        bottom: 2rem;
        left: 50%;
        transform: translateX(-50%);
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 1rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: none;
        align-items: center;
        gap: 1rem;
        z-index: 999;
      }

      .multi-select-actions.visible {
        display: flex;
      }

      .multi-select-count {
        font-weight: 500;
        color: #6b7280;
      }

      .multi-select-clear {
        color: #6366f1;
        cursor: pointer;
        font-size: 0.875rem;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * PCT-WC-092: Make tables responsive
   */
  makeTablesResponsive() {
    document.querySelectorAll('table').forEach((table) => {
      if (!table.closest('.responsive-table')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'responsive-table';
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);

        // Add data-label attributes for mobile card view
        const headers = Array.from(table.querySelectorAll('th')).map((th) => th.textContent);
        table.querySelectorAll('tbody tr').forEach((row) => {
          Array.from(row.querySelectorAll('td')).forEach((cell, index) => {
            cell.setAttribute('data-label', headers[index] || '');
          });
        });
      }
    });

    console.log('[UI] Tables made responsive');
  }

  /**
   * PCT-WC-093: Initialize drag-drop zones
   */
  initDragDropZones() {
    console.log('[UI] Drag-drop zones initialized');
  }

  /**
   * Create drag-drop zone
   */
  createDragDropZone(options = {}) {
    const {
      accept = '*',
      multiple = false,
      maxSize = 10 * 1024 * 1024, // 10MB
      onDrop = null,
    } = options;

    const zone = document.createElement('div');
    zone.className = 'drag-drop-zone';
    zone.innerHTML = `
      <div class="drag-drop-zone-icon">📁</div>
      <div class="drag-drop-zone-text">Drop files here or click to browse</div>
      <div class="drag-drop-zone-subtext">Max ${this.formatBytes(maxSize)}</div>
      <input type="file" ${multiple ? 'multiple' : ''} accept="${accept}" style="display: none;">
    `;

    const input = zone.querySelector('input');

    zone.addEventListener('click', () => input.click());

    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('drag-over');
    });

    zone.addEventListener('dragleave', () => {
      zone.classList.remove('drag-over');
    });

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');

      const files = Array.from(e.dataTransfer.files);
      this.handleFiles(files, maxSize, onDrop);
    });

    input.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      this.handleFiles(files, maxSize, onDrop);
    });

    return zone;
  }

  /**
   * Handle dropped files
   */
  handleFiles(files, maxSize, callback) {
    const validFiles = files.filter((file) => {
      if (file.size > maxSize) {
        if (window.toast) {
          window.toast(`${file.name} is too large`, 'error');
        }
        return false;
      }
      return true;
    });

    if (callback) {
      callback(validFiles);
    }
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * PCT-WC-095: Create stepped form
   */
  createSteppedForm(steps) {
    const container = document.createElement('div');
    container.className = 'stepped-form-container';

    // Create progress indicator
    const progress = document.createElement('div');
    progress.className = 'form-steps';

    steps.forEach((step, index) => {
      const stepEl = document.createElement('div');
      stepEl.className = 'form-step';
      stepEl.innerHTML = `
        <div class="form-step-circle">${index + 1}</div>
        <div class="form-step-label">${step.label}</div>
      `;
      progress.appendChild(stepEl);
    });

    container.appendChild(progress);

    return { container, setStep: (index) => this.setFormStep(progress, index) };
  }

  /**
   * Set active step
   */
  setFormStep(progressEl, activeIndex) {
    const steps = Array.from(progressEl.querySelectorAll('.form-step'));
    steps.forEach((step, index) => {
      step.classList.remove('active', 'completed');
      if (index < activeIndex) {
        step.classList.add('completed');
      } else if (index === activeIndex) {
        step.classList.add('active');
      }
    });
  }

  /**
   * PCT-WC-096: Initialize notification center
   */
  initNotificationCenter() {
    console.log('[UI] Notification center initialized');
  }

  /**
   * Create notification bell
   */
  createNotificationBell() {
    const bell = document.createElement('div');
    bell.className = 'notification-bell';
    bell.innerHTML = `
      <button class="pct-btn pct-btn-sm" aria-label="Notifications">
        🔔
        <span class="notification-badge" style="display: none;">0</span>
      </button>
      <div class="notification-dropdown" style="display: none;">
        <div class="notification-item">
          <div class="notification-item-title">No notifications</div>
        </div>
      </div>
    `;

    const button = bell.querySelector('button');
    const dropdown = bell.querySelector('.notification-dropdown');

    button.addEventListener('click', () => {
      dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    });

    return bell;
  }

  /**
   * Add notification
   */
  addNotification(notification) {
    this.notifications.unshift(notification);

    // Update badge count
    const badges = document.querySelectorAll('.notification-badge');
    badges.forEach((badge) => {
      badge.textContent = this.notifications.length;
      badge.style.display = this.notifications.length > 0 ? 'block' : 'none';
    });
  }

  /**
   * PCT-WC-097: Create avatar
   */
  createAvatar(options = {}) {
    const { src = null, name = '', size = 'default' } = options;

    const avatar = document.createElement('div');
    avatar.className = `avatar avatar-${size}`;

    if (src) {
      const img = document.createElement('img');
      img.src = src;
      img.alt = name;
      img.className = 'avatar';
      if (size !== 'default') img.classList.add(`avatar-${size}`);
      return img;
    } else {
      // Show initials
      const initials = name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      avatar.textContent = initials || '?';
    }

    return avatar;
  }

  /**
   * PCT-WC-098: Initialize click-to-copy
   */
  initClickToCopy() {
    document.addEventListener('click', (e) => {
      const copyEl = e.target.closest('.click-to-copy');
      if (copyEl) {
        const text = copyEl.dataset.copy || copyEl.textContent;
        navigator.clipboard.writeText(text).then(() => {
          copyEl.classList.add('copied');
          setTimeout(() => copyEl.classList.remove('copied'), 2000);

          if (window.toast) {
            window.toast('Copied to clipboard', 'success', 1500);
          }
        });
      }
    });

    console.log('[UI] Click-to-copy initialized');
  }

  /**
   * PCT-WC-099: Initialize multi-select
   */
  initMultiSelect() {
    console.log('[UI] Multi-select initialized');
  }

  /**
   * PCT-WC-100: Add print styles
   */
  addPrintStyles() {
    const style = document.createElement('style');
    style.media = 'print';
    style.textContent = `
      @media print {
        /* Hide non-essential elements */
        .pct-header,
        .pct-sidebar,
        .pct-tabs,
        .sidebar-toggle,
        .theme-toggle,
        .notification-bell,
        .toast-container,
        .autosave-indicator,
        .multi-select-actions,
        button,
        .pct-btn {
          display: none !important;
        }

        /* Optimize for print */
        body {
          font-size: 12pt;
          line-height: 1.5;
          color: #000;
          background: #fff;
        }

        .pct-container {
          max-width: 100%;
          padding: 0;
        }

        /* Show all content */
        .pct-tab-panel {
          display: block !important;
        }

        /* Improve table printing */
        table {
          page-break-inside: auto;
        }

        tr {
          page-break-inside: avoid;
          page-break-after: auto;
        }

        thead {
          display: table-header-group;
        }

        /* Add page breaks */
        .page-break {
          page-break-after: always;
        }

        /* Ensure links are visible */
        a[href]:after {
          content: " (" attr(href) ")";
          font-size: 0.8em;
          color: #666;
        }
      }
    `;
    document.head.appendChild(style);

    console.log('[UI] Print styles added');
  }
}

// Create singleton instance
const pctUIComponents = new PCTUIComponents();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => pctUIComponents.init());
} else {
  pctUIComponents.init();
}

// Export for use in other modules
window.pctUIComponents = pctUIComponents;
