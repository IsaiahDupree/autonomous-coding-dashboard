/**
 * WH-006: Custom Webhook Subscriptions
 *
 * Allows users to define their own webhook subscriptions
 * for system events (render complete, campaign published, etc.).
 */
import { WebhookManager } from './manager';
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
export declare const SYSTEM_EVENTS: readonly ["render.started", "render.completed", "render.failed", "campaign.created", "campaign.published", "campaign.paused", "content.uploaded", "content.processed", "content.published", "analytics.report_ready", "billing.payment_received", "billing.payment_failed", "user.signed_up", "user.plan_changed"];
export type SystemEvent = (typeof SYSTEM_EVENTS)[number];
export declare class CustomWebhookSubscriptions {
    private subscriptions;
    private webhookManager;
    private counter;
    constructor(webhookManager?: WebhookManager);
    /**
     * Create a new user-defined webhook subscription.
     */
    create(input: SubscriptionCreateInput): Subscription;
    /**
     * Delete a subscription.
     */
    delete(id: string): boolean;
    /**
     * Enable or disable a subscription.
     */
    setActive(id: string, active: boolean): Subscription | null;
    /**
     * Update subscription events.
     */
    updateEvents(id: string, events: string[]): Subscription | null;
    /**
     * Get a subscription by ID.
     */
    get(id: string): Subscription | null;
    /**
     * List all subscriptions.
     */
    list(): Subscription[];
    /**
     * Get delivery stats for a subscription.
     */
    getStats(id: string): SubscriptionStats | null;
    /**
     * Dispatch a system event (triggers all matching subscriptions).
     */
    dispatch(event: string, payload: unknown): Promise<void>;
    /**
     * Get the underlying webhook manager.
     */
    getWebhookManager(): WebhookManager;
    private isValidEvent;
    private generateSecret;
}
