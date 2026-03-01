/**
 * PCT Memory Manager
 * Prevents memory leaks from event listeners, DOM references, and timers
 * PCT-WC-056: Memory optimization
 */

class PCTMemoryManager {
  constructor() {
    this.listeners = new Map(); // Track all event listeners
    this.timers = new Set(); // Track all timers
    this.observers = new Set(); // Track all observers (MutationObserver, IntersectionObserver, etc.)
    this.weakRefs = new WeakMap(); // Store weak references to large objects
    this.cleanupTasks = []; // Functions to run on cleanup
    this.initialized = false;
  }

  /**
   * Initialize memory manager
   */
  init() {
    if (this.initialized) return;
    this.initialized = true;

    // Clean up on page unload
    window.addEventListener('beforeunload', () => this.cleanup());

    // Monitor memory usage (if available)
    if (performance.memory) {
      this.startMemoryMonitoring();
    }

    console.log('[PCT Memory Manager] Initialized');
  }

  /**
   * Add event listener with tracking
   * @param {Element|Window|Document} target
   * @param {string} event
   * @param {Function} handler
   * @param {Object|Boolean} options
   */
  addEventListener(target, event, handler, options = false) {
    if (!target || !event || !handler) return;

    // Add the listener
    target.addEventListener(event, handler, options);

    // Track it
    const key = this.getListenerKey(target, event, handler);
    if (!this.listeners.has(key)) {
      this.listeners.set(key, { target, event, handler, options });
    }

    return () => this.removeEventListener(target, event, handler, options);
  }

  /**
   * Remove event listener
   */
  removeEventListener(target, event, handler, options = false) {
    if (!target || !event || !handler) return;

    target.removeEventListener(event, handler, options);

    const key = this.getListenerKey(target, event, handler);
    this.listeners.delete(key);
  }

  /**
   * Generate unique key for listener
   */
  getListenerKey(target, event, handler) {
    return `${this.getTargetId(target)}_${event}_${handler.name || handler.toString().substring(0, 50)}`;
  }

  /**
   * Get unique ID for target
   */
  getTargetId(target) {
    if (target === window) return 'window';
    if (target === document) return 'document';
    if (target.id) return target.id;
    if (target.className) return target.className;
    return target.tagName || 'unknown';
  }

  /**
   * Track setTimeout
   */
  setTimeout(callback, delay, ...args) {
    const timerId = setTimeout(() => {
      callback(...args);
      this.timers.delete(timerId);
    }, delay);

    this.timers.add(timerId);
    return timerId;
  }

  /**
   * Track setInterval
   */
  setInterval(callback, delay, ...args) {
    const timerId = setInterval(callback, delay, ...args);
    this.timers.add(timerId);
    return timerId;
  }

  /**
   * Clear timer
   */
  clearTimer(timerId) {
    clearTimeout(timerId);
    clearInterval(timerId);
    this.timers.delete(timerId);
  }

  /**
   * Track observer
   */
  trackObserver(observer) {
    this.observers.add(observer);
    return observer;
  }

  /**
   * Untrack observer
   */
  untrackObserver(observer) {
    if (observer) {
      observer.disconnect();
      this.observers.delete(observer);
    }
  }

  /**
   * Add cleanup task
   */
  onCleanup(fn) {
    if (typeof fn === 'function') {
      this.cleanupTasks.push(fn);
    }
  }

  /**
   * Clean up all tracked resources
   */
  cleanup() {
    console.log('[PCT Memory Manager] Starting cleanup...');

    // Remove all event listeners
    for (const [key, { target, event, handler, options }] of this.listeners.entries()) {
      try {
        target.removeEventListener(event, handler, options);
      } catch (e) {
        console.warn('[PCT Memory Manager] Failed to remove listener:', key, e);
      }
    }
    this.listeners.clear();

    // Clear all timers
    for (const timerId of this.timers) {
      try {
        clearTimeout(timerId);
        clearInterval(timerId);
      } catch (e) {
        console.warn('[PCT Memory Manager] Failed to clear timer:', timerId, e);
      }
    }
    this.timers.clear();

    // Disconnect all observers
    for (const observer of this.observers) {
      try {
        observer.disconnect();
      } catch (e) {
        console.warn('[PCT Memory Manager] Failed to disconnect observer:', e);
      }
    }
    this.observers.clear();

    // Run cleanup tasks
    for (const task of this.cleanupTasks) {
      try {
        task();
      } catch (e) {
        console.warn('[PCT Memory Manager] Cleanup task failed:', e);
      }
    }
    this.cleanupTasks = [];

    console.log('[PCT Memory Manager] Cleanup complete');
  }

