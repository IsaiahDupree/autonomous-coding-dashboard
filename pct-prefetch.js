/**
 * PCT Navigation Prefetching
 * Prefetch routes and data for instant navigation
 * PCT-WC-058: Navigation prefetching
 */

class PCTPrefetchManager {
  constructor() {
    this.prefetchedUrls = new Set();
    this.prefetchedData = new Map();
    this.observer = null;
    this.enabled = true;
    this.strategy = 'hover'; // 'hover', 'visible', 'eager'
    this.maxConcurrent = 3;
    this.activePrefetches = 0;
    this.queue = [];

    // Configuration
    this.config = {
      // Wait time before prefetching on hover (ms)
      hoverDelay: 50,
      // Prefetch data endpoints
      dataPrefetch: true,
      // Prefetch images
      imagePrefetch: true,
      // Prefetch scripts
      scriptPrefetch: false,
      // Cache duration (ms)
      cacheDuration: 5 * 60 * 1000, // 5 minutes
    };
  }

  /**
   * Initialize prefetch manager
   */
  init() {
    if (!this.enabled) return;

    // Set up link prefetching
    this.setupLinkPrefetching();

    // Set up data prefetching
    if (this.config.dataPrefetch) {
      this.setupDataPrefetching();
    }

    // Set up intersection observer for visible links
    if (this.strategy === 'visible') {
      this.setupIntersectionObserver();
    }

    console.log('[PCT Prefetch] Initialized with strategy:', this.strategy);
  }

  /**
   * Set up link prefetching
   */
  setupLinkPrefetching() {
    // Prefetch on hover
    if (this.strategy === 'hover') {
      document.addEventListener(
        'mouseover',
        (e) => {
          const link = e.target.closest('a[href]');
          if (link && this.shouldPrefetch(link)) {
            this.prefetchLinkWithDelay(link);
          }
        },
        { passive: true }
      );
    }

    // Prefetch on touch (for mobile)
    document.addEventListener(
      'touchstart',
      (e) => {
        const link = e.target.closest('a[href]');
        if (link && this.shouldPrefetch(link)) {
          this.prefetchLink(link);
        }
      },
      { passive: true }
    );

    // Eager prefetch for high-priority links
    if (this.strategy === 'eager') {
      this.prefetchEagerLinks();
    }
  }

  /**
   * Set up data prefetching
   */
  setupDataPrefetching() {
    // Prefetch data when hovering over interactive elements
    document.addEventListener(
      'mouseover',
      (e) => {
        const element = e.target.closest('[data-prefetch]');
        if (element) {
          const url = element.dataset.prefetch;
          if (url) {
            this.prefetchData(url);
          }
        }
      },
      { passive: true }
    );
  }

