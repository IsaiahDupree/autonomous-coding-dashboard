import { randomUUID } from 'crypto';
import {
  TrackEventInputSchema,
  AnalyticsEventSchema,
  type AnalyticsEvent,
  type EventContext,
  type ProductId,
  type IdentifyInput,
} from './types';
import type { EventTransport } from './transport';

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export type EventMiddleware = (
  event: AnalyticsEvent,
  next: (event: AnalyticsEvent) => void,
) => void;

// ---------------------------------------------------------------------------
// Tracker options
// ---------------------------------------------------------------------------

export interface AnalyticsTrackerOptions {
  /** The product this tracker instance belongs to. */
  product: ProductId;
  /** Default context merged into every event. */
  defaultContext?: Partial<EventContext>;
  /** When true, logs events to the console before sending. */
  debug?: boolean;
}

// ---------------------------------------------------------------------------
// AnalyticsTracker
// ---------------------------------------------------------------------------

export class AnalyticsTracker {
  private readonly transport: EventTransport;
  private readonly product: ProductId;
  private readonly defaultContext: Partial<EventContext>;
  private readonly debug: boolean;
  private readonly middlewares: EventMiddleware[] = [];

  constructor(transport: EventTransport, options: AnalyticsTrackerOptions) {
    this.transport = transport;
    this.product = options.product;
    this.defaultContext = options.defaultContext ?? {};
    this.debug = options.debug ?? false;
  }

  // ---- public API ----------------------------------------------------------

  /**
   * Register a middleware that can inspect / transform events before they
   * reach the transport layer.
   */
  use(middleware: EventMiddleware): this {
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * Track an arbitrary event.
   */
  async track(
    event: string,
    properties: Record<string, unknown> = {},
    options: {
      userId?: string;
      anonymousId?: string;
      context?: Partial<EventContext>;
    } = {},
  ): Promise<void> {
    const mergedContext = this.mergeContext(options.context);

    const raw = {
      event,
      properties,
      context: mergedContext,
      userId: options.userId,
      anonymousId: options.anonymousId,
      product: this.product,
      timestamp: new Date().toISOString(),
    };

    // Validate against the input schema
    TrackEventInputSchema.parse(raw);

    const analyticsEvent: AnalyticsEvent = {
      ...raw,
      messageId: randomUUID(),
    };

    // Validate the enriched event
    AnalyticsEventSchema.parse(analyticsEvent);

    await this.runMiddlewareAndSend(analyticsEvent);
  }

  /**
   * Identify a user with optional traits.
   */
  async identify(
    userId: string,
    traits: Record<string, unknown> = {},
  ): Promise<void> {
    const identifyEvent: AnalyticsEvent = {
      event: '$identify',
      properties: { userId, traits },
      product: this.product,
      timestamp: new Date().toISOString(),
      messageId: randomUUID(),
      userId,
    };

    AnalyticsEventSchema.parse(identifyEvent);
    await this.runMiddlewareAndSend(identifyEvent);
  }

  /**
   * Convenience method for page view tracking.
   */
  async page(
    name: string,
    properties: Record<string, unknown> = {},
  ): Promise<void> {
    await this.track('page_view', { ...properties, name });
  }

  /**
   * Track group / organisation membership.
   */
  async group(
    groupId: string,
    traits: Record<string, unknown> = {},
  ): Promise<void> {
    const groupEvent: AnalyticsEvent = {
      event: '$group',
      properties: { groupId, traits },
      product: this.product,
      timestamp: new Date().toISOString(),
      messageId: randomUUID(),
    };

    AnalyticsEventSchema.parse(groupEvent);
    await this.runMiddlewareAndSend(groupEvent);
  }

  /**
   * Flush any pending events in the transport.
   */
  async flush(): Promise<void> {
    await this.transport.flush();
  }

  /**
   * Flush remaining events and release resources.
   */
  async shutdown(): Promise<void> {
    await this.transport.flush();
  }

  // ---- internals -----------------------------------------------------------

  private mergeContext(
    perCall?: Partial<EventContext>,
  ): EventContext {
    return {
      ...this.defaultContext,
      ...perCall,
      page: {
        ...this.defaultContext.page,
        ...perCall?.page,
      },
      device: {
        ...this.defaultContext.device,
        ...perCall?.device,
      },
      campaign: {
        ...this.defaultContext.campaign,
        ...perCall?.campaign,
      },
    } as EventContext;
  }

  private async runMiddlewareAndSend(event: AnalyticsEvent): Promise<void> {
    if (this.middlewares.length === 0) {
      if (this.debug) {
        // eslint-disable-next-line no-console
        console.log('[analytics]', JSON.stringify(event, null, 2));
      }
      await this.transport.send(event);
      return;
    }

    // Build a middleware chain where each middleware calls `next` to pass to
    // the subsequent one, with the transport.send as the terminal handler.
    let index = 0;

    const next = (evt: AnalyticsEvent): void => {
      index++;
      if (index < this.middlewares.length) {
        this.middlewares[index](evt, next);
      } else {
        if (this.debug) {
          // eslint-disable-next-line no-console
          console.log('[analytics]', JSON.stringify(evt, null, 2));
        }
        // Fire-and-forget inside the sync middleware chain -- the outer
        // promise returned by `runMiddlewareAndSend` will resolve after
        // the initial middleware invocation. Users who need guarantees
        // should call `flush()`.
        void this.transport.send(evt);
      }
    };

    this.middlewares[0](event, next);
  }
}
