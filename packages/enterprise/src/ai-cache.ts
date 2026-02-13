/**
 * AI Response Caching (AI-003)
 * Cache key from prompt hash, TTL, invalidation.
 */

import { createHash } from 'crypto';
import { AICacheEntry, AIRequest, AIResponse } from './types';

export interface AICacheOptions {
  /** Default TTL in milliseconds. Default: 1 hour */
  defaultTtlMs?: number;
  /** Maximum number of cache entries. Default: 10000 */
  maxEntries?: number;
}

/**
 * In-memory cache for AI responses.
 * Uses prompt hashing for cache keys, with TTL-based expiration.
 */
export class AIResponseCache {
  private cache: Map<string, AICacheEntry> = new Map();
  private defaultTtlMs: number;
  private maxEntries: number;

  constructor(options: AICacheOptions = {}) {
    this.defaultTtlMs = options.defaultTtlMs ?? 60 * 60 * 1000; // 1 hour
    this.maxEntries = options.maxEntries ?? 10000;
  }

  /**
   * Generate a cache key from an AI request.
   * Hashes the prompt, system prompt, and key parameters for consistent lookups.
   */
  generateCacheKey(request: AIRequest, modelId?: string): string {
    const keyComponents = {
      prompt: request.prompt,
      systemPrompt: request.systemPrompt ?? '',
      maxTokens: request.maxTokens,
      temperature: request.temperature,
      model: modelId ?? '',
    };

    return createHash('sha256')
      .update(JSON.stringify(keyComponents))
      .digest('hex');
  }

  /**
   * Get a cached response if it exists and hasn't expired.
   */
  get(key: string): AIResponse | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check TTL
    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    // Update hit count
    entry.hitCount++;

    // Return the cached response with cached flag set
    return {
      ...entry.response,
      cached: true,
    };
  }

  /**
   * Store a response in the cache.
   */
  set(key: string, response: AIResponse, ttlMs?: number): void {
    // Evict if at capacity
    if (this.cache.size >= this.maxEntries) {
      this.evictExpired();
      // If still at capacity, remove oldest entry
      if (this.cache.size >= this.maxEntries) {
        this.evictOldest();
      }
    }

    const now = Date.now();
    const ttl = ttlMs ?? this.defaultTtlMs;

    const entry: AICacheEntry = {
      key,
      response,
      createdAt: now,
      ttlMs: ttl,
      expiresAt: now + ttl,
      hitCount: 0,
    };

    this.cache.set(key, entry);
  }

  /**
   * Try to get from cache; if miss, execute the provider function and cache the result.
   */
  async getOrCompute(
    request: AIRequest,
    modelId: string,
    compute: () => Promise<AIResponse>,
    ttlMs?: number,
  ): Promise<AIResponse> {
    const key = this.generateCacheKey(request, modelId);

    // Try cache first
    const cached = this.get(key);
    if (cached) return cached;

    // Compute and cache
    const response = await compute();
    this.set(key, response, ttlMs);
    return response;
  }

  /**
   * Invalidate a specific cache entry.
   */
  invalidate(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Invalidate all cache entries matching a pattern (prefix match).
   */
  invalidateByPrefix(prefix: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Clear all cache entries.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics.
   */
  getStats(): {
    totalEntries: number;
    totalHits: number;
    expiredEntries: number;
    memoryEstimateBytes: number;
  } {
    const now = Date.now();
    let totalHits = 0;
    let expiredEntries = 0;

    for (const entry of this.cache.values()) {
      totalHits += entry.hitCount;
      if (now > entry.expiresAt) expiredEntries++;
    }

    // Rough memory estimate
    let memoryEstimate = 0;
    for (const entry of this.cache.values()) {
      memoryEstimate += entry.key.length * 2; // string overhead
      memoryEstimate += entry.response.content.length * 2;
      memoryEstimate += 200; // overhead for metadata
    }

    return {
      totalEntries: this.cache.size,
      totalHits,
      expiredEntries,
      memoryEstimateBytes: memoryEstimate,
    };
  }

  /** Remove all expired entries */
  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /** Remove the oldest cache entry */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}
