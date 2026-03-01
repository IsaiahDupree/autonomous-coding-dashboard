/**
 * Client-Side Data Caching
 * Simple SWR (Stale-While-Revalidate) implementation
 */

class ClientCache {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.subscribers = new Map();

    // Default configuration
    this.config = {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    };

    this.setupEventListeners();
  }

  setupEventListeners() {
    if (this.config.revalidateOnFocus) {
      window.addEventListener('focus', () => this.revalidateAll());
    }

    if (this.config.revalidateOnReconnect) {
      window.addEventListener('online', () => this.revalidateAll());
    }
  }

  /**
   * Fetch data with caching
   */
  async fetch(key, fetcher, options = {}) {
    const opts = { ...this.config, ...options };

    // Check cache
    const cached = this.cache.get(key);
    if (cached) {
      const age = Date.now() - cached.timestamp;

      // Return cached data if still fresh
      if (age < opts.staleTime) {
        return { data: cached.data, fromCache: true };
      }

      // Revalidate in background if stale
      if (age < opts.cacheTime) {
        this.revalidate(key, fetcher, opts);
        return { data: cached.data, fromCache: true, revalidating: true };
      }
    }

    // Deduplicate requests
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    // Fetch fresh data
    const promise = this.fetchFresh(key, fetcher, opts);
    this.pendingRequests.set(key, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      this.pendingRequests.delete(key);
    }
  }

  async fetchFresh(key, fetcher, opts) {
    try {
      const data = await fetcher();

      // Store in cache
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
      });

      // Notify subscribers
      this.notify(key, data);

      // Schedule cleanup
      setTimeout(() => {
        if (this.cache.has(key)) {
          const cached = this.cache.get(key);
          const age = Date.now() - cached.timestamp;

          if (age >= opts.cacheTime) {
            this.cache.delete(key);
          }
        }
      }, opts.cacheTime);

      return { data, fromCache: false };
    } catch (error) {
      console.error(`Cache fetch error for key "${key}":`, error);

      // Return stale data on error if available
      const cached = this.cache.get(key);
      if (cached) {
        return { data: cached.data, fromCache: true, error };
      }

      throw error;
    }
  }

  async revalidate(key, fetcher, opts) {
    try {
      const data = await fetcher();

      this.cache.set(key, {
        data,
        timestamp: Date.now(),
      });

      this.notify(key, data);
    } catch (error) {
      console.error(`Revalidation error for key "${key}":`, error);
    }
  }

  revalidateAll() {
    // Revalidate all cached entries that have subscribers
    for (const [key, subs] of this.subscribers.entries()) {
      if (subs.size > 0) {
        // Would need to store fetcher with key to revalidate
        // For now, just notify subscribers to refetch
        this.notify(key, null);
      }
    }
  }

  /**
   * Subscribe to cache updates
   */
  subscribe(key, callback) {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }

    this.subscribers.get(key).add(callback);

    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(key);
      if (subs) {
        subs.delete(callback);

        if (subs.size === 0) {
          this.subscribers.delete(key);
        }
      }
    };
  }

  notify(key, data) {
    const subs = this.subscribers.get(key);
    if (subs) {
      subs.forEach((callback) => callback(data));
    }
  }

  /**
   * Invalidate cache entry
   */
  invalidate(key) {
    this.cache.delete(key);
    this.notify(key, null);
  }

  /**
   * Invalidate multiple keys by pattern
   */
  invalidatePattern(pattern) {
    const regex = new RegExp(pattern);
    const keysToInvalidate = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToInvalidate.push(key);
      }
    }

    keysToInvalidate.forEach((key) => this.invalidate(key));
  }

  /**
   * Mutate cached data
   */
  mutate(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    this.notify(key, data);
  }

  /**
   * Optimistic update
   */
  optimisticUpdate(key, updater, rollback) {
    const cached = this.cache.get(key);
    const oldData = cached ? cached.data : null;

    // Apply optimistic update
    const newData = typeof updater === 'function' ? updater(oldData) : updater;
    this.mutate(key, newData);

    return {
      rollback: () => {
        if (oldData !== null) {
          this.mutate(key, oldData);
        }

        if (rollback) {
          rollback();
        }
      },
    };
  }

  /**
   * Prefetch data
   */
  async prefetch(key, fetcher, options = {}) {
    if (this.cache.has(key)) {
      return; // Already cached
    }

    await this.fetch(key, fetcher, options);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.subscribers.clear();
    this.pendingRequests.clear();
  }

  /**
   * Get cache stats
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      subscribers: this.subscribers.size,
      pendingRequests: this.pendingRequests.size,
    };
  }
}

// Singleton instance
const cache = new ClientCache();

/**
 * useSWR-like hook pattern for vanilla JS
 */
function useCache(key, fetcher, options = {}) {
  const updateCallback = options.onUpdate || (() => {});

  // Subscribe to updates
  const unsubscribe = cache.subscribe(key, (data) => {
    updateCallback(data);
  });

  // Fetch data
  const promise = cache.fetch(key, fetcher, options);

  return {
    promise,
    unsubscribe,
    revalidate: () => cache.revalidate(key, fetcher, options),
    invalidate: () => cache.invalidate(key),
    mutate: (data) => cache.mutate(key, data),
  };
}

/**
 * Preload commonly accessed data
 */
async function preloadPCTData() {
  const brandId = localStorage.getItem('pct-selected-brand');
  const productId = localStorage.getItem('pct-selected-product');

  if (brandId) {
    cache.prefetch(`brand-${brandId}`, () =>
      fetch(`/api/pct/brands/${brandId}`).then((r) => r.json())
    );
  }

  if (productId) {
    cache.prefetch(`product-${productId}`, () =>
      fetch(`/api/pct/products/${productId}`).then((r) => r.json())
    );
  }
}

// Export for use in pct.js
window.pctCache = cache;
window.useCache = useCache;
window.preloadPCTData = preloadPCTData;
