/**
 * Request Deduplication System
 * ============================
 *
 * Prevents duplicate API calls with:
 * - Request deduplication (same URL/params within time window)
 * - Request cancellation (abort in-flight requests)
 * - Debouncing (delay execution until typing stops)
 * - Smart caching (reuse recent results)
 *
 * Feature: PCT-WC-053
 *
 * Usage:
 * ```js
 * import { deduplicatedFetch, debouncedFetch, cancelAllRequests } from './pct-request-dedup.js';
 *
 * // Automatic deduplication
 * const data = await deduplicatedFetch('/api/users');
 *
 * // Debounced search (waits 300ms after typing stops)
 * debouncedFetch('/api/search?q=' + query, { debounce: 300 });
 *
 * // Cancel all in-flight requests
 * cancelAllRequests();
 * ```
 */

/**
 * In-flight request tracker
 * Maps request key -> { promise, controller, timestamp }
 */
const inFlightRequests = new Map();

/**
 * Debounce timers for delayed requests
 */
const debounceTimers = new Map();

/**
 * Request result cache for fast repeated lookups
 * Maps request key -> { data, timestamp }
 */
const requestCache = new Map();

/**
 * Configuration
 */
const CONFIG = {
  // Cache TTL in milliseconds (5 seconds)
  cacheTTL: 5000,

  // Default debounce delay (milliseconds)
  defaultDebounce: 300,

  // Max cache size (entries)
  maxCacheSize: 100,

  // Request timeout (milliseconds)
  requestTimeout: 30000,
};

/**
 * Create a unique key for a request
 */
function createRequestKey(url, options = {}) {
  const method = options.method || 'GET';
  const body = options.body ? JSON.stringify(options.body) : '';
  const params = new URL(url, window.location.origin).searchParams.toString();

  return `${method}:${url}:${params}:${body}`;
}

/**
 * Clean up expired cache entries
 */
