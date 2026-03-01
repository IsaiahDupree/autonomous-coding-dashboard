/**
 * PCT UI Enhancements
 * Loading states, empty states, error boundaries, and toast notifications
 * PCT-WC-081 through PCT-WC-084
 */

class PCTUIEnhancements {
  constructor() {
    this.toasts = [];
    this.maxToasts = 3;
    this.toastContainer = null;
  }

  /**
   * Initialize UI enhancements
   */
  init() {
    console.log('[UI Enhancements] Initializing...');

    // PCT-WC-081: Loading skeletons
    this.initLoadingSkeletons();

    // PCT-WC-082: Empty states
    this.initEmptyStates();

    // PCT-WC-083: Error boundary
    this.initErrorBoundary();

    // PCT-WC-084: Toast notifications
    this.initToastSystem();

    console.log('[UI Enhancements] Initialized');
  }

  /**
   * PCT-WC-081: Initialize loading skeleton system
   */
  initLoadingSkeletons() {
    // Add CSS for skeleton loading states
    const style = document.createElement('style');
    style.textContent = `
      .skeleton {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: skeleton-loading 1.5s ease-in-out infinite;
        border-radius: 4px;
      }

      @keyframes skeleton-loading {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }

      .skeleton-text {
        height: 1em;
        margin-bottom: 0.5em;
      }

      .skeleton-title {
        height: 1.5em;
        width: 60%;
        margin-bottom: 1em;
      }

      .skeleton-avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
      }

      .skeleton-card {
        padding: 1rem;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        margin-bottom: 1rem;
      }

      .skeleton-list-item {
        display: flex;
        gap: 1rem;
        padding: 1rem;
        border-bottom: 1px solid #e5e7eb;
      }

      /* Reduce motion for accessibility */
      @media (prefers-reduced-motion: reduce) {
        .skeleton {
          animation: none;
          background: #f0f0f0;
        }
      }
    `;
    document.head.appendChild(style);

    console.log('[UI] Loading skeletons initialized');
  }

  /**
   * Create loading skeleton
   */
  createSkeleton(type = 'default', count = 3) {
    const container = document.createElement('div');
    container.className = 'skeleton-container';

    for (let i = 0; i < count; i++) {
      let skeleton;

      switch (type) {
        case 'list':
          skeleton = this.createListSkeleton();
          break;
        case 'card':
          skeleton = this.createCardSkeleton();
          break;
        case 'detail':
          skeleton = this.createDetailSkeleton();
          break;
        case 'form':
          skeleton = this.createFormSkeleton();
          break;
        default:
          skeleton = this.createDefaultSkeleton();
      }

      container.appendChild(skeleton);
    }

    return container;
  }

  createListSkeleton() {
    const item = document.createElement('div');
    item.className = 'skeleton-list-item';
    item.innerHTML = `
      <div class="skeleton skeleton-avatar"></div>
      <div style="flex: 1;">
        <div class="skeleton skeleton-text" style="width: 40%;"></div>
        <div class="skeleton skeleton-text" style="width: 80%;"></div>
      </div>
    `;
    return item;
  }

  createCardSkeleton() {
    const card = document.createElement('div');
    card.className = 'skeleton-card';
    card.innerHTML = `
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-text" style="width: 90%;"></div>
      <div class="skeleton skeleton-text" style="width: 70%;"></div>
    `;
    return card;
  }

  createDetailSkeleton() {
    const detail = document.createElement('div');
    detail.className = 'skeleton-card';
    detail.innerHTML = `
      <div class="skeleton skeleton-title" style="width: 50%;"></div>
      <div style="margin: 1.5rem 0;">
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text" style="width: 60%;"></div>
      </div>
      <div class="skeleton skeleton-text" style="height: 40px; width: 120px;"></div>
    `;
    return detail;
  }

  createFormSkeleton() {
    const form = document.createElement('div');
    form.className = 'skeleton-card';
    form.innerHTML = `
      <div class="skeleton skeleton-text" style="width: 30%; height: 1rem; margin-bottom: 0.5rem;"></div>
      <div class="skeleton skeleton-text" style="height: 40px; margin-bottom: 1rem;"></div>
      <div class="skeleton skeleton-text" style="width: 30%; height: 1rem; margin-bottom: 0.5rem;"></div>
      <div class="skeleton skeleton-text" style="height: 40px; margin-bottom: 1rem;"></div>
      <div class="skeleton skeleton-text" style="height: 40px; width: 120px;"></div>
    `;
    return form;
  }

