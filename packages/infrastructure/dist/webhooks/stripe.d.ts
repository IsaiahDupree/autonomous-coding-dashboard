/**
 * WH-003: Stripe Webhook Hub
 *
 * Routes incoming Stripe webhook events to the appropriate
 * product-specific handlers (subscriptions, payments, invoices, etc.).
 */
export type StripeEventCategory = 'checkout' | 'subscription' | 'invoice' | 'payment_intent' | 'customer' | 'charge' | 'dispute';
export interface StripeWebhookEvent {
    id: string;
    type: string;
    apiVersion: string;
    created: number;
    data: {
        object: Record<string, unknown>;
        previousAttributes?: Record<string, unknown>;
    };
    livemode: boolean;
}
export interface StripeEventRouteResult {
    eventId: string;
    eventType: string;
    category: StripeEventCategory | 'unknown';
    handled: boolean;
    handlerCount: number;
}
export type StripeEventHandler = (event: StripeWebhookEvent) => Promise<void>;
export declare class StripeWebhookHub {
    private handlers;
    private categoryHandlers;
    private catchAllHandlers;
    private processedEvents;
    /**
     * Register a handler for a specific Stripe event type (e.g., "invoice.paid").
     */
    on(eventType: string, handler: StripeEventHandler): void;
    /**
     * Register a handler for an entire event category (e.g., "subscription").
     */
    onCategory(category: StripeEventCategory, handler: StripeEventHandler): void;
    /**
     * Register a catch-all handler for any event.
     */
    onAny(handler: StripeEventHandler): void;
    /**
     * Process an incoming Stripe webhook event.
     * Supports idempotency via event ID deduplication.
     */
    processWebhook(payload: unknown, _signature?: string, _webhookSecret?: string): Promise<StripeEventRouteResult>;
    private parseEvent;
}
