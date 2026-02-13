/**
 * SYNC-003: Stripe Subscription Sync
 *
 * Syncs subscription status from Stripe to keep local billing
 * state up to date with payment events and plan changes.
 */

import type { SyncConfig } from '../types';

export interface StripeSubscriptionStatus {
  subscriptionId: string;
  customerId: string;
  status: 'active' | 'past_due' | 'canceled' | 'unpaid' | 'trialing' | 'incomplete' | 'incomplete_expired' | 'paused';
  planId: string;
  planName: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  lastChecked: string;
}

export type StripeSyncCallback = (subscriptions: StripeSubscriptionStatus[]) => void | Promise<void>;

const STRIPE_API_BASE = 'https://api.stripe.com/v1';

export class StripeSubscriptionSync {
  private readonly apiKey: string;
  private readonly syncConfig: SyncConfig;
  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private callbacks: StripeSyncCallback[] = [];
  private trackedCustomerIds: string[] = [];

  constructor(config: {
    apiKey: string;
    syncConfig?: Partial<SyncConfig>;
  }) {
    this.apiKey = config.apiKey;
    this.syncConfig = {
      provider: 'stripe',
      entityType: 'subscription',
      entityId: 'all',
      syncIntervalMs: config.syncConfig?.syncIntervalMs ?? 120_000,
      lastSyncAt: config.syncConfig?.lastSyncAt,
    };
  }

  /**
   * Adds a customer to the tracking list.
   */
  trackCustomer(customerId: string): void {
    if (!this.trackedCustomerIds.includes(customerId)) {
      this.trackedCustomerIds.push(customerId);
    }
  }

  /**
   * Removes a customer from the tracking list.
   */
  untrackCustomer(customerId: string): void {
    this.trackedCustomerIds = this.trackedCustomerIds.filter((id) => id !== customerId);
  }

  /**
   * Registers a callback to be notified when subscription statuses change.
   */
  onStatusChange(callback: StripeSyncCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * Starts polling for subscription status changes.
   */
  start(): void {
    if (this.pollingTimer) {
      return;
    }

    void this.poll();

    this.pollingTimer = setInterval(() => {
      void this.poll();
    }, this.syncConfig.syncIntervalMs);
  }

  /**
   * Stops the polling loop.
   */
  stop(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  /**
   * Performs a single poll to fetch subscription statuses for all tracked customers.
   */
  async poll(): Promise<StripeSubscriptionStatus[]> {
    const allStatuses: StripeSubscriptionStatus[] = [];

    for (const customerId of this.trackedCustomerIds) {
      try {
        const subscriptions = await this.fetchSubscriptions(customerId);
        allStatuses.push(...subscriptions);
      } catch {
        // Continue syncing other customers even if one fails
      }
    }

    // Update last sync time
    this.syncConfig.lastSyncAt = new Date().toISOString();

    // Notify callbacks
    for (const callback of this.callbacks) {
      await callback(allStatuses);
    }

    return allStatuses;
  }

  /**
   * Fetches all subscriptions for a specific customer from Stripe.
   */
  private async fetchSubscriptions(customerId: string): Promise<StripeSubscriptionStatus[]> {
    const params = new URLSearchParams({
      customer: customerId,
      limit: '100',
      expand: ['data.plan'].toString(),
    });

    const response = await fetch(`${STRIPE_API_BASE}/subscriptions?${params.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Stripe subscription fetch failed (${response.status}): ${errorBody}`);
    }

    const data = (await response.json()) as {
      data: Array<{
        id: string;
        customer: string;
        status: StripeSubscriptionStatus['status'];
        plan: { id: string; nickname: string | null };
        current_period_start: number;
        current_period_end: number;
        cancel_at_period_end: boolean;
      }>;
    };

    return data.data.map((sub) => ({
      subscriptionId: sub.id,
      customerId: sub.customer,
      status: sub.status,
      planId: sub.plan.id,
      planName: sub.plan.nickname ?? sub.plan.id,
      currentPeriodStart: new Date(sub.current_period_start * 1000).toISOString(),
      currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      lastChecked: new Date().toISOString(),
    }));
  }

  /**
   * Fetches a single subscription by ID directly from Stripe.
   */
  async getSubscription(subscriptionId: string): Promise<StripeSubscriptionStatus> {
    const response = await fetch(`${STRIPE_API_BASE}/subscriptions/${subscriptionId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Stripe subscription fetch failed (${response.status}): ${errorBody}`);
    }

    const sub = (await response.json()) as {
      id: string;
      customer: string;
      status: StripeSubscriptionStatus['status'];
      plan: { id: string; nickname: string | null };
      current_period_start: number;
      current_period_end: number;
      cancel_at_period_end: boolean;
    };

    return {
      subscriptionId: sub.id,
      customerId: sub.customer as string,
      status: sub.status,
      planId: sub.plan.id,
      planName: sub.plan.nickname ?? sub.plan.id,
      currentPeriodStart: new Date(sub.current_period_start * 1000).toISOString(),
      currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      lastChecked: new Date().toISOString(),
    };
  }

  /**
   * Returns the current sync configuration.
   */
  getSyncConfig(): SyncConfig {
    return { ...this.syncConfig };
  }

  /**
   * Returns whether the sync loop is currently running.
   */
  isRunning(): boolean {
    return this.pollingTimer !== null;
  }

  /**
   * Returns all currently tracked customer IDs.
   */
  getTrackedCustomerIds(): string[] {
    return [...this.trackedCustomerIds];
  }
}