  createDefaultSkeleton() {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton skeleton-text';
    return skeleton;
  }

  /**
   * PCT-WC-082: Initialize empty state system
   */
  initEmptyStates() {
    // Add CSS for empty states
    const style = document.createElement('style');
    style.textContent = `
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem 1rem;
        text-align: center;
      }

      .empty-state-icon {
        font-size: 4rem;
        opacity: 0.3;
        margin-bottom: 1rem;
      }

      .empty-state-title {
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--color-text);
        margin-bottom: 0.5rem;
      }

      .empty-state-message {
        font-size: 0.9375rem;
        color: var(--color-text-light);
        margin-bottom: 1.5rem;
        max-width: 400px;
      }

      .empty-state-action {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.625rem 1.25rem;
        background: var(--color-primary);
        color: white;
        border: none;
        border-radius: 6px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }

      .empty-state-action:hover {
        background: var(--color-primary-dark);
        transform: translateY(-1px);
      }
    `;
    document.head.appendChild(style);

    console.log('[UI] Empty states initialized');
  }

  /**
   * Create empty state component
   */
  createEmptyState(options = {}) {
    const {
      icon = '📭',
      title = 'No items found',
      message = 'Get started by creating a new item',
      actionLabel = 'Create New',
      actionCallback = null,
    } = options;

    const container = document.createElement('div');
    container.className = 'empty-state';

    container.innerHTML = `
      <div class="empty-state-icon">${icon}</div>
      <div class="empty-state-title">${title}</div>
      <div class="empty-state-message">${message}</div>
      ${
        actionLabel
          ? `<button class="empty-state-action">${actionLabel}</button>`
          : ''
      }
    `;

    if (actionCallback && actionLabel) {
      const button = container.querySelector('.empty-state-action');
      button.addEventListener('click', actionCallback);
    }

    return container;
  }