  /**
   * Set up intersection observer for visible links
   */
  setupIntersectionObserver() {
    if (this.observer) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const link = entry.target;
            if (this.shouldPrefetch(link)) {
              this.prefetchLink(link);
            }
          }
        });
      },
      {
        rootMargin: '200px', // Start prefetching 200px before element is visible
      }
    );

    // Observe all links
    this.observeLinks();

    // Re-observe when DOM changes
    const mutationObserver = new MutationObserver(() => {
      this.observeLinks();
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    window.pctMemoryManager?.trackObserver(this.observer);
    window.pctMemoryManager?.trackObserver(mutationObserver);
  }

  /**
   * Observe all links
   */
  observeLinks() {
    if (!this.observer) return;

    const links = document.querySelectorAll('a[href]');
    links.forEach((link) => {
      if (this.shouldPrefetch(link)) {
        this.observer.observe(link);
      }
    });
  }

  /**
   * Check if link should be prefetched
   */
  shouldPrefetch(link) {
    const href = link.getAttribute('href');
    if (!href) return false;

    // Skip external links
    if (href.startsWith('http') && !href.startsWith(window.location.origin)) {
      return false;
    }

    // Skip mailto, tel, etc.
    if (href.startsWith('mailto:') || href.startsWith('tel:')) {
      return false;
    }

    // Skip if already prefetched
    if (this.prefetchedUrls.has(href)) {
      return false;
    }

    // Skip if link has data-no-prefetch
    if (link.hasAttribute('data-no-prefetch')) {
      return false;
    }

    return true;
  }

  /**
   * Prefetch link with delay
   */
  prefetchLinkWithDelay(link) {
    const href = link.getAttribute('href');

    // Clear any existing timeout for this link
    if (link._prefetchTimeout) {
      clearTimeout(link._prefetchTimeout);
    }

    link._prefetchTimeout = setTimeout(() => {
      this.prefetchLink(link);
    }, this.config.hoverDelay);
  }

  /**
   * Prefetch a link
   */
  async prefetchLink(link) {
    const href = link.getAttribute('href');
    if (!href || this.prefetchedUrls.has(href)) return;

    // Queue if too many concurrent prefetches
    if (this.activePrefetches >= this.maxConcurrent) {
      this.queue.push(() => this.prefetchLink(link));
      return;
    }

    this.activePrefetches++;
    this.prefetchedUrls.add(href);

    try {
      // Use link rel=prefetch if available
      if ('HTMLLinkElement' in window) {
        const linkEl = document.createElement('link');
        linkEl.rel = 'prefetch';
        linkEl.href = href;
        linkEl.as = 'document';
        document.head.appendChild(linkEl);

        console.log('[PCT Prefetch] Prefetched link:', href);
      } else {
        // Fallback: fetch the page
        await fetch(href, { method: 'GET', credentials: 'same-origin' });
        console.log('[PCT Prefetch] Prefetched page:', href);
      }
    } catch (e) {
      console.warn('[PCT Prefetch] Failed to prefetch:', href, e);
      this.prefetchedUrls.delete(href);
    } finally {
      this.activePrefetches--;
      this.processQueue();
    }
  }

  /**
   * Prefetch data endpoint
   */
  async prefetchData(url) {
    if (this.prefetchedData.has(url)) {
      const cached = this.prefetchedData.get(url);
      if (Date.now() - cached.timestamp < this.config.cacheDuration) {
        console.log('[PCT Prefetch] Using cached data:', url);
        return cached.data;
      }
    }

    try {
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          'X-Prefetch': 'true',
        },
      });

      if (response.ok) {
        const data = await response.json();
        this.prefetchedData.set(url, {
          data,
          timestamp: Date.now(),
        });

        console.log('[PCT Prefetch] Prefetched data:', url);
        return data;
      }
    } catch (e) {
      console.warn('[PCT Prefetch] Failed to prefetch data:', url, e);
    }

    return null;
  }

  /**
   * Get prefetched data
   */
  getPrefetchedData(url) {
    const cached = this.prefetchedData.get(url);
    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.timestamp > this.config.cacheDuration) {
      this.prefetchedData.delete(url);
      return null;
    }

    return cached.data;
  }

  /**
   * Prefetch eager links (high priority)
   */
  prefetchEagerLinks() {
    const eagerLinks = document.querySelectorAll('a[data-prefetch="eager"]');
    eagerLinks.forEach((link) => this.prefetchLink(link));
  }

  /**
   * Process prefetch queue
   */
  processQueue() {
    if (this.queue.length === 0) return;
    if (this.activePrefetches >= this.maxConcurrent) return;

    const next = this.queue.shift();
    if (next) next();
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.prefetchedUrls.clear();
    this.prefetchedData.clear();
    console.log('[PCT Prefetch] Cache cleared');
  }

  /**
   * Set strategy
   */
  setStrategy(strategy) {
    if (['hover', 'visible', 'eager'].includes(strategy)) {
      this.strategy = strategy;
      console.log('[PCT Prefetch] Strategy set to:', strategy);

      // Re-initialize if needed
      if (strategy === 'visible') {
        this.setupIntersectionObserver();
      } else if (strategy === 'eager') {
        this.prefetchEagerLinks();
      }
    }
  }

  /**
   * Enable/disable prefetching
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    console.log('[PCT Prefetch] Prefetching', enabled ? 'enabled' : 'disabled');
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      prefetchedUrls: this.prefetchedUrls.size,
      cachedData: this.prefetchedData.size,
      activePrefetches: this.activePrefetches,
      queueLength: this.queue.length,
      strategy: this.strategy,
      enabled: this.enabled,
    };
  }
}

// Create singleton instance
const pctPrefetchManager = new PCTPrefetchManager();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => pctPrefetchManager.init());
} else {
  pctPrefetchManager.init();
}

// Export for use in other modules
window.pctPrefetchManager = pctPrefetchManager;
