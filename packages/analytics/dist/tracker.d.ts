import { type AnalyticsEvent, type EventContext, type ProductId } from './types';
import type { EventTransport } from './transport';
export type EventMiddleware = (event: AnalyticsEvent, next: (event: AnalyticsEvent) => void) => void;
export interface AnalyticsTrackerOptions {
    /** The product this tracker instance belongs to. */
    product: ProductId;
    /** Default context merged into every event. */
    defaultContext?: Partial<EventContext>;
    /** When true, logs events to the console before sending. */
    debug?: boolean;
}
export declare class AnalyticsTracker {
    private readonly transport;
    private readonly product;
    private readonly defaultContext;
    private readonly debug;
    private readonly middlewares;
    constructor(transport: EventTransport, options: AnalyticsTrackerOptions);
    /**
     * Register a middleware that can inspect / transform events before they
     * reach the transport layer.
     */
    use(middleware: EventMiddleware): this;
    /**
     * Track an arbitrary event.
     */
    track(event: string, properties?: Record<string, unknown>, options?: {
        userId?: string;
        anonymousId?: string;
        context?: Partial<EventContext>;
    }): Promise<void>;
    /**
     * Identify a user with optional traits.
     */
    identify(userId: string, traits?: Record<string, unknown>): Promise<void>;
    /**
     * Convenience method for page view tracking.
     */
    page(name: string, properties?: Record<string, unknown>): Promise<void>;
    /**
     * Track group / organisation membership.
     */
    group(groupId: string, traits?: Record<string, unknown>): Promise<void>;
    /**
     * Flush any pending events in the transport.
     */
    flush(): Promise<void>;
    /**
     * Flush remaining events and release resources.
     */
    shutdown(): Promise<void>;
    private mergeContext;
    private runMiddlewareAndSend;
}
//# sourceMappingURL=tracker.d.ts.map