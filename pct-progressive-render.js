/**
 * PCT Progressive Rendering (Streaming SSR Simulation)
 * Implements progressive rendering and lazy content loading
 * PCT-WC-060: Streaming SSR
 *
 * Note: True streaming SSR requires framework support (React 18+, Next.js, etc.)
 * This module provides progressive enhancement for vanilla JS apps.
 */

class PCTProgressiveRenderer {
  constructor() {
    this.pendingChunks = [];
    this.renderQueue = [];
    this.isRendering = false;
    this.chunkSize = 5; // Number of elements to render per frame
    this.priority = {
      critical: [],
      high: [],
      medium: [],
      low: [],
    };
    this.rendered = new WeakSet();
  }

  /**
   * Initialize progressive renderer
   */
  init() {
    // Mark critical content for immediate render
    this.markCriticalContent();

    // Set up progressive content loading
    this.setupProgressiveLoading();

    // Defer non-critical content
    this.deferNonCriticalContent();

    // Set up content visibility observers
    this.setupContentVisibility();

    console.log('[PCT Progressive Render] Initialized');
  }

  /**
   * Mark critical above-the-fold content
   */
  markCriticalContent() {
    // Critical elements that should render immediately
    const critical = [
      'header',
      'nav',
      '.pct-header',
      '.pct-tabs',
      '#pct-stats',
      '[data-critical]',
    ];

    critical.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        el.setAttribute('data-render-priority', 'critical');
        this.priority.critical.push(el);
      });
    });
  }

  /**
   * Set up progressive content loading
   */
  setupProgressiveLoading() {
    // Find all lazy-loadable content
    const lazyElements = document.querySelectorAll('[data-lazy], [data-defer]');

    lazyElements.forEach((el) => {
      const priority = el.getAttribute('data-priority') || 'low';

      // Add to appropriate queue
      if (this.priority[priority]) {
        this.priority[priority].push(el);
      } else {
        this.priority.low.push(el);
      }

      // Hide until ready to render
      if (!el.hasAttribute('data-critical')) {
        el.style.contentVisibility = 'auto';
        el.style.containIntrinsicSize = el.getAttribute('data-height') || '500px';
      }
    });

    // Start progressive rendering
    this.processRenderQueue();
  }

  /**
   * Defer non-critical content
   */
  deferNonCriticalContent() {
    // Automatically defer heavy content below the fold
    const deferrable = document.querySelectorAll('.pct-tab-panel:not(.active)');

    deferrable.forEach((panel) => {
      if (!panel.hasAttribute('data-render-priority')) {
        panel.setAttribute('data-defer', 'true');
        panel.style.contentVisibility = 'auto';

        // Estimate height to prevent layout shift
        const estimatedHeight = panel.getAttribute('data-estimated-height') || '1000px';
        panel.style.containIntrinsicSize = estimatedHeight;

        this.priority.low.push(panel);
      }
    });
  }

  /**
   * Set up content visibility observers
   */
  setupContentVisibility() {
    if (!('IntersectionObserver' in window)) return;

    // Observe deferred content
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const element = entry.target;

            // Render when visible
            if (!this.rendered.has(element)) {
              this.renderElement(element);
              observer.unobserve(element);
            }
          }
        });
      },
      {
        rootMargin: '200px', // Start loading 200px before visible
      }
    );

    // Observe all deferred elements
    [...this.priority.medium, ...this.priority.low].forEach((el) => {
      observer.observe(el);
    });

    // Track observer for cleanup
    if (window.pctMemoryManager) {
      window.pctMemoryManager.trackObserver(observer);
    }
  }

  /**
   * Process render queue
   */
  async processRenderQueue() {
    if (this.isRendering) return;
    this.isRendering = true;

    // Render in priority order
    await this.renderPriority('critical');
    await this.yieldToMain();

    await this.renderPriority('high');
    await this.yieldToMain();

    // Medium and low priority will be rendered on-demand via intersection observer

    this.isRendering = false;
  }

  /**
   * Render elements of a specific priority
   */
  async renderPriority(priority) {
    const elements = this.priority[priority] || [];

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];

      if (!this.rendered.has(element)) {
        this.renderElement(element);
      }

      // Yield to main thread every few elements
      if (i % this.chunkSize === 0) {
        await this.yieldToMain();
      }
    }
  }

  /**
   * Render a single element
   */
  renderElement(element) {
    if (this.rendered.has(element)) return;

    // Remove content-visibility
    element.style.contentVisibility = '';
    element.style.containIntrinsicSize = '';

    // Remove loading state
    element.classList.remove('loading');

    // Execute any deferred scripts
    const scripts = element.querySelectorAll('script[data-defer]');
    scripts.forEach((script) => {
      const newScript = document.createElement('script');
      newScript.textContent = script.textContent;
      script.parentNode.replaceChild(newScript, script);
    });

    // Mark as rendered
    this.rendered.add(element);

    // Dispatch event
    element.dispatchEvent(new CustomEvent('pct:rendered', { bubbles: true }));

    console.log('[PCT Progressive Render] Rendered:', this.getElementDescription(element));
  }

  /**
   * Yield to main thread
   */
  yieldToMain() {
    return new Promise((resolve) => {
      if ('scheduler' in window && 'yield' in window.scheduler) {
        window.scheduler.yield().then(resolve);
      } else {
        setTimeout(resolve, 0);
      }
    });
  }

  /**
   * Get element description for logging
   */
  getElementDescription(element) {
    if (element.id) return `#${element.id}`;
    if (element.className) return `.${element.className.split(' ')[0]}`;
    return element.tagName.toLowerCase();
  }

  /**
   * Manually trigger render for an element
   */
  render(element) {
    if (element instanceof HTMLElement) {
      this.renderElement(element);
    } else if (typeof element === 'string') {
      const el = document.querySelector(element);
      if (el) this.renderElement(el);
    }
  }

  /**
   * Render all pending content immediately (for dev/testing)
   */
  renderAll() {
    ['critical', 'high', 'medium', 'low'].forEach((priority) => {
      this.priority[priority].forEach((el) => this.renderElement(el));
    });
    console.log('[PCT Progressive Render] Rendered all content');
  }

  /**
   * Get render stats
   */
  getStats() {
    const total =
      this.priority.critical.length +
      this.priority.high.length +
      this.priority.medium.length +
      this.priority.low.length;

    const rendered = [
      ...this.priority.critical,
      ...this.priority.high,
      ...this.priority.medium,
      ...this.priority.low,
    ].filter((el) => this.rendered.has(el)).length;

    return {
      total,
      rendered,
      pending: total - rendered,
      byPriority: {
        critical: {
          total: this.priority.critical.length,
          rendered: this.priority.critical.filter((el) => this.rendered.has(el)).length,
        },
        high: {
          total: this.priority.high.length,
          rendered: this.priority.high.filter((el) => this.rendered.has(el)).length,
        },
        medium: {
          total: this.priority.medium.length,
          rendered: this.priority.medium.filter((el) => this.rendered.has(el)).length,
        },
        low: {
          total: this.priority.low.length,
          rendered: this.priority.low.filter((el) => this.rendered.has(el)).length,
        },
      },
    };
  }
}

