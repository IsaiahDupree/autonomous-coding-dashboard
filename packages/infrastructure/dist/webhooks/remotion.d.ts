/**
 * WH-002: Remotion Webhook Handler
 *
 * Processes callbacks from Remotion Lambda render jobs.
 * Routes render-complete, render-failed, and progress events
 * to the appropriate internal handlers.
 */
export type RemotionEventType = 'render.started' | 'render.progress' | 'render.completed' | 'render.failed' | 'render.timeout';
export interface RemotionRenderEvent {
    type: RemotionEventType;
    renderId: string;
    compositionId: string;
    timestamp: string;
    progress?: number;
    outputUrl?: string;
    outputSizeBytes?: number;
    durationMs?: number;
    errorMessage?: string;
    lambdaFunctionName?: string;
}
export type RemotionEventHandler = (event: RemotionRenderEvent) => Promise<void>;
export declare class RemotionWebhookHandler {
    private handlers;
    /**
     * Register a handler for a specific Remotion event type.
     */
    on(eventType: RemotionEventType, handler: RemotionEventHandler): void;
    /**
     * Remove a handler for a specific event type.
     */
    off(eventType: RemotionEventType, handler: RemotionEventHandler): void;
    /**
     * Process an incoming Remotion webhook payload.
     * Validates the event and routes to registered handlers.
     */
    processWebhook(payload: unknown, signature?: string, secret?: string): Promise<{
        handled: boolean;
        eventType: RemotionEventType;
    }>;
    /**
     * Verify the HMAC signature of a Remotion webhook.
     */
    private verifySignature;
    /**
     * Parse and validate the incoming event payload.
     */
    private parseEvent;
}