function cleanupCache() {
  const now = Date.now();
  const keysToDelete = [];

  for (const [key, entry] of requestCache.entries()) {
    if (now - entry.timestamp > CONFIG.cacheTTL) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach((key) => requestCache.delete(key));

  // Enforce max cache size (LRU)
  if (requestCache.size > CONFIG.maxCacheSize) {
    const entries = Array.from(requestCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    const toRemove = entries.slice(0, entries.length - CONFIG.maxCacheSize);
    toRemove.forEach(([key]) => requestCache.delete(key));
  }
}

/**
 * Get cached response if available and fresh
 */
function getCachedResponse(key) {
  const cached = requestCache.get(key);

  if (!cached) {
    return null;
  }

  const now = Date.now();
  if (now - cached.timestamp > CONFIG.cacheTTL) {
    requestCache.delete(key);
    return null;
  }

  return cached.data;
}

/**
 * Store response in cache
 */
function cacheResponse(key, data) {
  requestCache.set(key, {
    data,
    timestamp: Date.now(),
  });

  // Cleanup old entries periodically
  if (requestCache.size % 10 === 0) {
    cleanupCache();
  }
}

/**
 * Deduplicated fetch - prevents duplicate in-flight requests
 *
 * If the same request is already in flight, returns the existing promise.
 * Otherwise, makes a new request.
 */
export async function deduplicatedFetch(url, options = {}) {
  const key = createRequestKey(url, options);

  // Check cache first
  if (!options.noCache) {
    const cached = getCachedResponse(key);
    if (cached) {
      console.log(`[RequestDedup] Cache hit: ${url}`);
      return Promise.resolve(cached);
    }
  }

  // Check if request is already in flight
  const inFlight = inFlightRequests.get(key);
  if (inFlight) {
    console.log(`[RequestDedup] Deduplicated: ${url}`);
    return inFlight.promise;
  }

  // Create abort controller for cancellation
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.requestTimeout);

  // Make the request
  const promise = fetch(url, {
    ...options,
    signal: controller.signal,
  })
    .then(async (response) => {
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Cache the response
      if (!options.noCache) {
        cacheResponse(key, data);
      }

      // Remove from in-flight tracker
      inFlightRequests.delete(key);

      return data;
    })
    .catch((error) => {
      clearTimeout(timeoutId);
      inFlightRequests.delete(key);

      if (error.name === 'AbortError') {
        console.log(`[RequestDedup] Cancelled: ${url}`);
        throw new Error('Request cancelled');
      }

      console.error(`[RequestDedup] Error: ${url}`, error);
      throw error;
    });

  // Track in-flight request
  inFlightRequests.set(key, {
    promise,
    controller,
    timestamp: Date.now(),
  });

  return promise;
}

/**
 * Debounced fetch - delays request until activity stops
 *
 * Useful for search inputs where you want to wait until the user
 * stops typing before making the API call.
 */
export function debouncedFetch(url, options = {}) {
  const debounceDelay = options.debounce || CONFIG.defaultDebounce;
  const key = createRequestKey(url, options);

  // Cancel existing debounce timer for this request
  const existingTimer = debounceTimers.get(key);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  return new Promise((resolve, reject) => {
    const timerId = setTimeout(() => {
      debounceTimers.delete(key);

      deduplicatedFetch(url, options)
        .then(resolve)
        .catch(reject);
    }, debounceDelay);

    debounceTimers.set(key, timerId);
  });
}

/**
 * Cancel a specific request by URL
 */
export function cancelRequest(url, options = {}) {
  const key = createRequestKey(url, options);
  const inFlight = inFlightRequests.get(key);

  if (inFlight) {
    inFlight.controller.abort();
    inFlightRequests.delete(key);
    console.log(`[RequestDedup] Manually cancelled: ${url}`);
    return true;
  }

  return false;
}

/**
 * Cancel all in-flight requests
 */
export function cancelAllRequests() {
  console.log(`[RequestDedup] Cancelling ${inFlightRequests.size} requests`);

  for (const [key, { controller }] of inFlightRequests.entries()) {
    controller.abort();
  }

  inFlightRequests.clear();

  // Also clear debounce timers
  for (const timerId of debounceTimers.values()) {
    clearTimeout(timerId);
  }

  debounceTimers.clear();
}

/**
 * Clear all cached responses
 */
export function clearCache() {
  const size = requestCache.size;
  requestCache.clear();
  console.log(`[RequestDedup] Cleared ${size} cached responses`);
}

/**
 * Get stats about current request state
 */
export function getRequestStats() {
  return {
    inFlight: inFlightRequests.size,
    cached: requestCache.size,
    debouncing: debounceTimers.size,
  };
}

/**
 * Batch multiple requests and execute them concurrently
 * with automatic deduplication
 */
export async function batchFetch(requests) {
  const promises = requests.map((req) =>
    deduplicatedFetch(req.url, req.options)
  );

  return Promise.all(promises);
}

/**
 * Sequential fetch - execute requests one after another
 * with deduplication
 */
export async function sequentialFetch(requests) {
  const results = [];

  for (const req of requests) {
    const result = await deduplicatedFetch(req.url, req.options);
    results.push(result);
  }

  return results;
}

/**
 * Create a fetch function bound to a specific base URL
 */
export function createFetcher(baseUrl, defaultOptions = {}) {
  return {
    get: (path, options = {}) =>
      deduplicatedFetch(`${baseUrl}${path}`, { ...defaultOptions, ...options, method: 'GET' }),

    post: (path, data, options = {}) =>
      deduplicatedFetch(`${baseUrl}${path}`, {
        ...defaultOptions,
        ...options,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(defaultOptions.headers || {}),
          ...(options.headers || {}),
        },
        body: JSON.stringify(data),
      }),

    put: (path, data, options = {}) =>
      deduplicatedFetch(`${baseUrl}${path}`, {
        ...defaultOptions,
        ...options,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(defaultOptions.headers || {}),
          ...(options.headers || {}),
        },
        body: JSON.stringify(data),
      }),

    delete: (path, options = {}) =>
      deduplicatedFetch(`${baseUrl}${path}`, { ...defaultOptions, ...options, method: 'DELETE' }),
  };
}

/**
 * Hook-based API for React-like usage
 */
export function useRequest(url, options = {}) {
  let data = null;
  let loading = true;
  let error = null;

  deduplicatedFetch(url, options)
    .then((result) => {
      data = result;
      loading = false;
    })
    .catch((err) => {
      error = err;
      loading = false;
    });

  return { data, loading, error };
}

/**
 * Initialize request deduplication globally
 */
export function initRequestDeduplication() {
  // Set up cleanup interval
  setInterval(cleanupCache, CONFIG.cacheTTL);

  // Cancel all requests on page unload
  window.addEventListener('beforeunload', () => {
    cancelAllRequests();
  });

  // Log stats periodically in debug mode
  if (localStorage.getItem('DEBUG_REQUESTS') === 'true') {
    setInterval(() => {
      const stats = getRequestStats();
      console.log('[RequestDedup] Stats:', stats);
    }, 10000);
  }

  console.log('[RequestDedup] Initialized');
}

// Auto-initialize if not in module mode
if (typeof window !== 'undefined' && !window.__REQUEST_DEDUP_INITIALIZED__) {
  window.__REQUEST_DEDUP_INITIALIZED__ = true;
  initRequestDeduplication();
}

/**
 * Export default API client
 */
export default createFetcher('/api', {
  headers: {
    'Content-Type': 'application/json',
  },
});
