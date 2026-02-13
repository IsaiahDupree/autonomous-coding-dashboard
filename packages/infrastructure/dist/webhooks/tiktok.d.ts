/**
 * WH-005: TikTok Webhook Handler
 *
 * Processes incoming TikTok Marketing API and Content Publishing
 * webhook events (ad status changes, content moderation, audience sync).
 */
export type TikTokEventType = 'ad.status_change' | 'ad.approved' | 'ad.rejected' | 'campaign.budget_exhausted' | 'content.published' | 'content.moderation' | 'audience.sync_complete' | 'report.ready';
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
export declare class TikTokWebhookHandler {
    private handlers;
    private globalHandlers;
    private processedIds;
    /**
     * Register a handler for a specific TikTok event type.
     */
    on(eventType: TikTokEventType, handler: TikTokEventHandler): void;
    /**
     * Register a global handler that receives all events.
     */
    onAny(handler: TikTokEventHandler): void;
    /**
     * Remove a handler for a specific event type.
     */
    off(eventType: TikTokEventType, handler: TikTokEventHandler): void;
    /**
     * Process an incoming TikTok webhook payload.
     */
    processWebhook(payload: unknown, _signature?: string, _secret?: string): Promise<TikTokWebhookResult>;
    private parseEvent;
    private pruneProcessedIds;
}
