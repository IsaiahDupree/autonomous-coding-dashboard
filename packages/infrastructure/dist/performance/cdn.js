"use strict";
/**
 * PERF-001: CDN Configuration
 *
 * CDN configuration helpers for origin setup, cache rules,
 * purge management, and edge configuration generation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CDNConfig = void 0;
// ── CDNConfig ────────────────────────────────────────────────────────────────
class CDNConfig {
    constructor(options) {
        this.origins = new Map();
        this.cacheRules = [];
        this.purgeHistory = [];
        this.provider = options.provider;
        this.defaultTtlSeconds = options.defaultTtlSeconds;
        this.origins.set('default', options.defaultOrigin);
    }
    // ── Origin Management ────────────────────────────────────────────────────
    /**
     * Add or update an origin server.
     */
    setOrigin(name, config) {
        this.origins.set(name, config);
    }
    /**
     * Get an origin configuration.
     */
    getOrigin(name) {
        return this.origins.get(name);
    }
    /**
     * Remove an origin.
     */
    removeOrigin(name) {
        if (name === 'default') {
            throw new Error('Cannot remove default origin');
        }
        return this.origins.delete(name);
    }
    /**
     * List all origins.
     */
    listOrigins() {
        return Array.from(this.origins.entries()).map(([name, config]) => ({
            name,
            config,
        }));
    }
    // ── Cache Rules ──────────────────────────────────────────────────────────
    /**
     * Add a cache rule.
     */
    addCacheRule(rule) {
        // Insert sorted by path specificity (more specific first)
        const idx = this.cacheRules.findIndex((r) => r.pathPattern.length < rule.pathPattern.length);
        if (idx === -1) {
            this.cacheRules.push(rule);
        }
        else {
            this.cacheRules.splice(idx, 0, rule);
        }
    }
    /**
     * Remove cache rules matching a path pattern.
     */
    removeCacheRule(pathPattern) {
        const idx = this.cacheRules.findIndex((r) => r.pathPattern === pathPattern);
        if (idx === -1)
            return false;
        this.cacheRules.splice(idx, 1);
        return true;
    }
    /**
     * Get the cache rule matching a given path.
     */
    matchCacheRule(path) {
        for (const rule of this.cacheRules) {
            if (this.matchPattern(rule.pathPattern, path)) {
                return rule;
            }
        }
        return null;
    }
    /**
     * Get all cache rules.
     */
    getCacheRules() {
        return [...this.cacheRules];
    }
    // ── Purge ────────────────────────────────────────────────────────────────
    /**
     * Request a cache purge.
     */
    async purge(request) {
        let itemCount = 0;
        switch (request.type) {
            case 'all':
                itemCount = 1; // "everything"
                break;
            case 'urls':
                itemCount = request.urls?.length ?? 0;
                break;
            case 'tags':
                itemCount = request.tags?.length ?? 0;
                break;
            case 'prefixes':
                itemCount = request.prefixes?.length ?? 0;
                break;
        }
        const result = {
            requestId: `purge_${Date.now()}`,
            type: request.type,
            itemCount,
            estimatedPropagationMs: this.getEstimatedPropagation(),
            requestedAt: new Date(),
        };
        this.purgeHistory.push(result);
        // In production: call CDN provider API
        // await this.callProviderPurge(request);
        return result;
    }
    /**
     * Get purge history.
     */
    getPurgeHistory() {
        return [...this.purgeHistory];
    }
    // ── Edge Config Generation ───────────────────────────────────────────────
    /**
     * Generate a complete edge configuration object.
     */
    generateEdgeConfig() {
        return {
            origins: Array.from(this.origins.values()),
            cacheRules: this.getDefaultCacheRules().concat(this.cacheRules),
            securityHeaders: this.getSecurityHeaders(),
            compressionEnabled: true,
            http2Enabled: true,
            minifyEnabled: true,
        };
    }
    // ── Internal ─────────────────────────────────────────────────────────────
    matchPattern(pattern, path) {
        // Simple glob-like matching: * matches any segment, ** matches any depth
        const regexStr = pattern
            .replace(/\*\*/g, '<<<DOUBLE>>>')
            .replace(/\*/g, '[^/]*')
            .replace(/<<<DOUBLE>>>/g, '.*');
        const regex = new RegExp(`^${regexStr}$`);
        return regex.test(path);
    }
    getEstimatedPropagation() {
        switch (this.provider) {
            case 'cloudflare':
                return 30000;
            case 'cloudfront':
                return 60000;
            case 'fastly':
                return 5000;
            default:
                return 120000;
        }
    }
    getDefaultCacheRules() {
        return [
            {
                pathPattern: '**/*.js',
                ttlSeconds: 86400,
                cacheControl: `public, max-age=86400, s-maxage=${this.defaultTtlSeconds}`,
            },
            {
                pathPattern: '**/*.css',
                ttlSeconds: 86400,
                cacheControl: `public, max-age=86400, s-maxage=${this.defaultTtlSeconds}`,
            },
            {
                pathPattern: '**/*.{jpg,jpeg,png,gif,webp,avif,svg}',
                ttlSeconds: 604800,
                cacheControl: 'public, max-age=604800, immutable',
            },
            {
                pathPattern: '**/*.{mp4,webm}',
                ttlSeconds: 604800,
                cacheControl: 'public, max-age=604800, immutable',
            },
            {
                pathPattern: '/api/**',
                ttlSeconds: 0,
                cacheControl: 'no-store, no-cache, must-revalidate',
            },
        ];
    }
    getSecurityHeaders() {
        return {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
        };
    }
}
exports.CDNConfig = CDNConfig;
