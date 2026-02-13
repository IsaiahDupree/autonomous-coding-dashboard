/**
 * WH-003: Stripe Webhook Hub
 *
 * Routes incoming Stripe webhook events to the appropriate
 * product-specific handlers (subscriptions, payments, invoices, etc.).
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type StripeEventCategory =
  | 'checkout'
  | 'subscription'
  | 'invoice'
  | 'payment_intent'
  | 'customer'
  | 'charge'
  | 'dispute';

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

// ── Event Category Mapping ───────────────────────────────────────────────────

const EVENT_CATEGORY_MAP: Record<string, StripeEventCategory> = {
  'checkout.session': 'checkout',
  'customer.subscription': 'subscription',
  invoice: 'invoice',
  payment_intent: 'payment_intent',
  customer: 'customer',
  charge: 'charge',
  'charge.dispute': 'dispute',
};

function categorizeEvent(eventType: string): StripeEventCategory | 'unknown' {
  for (const [prefix, category] of Object.entries(EVENT_CATEGORY_MAP)) {
    if (eventType.startsWith(prefix)) {
      return category;
    }
  }
  return 'unknown';
}

// ── StripeWebhookHub ─────────────────────────────────────────────────────────

export class StripeWebhookHub {
  private handlers: Map<string, StripeEventHandler[]> = new Map();
  private categoryHandlers: Map<StripeEventCategory, StripeEventHandler[]> = new Map();
  private catchAllHandlers: StripeEventHandler[] = [];
  private processedEvents: Set<string> = new Set();

  /**
   * Register a handler for a specific Stripe event type (e.g., "invoice.paid").
   */
  on(eventType: string, handler: StripeEventHandler): void {
    const existing = this.handlers.get(eventType) ?? [];
    existing.push(handler);
    this.handlers.set(eventType, existing);
  }

  /**
   * Register a handler for an entire event category (e.g., "subscription").
   */
  onCategory(category: StripeEventCategory, handler: StripeEventHandler): void {
    const existing = this.categoryHandlers.get(category) ?? [];
    existing.push(handler);
    this.categoryHandlers.set(category, existing);
  }

  /**
   * Register a catch-all handler for any event.
   */
  onAny(handler: StripeEventHandler): void {
    this.catchAllHandlers.push(handler);
  }

  /**
   * Process an incoming Stripe webhook event.
   * Supports idempotency via event ID deduplication.
   */
  async processWebhook(
    payload: unknown,
    _signature?: string,
    _webhookSecret?: string,
  ): Promise<StripeEventRouteResult> {
    const event = this.parseEvent(payload);

    // Idempotency check
    if (this.processedEvents.has(event.id)) {
      return {
        eventId: event.id,
        eventType: event.type,
        category: categorizeEvent(event.type),
        handled: true,
        handlerCount: 0,
      };
    }

    this.processedEvents.add(event.id);

    // Prune old event IDs (keep last 10000)
    if (this.processedEvents.size > 10000) {
      const iter = this.processedEvents.values();
      for (let i = 0; i < 1000; i++) {
        const v = iter.next();
        if (v.done) break;
        this.processedEvents.delete(v.value);
      }
    }

    const category = categorizeEvent(event.type);
    let handlerCount = 0;

    // Exact type handlers
    const typeHandlers = this.handlers.get(event.type) ?? [];
    for (const h of typeHandlers) {
      await h(event);
      handlerCount++;
    }

    // Category handlers
    if (category !== 'unknown') {
      const catHandlers = this.categoryHandlers.get(category) ?? [];
      for (const h of catHandlers) {
        await h(event);
        handlerCount++;
      }
    }

    // Catch-all handlers
    for (const h of this.catchAllHandlers) {
      await h(event);
      handlerCount++;
    }

    return {
      eventId: event.id,
      eventType: event.type,
      category,
      handled: handlerCount > 0,
      handlerCount,
    };
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  private parseEvent(payload: unknown): StripeWebhookEvent {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid Stripe webhook payload');
    }

    const p = payload as Record<string, unknown>;

    if (!p.id || typeof p.id !== 'string') {
      throw new Error('Missing event ID');
    }
    if (!p.type || typeof p.type !== 'string') {
      throw new Error('Missing event type');
    }

    return {
      id: p.id as string,
      type: p.type as string,
      apiVersion: (p.api_version as string) ?? '',
      created: (p.created as number) ?? Date.now(),
      data: (p.data as StripeWebhookEvent['data']) ?? { object: {} },
      livemode: (p.livemode as boolean) ?? false,
    };
  }
}
