/**
 * CACHE-001: Cache Manager
 *
 * In-memory cache with LRU eviction, TTL-based expiration,
 * namespace/prefix support, and hit/miss statistics.
 */

import { CacheEntry } from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CacheManagerOptions {
  defaultTtlMs?: number;
  maxSize?: number;
  prefix?: string;
  onEvict?: <T>(entry: CacheEntry<T>) => void;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
}

// ── CacheManager ─────────────────────────────────────────────────────────────

export class CacheManager {
  private store: Map<string, CacheEntry<unknown>> = new Map();
  private readonly defaultTtlMs: number;
  private readonly maxSize: number;
  private readonly prefix: string;
  private readonly onEvict?: <T>(entry: CacheEntry<T>) => void;

  private hits = 0;
  private misses = 0;

  constructor(options: CacheManagerOptions = {}) {
    this.defaultTtlMs = options.defaultTtlMs ?? 300_000; // 5 minutes default
    this.maxSize = options.maxSize ?? 1000;
    this.prefix = options.prefix ?? '';
    this.onEvict = options.onEvict;
  }

  /**
   * Get a cached value by key. Returns null if not found or expired.
   */
  get<T>(key: string): T | null {
    const fullKey = this.prefixKey(key);
    const entry = this.store.get(fullKey);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check expiration
    if (entry.expiresAt.getTime() < Date.now()) {
      this.store.delete(fullKey);
      this.misses++;
      return null;
    }

    // Update access count and move to end (most recently used)
    entry.accessCount++;
    this.store.delete(fullKey);
    this.store.set(fullKey, entry);

    this.hits++;
    return entry.value as T;
  }

  /**
   * Set a value in the cache.
   */
  set<T>(key: string, value: T, ttlMs?: number): void {
    const fullKey = this.prefixKey(key);
    const ttl = ttlMs ?? this.defaultTtlMs;
    const now = new Date();

    // If key already exists, delete it first (to update position in Map)
    if (this.store.has(fullKey)) {
      this.store.delete(fullKey);
    }

    // Evict if at capacity
    while (this.store.size >= this.maxSize) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      key: fullKey,
      value,
      expiresAt: new Date(now.getTime() + ttl),
      createdAt: now,
      accessCount: 0,
    };

    this.store.set(fullKey, entry as CacheEntry<unknown>);
  }

  /**
   * Delete a cached value.
   */
  delete(key: string): boolean {
    return this.store.delete(this.prefixKey(key));
  }

  /**
   * Check if a key exists and is not expired.
   */
  has(key: string): boolean {
    const fullKey = this.prefixKey(key);
    const entry = this.store.get(fullKey);

    if (!entry) return false;

    if (entry.expiresAt.getTime() < Date.now()) {
      this.store.delete(fullKey);
      return false;
    }

    return true;
  }

  /**
   * Clear all cached entries.
   */
  clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics.
   */
  getStats(): CacheStats {
    // Clean up expired entries before reporting
    this.purgeExpired();

    const total = this.hits + this.misses;
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  /**
   * Get all keys (non-expired).
   */
  keys(): string[] {
    this.purgeExpired();
    return Array.from(this.store.keys());
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  private prefixKey(key: string): string {
    return this.prefix ? `${this.prefix}:${key}` : key;
  }

  private evictLRU(): void {
    // Map iteration order is insertion order; first entry is the LRU
    const firstKey = this.store.keys().next().value;
    if (firstKey !== undefined) {
      const entry = this.store.get(firstKey);
      this.store.delete(firstKey);
      if (entry && this.onEvict) {
        this.onEvict(entry);
      }
    }
  }

  private purgeExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expiresAt.getTime() < now) {
        this.store.delete(key);
      }
    }
  }
}
