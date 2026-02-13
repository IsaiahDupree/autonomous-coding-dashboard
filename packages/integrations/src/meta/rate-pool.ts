/**
 * MetaRateLimitPool (MH-006)
 *
 * Manages a pool of Meta Ad Account credentials with per-account rate limiting.
 * Distributes API calls across accounts using round-robin scheduling with
 * fair distribution and per-account usage tracking.
 */

import { randomUUID } from "crypto";
import type { PoolAccount, AccountUsage, RateLimitSlot } from "./types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default global limit (concurrent slots across all accounts). */
const DEFAULT_GLOBAL_LIMIT = 200;

/** Default per-account concurrent slot limit. */
const DEFAULT_PER_ACCOUNT_LIMIT = 50;

// ---------------------------------------------------------------------------
// Internal tracking
// ---------------------------------------------------------------------------

interface AccountState {
  account: PoolAccount;
  activeSlots: Map<string, RateLimitSlot>;
  totalCalls: number;
  perAccountLimit: number;
}

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
export class MetaRateLimitPool {
  private readonly accounts: Map<string, AccountState> = new Map();
  private readonly globalLimit: number;
  private roundRobinIndex = 0;
  private readonly accountOrder: string[];

  constructor(
    accounts: PoolAccount[],
    globalLimit?: number,
  ) {
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
  acquireSlot(adAccountId?: string): RateLimitSlot {
    // Check global limit
    const totalActive = this.getTotalActiveSlots();
    if (totalActive >= this.globalLimit) {
      throw new Error(
        `Global rate limit reached (${totalActive}/${this.globalLimit} active slots)`,
      );
    }

    let state: AccountState | undefined;

    if (adAccountId) {
      // Specific account requested
      state = this.accounts.get(adAccountId);
      if (!state) {
        throw new Error(`Account "${adAccountId}" not found in pool`);
      }
      if (state.activeSlots.size >= state.perAccountLimit) {
        throw new Error(
          `Per-account rate limit reached for "${adAccountId}" ` +
            `(${state.activeSlots.size}/${state.perAccountLimit} active slots)`,
        );
      }
    } else {
      // Round-robin: pick least-loaded account
      state = this.pickLeastLoaded();
      if (!state) {
        throw new Error("No accounts available with free slots");
      }
    }

    const slot: RateLimitSlot = {
      slotId: randomUUID(),
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
  releaseSlot(slotId: string): void {
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
  async withSlot<T>(
    fn: (accessToken: string, adAccountId: string) => Promise<T>,
    adAccountId?: string,
  ): Promise<T> {
    const slot = this.acquireSlot(adAccountId);
    try {
      return await fn(slot.accessToken, slot.adAccountId);
    } finally {
      this.releaseSlot(slot.slotId);
    }
  }

  // -------------------------------------------------------------------------
  // Usage reporting
  // -------------------------------------------------------------------------

  /**
   * Get per-account usage statistics.
   */
  getUsage(): AccountUsage[] {
    const usage: AccountUsage[] = [];
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

  private getTotalActiveSlots(): number {
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
  private pickLeastLoaded(): AccountState | undefined {
    let best: AccountState | undefined;
    let bestLoad = Infinity;
    const len = this.accountOrder.length;

    // Start from round-robin index and scan all accounts
    for (let i = 0; i < len; i++) {
      const idx = (this.roundRobinIndex + i) % len;
      const id = this.accountOrder[idx];
      const state = this.accounts.get(id);
      if (!state) continue;

      // Skip if at per-account limit
      if (state.activeSlots.size >= state.perAccountLimit) continue;

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
