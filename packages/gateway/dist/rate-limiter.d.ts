import { RateLimitConfig, RateLimitInfo } from './types';
export interface RateLimitStore {
    increment(key: string, windowMs: number): number;
    getCount(key: string, windowMs: number): number;
    reset(key: string): void;
}
export declare class InMemoryRateLimitStore implements RateLimitStore {
    private windows;
    private cleanupInterval;
    constructor(cleanupIntervalMs?: number);
    increment(key: string, windowMs: number): number;
    getCount(key: string, windowMs: number): number;
    reset(key: string): void;
    destroy(): void;
    private getValidEntries;
    private cleanup;
}
export declare class GatewayRateLimiter {
    private readonly defaultConfig;
    private readonly store;
    constructor(defaultConfig: RateLimitConfig, store?: RateLimitStore);
    /**
     * Check the current rate limit status for a key without consuming a request.
     */
    check(key: string, config?: RateLimitConfig): RateLimitInfo;
    /**
     * Consume a request against the rate limit for a key.
     * Returns whether the request is allowed and the current rate limit info.
     */
    consume(key: string, config?: RateLimitConfig): {
        allowed: boolean;
        info: RateLimitInfo;
    };
    /**
     * Reset the rate limit counter for a key.
     */
    reset(key: string): void;
    /**
     * Generate standard rate limit HTTP headers from a RateLimitInfo.
     */
    getRateLimitHeaders(info: RateLimitInfo): Record<string, string>;
    /**
     * Build the internal store key with optional prefix.
     */
    private buildKey;
}
//# sourceMappingURL=rate-limiter.d.ts.map