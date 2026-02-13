/**
 * WH-005: TikTok Webhook Handler
 *
 * Processes incoming TikTok Marketing API and Content Publishing
 * webhook events (ad status changes, content moderation, audience sync).
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type TikTokEventType =
  | 'ad.status_change'
  | 'ad.approved'
  | 'ad.rejected'
  | 'campaign.budget_exhausted'
  | 'content.published'
  | 'content.moderation'
  | 'audience.sync_complete'
  | 'report.ready';

export interface TikTokWebhookEvent {
  eventType: TikTokEventType;
  eventId: string;
  advertiserId: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface TikTokWebhookResult {
  eventId: string;
  eventType: TikTokEventType;
  handled: boolean;
  handlerCount: number;
}

export type TikTokEventHandler = (event: TikTokWebhookEvent) => Promise<void>;

// ── TikTokWebhookHandler ────────────────────────────────────────────────────

export class TikTokWebhookHandler {
  private handlers: Map<TikTokEventType, TikTokEventHandler[]> = new Map();
  private globalHandlers: TikTokEventHandler[] = [];
  private processedIds: Set<string> = new Set();

  /**
   * Register a handler for a specific TikTok event type.
   */
  on(eventType: TikTokEventType, handler: TikTokEventHandler): void {
    const existing = this.handlers.get(eventType) ?? [];
    existing.push(handler);
    this.handlers.set(eventType, existing);
  }

  /**
   * Register a global handler that receives all events.
   */
  onAny(handler: TikTokEventHandler): void {
    this.globalHandlers.push(handler);
  }

  /**
   * Remove a handler for a specific event type.
   */
  off(eventType: TikTokEventType, handler: TikTokEventHandler): void {
    const existing = this.handlers.get(eventType);
    if (!existing) return;
    const idx = existing.indexOf(handler);
    if (idx >= 0) existing.splice(idx, 1);
  }

  /**
   * Process an incoming TikTok webhook payload.
   */
  async processWebhook(
    payload: unknown,
    _signature?: string,
    _secret?: string,
  ): Promise<TikTokWebhookResult> {
    const event = this.parseEvent(payload);

    // Idempotency check
    if (this.processedIds.has(event.eventId)) {
      return {
        eventId: event.eventId,
        eventType: event.eventType,
        handled: true,
        handlerCount: 0,
      };
    }

    this.processedIds.add(event.eventId);
    this.pruneProcessedIds();

    let handlerCount = 0;

    // Type-specific handlers
    const typeHandlers = this.handlers.get(event.eventType) ?? [];
    for (const h of typeHandlers) {
      await h(event);
      handlerCount++;
    }

    // Global handlers
    for (const h of this.globalHandlers) {
      await h(event);
      handlerCount++;
    }

    return {
      eventId: event.eventId,
      eventType: event.eventType,
      handled: handlerCount > 0,
      handlerCount,
    };
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  private parseEvent(payload: unknown): TikTokWebhookEvent {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid TikTok webhook payload');
    }

    const p = payload as Record<string, unknown>;

    if (!p.event_type && !p.eventType) {
      throw new Error('Missing event type');
    }

    return {
      eventType: (p.event_type ?? p.eventType) as TikTokEventType,
      eventId: (p.event_id ?? p.eventId ?? `tt_${Date.now()}`) as string,
      advertiserId: (p.advertiser_id ?? p.advertiserId ?? '') as string,
      timestamp: (p.timestamp as number) ?? Date.now(),
      data: (p.data as Record<string, unknown>) ?? {},
    };
  }

  private pruneProcessedIds(): void {
    if (this.processedIds.size > 10000) {
      const iter = this.processedIds.values();
      for (let i = 0; i < 1000; i++) {
        const v = iter.next();
        if (v.done) break;
        this.processedIds.delete(v.value);
      }
    }
  }
}
