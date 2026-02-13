/**
 * PERF-001: CDN Configuration
 *
 * CDN configuration helpers for origin setup, cache rules,
 * purge management, and edge configuration generation.
 */
import { CDNOriginConfig, CDNCacheRule } from '../types';
export interface CDNConfigOptions {
    provider: 'cloudflare' | 'cloudfront' | 'fastly' | 'custom';
    defaultTtlSeconds: number;
    defaultOrigin: CDNOriginConfig;
}
export interface CDNPurgeRequest {
    type: 'all' | 'urls' | 'tags' | 'prefixes';
    urls?: string[];
    tags?: string[];
    prefixes?: string[];
}
export interface CDNPurgeResult {
    requestId: string;
    type: CDNPurgeRequest['type'];
    itemCount: number;
    estimatedPropagationMs: number;
    requestedAt: Date;
}
export interface CDNEdgeConfig {
    origins: CDNOriginConfig[];
    cacheRules: CDNCacheRule[];
    securityHeaders: Record<string, string>;
    compressionEnabled: boolean;
    http2Enabled: boolean;
    minifyEnabled: boolean;
}
export declare class CDNConfig {
    private provider;
    private defaultTtlSeconds;
    private origins;
    private cacheRules;
    private purgeHistory;
    constructor(options: CDNConfigOptions);
    /**
     * Add or update an origin server.
     */
    setOrigin(name: string, config: CDNOriginConfig): void;
    /**
     * Get an origin configuration.
     */
    getOrigin(name: string): CDNOriginConfig | undefined;
    /**
     * Remove an origin.
     */
    removeOrigin(name: string): boolean;
    /**
     * List all origins.
     */
    listOrigins(): {
        name: string;
        config: CDNOriginConfig;
    }[];
    /**
     * Add a cache rule.
     */
    addCacheRule(rule: CDNCacheRule): void;
    /**
     * Remove cache rules matching a path pattern.
     */
    removeCacheRule(pathPattern: string): boolean;
    /**
     * Get the cache rule matching a given path.
     */
    matchCacheRule(path: string): CDNCacheRule | null;
    /**
     * Get all cache rules.
     */
    getCacheRules(): CDNCacheRule[];
    /**
     * Request a cache purge.
     */
    purge(request: CDNPurgeRequest): Promise<CDNPurgeResult>;
    /**
     * Get purge history.
     */
    getPurgeHistory(): CDNPurgeResult[];
    /**
     * Generate a complete edge configuration object.
     */
    generateEdgeConfig(): CDNEdgeConfig;
    private matchPattern;
    private getEstimatedPropagation;
    private getDefaultCacheRules;
    private getSecurityHeaders;
}
