/**
 * WH-006: Custom Webhook Subscriptions
 *
 * Allows users to define their own webhook subscriptions
 * for system events (render complete, campaign published, etc.).
 */

import { WebhookManager } from './manager';
import { WebhookConfig } from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SubscriptionCreateInput {
  name: string;
  url: string;
  events: string[];
  secret?: string;
  metadata?: Record<string, unknown>;
}

export interface Subscription {
  id: string;
  name: string;
  webhookId: string;
  url: string;
  events: string[];
  active: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionStats {
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  lastDeliveryAt?: Date;
}

// ── System Events ────────────────────────────────────────────────────────────

export const SYSTEM_EVENTS = [
  'render.started',
  'render.completed',
  'render.failed',
  'campaign.created',
  'campaign.published',
  'campaign.paused',
  'content.uploaded',
  'content.processed',
  'content.published',
  'analytics.report_ready',
  'billing.payment_received',
  'billing.payment_failed',
  'user.signed_up',
  'user.plan_changed',
] as const;

export type SystemEvent = (typeof SYSTEM_EVENTS)[number];

// ── CustomWebhookSubscriptions ───────────────────────────────────────────────

export class CustomWebhookSubscriptions {
  private subscriptions: Map<string, Subscription> = new Map();
  private webhookManager: WebhookManager;
  private counter = 0;

  constructor(webhookManager?: WebhookManager) {
    this.webhookManager = webhookManager ?? new WebhookManager();
  }

  /**
   * Create a new user-defined webhook subscription.
   */
  create(input: SubscriptionCreateInput): Subscription {
    // Validate events
    for (const event of input.events) {
      if (!this.isValidEvent(event)) {
        throw new Error(
          `Invalid event "${event}". Valid events: ${SYSTEM_EVENTS.join(', ')}, or use wildcard "*"`,
        );
      }
    }

    const secret = input.secret ?? this.generateSecret();
    const webhookConfig = this.webhookManager.register(
      input.url,
      input.events,
      secret,
    );

    const id = `sub_${Date.now()}_${++this.counter}`;
    const now = new Date();

    const subscription: Subscription = {
      id,
      name: input.name,
      webhookId: webhookConfig.id,
      url: input.url,
      events: input.events,
      active: true,
      metadata: input.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };

    this.subscriptions.set(id, subscription);
    return subscription;
  }

  /**
   * Delete a subscription.
   */
  delete(id: string): boolean {
    const sub = this.subscriptions.get(id);
    if (!sub) return false;

    this.webhookManager.unregister(sub.webhookId);
    return this.subscriptions.delete(id);
  }

  /**
   * Enable or disable a subscription.
   */
  setActive(id: string, active: boolean): Subscription | null {
    const sub = this.subscriptions.get(id);
    if (!sub) return null;

    sub.active = active;
    sub.updatedAt = new Date();

    // Also update the underlying webhook config
    const wh = this.webhookManager.getWebhook(sub.webhookId);
    if (wh) {
      (wh as { active: boolean }).active = active;
    }

    return sub;
  }

  /**
   * Update subscription events.
   */
  updateEvents(id: string, events: string[]): Subscription | null {
    const sub = this.subscriptions.get(id);
    if (!sub) return null;

    for (const event of events) {
      if (!this.isValidEvent(event)) {
        throw new Error(`Invalid event "${event}"`);
      }
    }

    // Re-register with new events
    const oldWh = this.webhookManager.getWebhook(sub.webhookId);
    if (oldWh) {
      this.webhookManager.unregister(sub.webhookId);
      const newWh = this.webhookManager.register(sub.url, events, oldWh.secret);
      sub.webhookId = newWh.id;
    }

    sub.events = events;
    sub.updatedAt = new Date();
    return sub;
  }

  /**
   * Get a subscription by ID.
   */
  get(id: string): Subscription | null {
    return this.subscriptions.get(id) ?? null;
  }

  /**
   * List all subscriptions.
   */
  list(): Subscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Get delivery stats for a subscription.
   */
  getStats(id: string): SubscriptionStats | null {
    const sub = this.subscriptions.get(id);
    if (!sub) return null;

    const deliveries = this.webhookManager.getDeliveryHistory(sub.webhookId);

    const successful = deliveries.filter((d) => d.status === 'delivered').length;
    const failed = deliveries.filter((d) => d.status === 'failed').length;
    const lastDelivery = deliveries[deliveries.length - 1];

    return {
      totalDeliveries: deliveries.length,
      successfulDeliveries: successful,
      failedDeliveries: failed,
      lastDeliveryAt: lastDelivery?.lastAttemptAt,
    };
  }

  /**
   * Dispatch a system event (triggers all matching subscriptions).
   */
  async dispatch(event: string, payload: unknown): Promise<void> {
    await this.webhookManager.dispatch(event, payload);
  }

  /**
   * Get the underlying webhook manager.
   */
  getWebhookManager(): WebhookManager {
    return this.webhookManager;
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  private isValidEvent(event: string): boolean {
    if (event === '*') return true;
    return (SYSTEM_EVENTS as readonly string[]).includes(event);
  }

  private generateSecret(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'whsec_';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