  /**
   * Monitor memory usage
   */
  startMemoryMonitoring() {
    const checkMemory = () => {
      if (!performance.memory) return;

      const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = performance.memory;
      const usedMB = (usedJSHeapSize / 1048576).toFixed(2);
      const totalMB = (totalJSHeapSize / 1048576).toFixed(2);
      const limitMB = (jsHeapSizeLimit / 1048576).toFixed(2);
      const usagePercent = ((usedJSHeapSize / jsHeapSizeLimit) * 100).toFixed(2);

      // Warn if memory usage is high
      if (usagePercent > 80) {
        console.warn(`[PCT Memory Manager] High memory usage: ${usagePercent}% (${usedMB}MB / ${limitMB}MB)`);
      }

      // Log memory stats every minute
      const stats = {
        used: usedMB,
        total: totalMB,
        limit: limitMB,
        usagePercent: usagePercent,
        listeners: this.listeners.size,
        timers: this.timers.size,
        observers: this.observers.size,
      };

      // Store in sessionStorage for monitoring
      try {
        const history = JSON.parse(sessionStorage.getItem('pct_memory_history') || '[]');
        history.push({ timestamp: Date.now(), ...stats });
        // Keep only last 60 entries (1 hour if checked every minute)
        if (history.length > 60) history.shift();
        sessionStorage.setItem('pct_memory_history', JSON.stringify(history));
      } catch (e) {
        // Ignore storage errors
      }
    };

    // Check every 60 seconds
    const timerId = setInterval(checkMemory, 60000);
    this.timers.add(timerId);

    // Initial check
    checkMemory();
  }

  /**
   * Get memory stats
   */
  getMemoryStats() {
    const stats = {
      listeners: this.listeners.size,
      timers: this.timers.size,
      observers: this.observers.size,
      cleanupTasks: this.cleanupTasks.length,
    };

    if (performance.memory) {
      const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = performance.memory;
      stats.memory = {
        usedMB: (usedJSHeapSize / 1048576).toFixed(2),
        totalMB: (totalJSHeapSize / 1048576).toFixed(2),
        limitMB: (jsHeapSizeLimit / 1048576).toFixed(2),
        usagePercent: ((usedJSHeapSize / jsHeapSizeLimit) * 100).toFixed(2),
      };
    }

    return stats;
  }

  /**
   * Force garbage collection (if available)
   */
  forceGC() {
    if (window.gc) {
      console.log('[PCT Memory Manager] Forcing garbage collection...');
      window.gc();
    } else {
      console.warn('[PCT Memory Manager] gc() not available. Run Chrome with --expose-gc flag.');
    }
  }
}

// Create singleton instance
const pctMemoryManager = new PCTMemoryManager();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => pctMemoryManager.init());
} else {
  pctMemoryManager.init();
}

// Export for use in other modules
window.pctMemoryManager = pctMemoryManager;

// SSR leak prevention
if (typeof window === 'undefined') {
  console.warn('[PCT Memory Manager] Running in SSR context - memory manager disabled');
  module.exports = {
    addEventListener: () => {},
    removeEventListener: () => {},
    setTimeout: setTimeout,
    setInterval: setInterval,
    clearTimer: (id) => { clearTimeout(id); clearInterval(id); },
    cleanup: () => {},
    trackObserver: (obs) => obs,
    untrackObserver: () => {},
    onCleanup: () => {},
    getMemoryStats: () => ({}),
    forceGC: () => {},
  };
}
