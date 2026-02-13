/**
 * WH-004: Meta Webhook Hub
 *
 * Routes incoming Meta (Facebook/Instagram) webhook events
 * to the appropriate handlers for ads, pages, and Instagram.
 */
export type MetaWebhookObject = 'page' | 'instagram' | 'ad_account' | 'application' | 'whatsapp_business_account';
export interface MetaWebhookEntry {
    id: string;
    time: number;
    changes: {
        field: string;
        value: unknown;
    }[];
    messaging?: unknown[];
}
export interface MetaWebhookPayload {
    object: MetaWebhookObject;
    entry: MetaWebhookEntry[];
}
export interface MetaWebhookRouteResult {
    object: MetaWebhookObject;
    entriesProcessed: number;
    handlersInvoked: number;
}
export type MetaFieldHandler = (entryId: string, field: string, value: unknown) => Promise<void>;
export declare class MetaWebhookHub {
    private objectHandlers;
    private verifyToken;
    constructor(verifyToken: string);
    /**
     * Handle Meta's webhook verification challenge (GET request).
     */
    handleVerification(params: {
        'hub.mode'?: string;
        'hub.verify_token'?: string;
        'hub.challenge'?: string;
    }): {
        statusCode: number;
        body: string;
    };
    /**
     * Register a handler for a specific object type and field.
     */
    on(objectType: MetaWebhookObject, field: string, handler: MetaFieldHandler): void;
    /**
     * Process an incoming Meta webhook payload.
     */
    processWebhook(payload: unknown): Promise<MetaWebhookRouteResult>;
    private parsePayload;
}