/**
 * Streaming Response Simulator (for API responses)
 */
class PCTStreamingResponse {
  constructor() {
    this.handlers = new Map();
  }

  /**
   * Simulate streaming response
   * @param {string} url - API endpoint
   * @param {Function} onChunk - Callback for each chunk
   * @param {Object} options - Fetch options
   */
  async stream(url, onChunk, options = {}) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Accept: 'application/x-ndjson, application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');

      // Handle streaming response
      if (response.body && typeof response.body.getReader === 'function') {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete lines (NDJSON)
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.trim()) {
              try {
                const chunk = JSON.parse(line);
                await onChunk(chunk);
              } catch (e) {
                console.warn('[PCT Streaming] Failed to parse chunk:', e);
              }
            }
          }
        }

        // Process any remaining buffer
        if (buffer.trim()) {
          try {
            const chunk = JSON.parse(buffer);
            await onChunk(chunk);
          } catch (e) {
            console.warn('[PCT Streaming] Failed to parse final chunk:', e);
          }
        }
      } else {
        // Fallback: Regular JSON response
        const data = await response.json();
        await onChunk(data);
      }
    } catch (error) {
      console.error('[PCT Streaming] Stream failed:', error);
      throw error;
    }
  }
}

// Create singleton instances
const pctProgressiveRenderer = new PCTProgressiveRenderer();
const pctStreamingResponse = new PCTStreamingResponse();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => pctProgressiveRenderer.init());
} else {
  pctProgressiveRenderer.init();
}

// Export for use in other modules
window.pctProgressiveRenderer = pctProgressiveRenderer;
window.pctStreamingResponse = pctStreamingResponse;

// Helper: Mark element as deferred
window.pctDefer = function (selector, priority = 'low') {
  const elements = document.querySelectorAll(selector);
  elements.forEach((el) => {
    el.setAttribute('data-defer', 'true');
    el.setAttribute('data-priority', priority);
  });
};

// Helper: Mark element as critical
window.pctCritical = function (selector) {
  const elements = document.querySelectorAll(selector);
  elements.forEach((el) => {
    el.setAttribute('data-critical', 'true');
    el.setAttribute('data-render-priority', 'critical');
  });
};