  /**
   * PCT-WC-083: Initialize error boundary
   */
  initErrorBoundary() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.handleError(event.error || event.message);
    });

    // Promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason);
    });

    console.log('[UI] Error boundary initialized');
  }

  /**
   * Handle and display errors
   */
  handleError(error) {
    console.error('[Error Boundary]', error);

    // Don't show error UI for certain types of errors
    if (error && error.message && error.message.includes('ResizeObserver')) {
      return; // Ignore ResizeObserver errors
    }

    // Show error UI
    this.showErrorUI(error);
  }

  /**
   * Show error UI
   */
  showErrorUI(error) {
    const existingError = document.getElementById('global-error-ui');
    if (existingError) return; // Don't show multiple error UIs

    const errorMessage = error?.message || error?.toString() || 'An unexpected error occurred';

    const errorUI = document.createElement('div');
    errorUI.id = 'global-error-ui';
    errorUI.innerHTML = `
      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;">
        <div style="background: white; border-radius: 12px; padding: 2rem; max-width: 500px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
          <div style="font-size: 3rem; text-align: center; margin-bottom: 1rem;">⚠️</div>
          <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem; text-align: center;">Something went wrong</h2>
          <p style="color: #6b7280; margin-bottom: 1.5rem; text-align: center;">${errorMessage}</p>
          <div style="display: flex; gap: 0.75rem; justify-content: center;">
            <button id="error-retry-btn" style="padding: 0.625rem 1.25rem; background: #6366f1; color: white; border: none; border-radius: 6px; font-weight: 500; cursor: pointer;">Retry</button>
            <button id="error-report-btn" style="padding: 0.625rem 1.25rem; background: transparent; color: #6366f1; border: 1px solid #6366f1; border-radius: 6px; font-weight: 500; cursor: pointer;">Report Issue</button>
            <button id="error-dismiss-btn" style="padding: 0.625rem 1.25rem; background: #e5e7eb; color: #374151; border: none; border-radius: 6px; font-weight: 500; cursor: pointer;">Dismiss</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(errorUI);

    // Retry button
    document.getElementById('error-retry-btn').addEventListener('click', () => {
      window.location.reload();
    });

    // Report button
    document.getElementById('error-report-btn').addEventListener('click', () => {
      console.log('Error reported:', error);
      this.toast('Error reported. Thank you!', 'success');
      errorUI.remove();
    });

    // Dismiss button
    document.getElementById('error-dismiss-btn').addEventListener('click', () => {
      errorUI.remove();
    });
  }

  /**
   * PCT-WC-084: Initialize toast notification system
   */
  initToastSystem() {
    // Create toast container
    if (!this.toastContainer) {
      this.toastContainer = document.createElement('div');
      this.toastContainer.id = 'pct-toast-container';
      this.toastContainer.className = 'toast-container';
      document.body.appendChild(this.toastContainer);
    }

    // Add CSS for toasts
    const style = document.createElement('style');
    style.textContent = `
      .toast-container {
        position: fixed;
        top: 1rem;
        right: 1rem;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        max-width: 400px;
      }

      .toast {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 1rem;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        border-left: 4px solid #6366f1;
        animation: toast-slide-in 0.3s ease-out;
        transition: opacity 0.3s, transform 0.3s;
      }

      .toast.toast-success { border-left-color: #10b981; }
      .toast.toast-error { border-left-color: #ef4444; }
      .toast.toast-warning { border-left-color: #f59e0b; }
      .toast.toast-info { border-left-color: #3b82f6; }

      .toast.toast-exit {
        opacity: 0;
        transform: translateX(100%);
      }

      .toast-icon {
        font-size: 1.25rem;
        flex-shrink: 0;
      }

      .toast-content {
        flex: 1;
      }

      .toast-title {
        font-weight: 600;
        margin-bottom: 0.25rem;
        color: #111827;
      }

      .toast-message {
        font-size: 0.875rem;
        color: #6b7280;
      }

      .toast-close {
        background: none;
        border: none;
        font-size: 1.25rem;
        color: #9ca3af;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background 0.2s;
      }

      .toast-close:hover {
        background: #f3f4f6;
      }

      @keyframes toast-slide-in {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @media (max-width: 640px) {
        .toast-container {
          left: 1rem;
          right: 1rem;
          max-width: none;
        }
      }
    `;
    document.head.appendChild(style);

    console.log('[UI] Toast system initialized');
  }

  /**
   * Show toast notification
   */
  toast(message, type = 'info', duration = 3000) {
    // Limit number of toasts
    if (this.toasts.length >= this.maxToasts) {
      this.toasts[0].element.remove();
      this.toasts.shift();
    }

    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ',
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || icons.info}</div>
      <div class="toast-content">
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close">×</button>
    `;

    const toastData = { element: toast, type };
    this.toasts.push(toastData);

    this.toastContainer.appendChild(toast);

    // Close button
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      this.removeToast(toastData);
    });

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => {
        this.removeToast(toastData);
      }, duration);
    }

    return toastData;
  }

  /**
   * Remove toast
   */
  removeToast(toastData) {
    const index = this.toasts.indexOf(toastData);
    if (index > -1) {
      toastData.element.classList.add('toast-exit');
      setTimeout(() => {
        toastData.element.remove();
        this.toasts.splice(index, 1);
      }, 300);
    }
  }

  /**
   * Show loading skeleton in target element
   */
  showLoading(targetElement, type = 'default', count = 3) {
    if (typeof targetElement === 'string') {
      targetElement = document.querySelector(targetElement);
    }

    if (!targetElement) return;

    const skeleton = this.createSkeleton(type, count);
    targetElement.innerHTML = '';
    targetElement.appendChild(skeleton);
  }

  /**
   * Show empty state in target element
   */
  showEmptyState(targetElement, options) {
    if (typeof targetElement === 'string') {
      targetElement = document.querySelector(targetElement);
    }

    if (!targetElement) return;

    const emptyState = this.createEmptyState(options);
    targetElement.innerHTML = '';
    targetElement.appendChild(emptyState);
  }
}

// Create singleton instance
const pctUIEnhancements = new PCTUIEnhancements();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => pctUIEnhancements.init());
} else {
  pctUIEnhancements.init();
}

// Export for use in other modules
window.pctUI = pctUIEnhancements;

// Global helper functions
window.toast = function (message, type, duration) {
  return pctUIEnhancements.toast(message, type, duration);
};

window.showLoading = function (target, type, count) {
  pctUIEnhancements.showLoading(target, type, count);
};

window.showEmptyState = function (target, options) {
  pctUIEnhancements.showEmptyState(target, options);
};
