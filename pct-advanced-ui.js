/**
 * PCT Advanced UI Features
 * Confirmation dialogs, sidebar navigation, dark mode, autosave, infinite scroll, keyboard shortcuts
 * PCT-WC-085 through PCT-WC-090
 */

class PCTAdvancedUI {
  constructor() {
    this.theme = localStorage.getItem('pct-theme') || 'system';
    this.shortcuts = new Map();
    this.autosaveTimers = new Map();
    this.infiniteScrollObservers = new Map();
  }

  /**
   * Initialize all advanced UI features
   */
  init() {
    console.log('[Advanced UI] Initializing...');

    // PCT-WC-085: Confirmation dialogs
    this.initConfirmationDialogs();

    // PCT-WC-086: Responsive sidebar
    this.initResponsiveSidebar();

    // PCT-WC-087: Dark mode
    this.initDarkMode();

    // PCT-WC-088: Form autosave
    this.initFormAutosave();

    // PCT-WC-089: Infinite scroll
    this.initInfiniteScroll();

    // PCT-WC-090: Keyboard shortcuts
    this.initKeyboardShortcuts();

    console.log('[Advanced UI] Initialized');
  }

  /**
   * PCT-WC-085: Confirmation dialogs
   */
  initConfirmationDialogs() {
    // Add CSS for confirmation dialogs
    const style = document.createElement('style');
    style.textContent = `
      .confirm-dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 9998;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fade-in 0.2s;
      }

      .confirm-dialog {
        background: white;
        border-radius: 12px;
        padding: 1.5rem;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: scale-in 0.3s ease-out;
      }

      .confirm-dialog-icon {
        font-size: 3rem;
        text-align: center;
        margin-bottom: 1rem;
      }

      .confirm-dialog-title {
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
        text-align: center;
      }

      .confirm-dialog-message {
        color: #6b7280;
        margin-bottom: 1.5rem;
        text-align: center;
        line-height: 1.5;
      }

      .confirm-dialog-actions {
        display: flex;
        gap: 0.75rem;
        justify-content: center;
      }

      .confirm-dialog-btn {
        padding: 0.625rem 1.25rem;
        border: none;
        border-radius: 6px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }

      .confirm-dialog-btn-danger {
        background: #ef4444;
        color: white;
      }

      .confirm-dialog-btn-danger:hover {
        background: #dc2626;
      }

      .confirm-dialog-btn-cancel {
        background: #e5e7eb;
        color: #374151;
      }

      .confirm-dialog-btn-cancel:hover {
        background: #d1d5db;
      }

      @keyframes fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes scale-in {
        from {
          opacity: 0;
          transform: scale(0.9);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
    `;
    document.head.appendChild(style);

    console.log('[Advanced UI] Confirmation dialogs initialized');
  }

