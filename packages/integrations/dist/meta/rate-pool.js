"use strict";
/**
 * MetaRateLimitPool (MH-006)
 *
 * Manages a pool of Meta Ad Account credentials with per-account rate limiting.
 * Distributes API calls across accounts using round-robin scheduling with
 * fair distribution and per-account usage tracking.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaRateLimitPool = void 0;
const crypto_1 = require("crypto");
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
/** Default global limit (concurrent slots across all accounts). */
const DEFAULT_GLOBAL_LIMIT = 200;
/** Default per-account concurrent slot limit. */
const DEFAULT_PER_ACCOUNT_LIMIT = 50;
// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------
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
class MetaRateLimitPool {
    constructor(accounts, globalLimit) {
        this.accounts = new Map();
        this.roundRobinIndex = 0;
        if (accounts.length === 0) {
            throw new Error("At least one account is required for the rate limit pool");
        }
        this.globalLimit = globalLimit ?? DEFAULT_GLOBAL_LIMIT;
        this.accountOrder = [];
        for (const account of accounts) {
            this.accounts.set(account.adAccountId, {
                account,
                activeSlots: new Map(),
                totalCalls: 0,
                perAccountLimit: DEFAULT_PER_ACCOUNT_LIMIT,
            });
            this.accountOrder.push(account.adAccountId);
        }
    }
    // -------------------------------------------------------------------------
    // Slot acquisition
    // -------------------------------------------------------------------------
    /**
     * Acquire a rate-limited slot for an API call.
     *
     * If adAccountId is specified, acquires a slot for that specific account.
     * Otherwise, picks the least-loaded account via round-robin.
     *
     * @throws Error if no slots are available.
     */
    acquireSlot(adAccountId) {
        // Check global limit
        const totalActive = this.getTotalActiveSlots();
        if (totalActive >= this.globalLimit) {
            throw new Error(`Global rate limit reached (${totalActive}/${this.globalLimit} active slots)`);
        }
        let state;
        if (adAccountId) {
            // Specific account requested
            state = this.accounts.get(adAccountId);
            if (!state) {
                throw new Error(`Account "${adAccountId}" not found in pool`);
            }
            if (state.activeSlots.size >= state.perAccountLimit) {
                throw new Error(`Per-account rate limit reached for "${adAccountId}" ` +
                    `(${state.activeSlots.size}/${state.perAccountLimit} active slots)`);
            }
        }
        else {
            // Round-robin: pick least-loaded account
            state = this.pickLeastLoaded();
            if (!state) {
                throw new Error("No accounts available with free slots");
            }
        }
        const slot = {
            slotId: (0, crypto_1.randomUUID)(),
            adAccountId: state.account.adAccountId,
            accessToken: state.account.accessToken,
            acquiredAt: Date.now(),
        };
        state.activeSlots.set(slot.slotId, slot);
        state.totalCalls++;
        return slot;
    }
    /**
     * Release a previously acquired slot back to the pool.
     */
    releaseSlot(slotId) {
        for (const state of this.accounts.values()) {
            if (state.activeSlots.has(slotId)) {
                state.activeSlots.delete(slotId);
                return;
            }
        }
        // Slot not found - silently ignore (may have been cleaned up already)
    }
    // -------------------------------------------------------------------------
    // Convenience executor
    // -------------------------------------------------------------------------
    /**
     * Execute a function with a rate-limited slot. The slot is automatically
     * released when the function completes (or throws).
     */
    async withSlot(fn, adAccountId) {
        const slot = this.acquireSlot(adAccountId);
        try {
            return await fn(slot.accessToken, slot.adAccountId);
        }
        finally {
            this.releaseSlot(slot.slotId);
        }
    }
    // -------------------------------------------------------------------------
    // Usage reporting
    // -------------------------------------------------------------------------
    /**
     * Get per-account usage statistics.
     */
    getUsage() {
        const usage = [];
        for (const state of this.accounts.values()) {
            usage.push({
                adAccountId: state.account.adAccountId,
                activeSlots: state.activeSlots.size,
                totalCalls: state.totalCalls,
            });
        }
        return usage;
    }
    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------
    getTotalActiveSlots() {
        let total = 0;
        for (const state of this.accounts.values()) {
            total += state.activeSlots.size;
        }
        return total;
    }
    /**
     * Pick the least-loaded account using round-robin as a tie-breaker.
     * Skips accounts that are at their per-account limit.
     */
    pickLeastLoaded() {
        let best;
        let bestLoad = Infinity;
        const len = this.accountOrder.length;
        // Start from round-robin index and scan all accounts
        for (let i = 0; i < len; i++) {
            const idx = (this.roundRobinIndex + i) % len;
            const id = this.accountOrder[idx];
            const state = this.accounts.get(id);
            if (!state)
                continue;
            // Skip if at per-account limit
            if (state.activeSlots.size >= state.perAccountLimit)
                continue;
            if (state.activeSlots.size < bestLoad) {
                bestLoad = state.activeSlots.size;
                best = state;
            }
        }
        // Advance round-robin index for fairness
        this.roundRobinIndex = (this.roundRobinIndex + 1) % len;
        return best;
    }
}
exports.MetaRateLimitPool = MetaRateLimitPool;
//# sourceMappingURL=rate-pool.js.map