/**
 * WH-001: Webhook Manager
 *
 * Core webhook infrastructure: registration, dispatching with HMAC-SHA256
 * signatures, delivery tracking, and exponential backoff retry.
 */
import { WebhookConfig, WebhookDelivery, WebhookDeliveryStatus, RetryPolicy } from '../types';
export interface WebhookDispatchResult {
    webhookId: string;
    deliveryId: string;
    status: WebhookDeliveryStatus;
    responseCode?: number;
    error?: string;
}
export interface WebhookTransport {
    send(url: string, payload: string, headers: Record<string, string>): Promise<{
        statusCode: number;
    }>;
}
export declare class WebhookManager {
    private webhooks;
    private deliveries;
    private transport;
    constructor(transport?: WebhookTransport);
    /**
     * Register a new webhook subscription.
     */
    register(url: string, events: string[], secret: string, retryPolicy?: Partial<RetryPolicy>): WebhookConfig;
    /**
     * Unregister a webhook subscription.
     */
    unregister(id: string): boolean;
    /**
     * Get a webhook by ID.
     */
    getWebhook(id: string): WebhookConfig | undefined;
    /**
     * List all registered webhooks.
     */
    listWebhooks(): WebhookConfig[];
    /**
     * Dispatch an event to all matching webhook subscriptions.
     */
    dispatch(event: string, payload: unknown): Promise<WebhookDispatchResult[]>;
    /**
     * Get delivery history for a webhook.
     */
    getDeliveryHistory(webhookId: string): WebhookDelivery[];
    private deliverWithRetry;
    private recordDelivery;
}