  /**
   * Show confirmation dialog
   */
  confirm(options = {}) {
    const {
      title = 'Are you sure?',
      message = 'This action cannot be undone.',
      icon = '⚠️',
      confirmLabel = 'Confirm',
      cancelLabel = 'Cancel',
      type = 'danger',
    } = options;

    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'confirm-dialog-overlay';

      overlay.innerHTML = `
        <div class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <div class="confirm-dialog-icon">${icon}</div>
          <div class="confirm-dialog-title" id="confirm-title">${title}</div>
          <div class="confirm-dialog-message">${message}</div>
          <div class="confirm-dialog-actions">
            <button class="confirm-dialog-btn confirm-dialog-btn-cancel" id="confirm-cancel">${cancelLabel}</button>
            <button class="confirm-dialog-btn confirm-dialog-btn-${type}" id="confirm-ok">${confirmLabel}</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      const dialog = overlay.querySelector('.confirm-dialog');
      const confirmBtn = overlay.querySelector('#confirm-ok');
      const cancelBtn = overlay.querySelector('#confirm-cancel');

      confirmBtn.focus();

      const cleanup = (result) => {
        overlay.remove();
        resolve(result);
      };

      confirmBtn.addEventListener('click', () => cleanup(true));
      cancelBtn.addEventListener('click', () => cleanup(false));
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) cleanup(false);
      });

      // Keyboard handling
      document.addEventListener('keydown', function handler(e) {
        if (e.key === 'Escape') {
          cleanup(false);
          document.removeEventListener('keydown', handler);
        }
      });
    });
  }

  /**
   * PCT-WC-086: Responsive sidebar navigation
   */
  initResponsiveSidebar() {
    // Check if sidebar exists
    const sidebar = document.querySelector('.pct-sidebar');
    if (!sidebar) return;

    // Add CSS for responsive sidebar
    const style = document.createElement('style');
    style.textContent = `
      .sidebar-toggle {
        display: none;
        position: fixed;
        bottom: 1rem;
        left: 1rem;
        z-index: 1000;
        padding: 0.75rem;
        background: var(--color-primary);
        color: white;
        border: none;
        border-radius: 50%;
        width: 48px;
        height: 48px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }

      @media (max-width: 768px) {
        .pct-sidebar {
          position: fixed;
          top: 0;
          left: -280px;
          height: 100vh;
          width: 280px;
          z-index: 999;
          transition: left 0.3s;
          background: white;
          box-shadow: 2px 0 12px rgba(0, 0, 0, 0.1);
        }

        .pct-sidebar.open {
          left: 0;
        }

        .sidebar-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sidebar-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 998;
          display: none;
        }

        .sidebar-overlay.visible {
          display: block;
        }
      }
    `;
    document.head.appendChild(style);

    // Create toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'sidebar-toggle';
    toggleBtn.innerHTML = '☰';
    toggleBtn.setAttribute('aria-label', 'Toggle sidebar');
    document.body.appendChild(toggleBtn);

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);

    // Toggle functionality
    const toggleSidebar = () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('visible');
    };

    toggleBtn.addEventListener('click', toggleSidebar);
    overlay.addEventListener('click', toggleSidebar);

    console.log('[Advanced UI] Responsive sidebar initialized');
  }

  /**
   * PCT-WC-087: Dark mode with system preference
   */
  initDarkMode() {
    // Add CSS for dark mode
    const style = document.createElement('style');
    style.textContent = `
      :root {
        --color-bg: #ffffff;
        --color-bg-secondary: #f9fafb;
        --color-bg-tertiary: #f3f4f6;
        --color-text: #111827;
        --color-text-light: #6b7280;
        --color-border: #e5e7eb;
      }

      [data-theme="dark"] {
        --color-bg: #111827;
        --color-bg-secondary: #1f2937;
        --color-bg-tertiary: #374151;
        --color-text: #f9fafb;
        --color-text-light: #9ca3af;
        --color-border: #374151;
      }

      [data-theme="dark"] {
        background: var(--color-bg);
        color: var(--color-text);
      }

      .theme-toggle {
        position: fixed;
        top: 1rem;
        right: 1rem;
        z-index: 1000;
        padding: 0.5rem;
        background: var(--color-bg-secondary);
        border: 1px solid var(--color-border);
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
      }

