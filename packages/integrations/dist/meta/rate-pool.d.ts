/**
 * MetaRateLimitPool (MH-006)
 *
 * Manages a pool of Meta Ad Account credentials with per-account rate limiting.
 * Distributes API calls across accounts using round-robin scheduling with
 * fair distribution and per-account usage tracking.
 */
import type { PoolAccount, AccountUsage, RateLimitSlot } from "./types";
/**
 * MetaRateLimitPool manages a pool of Meta Ad Account credentials,
 * distributing API calls across accounts with rate limiting.
 *
 * Features:
 * - Round-robin distribution across accounts
 * - Per-account concurrent slot limits
 * - Global concurrent slot limit
 * - Usage statistics per account
 */
export declare class MetaRateLimitPool {
    private readonly accounts;
    private readonly globalLimit;
    private roundRobinIndex;
    private readonly accountOrder;
    constructor(accounts: PoolAccount[], globalLimit?: number);
    /**
     * Acquire a rate-limited slot for an API call.
     *
     * If adAccountId is specified, acquires a slot for that specific account.
     * Otherwise, picks the least-loaded account via round-robin.
     *
     * @throws Error if no slots are available.
     */
    acquireSlot(adAccountId?: string): RateLimitSlot;
    /**
     * Release a previously acquired slot back to the pool.
     */
    releaseSlot(slotId: string): void;
    /**
     * Execute a function with a rate-limited slot. The slot is automatically
     * released when the function completes (or throws).
     */
    withSlot<T>(fn: (accessToken: string, adAccountId: string) => Promise<T>, adAccountId?: string): Promise<T>;
    /**
     * Get per-account usage statistics.
     */
    getUsage(): AccountUsage[];
    private getTotalActiveSlots;
    /**
     * Pick the least-loaded account using round-robin as a tie-breaker.
     * Skips accounts that are at their per-account limit.
     */
    private pickLeastLoaded;
}
//# sourceMappingURL=rate-pool.d.ts.map