      .theme-toggle:hover {
        background: var(--color-bg-tertiary);
      }
    `;
    document.head.appendChild(style);

    // Apply saved theme or system preference
    this.applyTheme(this.theme);

    // Create theme toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'theme-toggle';
    toggleBtn.setAttribute('aria-label', 'Toggle theme');
    this.updateThemeToggleButton(toggleBtn);
    document.body.appendChild(toggleBtn);

    toggleBtn.addEventListener('click', () => {
      this.cycleTheme();
      this.updateThemeToggleButton(toggleBtn);
    });

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (this.theme === 'system') {
        this.applyTheme('system');
      }
    });

    console.log('[Advanced UI] Dark mode initialized');
  }

  /**
   * Apply theme
   */
  applyTheme(theme) {
    this.theme = theme;

    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }

    localStorage.setItem('pct-theme', theme);
  }

  /**
   * Cycle through themes
   */
  cycleTheme() {
    const themes = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(this.theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    this.applyTheme(nextTheme);
  }

  /**
   * Update theme toggle button
   */
  updateThemeToggleButton(btn) {
    const icons = {
      light: '☀️',
      dark: '🌙',
      system: '💻',
    };

    btn.innerHTML = `${icons[this.theme]} <span>${this.theme}</span>`;
  }

  /**
   * PCT-WC-088: Form autosave with drafts
   */
  initFormAutosave() {
    // Add CSS for autosave indicator
    const style = document.createElement('style');
    style.textContent = `
      .autosave-indicator {
        position: fixed;
        bottom: 1rem;
        right: 1rem;
        padding: 0.5rem 1rem;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        font-size: 0.875rem;
        color: #6b7280;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        opacity: 0;
        transition: opacity 0.3s;
        pointer-events: none;
      }

      .autosave-indicator.visible {
        opacity: 1;
      }

      .autosave-indicator.saving {
        color: #3b82f6;
      }

      .autosave-indicator.saved {
        color: #10b981;
      }
    `;
    document.head.appendChild(style);

    // Create autosave indicator
    const indicator = document.createElement('div');
    indicator.className = 'autosave-indicator';
    indicator.innerHTML = '<span class="status">Saved</span>';
    document.body.appendChild(indicator);
    this.autosaveIndicator = indicator;

    console.log('[Advanced UI] Form autosave initialized');
  }

  /**
   * Enable autosave for a form
   */
  enableAutosave(formId, saveCallback, interval = 3000) {
    const form = document.getElementById(formId);
    if (!form) return;

    let saveTimeout;

    const autosave = () => {
      clearTimeout(saveTimeout);
      this.showAutosaveStatus('saving');

      saveTimeout = setTimeout(() => {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        // Save to localStorage
        localStorage.setItem(`autosave_${formId}`, JSON.stringify(data));

        // Call custom save callback if provided
        if (saveCallback) {
          saveCallback(data);
        }

        this.showAutosaveStatus('saved');
      }, interval);
    };

    // Watch for changes
    form.addEventListener('input', autosave);
    form.addEventListener('change', autosave);

    // Try to restore from autosave
    this.restoreAutosave(formId);

    this.autosaveTimers.set(formId, { autosave, form });
  }

  /**
   * Show autosave status
   */
  showAutosaveStatus(status) {
    const statusMap = {
      saving: 'Saving...',
      saved: 'Saved ✓',
    };

    this.autosaveIndicator.className = `autosave-indicator visible ${status}`;
    this.autosaveIndicator.querySelector('.status').textContent = statusMap[status];

    if (status === 'saved') {
      setTimeout(() => {
        this.autosaveIndicator.classList.remove('visible');
      }, 2000);
    }
  }

  /**
   * Restore autosaved data
   */
  restoreAutosave(formId) {
    const saved = localStorage.getItem(`autosave_${formId}`);
    if (!saved) return false;

    try {
      const data = JSON.parse(saved);
      const form = document.getElementById(formId);

      Object.entries(data).forEach(([name, value]) => {
        const input = form.querySelector(`[name="${name}"]`);
        if (input) {
          if (input.type === 'checkbox') {
            input.checked = value === 'on';
          } else {
            input.value = value;
          }
        }
      });

      return true;
    } catch (e) {
      console.error('[Autosave] Failed to restore:', e);
      return false;
    }
  }

  /**
   * Clear autosave for a form
   */
  clearAutosave(formId) {
    localStorage.removeItem(`autosave_${formId}`);
  }

  /**
   * PCT-WC-089: Infinite scroll
   */
  initInfiniteScroll() {
    console.log('[Advanced UI] Infinite scroll initialized');
  }

  /**
   * Enable infinite scroll for an element
   */
  enableInfiniteScroll(elementId, loadMoreCallback) {
    const element = document.getElementById(elementId);
    if (!element) return;

    // Create loading indicator
    const loader = document.createElement('div');
    loader.className = 'infinite-scroll-loader';
    loader.innerHTML = '<div class="spinner"></div><p>Loading more...</p>';
    loader.style.cssText = `
      display: none;
      text-align: center;
      padding: 2rem;
      color: #6b7280;
    `;
    element.appendChild(loader);

    // Intersection Observer for infinite scroll
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loader.style.display = 'block';
            loadMoreCallback().finally(() => {
              loader.style.display = 'none';
            });
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(loader);

    this.infiniteScrollObservers.set(elementId, observer);
  }

  /**
   * PCT-WC-090: Keyboard shortcuts
   */
  initKeyboardShortcuts() {
    // Register default shortcuts
    this.registerShortcut('mod+/', () => this.showShortcutsHelp());
    this.registerShortcut('mod+k', () => this.showCommandPalette());

    // Global keyboard listener
    document.addEventListener('keydown', (e) => {
      this.handleShortcut(e);
    });

    console.log('[Advanced UI] Keyboard shortcuts initialized');
  }

  /**
   * Register a keyboard shortcut
   */
  registerShortcut(keys, callback, description = '') {
    this.shortcuts.set(keys.toLowerCase(), { callback, description });
  }

  /**
   * Handle keyboard shortcut
   */
  handleShortcut(event) {
    const isMod = event.metaKey || event.ctrlKey;
    let keys = [];

    if (isMod) keys.push('mod');
    if (event.shiftKey) keys.push('shift');
    if (event.altKey) keys.push('alt');
    keys.push(event.key.toLowerCase());

    const shortcut = keys.join('+');
    const handler = this.shortcuts.get(shortcut);

    if (handler) {
      event.preventDefault();
      handler.callback();
    }
  }

  /**
   * Show shortcuts help
   */
  showShortcutsHelp() {
    const shortcuts = [
      { keys: 'Cmd+/', description: 'Show keyboard shortcuts' },
      { keys: 'Cmd+K', description: 'Open command palette' },
      { keys: 'Tab', description: 'Navigate between elements' },
      { keys: 'Esc', description: 'Close modals and overlays' },
      { keys: '←/→', description: 'Navigate tabs' },
    ];

    const modal = document.createElement('div');
    modal.className = 'shortcuts-modal';
    modal.innerHTML = `
      <div class="confirm-dialog-overlay">
        <div class="confirm-dialog" style="max-width: 500px;">
          <h2 style="margin-bottom: 1rem;">Keyboard Shortcuts</h2>
          <div style="margin-bottom: 1.5rem;">
            ${shortcuts
              .map(
                (s) => `
              <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #e5e7eb;">
                <span>${s.description}</span>
                <kbd style="background: #f3f4f6; padding: 0.25rem 0.5rem; border-radius: 4px; font-family: monospace;">${s.keys}</kbd>
              </div>
            `
              )
              .join('')}
          </div>
          <button class="confirm-dialog-btn confirm-dialog-btn-cancel" onclick="this.closest('.shortcuts-modal').remove()">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  /**
   * Show command palette
   */
  showCommandPalette() {
    if (window.toast) {
      window.toast('Command palette coming soon!', 'info');
    }
  }
}

// Create singleton instance
const pctAdvancedUI = new PCTAdvancedUI();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => pctAdvancedUI.init());
} else {
  pctAdvancedUI.init();
}

// Export for use in other modules
window.pctAdvancedUI = pctAdvancedUI;

// Global helper functions
window.confirm = async function (options) {
  return await pctAdvancedUI.confirm(options);
};

window.enableAutosave = function (formId, callback, interval) {
  pctAdvancedUI.enableAutosave(formId, callback, interval);
};

window.enableInfiniteScroll = function (elementId, callback) {
  pctAdvancedUI.enableInfiniteScroll(elementId, callback);
};

window.registerShortcut = function (keys, callback, description) {
  pctAdvancedUI.registerShortcut(keys, callback, description);
};
